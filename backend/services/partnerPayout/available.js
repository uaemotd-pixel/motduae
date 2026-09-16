import mongoose from "mongoose";
import PartnerEarning from "../../models/PartnerEarning.js";
import CustomOrder from "../../models/CustomOrder.js";
import RetailOrder from "../../models/RetailOrder.js";

const EXCLUDED_PENDING_STATUSES = new Set([
  "cancelled",
  "return_requested",
  "return_approved",
  "refund_processed",
]);

export async function maybeMarkEarningsAvailable(order, orderType) {
  if (!order?._id) return { modifiedCount: 0 };
  if (String(order.status || "").toLowerCase() !== "delivered") {
    return { modifiedCount: 0 };
  }
  return markEarningsAvailableForOrder({
    orderId: order._id,
    orderType: orderType === "retail" ? "retail" : "custom",
    deliveredAt: order.deliveredAt || new Date(),
  });
}

export async function markEarningsAvailableForOrder({
  orderId,
  orderType,
  deliveredAt,
} = {}) {
  if (!orderId) return { modifiedCount: 0 };
  const type = orderType === "retail" ? "retail" : "custom";
  const at = deliveredAt ? new Date(deliveredAt) : new Date();
  const result = await PartnerEarning.updateMany(
    {
      orderId,
      orderType: type,
      status: "pending",
    },
    {
      $set: {
        status: "available",
        availableAt: at,
      },
    },
  );
  return { modifiedCount: result.modifiedCount || 0 };
}

async function loadOrderStatuses(orderIds, Model) {
  if (!orderIds.length) return new Map();
  const docs = await Model.find({ _id: { $in: orderIds } })
    .select("status deliveredAt")
    .lean();
  return new Map(docs.map((doc) => [String(doc._id), doc]));
}

/**
 * Promote pending earnings whose order is already delivered.
 * Pending rows on cancelled / refunded orders stay pending and are excluded
 * from settlement buckets.
 */
export async function healDeliveredEarnings({ partnerId, partnerKind } = {}) {
  const filter = { status: "pending" };
  if (partnerId) filter.partnerId = String(partnerId);
  if (partnerKind) filter.partnerKind = partnerKind;

  const pending = await PartnerEarning.find(filter)
    .select("orderId orderType")
    .lean();
  if (pending.length === 0) {
    return { promoted: 0 };
  }

  const customIds = [
    ...new Set(
      pending
        .filter((row) => row.orderType === "custom")
        .map((row) => String(row.orderId)),
    ),
  ];
  const retailIds = [
    ...new Set(
      pending
        .filter((row) => row.orderType === "retail")
        .map((row) => String(row.orderId)),
    ),
  ];

  const [customMap, retailMap] = await Promise.all([
    loadOrderStatuses(customIds, CustomOrder),
    loadOrderStatuses(retailIds, RetailOrder),
  ]);

  const promote = [];
  for (const row of pending) {
    const order =
      row.orderType === "retail"
        ? retailMap.get(String(row.orderId))
        : customMap.get(String(row.orderId));
    if (!order) continue;
    if (String(order.status || "").toLowerCase() === "delivered") {
      promote.push({
        orderId: row.orderId,
        orderType: row.orderType,
        deliveredAt: order.deliveredAt || new Date(),
      });
    }
  }

  let promoted = 0;
  const seen = new Set();
  for (const item of promote) {
    const key = `${item.orderType}:${item.orderId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const result = await markEarningsAvailableForOrder(item);
    promoted += result.modifiedCount;
  }
  return { promoted };
}

export function isExcludedOrderStatus(status) {
  return EXCLUDED_PENDING_STATUSES.has(String(status || "").toLowerCase());
}

export async function loadExcludedOrderIdSet(earnings) {
  const customIds = [
    ...new Set(
      earnings
        .filter((row) => row.orderType === "custom")
        .map((row) => String(row.orderId)),
    ),
  ];
  const retailIds = [
    ...new Set(
      earnings
        .filter((row) => row.orderType === "retail")
        .map((row) => String(row.orderId)),
    ),
  ];
  const [custom, retail] = await Promise.all([
    customIds.length
      ? CustomOrder.find({ _id: { $in: customIds } })
          .select("status")
          .lean()
      : Promise.resolve([]),
    retailIds.length
      ? RetailOrder.find({ _id: { $in: retailIds } })
          .select("status")
          .lean()
      : Promise.resolve([]),
  ]);
  const excluded = new Set();
  for (const doc of [...custom, ...retail]) {
    if (isExcludedOrderStatus(doc.status)) {
      excluded.add(String(doc._id));
    }
  }
  return excluded;
}

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}
