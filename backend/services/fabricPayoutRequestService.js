import FabricShop from "../models/FabricShop.js";
import Fabric from "../models/Fabric.js";
import CustomOrder from "../models/CustomOrder.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import RetailOrder from "../models/RetailOrder.js";
import PlatformSettings from "../models/PlatformSettings.js";
import PartnerPayout from "../models/PartnerPayout.js";
import PartnerPayoutCredit from "../models/PartnerPayoutCredit.js";
import PartnerPayoutRequest from "../models/PartnerPayoutRequest.js";
import { splitMotdCommission } from "./pricingService.js";
import {
  buildFabricStoreCustomOrderMatch,
  isStoreOwnedCustomAddon,
  isStoreOwnedCustomItem,
} from "./fabricPortalCustomOrderScope.js";

const DEFAULT_FABRIC_COMMISSION_PERCENT = 15;

export function normalizePartnerLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function resolveFabricCommissionPercent(settings) {
  if (
    typeof settings?.motdCommissionFromFabricStore === "number" &&
    Number.isFinite(settings.motdCommissionFromFabricStore)
  ) {
    return Math.min(100, Math.max(0, settings.motdCommissionFromFabricStore));
  }
  return DEFAULT_FABRIC_COMMISSION_PERCENT;
}

function asId(value) {
  if (value == null) return "";
  if (typeof value === "object" && value._id != null) return String(value._id);
  return String(value);
}

export { isStoreOwnedCustomItem };

export function sumStoreCustomAddOnsFee(order, storeAddonIdSet, shopIdStr = "") {
  return (order.addons || []).reduce((sum, addon) => {
    if (
      !isStoreOwnedCustomAddon(addon, {
        storeAddonIdSet,
        shopIdStr,
      })
    ) {
      return sum;
    }
    return sum + (Number(addon.price) || 0);
  }, 0);
}

/** Fabric lines + this store's add-ons on a custom order (gross, before commission). */
export function sumStoreCustomOrderGross(order, ctx) {
  const { ownerUserIdStr, shopIdStr, storeFabricIdSet, storeAddonIdSet } = ctx;
  let fabricFee = 0;
  if (String(order.fabricSource || "") !== "self") {
    if (order.items && order.items.length > 0) {
      fabricFee = order.items
        .filter((item) =>
          isStoreOwnedCustomItem(item, {
            ownerUserIdStr,
            shopIdStr,
            storeFabricIdSet,
          }),
        )
        .reduce(
          (sum, item) => sum + (Number(item.pricing?.fabricCost) || 0),
          0,
        );
    } else {
      const rootSid = asId(order.fabricStoreId);
      const rootFabricId = asId(order.fabricId);
      if (
        rootSid === ownerUserIdStr ||
        (shopIdStr && rootSid === shopIdStr) ||
        (rootFabricId && storeFabricIdSet.has(rootFabricId))
      ) {
        fabricFee = Number(order.pricing?.fabricCost) || 0;
      }
    }
  }
  return fabricFee + sumStoreCustomAddOnsFee(order, storeAddonIdSet, shopIdStr);
}

export function buildFabricPartnerIdentity(shop, ownerUserId) {
  const ownerIdStr = String(ownerUserId);
  const shopIdStr = shop?._id ? String(shop._id) : "";
  const nameNorm = normalizePartnerLabel(shop?.name);
  const partnerKey = nameNorm
    ? `fabric:name:${nameNorm}`
    : `fabric:${shopIdStr || ownerIdStr}`;
  return {
    partnerKey,
    partnerKind: "fabric",
    partnerId: shopIdStr || ownerIdStr,
    partnerName: String(shop?.name || "Fabric store").trim() || "Fabric store",
    payeeName: String(shop?.name || "").trim(),
  };
}

