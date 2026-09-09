import mongoose from "mongoose";
import Customer from "../models/customer.js";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";

function roundRating(avg) {
  if (!Number.isFinite(avg) || avg <= 0) return 0;
  return Math.round(avg * 10) / 10;
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
  if (!shopId) return;
  const { rating, reviewCount } = await aggregateShopReviews(
    "tailorShopId",
    shopId,
  );
  await TailorShop.updateOne(
    { _id: shopId },
    { $set: { rating, reviewCount } },
  );
}

export async function recomputeFabricShopRating(shopId) {
  if (!shopId) return;
  const { rating, reviewCount } = await aggregateShopReviews(
    "fabricShopId",
    shopId,
  );
  await FabricShop.updateOne(
    { _id: shopId },
    { $set: { rating, reviewCount } },
  );
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
