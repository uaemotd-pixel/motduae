import TailorShop from "../models/TailorShop.js";
import CustomOrder from "../models/CustomOrder.js";
import PlatformSettings from "../models/PlatformSettings.js";
import PartnerPayout from "../models/PartnerPayout.js";
import PartnerPayoutCredit from "../models/PartnerPayoutCredit.js";
import PartnerPayoutRequest from "../models/PartnerPayoutRequest.js";
import { splitMotdCommission } from "./pricingService.js";
import { normalizePartnerLabel } from "./fabricPayoutRequestService.js";

const DEFAULT_TAILOR_COMMISSION_PERCENT = 12;

export function resolveTailorCommissionPercent(settings) {
  if (
    typeof settings?.motdCommissionFromTailor === "number" &&
    Number.isFinite(settings.motdCommissionFromTailor) &&
    settings.motdCommissionFromTailor > 0
  ) {
    return Math.min(100, Math.max(0, settings.motdCommissionFromTailor));
  }
  return DEFAULT_TAILOR_COMMISSION_PERCENT;
}

export function buildTailorPartnerIdentity(shop) {
  const shopIdStr = shop?._id ? String(shop._id) : "";
  const nameNorm = normalizePartnerLabel(shop?.name);
  const partnerKey = nameNorm
    ? `tailor:name:${nameNorm}`
    : `tailor:${shopIdStr}`;
  return {
    partnerKey,
    partnerKind: "tailor",
    partnerId: shopIdStr,
    partnerName: String(shop?.name || "Tailor shop").trim() || "Tailor shop",
    payeeName: String(shop?.name || "").trim(),
  };
}

async function getTailorSettlement(shop) {
  if (!shop?._id) {
    return { paidByOrderId: new Map() };
  }
  const shopId = String(shop._id);
  const nameNorm = normalizePartnerLabel(shop.name);
  const keys = [`tailor:${shopId}`];
  if (nameNorm) keys.push(`tailor:name:${nameNorm}`);

  const match = {
    partnerKind: "tailor",
    $or: [{ partnerId: shopId }, { partnerKey: { $in: keys } }],
  };

  const [payouts, credits] = await Promise.all([
    PartnerPayout.find(match).select("amount orders").lean(),
    PartnerPayoutCredit.find({
      ...match,
      "orders.0": { $exists: true },
    })
      .select("amount orders")
      .lean(),
  ]);

  const paidByOrderId = new Map();
  const addOrders = (orders) => {
    for (const order of orders || []) {
      const orderId = String(order.orderId || "");
      if (!orderId) continue;
      const amount = Number(order.amount) || 0;
      if (amount <= 0) continue;
      paidByOrderId.set(
        orderId,
        Number(((paidByOrderId.get(orderId) || 0) + amount).toFixed(2)),
      );
    }
  };

  for (const payout of payouts) addOrders(payout.orders);
  for (const credit of credits) addOrders(credit.orders);

  return { paidByOrderId };
}

function isPayoutEligibleOrder(order) {
  if (order?.isPaid === false) return false;
  const status = String(order?.status || "").toLowerCase();
  // CustomOrder has no "cancelled"; keep it for defensive parity with fabric/retail.
  if (
    status === "cancelled" ||
    status === "return_requested" ||
    status === "return_approved" ||
    status === "refund_processed"
  ) {
    return false;
  }
  return true;
}

/**
 * Compute unpaid tailor order lines for a shop owner (all-time).
 */
export async function computeTailorUnpaidBreakdown(ownerUserId) {
  const shop = await TailorShop.findOne({ ownerId: ownerUserId });
  if (!shop) {
    return {
      shop: null,
      identity: buildTailorPartnerIdentity(null),
      amount: 0,
      orders: [],
      pendingRequest: null,
    };
  }

  const settings = await PlatformSettings.findOne({}).lean();
  const commissionPercent = resolveTailorCommissionPercent(settings);
  const identity = buildTailorPartnerIdentity(shop);
  const shopId = shop._id;
  const shopIdStr = shopId.toString();

  const orderMatch = {
    $or: [{ tailorShopId: shopId }, { "items.tailorShopId": shopId }],
  };

  const isShopItem = (item) => {
    const sid =
      item.tailorShopId?._id?.toString?.() ||
      item.tailorShopId?.toString?.() ||
      "";
    return sid === shopIdStr;
  };

  const getDesignFee = (order) => {
    if (order.items && order.items.length > 0) {
      return order.items
        .filter(isShopItem)
        .reduce((sum, item) => sum + (item.pricing?.designBase || 0), 0);
    }
    const orderShopId =
      order.tailorShopId?._id?.toString?.() ||
      order.tailorShopId?.toString?.() ||
      "";
    return orderShopId === shopIdStr ? order.pricing?.designBase || 0 : 0;
  };

  const getTailoringFee = (order) => {
    if (order.items && order.items.length > 0) {
      return order.items
        .filter(isShopItem)
        .reduce((sum, item) => sum + (item.pricing?.tailoringFee || 0), 0);
    }
    const orderShopId =
      order.tailorShopId?._id?.toString?.() ||
      order.tailorShopId?.toString?.() ||
      "";
    return orderShopId === shopIdStr ? order.pricing?.tailoringFee || 0 : 0;
  };

  const getTailorGross = (order) => getDesignFee(order) + getTailoringFee(order);

  const [orders, settlement, pendingRequest] = await Promise.all([
    CustomOrder.find(orderMatch).sort({ createdAt: -1 }).lean(),
    getTailorSettlement(shop),
    PartnerPayoutRequest.findOne({
      partnerKind: "tailor",
      partnerKey: identity.partnerKey,
      status: "pending",
    })
      .sort({ requestedAt: -1 })
      .lean(),
  ]);

  const unpaidOrders = [];
  for (const order of orders) {
    if (!isPayoutEligibleOrder(order)) continue;
    const net = splitMotdCommission(getTailorGross(order), commissionPercent)
      .net;
    if (net <= 0) continue;
    const orderId = String(order._id);
    const paid = Number(settlement.paidByOrderId.get(orderId)) || 0;
    const remaining = Math.max(0, Number((net - paid).toFixed(2)));
    if (remaining <= 0) continue;
    unpaidOrders.push({
      orderId,
      orderType: "custom",
      amount: remaining,
    });
  }

  const amount = Number(
    unpaidOrders
      .reduce((sum, line) => sum + (Number(line.amount) || 0), 0)
      .toFixed(2),
  );

  return {
    shop,
    identity,
    amount,
    orders: unpaidOrders,
    pendingRequest: pendingRequest
      ? {
          _id: pendingRequest._id,
          amount: pendingRequest.amount,
          status: pendingRequest.status,
          requestedAt: pendingRequest.requestedAt,
          orderCount: Array.isArray(pendingRequest.orders)
            ? pendingRequest.orders.length
            : 0,
        }
      : null,
  };
}
