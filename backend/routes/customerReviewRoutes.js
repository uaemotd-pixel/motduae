import mongoose from "mongoose";
import Customer from "../models/customer.js";
import RetailOrder from "../models/RetailOrder.js";
import CustomOrder from "../models/CustomOrder.js";
import Fabric from "../models/Fabric.js";
import FabricShop from "../models/FabricShop.js";
import AddOn from "../models/AddOn.js";
import { isAuth } from "../middleware/auth.js";
import { createNotification } from "../services/notificationService.js";
import { recomputeShopRatingsForReview } from "../services/reviewShopRatings.js";
import {
  explodeCustomOrder,
  enrichReviewTarget,
  findTargetInCustomOrder,
  findOrCreateCustomer,
  isReviewCustomerRole,
  omitReviewModerationFields,
  omitReviewsModerationFields,
  reviewedProductIdSet,
  toObjectIdOrNull,
} from "../services/reviewTargets.js";

function isValidHalfStarRating(rating) {
  const n = Number(rating);
  if (!Number.isFinite(n) || n < 1 || n > 5) return false;
  return Math.abs(n * 2 - Math.round(n * 2)) < 1e-9;
}

function isPubliclyVisibleReview(rev) {
  if (!rev) return false;
  if (rev.status === "approved") return true;
  if (rev.status === "pending" || rev.status === "rejected") return false;
  return true;
}

function serializePublicReview(customer, rev) {
  return {
    id: rev._id || rev.id,
    nameEn: customer.name,
    nameAr: customer.name,
    titleEn: rev.titleEn || "Client",
    titleAr: rev.titleAr || "عميل",
    quoteEn: rev.quoteEn,
    quoteAr: rev.quoteAr || rev.quoteEn,
    rating: rev.rating,
    createdAt: rev.createdAt,
    productId: rev.productId || null,
    productKind: rev.productKind || null,
    productName: rev.productName || "",
    productNameAr: rev.productNameAr || "",
    productSlug: rev.productSlug || "",
    orderType: rev.orderType || "",
    orderId: rev.orderId || null,
    verified: Boolean(rev.orderId),
  };
}

function parsePagination(query, { defaultLimit = 12, maxLimit = 50 } = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    maxLimit,
    Math.max(1, parseInt(query.limit, 10) || defaultLimit),
  );
  return { page, limit, skip: (page - 1) * limit };
}

function resolveReviewQuotes(quoteEn, quoteAr, titleEn, titleAr, fallbacks = {}) {
  const trimmedQuoteEn = typeof quoteEn === "string" ? quoteEn.trim() : "";
  const trimmedQuoteAr = typeof quoteAr === "string" ? quoteAr.trim() : "";
  return {
    trimmedQuoteEn,
    trimmedQuoteAr,
    resolvedQuoteEn: trimmedQuoteEn || trimmedQuoteAr,
    resolvedQuoteAr: trimmedQuoteAr || trimmedQuoteEn,
    resolvedTitleEn:
      (typeof titleEn === "string" && titleEn.trim()) ||
      (typeof titleAr === "string" && titleAr.trim()) ||
      fallbacks.titleEn ||
      "Client",
    resolvedTitleAr:
      (typeof titleAr === "string" && titleAr.trim()) ||
      (typeof titleEn === "string" && titleEn.trim()) ||
      fallbacks.titleAr ||
      "عميل",
  };
}

function denyIfNotReviewCustomer(req, res) {
  if (!isReviewCustomerRole(req.user)) {
    res.status(403).json({
      error: "Only customers can submit reviews",
    });
    return true;
  }
  return false;
}

async function resolveRetailShopIds(item) {
  const kind = item.kind || "readyMade";
  let fabricShopId = item.fabricShopId ? String(item.fabricShopId) : null;

  if ((kind === "fabric" || kind === "addon") && !fabricShopId) {
    if (kind === "fabric") {
      const fabric = await Fabric.findById(item.productId)
        .select("fabricShopId listedByStore")
        .lean();
      if (fabric?.fabricShopId) {
        fabricShopId = String(fabric.fabricShopId);
      } else if (fabric?.listedByStore) {
        const shop = await FabricShop.findOne({
          ownerId: fabric.listedByStore,
        })
          .select("_id")
          .lean();
        if (shop) fabricShopId = String(shop._id);
      }
    } else {
      const addon = await AddOn.findById(item.productId)
        .select("fabricShopId")
        .lean();
      if (addon?.fabricShopId) fabricShopId = String(addon.fabricShopId);
    }
  }

  return { tailorShopId: null, fabricShopId };
}