async function getFabricSettlement(shop, ownerUserId) {
  const ownerIdStr = String(ownerUserId);
  const partnerIds = [ownerIdStr];
  const keys = [`fabric:${ownerIdStr}`];

  if (shop) {
    const shopId = String(shop._id);
    partnerIds.push(shopId);
    keys.push(`fabric:${shopId}`);
    const nameNorm = normalizePartnerLabel(shop.name);
    if (nameNorm) keys.push(`fabric:name:${nameNorm}`);
  }

  const match = {
    partnerKind: "fabric",
    $or: [{ partnerId: { $in: partnerIds } }, { partnerKey: { $in: keys } }],
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
 * Compute unpaid fabric order lines for a store owner (all-time).
 * Used by payout request create + dashboard summary.
 */
export async function computeFabricUnpaidBreakdown(ownerUserId) {
  const shop = await FabricShop.findOne({ ownerId: ownerUserId });
  const settings = await PlatformSettings.findOne({}).lean();
  const commissionPercent = resolveFabricCommissionPercent(settings);
  const identity = buildFabricPartnerIdentity(shop, ownerUserId);

  const ownerUserIdStr = String(ownerUserId);
  const shopIdStr = shop?._id?.toString?.() || "";

  const [storeFabricIds, storeProducts, storeAddonIds] = await Promise.all([
    Fabric.find({
      $or: [
        { listedByStore: ownerUserId },
        ...(shop ? [{ fabricShopId: shop._id }] : []),
      ],
    }).select("_id"),
    shop
      ? ReadyMadeProduct.find({
          $or: [
            { fabricShopId: shop._id, ownerName: { $ne: "MOTD Admin" } },
            { ownerName: shop.name },
          ],
        }).select("_id")
      : Promise.resolve([]),
    shop
      ? AddOn.find({
          $or: [
            { fabricShopId: shop._id, ownerName: { $ne: "MOTD Admin" } },
            { ownerName: shop.name },
          ],
        }).select("_id")
      : Promise.resolve([]),
  ]);

  const storeFabricIdSet = new Set(
    storeFabricIds.map((f) => f._id.toString()),
  );
  const storeProductIdSet = new Set(
    storeProducts.map((p) => p._id.toString()),
  );
  const storeAddonIdValues = storeAddonIds.map((a) => a._id);
  const storeAddonIdSet = new Set(
    storeAddonIdValues.map((id) => id.toString()),
  );
  const storeRetailItemIds = [
    ...storeFabricIds.map((f) => f._id),
    ...storeProducts.map((p) => p._id),
    ...storeAddonIdValues,
  ];

  const orderMatch = buildFabricStoreCustomOrderMatch({
    ownerUserId,
    shop,
    storeFabricIdValues: storeFabricIds.map((f) => f._id),
    storeAddonIdValues,
  });

  const storeGrossCtx = {
    ownerUserIdStr,
    shopIdStr,
    storeFabricIdSet,
    storeAddonIdSet,
  };
  const sumCustomFabricFee = (order) =>
    sumStoreCustomOrderGross(order, storeGrossCtx);

  const isStoreRetailItem = (item) => {
    const pid =
      item.productId?._id?.toString?.() || item.productId?.toString?.() || "";
    if (!pid) return false;
    if (
      (item.kind === "fabric" || item.cutId || item.size === "Per Meter") &&
      storeFabricIdSet.has(pid)
    )
      return true;
    if (storeProductIdSet.has(pid) || storeAddonIdSet.has(pid)) return true;
    return false;
  };

  const sumRetailFabricFee = (order) =>
    (order.orderItems || [])
      .filter(isStoreRetailItem)
      .reduce(
        (sum, item) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0,
      );

  const [customOrders, retailOrders, settlement, pendingRequest] =
    await Promise.all([
      CustomOrder.find(orderMatch).sort({ createdAt: -1 }).lean(),
      storeRetailItemIds.length
        ? RetailOrder.find({
            "orderItems.productId": { $in: storeRetailItemIds },
          })
            .sort({ createdAt: -1 })
            .lean()
        : Promise.resolve([]),
      getFabricSettlement(shop, ownerUserId),
      PartnerPayoutRequest.findOne({
        partnerKind: "fabric",
        partnerKey: identity.partnerKey,
        status: "pending",
      })
        .sort({ requestedAt: -1 })
        .lean(),
    ]);

  const unpaidOrders = [];

  const pushUnpaid = (order, gross, orderType) => {
    if (!isPayoutEligibleOrder(order)) return;
    const net = splitMotdCommission(gross, commissionPercent).net;
    if (net <= 0) return;
    const orderId = String(order._id);
    const paid = Number(settlement.paidByOrderId.get(orderId)) || 0;
    const remaining = Math.max(0, Number((net - paid).toFixed(2)));
    if (remaining <= 0) return;
    unpaidOrders.push({
      orderId,
      orderType,
      amount: remaining,
    });
  };

  for (const order of customOrders) {
    pushUnpaid(order, sumCustomFabricFee(order), "custom");
  }
  for (const order of retailOrders) {
    pushUnpaid(order, sumRetailFabricFee(order), "retail");
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
