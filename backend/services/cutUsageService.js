import mongoose from "mongoose";
import CustomOrder from "../models/CustomOrder.js";
import PendingCheckout from "../models/PendingCheckout.js";
import Fabric from "../models/Fabric.js";

function collectCutIdsFromPayload(payload) {
  const ids = [];
  if (!payload || typeof payload !== "object") return ids;

  const items = payload.items;
  if (!Array.isArray(items)) return ids;

  for (const item of items) {
    if (item?.cutId && mongoose.Types.ObjectId.isValid(item.cutId)) {
      ids.push(String(item.cutId));
    }
  }

  return ids;
}

/**
 * Returns a map of cutId string -> usage count across orders and in-flight checkouts.
 */
export async function getCutUsageMap(cutIds = []) {
  const usage = Object.fromEntries(cutIds.map((id) => [String(id), 0]));
  if (cutIds.length === 0) return usage;

  const objectIds = cutIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return usage;

  const grouped = await CustomOrder.aggregate([
    { $unwind: "$items" },
    { $match: { "items.cutId": { $in: objectIds } } },
    { $group: { _id: "$items.cutId", count: { $sum: 1 } } },
  ]);

  for (const row of grouped) {
    usage[String(row._id)] = (usage[String(row._id)] || 0) + row.count;
  }

  const fabricGrouped = await Fabric.aggregate([
    { $unwind: "$cuts" },
    { $match: { "cuts.cutId": { $in: objectIds } } },
    { $group: { _id: "$cuts.cutId", count: { $sum: 1 } } },
  ]);

  for (const row of fabricGrouped) {
    usage[String(row._id)] = (usage[String(row._id)] || 0) + row.count;
  }

  const pending = await PendingCheckout.find({
    status: { $in: ["pending", "fulfilling"] },
  })
    .select("payload")
    .lean();

  for (const entry of pending) {
    const cutIdsInPayload = collectCutIdsFromPayload(entry.payload);
    for (const cutId of cutIdsInPayload) {
      if (usage[cutId] !== undefined) {
        usage[cutId] += 1;
      }
    }
  }

  return usage;
}

export async function getCutUsageCount(cutId) {
  const map = await getCutUsageMap([String(cutId)]);
  return map[String(cutId)] || 0;
}

export async function isCutInUse(cutId) {
  return getCutUsageCount(cutId) > 0;
}