async function findRetailReviewMatch(userId, productId) {
  const deliveredOrders = await RetailOrder.find({
    userId,
    status: "delivered",
    "orderItems.productId": new mongoose.Types.ObjectId(productId),
  })
    .sort({ createdAt: -1 })
    .select("orderItems _id")
    .lean();

  for (const order of deliveredOrders) {
    const item = (order.orderItems || []).find((entry) => {
      const kind = entry.kind || "readyMade";
      return (
        (kind === "readyMade" || kind === "fabric" || kind === "addon") &&
        String(entry.productId) === String(productId)
      );
    });
    if (item) {
      const shops = await resolveRetailShopIds(item);
      const matchedKind = item.kind || "readyMade";
      return {
        productId: item.productId,
        productKind:
          matchedKind === "fabric"
            ? "fabric"
            : matchedKind === "addon"
              ? "addon"
              : "readyMade",
        productName: item.name || "",
        productNameAr: item.nameAr || item.name || "",
        productSlug: item.slug || "",
        orderType: "retail",
        orderId: order._id,
        tailorShopId: shops.tailorShopId,
        fabricShopId: shops.fabricShopId,
      };
    }
  }
  return null;
}

async function findCustomReviewMatch(userId, productId) {
  const orders = await CustomOrder.find({
    userId,
    status: "delivered",
  })
    .select(
      "items designId designSnapshot fabricId fabricSnapshot fabricSource fabricStoreId tailorShopId addons",
    )
    .lean();

  for (const order of orders) {
    const target = findTargetInCustomOrder(order, productId);
    if (!target) continue;
    const enriched = await enrichReviewTarget(target);
    return {
      productId: enriched.productId,
      productKind: enriched.kind,
      productName: enriched.name || "",
      productNameAr: enriched.nameAr || enriched.name || "",
      productSlug: enriched.slug || "",
      orderType: "custom",
      orderId: order._id,
      tailorShopId: enriched.tailorShopId,
      fabricShopId: enriched.fabricShopId,
    };
  }
  return null;
}

async function buildLinkedReviewFields(userId, productId) {
  if (!productId) {
    return {
      productId: null,
      productKind: "",
      productName: "",
      productNameAr: "",
      productSlug: "",
      orderType: "",
      orderId: null,
      tailorShopId: null,
      fabricShopId: null,
    };
  }

  if (!mongoose.Types.ObjectId.isValid(String(productId))) {
    const err = new Error("Invalid product");
    err.status = 400;
    throw err;
  }

  const retail = await findRetailReviewMatch(userId, productId);
  if (retail) return retail;

  const custom = await findCustomReviewMatch(userId, productId);
  if (custom) return custom;

  const err = new Error(
    "You can only review items from your delivered orders",
  );
  err.status = 400;
  throw err;
}

async function notifyAdminsOfNewReviews(customer, count) {
  const n = Number(count) || 1;
  try {
    await createNotification({
      type: "review_submitted",
      title: n > 1 ? "New reviews pending" : "New review pending",
      message:
        n > 1
          ? `${customer.name} submitted ${n} reviews for moderation.`
          : `${customer.name} submitted a review for moderation.`,
      audience: "admin",
      createdBy: customer.userId,
    });
  } catch (err) {
    console.error("Failed to notify admin of new review:", err);
  }
}

