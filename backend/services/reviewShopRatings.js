import mongoose from "mongoose";
import Customer from "../models/customer.js";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import Design from "../models/Design.js";
import Fabric from "../models/Fabric.js";
import AddOn from "../models/AddOn.js";

function roundRating(avg) {
  if (!Number.isFinite(avg) || avg <= 0) return 0;
  return Math.round(avg * 10) / 10;
}

function sameId(a, b) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return String(a) === String(b);
}

async function aggregateShopReviews(field, shopId) {
  if (!shopId || !mongoose.Types.ObjectId.isValid(String(shopId))) {
    return { rating: 0, reviewCount: 0 };
  }

  const rows = await Customer.aggregate([
    { $unwind: "$reviews" },
    {
      $match: {
        "reviews.status": "approved",
        [`reviews.${field}`]: new mongoose.Types.ObjectId(String(shopId)),
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: "$reviews.rating" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    rating: roundRating(rows[0]?.avg || 0),
    reviewCount: rows[0]?.count || 0,
  };
}

export async function recomputeTailorShopRating(shopId) {
  if (!shopId) return { rating: 0, reviewCount: 0 };
  const { rating, reviewCount } = await aggregateShopReviews(
    "tailorShopId",
    shopId,
  );
  await TailorShop.updateOne(
    { _id: shopId },
    { $set: { rating, reviewCount } },
  );
  return { rating, reviewCount };
}

export async function recomputeFabricShopRating(shopId) {
  if (!shopId) return { rating: 0, reviewCount: 0 };
  const { rating, reviewCount } = await aggregateShopReviews(
    "fabricShopId",
    shopId,
  );
  await FabricShop.updateOne(
    { _id: shopId },
    { $set: { rating, reviewCount } },
  );
  return { rating, reviewCount };
}

export async function recomputeShopRatingsForReview(review) {
  if (!review) return;
  const tailorShopId = review.tailorShopId;
  const fabricShopId = review.fabricShopId;
  await Promise.all([
    recomputeTailorShopRating(tailorShopId),
    recomputeFabricShopRating(fabricShopId),
  ]);
}

/**
 * Recompute rating/reviewCount for every tailor and fabric shop from approved
 * customer reviews. Clears stale seed/fake scores on shops that never got a
 * moderation-triggered recompute.
 */
export async function recomputeAllShopRatings() {
  const [tailors, fabrics] = await Promise.all([
    TailorShop.find({}).select("_id name slug rating reviewCount").lean(),
    FabricShop.find({}).select("_id name slug rating reviewCount").lean(),
  ]);

  const tailorResults = [];
  for (const shop of tailors) {
    const next = await recomputeTailorShopRating(shop._id);
    tailorResults.push({
      id: String(shop._id),
      slug: shop.slug,
      name: shop.name,
      before: { rating: shop.rating ?? 0, reviewCount: shop.reviewCount ?? 0 },
      after: next,
    });
  }

  const fabricResults = [];
  for (const shop of fabrics) {
    const next = await recomputeFabricShopRating(shop._id);
    fabricResults.push({
      id: String(shop._id),
      slug: shop.slug,
      name: shop.name,
      before: { rating: shop.rating ?? 0, reviewCount: shop.reviewCount ?? 0 },
      after: next,
    });
  }

  return {
    tailors: tailorResults,
    fabrics: fabricResults,
    updated:
      tailorResults.filter(
        (r) =>
          r.before.rating !== r.after.rating ||
          r.before.reviewCount !== r.after.reviewCount,
      ).length +
      fabricResults.filter(
        (r) =>
          r.before.rating !== r.after.rating ||
          r.before.reviewCount !== r.after.reviewCount,
      ).length,
  };
}

async function resolveShopIdsForProduct(productId, productKind = "") {
  if (!productId || !mongoose.Types.ObjectId.isValid(String(productId))) {
    return { tailorShopId: null, fabricShopId: null };
  }

  const id = String(productId);
  const kind = String(productKind || "").trim();

  if (!kind || kind === "readyMade") {
    const product = await ReadyMadeProduct.findById(id)
      .select("tailorShopId")
      .lean();
    if (product) {
      return {
        tailorShopId: product.tailorShopId || null,
        fabricShopId: null,
      };
    }
  }

  if (!kind || kind === "design") {
    const design = await Design.findById(id).select("tailorShopId").lean();
    if (design) {
      return {
        tailorShopId: design.tailorShopId || null,
        fabricShopId: null,
      };
    }
  }

  if (!kind || kind === "fabric") {
    const fabric = await Fabric.findById(id)
      .select("fabricShopId listedByStore")
      .lean();
    if (fabric) {
      let fabricShopId = fabric.fabricShopId || null;
      if (!fabricShopId && fabric.listedByStore) {
        const shop = await FabricShop.findOne({
          ownerId: fabric.listedByStore,
        })
          .select("_id")
          .lean();
        fabricShopId = shop?._id || null;
      }
      return { tailorShopId: null, fabricShopId };
    }
  }

  if (!kind || kind === "addon") {
    const addon = await AddOn.findById(id).select("fabricShopId").lean();
    if (addon) {
      return {
        tailorShopId: null,
        fabricShopId: addon.fabricShopId || null,
      };
    }
  }

  return { tailorShopId: null, fabricShopId: null };
}

/**
 * Fill missing/incorrect tailorShopId and fabricShopId on existing reviews so
 * tailor and brand review sections (and ratings) include them.
 */
export async function backfillReviewShopIds() {
  const customers = await Customer.find({ "reviews.0": { $exists: true } });
  let scanned = 0;
  let updated = 0;

  for (const customer of customers) {
    let dirty = false;
    for (const review of customer.reviews || []) {
      scanned += 1;
      if (!review.productId) continue;

      const resolved = await resolveShopIdsForProduct(
        review.productId,
        review.productKind,
      );

      const kind = String(review.productKind || "").trim();
      const isTailorProduct = !kind || kind === "readyMade" || kind === "design";
      const nextTailor = isTailorProduct ? resolved.tailorShopId : null;
      const nextFabric = isTailorProduct ? null : resolved.fabricShopId;

      if (
        sameId(review.tailorShopId, nextTailor) &&
        sameId(review.fabricShopId, nextFabric)
      ) {
        continue;
      }

      review.tailorShopId = nextTailor;
      review.fabricShopId = nextFabric;
      dirty = true;
      updated += 1;
    }

    if (dirty) {
      await customer.save();
    }
  }

  return { scanned, updated };
}