export function registerCustomerReviewRoutes(customerRouter) {
  customerRouter.post("/reviews", isAuth, async (req, res) => {
    if (denyIfNotReviewCustomer(req, res)) return;

    const rawItems = Array.isArray(req.body?.items)
      ? req.body.items
      : [req.body || {}];

    if (!rawItems.length) {
      return res.status(400).json({ error: "Review payload is required" });
    }

    if (rawItems.some((item) => item?.customOrderId && !item?.productId)) {
      return res.status(400).json({
        error: "Select a design, fabric, or add-on from the custom order",
      });
    }

    try {
      const customer = await findOrCreateCustomer(req.user);
      const already = reviewedProductIdSet(customer.reviews);
      const batchIds = new Set();
      const toInsert = [];

      for (const item of rawItems) {
        if (!isValidHalfStarRating(item?.rating)) {
          return res.status(400).json({
            error:
              "Rating must be between 1 and 5 in half-star steps (e.g. 3.5)",
          });
        }

        const quotes = resolveReviewQuotes(
          item.quoteEn,
          item.quoteAr,
          item.titleEn,
          item.titleAr,
        );
        if (!quotes.trimmedQuoteEn && !quotes.trimmedQuoteAr) {
          return res.status(400).json({ error: "Review comment is required" });
        }

        const productId = item.productId ? String(item.productId) : "";
        if (productId) {
          if (already.has(productId) || batchIds.has(productId)) {
            return res.status(400).json({
              error: "You have already reviewed this product",
            });
          }
          batchIds.add(productId);
        }

        const linked = await buildLinkedReviewFields(req.user._id, productId || null);
        toInsert.push({
          rating: Number(item.rating),
          quoteEn: quotes.resolvedQuoteEn,
          quoteAr: quotes.resolvedQuoteAr,
          titleEn: quotes.resolvedTitleEn,
          titleAr: quotes.resolvedTitleAr,
          status: "pending",
          productId: toObjectIdOrNull(linked.productId),
          productKind: linked.productKind || "",
          productName: linked.productName || "",
          productNameAr: linked.productNameAr || "",
          productSlug: linked.productSlug || "",
          orderType: linked.orderType || "",
          orderId: toObjectIdOrNull(linked.orderId),
          tailorShopId: toObjectIdOrNull(linked.tailorShopId),
          fabricShopId: toObjectIdOrNull(linked.fabricShopId),
        });
      }

      const start = customer.reviews.length;
      for (const review of toInsert) {
        customer.reviews.push(review);
      }
      await customer.save();

      const created = customer.reviews.slice(start);
      await notifyAdminsOfNewReviews(customer, created.length);

      return res.status(201).json({
        success: true,
        review:
          created.length === 1
            ? omitReviewModerationFields(created[0])
            : undefined,
        reviews: omitReviewsModerationFields(created),
      });
    } catch (err) {
      console.error(err);
      const status = err.status || 500;
      return res.status(status).json({ error: err.message || "Server error" });
    }
  });

  customerRouter.put("/reviews/:id", isAuth, async (req, res) => {
    const reviewId = req.params.id;
    const { rating, quoteEn, quoteAr, titleEn, titleAr } = req.body;

    if (denyIfNotReviewCustomer(req, res)) return;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    if (!isValidHalfStarRating(rating)) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5 in half-star steps (e.g. 3.5)",
      });
    }

    const quotes = resolveReviewQuotes(quoteEn, quoteAr, titleEn, titleAr);
    if (!quotes.trimmedQuoteEn && !quotes.trimmedQuoteAr) {
      return res.status(400).json({ error: "Review comment is required" });
    }

    try {
      const customer = await findOrCreateCustomer(req.user);
      const review = customer.reviews.id(reviewId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      const wasApproved = review.status === "approved";
      review.rating = Number(rating);
      review.quoteEn = quotes.resolvedQuoteEn;
      review.quoteAr = quotes.resolvedQuoteAr;
      review.titleEn = quotes.resolvedTitleEn || review.titleEn || "Client";
      review.titleAr = quotes.resolvedTitleAr || review.titleAr || "عميل";
      review.status = "pending";
      await customer.save();

      if (wasApproved) {
        await recomputeShopRatingsForReview(review);
      }

      return res.json({
        success: true,
        review: omitReviewModerationFields(review),
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  customerRouter.delete("/reviews/:id", isAuth, async (req, res) => {
    const reviewId = req.params.id;

    if (denyIfNotReviewCustomer(req, res)) return;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({ error: "Invalid review id" });
    }

    try {
      const customer = await Customer.findOne({ userId: req.user._id });
      if (!customer) {
        return res.status(404).json({ error: "Customer profile not found" });
      }

      const review = customer.reviews.id(reviewId);
      if (!review) {
        return res.status(404).json({ error: "Review not found" });
      }

      const snapshot = review.toObject();
      customer.reviews = customer.reviews.filter(
        (rev) => String(rev._id) !== String(reviewId),
      );
      await customer.save();

      if (snapshot.status === "approved") {
        await recomputeShopRatingsForReview(snapshot);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  customerRouter.get("/reviews/eligible-products", isAuth, async (req, res) => {
    try {
      if (denyIfNotReviewCustomer(req, res)) return;

      const customer = await Customer.findOne({ userId: req.user._id }).select(
        "reviews",
      );
      const reviewedIds = reviewedProductIdSet(customer?.reviews);

      const { orderId, orderType } = req.query;
      const requestedType = String(orderType || "")
        .trim()
        .toLowerCase();
      const hasOrderFilter =
        Boolean(orderId) && mongoose.Types.ObjectId.isValid(String(orderId));

      if (orderId && !hasOrderFilter) {
        return res.status(400).json({ error: "Invalid orderId" });
      }

      const products = [];
      const seenProducts = new Set();
      const retailOnly = hasOrderFilter && requestedType === "retail";
      const customOnly = hasOrderFilter && requestedType === "custom";
      const wantRetail = !customOnly;
      const wantCustom = !retailOnly;

      if (wantRetail) {
        const orderFilter = {
          userId: req.user._id,
          status: "delivered",
        };
        if (hasOrderFilter && (retailOnly || requestedType === "")) {
          orderFilter._id = new mongoose.Types.ObjectId(String(orderId));
        }

        const orders = await RetailOrder.find(orderFilter)
          .sort({ createdAt: -1 })
          .select("orderItems _id createdAt")
          .lean();

        for (const order of orders) {
          for (const item of order.orderItems || []) {
            const kind = item.kind || "readyMade";
            if (kind !== "readyMade" && kind !== "fabric" && kind !== "addon") {
              continue;
            }
            const pid = String(item.productId);
            if (!pid || seenProducts.has(pid) || reviewedIds.has(pid)) continue;
            seenProducts.add(pid);
            products.push({
              productId: pid,
              orderId: String(order._id),
              orderType: "retail",
              kind,
              name: item.name || "",
              nameAr: item.nameAr || item.name || "",
              slug: item.slug || "",
              image: item.image || "",
              deliveredAt: order.createdAt,
            });
          }
        }
      }

      if (wantCustom) {
        const customFilter = {
          userId: req.user._id,
          status: "delivered",
        };
        if (hasOrderFilter && (customOnly || requestedType === "")) {
          customFilter._id = new mongoose.Types.ObjectId(String(orderId));
        }

        const orders = await CustomOrder.find(customFilter)
          .sort({ createdAt: -1 })
          .select(
            "items designId designSnapshot fabricId fabricSnapshot addons fabricSource fabricStoreId tailorShopId createdAt",
          )
          .lean();

        for (const order of orders) {
          const targets = explodeCustomOrder(order, reviewedIds);
          for (const target of targets) {
            if (seenProducts.has(target.productId)) continue;
            seenProducts.add(target.productId);
            const enriched = await enrichReviewTarget(target);
            products.push({
              productId: enriched.productId,
              orderId: String(order._id),
              orderType: "custom",
              kind: enriched.kind,
              name: enriched.name || "",
              nameAr: enriched.nameAr || enriched.name || "",
              slug: enriched.slug || "",
              image: enriched.image || "",
              deliveredAt: order.createdAt,
            });
          }
        }
      }

      return res.json({ success: true, products, customOrders: [] });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });

  customerRouter.get("/reviews", async (req, res) => {
    try {
      const { productId, tailorShopId, fabricShopId } = req.query;
      const { page, limit, skip } = parsePagination(req.query);

      const match = {
        $or: [
          { "reviews.status": "approved" },
          { "reviews.status": { $exists: false } },
          { "reviews.status": null },
        ],
      };

      if (productId) {
        if (!mongoose.Types.ObjectId.isValid(String(productId))) {
          return res.status(400).json({ error: "Invalid productId" });
        }
        match["reviews.productId"] = new mongoose.Types.ObjectId(
          String(productId),
        );
      }

      if (tailorShopId) {
        if (!mongoose.Types.ObjectId.isValid(String(tailorShopId))) {
          return res.status(400).json({ error: "Invalid tailorShopId" });
        }
        match["reviews.tailorShopId"] = new mongoose.Types.ObjectId(
          String(tailorShopId),
        );
      }

      if (fabricShopId) {
        if (!mongoose.Types.ObjectId.isValid(String(fabricShopId))) {
          return res.status(400).json({ error: "Invalid fabricShopId" });
        }
        match["reviews.fabricShopId"] = new mongoose.Types.ObjectId(
          String(fabricShopId),
        );
      }

      const pipeline = [
        { $match: { "reviews.0": { $exists: true } } },
        { $unwind: "$reviews" },
        { $match: match },
        { $sort: { "reviews.createdAt": -1 } },
        {
          $facet: {
            items: [
              { $skip: skip },
              { $limit: limit },
              {
                $project: {
                  name: 1,
                  reviews: 1,
                },
              },
            ],
            total: [{ $count: "count" }],
          },
        },
      ];

      const [result] = await Customer.aggregate(pipeline);
      const rows = result?.items || [];
      const total = result?.total?.[0]?.count || 0;

      const items = rows
        .filter((row) => isPubliclyVisibleReview(row.reviews))
        .map((row) => serializePublicReview({ name: row.name }, row.reviews));

      return res.json({
        items,
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 0,
      });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: err.message || "Server error" });
    }
  });
}
