import { roundFils, splitCommissionFils } from "../../utils/fils.js";
import {
  SHIPPING_PARTNER_ID,
  SHIPPING_PARTNER_NAME,
} from "./constants.js";
import { PartnerPayoutError } from "./errors.js";
import { earningIdempotencyKey } from "./keys.js";

export function asEntityId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
    if (typeof value.toHexString === "function") return value.toHexString();
  }
  return String(value);
}

export function sumDeliveryBreakdownFees(breakdown) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;
  const sum = breakdown.reduce((total, line) => {
    if (line?.billable === false) return total;
    return total + (Number(line?.fee) || 0);
  }, 0);
  return Number(sum);
}

export function sumOrderShippingGross(order, { retail = false } = {}) {
  const breakdown = retail
    ? order?.deliveryBreakdown
    : order?.pricing?.deliveryBreakdown;
  const fromBreakdown = sumDeliveryBreakdownFees(breakdown);
  if (fromBreakdown != null) return fromBreakdown;

  const parcelCount = Number(
    retail ? order?.parcelCount : order?.pricing?.parcelCount,
  );
  const perParcel = Number(
    retail ? order?.perParcelFee : order?.pricing?.perParcelFee,
  );
  if (
    Number.isFinite(parcelCount) &&
    parcelCount > 0 &&
    Number.isFinite(perParcel) &&
    perParcel >= 0
  ) {
    return parcelCount * perParcel;
  }

  if (retail) {
    return Number(order?.shippingPrice) || 0;
  }
  return Number(order?.pricing?.deliveryFee) || 0;
}

/**
 * Tailor gross is the customer-facing sale (ex-VAT) stored on the order.
 * After MOTD markup, designBase is already partner-net × (1 + %). Freeze
 * reverses that markup so the partner net matches what they entered.
 */
export function tailorGrossByShop(order) {
  const byShop = new Map();
  const add = (shopId, aed, nameHint = "") => {
    const id = asEntityId(shopId);
    if (!id) return;
    const prev = byShop.get(id) || { shopId: id, grossAed: 0, nameHint };
    prev.grossAed += Number(aed) || 0;
    if (!prev.nameHint && nameHint) prev.nameHint = nameHint;
    byShop.set(id, prev);
  };

  if (Array.isArray(order?.items) && order.items.length > 0) {
    for (const item of order.items) {
      const gross =
        (Number(item?.pricing?.designBase) || 0) +
        (Number(item?.pricing?.tailoringFee) || 0);
      add(item?.tailorShopId, gross);
    }
    return byShop;
  }

  const rootShop = order?.tailorShopId;
  const gross =
    (Number(order?.pricing?.designBase) || 0) +
    (Number(order?.pricing?.tailoringFee) || 0);
  add(rootShop, gross);
  return byShop;
}

function isMotdCatalogOwner(ownerName) {
  return String(ownerName || "").trim() === "MOTD Admin";
}

export function resolveFabricShopId(rawId, catalogs = {}) {
  const id = asEntityId(rawId);
  if (!id) return "";
  const { shopsById, shopsByOwnerId } = catalogs;
  if (shopsById instanceof Map && shopsById.has(id)) return id;
  if (shopsByOwnerId instanceof Map && shopsByOwnerId.has(id)) {
    return asEntityId(shopsByOwnerId.get(id)?._id);
  }
  return "";
}

function addFabricGross(byShop, shopId, aed, catalogs, nameHint = "") {
  const resolved = resolveFabricShopId(shopId, catalogs);
  if (!resolved) return;
  const shop =
    catalogs.shopsById instanceof Map ? catalogs.shopsById.get(resolved) : null;
  const prev = byShop.get(resolved) || {
    shopId: resolved,
    grossAed: 0,
    nameHint: nameHint || shop?.name || "",
  };
  prev.grossAed += Number(aed) || 0;
  if (!prev.nameHint) {
    prev.nameHint = nameHint || shop?.name || "";
  }
  byShop.set(resolved, prev);
}

/**
 * Shop-scoped fabric + add-on gross for a custom or retail order.
 * Lines are customer-facing sale amounts (partner catalog prices already
 * include MOTD commission). Skips customer-supplied fabric (`fabricSource =
 * self`) and MOTD catalog lines.
 */
export function fabricGrossByShop(order, orderType, catalogs = {}) {
  const byShop = new Map();
  const { fabricsById } = catalogs;

  if (orderType === "retail") {
    for (const item of order?.orderItems || []) {
      if (isMotdCatalogOwner(item?.ownerName)) continue;
      const shopId = asEntityId(item?.fabricShopId);
      if (!shopId) continue;
      const lineGross =
        (Number(item?.price) || 0) * (Number(item?.quantity) || 0);
      addFabricGross(byShop, shopId, lineGross, catalogs, item?.shopName || "");
    }
    return byShop;
  }

  const isSelf = String(order?.fabricSource || "") === "self";
  if (!isSelf) {
    if (Array.isArray(order?.items) && order.items.length > 0) {
      for (const item of order.items) {
        const fabricId = asEntityId(item?.fabricId);
        const fabric =
          fabricId && fabricsById instanceof Map
            ? fabricsById.get(fabricId)
            : null;
        const shopId =
          item?.fabricStoreId ||
          fabric?.fabricShopId ||
          fabric?.listedByStore;
        addFabricGross(
          byShop,
          shopId,
          Number(item?.pricing?.fabricCost) || 0,
          catalogs,
        );
      }
    } else {
      const fabricId = asEntityId(order?.fabricId);
      const fabric =
        fabricId && fabricsById instanceof Map
          ? fabricsById.get(fabricId)
          : null;
      const shopId =
        order?.fabricStoreId || fabric?.fabricShopId || fabric?.listedByStore;
      addFabricGross(
        byShop,
        shopId,
        Number(order?.pricing?.fabricCost) || 0,
        catalogs,
      );
    }
  }

  for (const addon of order?.addons || order?.addOns || []) {
    if (isMotdCatalogOwner(addon?.ownerName)) continue;
    const shopId = addon?.fabricShopId || addon?.fabricShop?._id;
    addFabricGross(byShop, shopId, Number(addon?.price) || 0, catalogs);
  }

  return byShop;
}

function earningMoney(split) {
  return {
    grossFils: split.grossFils,
    commissionPercent: split.percent,
    commissionFils: split.commissionFils,
    netFils: split.netFils,
    remainingFils: split.netFils,
  };
}

export function buildEarningDraftsFromOrder({
  order,
  orderType,
  percents,
  catalogs,
  provider = "",
  providerPaymentId = "",
}) {
  const orderId = asEntityId(order?._id);
  if (!orderId) return [];

  const delivered = String(order?.status || "").toLowerCase() === "delivered";
  const status = delivered ? "available" : "pending";
  const availableAt = delivered
    ? order?.deliveredAt
      ? new Date(order.deliveredAt)
      : new Date()
    : null;

  const drafts = [];
  const tailorPercent = Number(percents?.tailor) || 0;
  const fabricPercent = Number(percents?.fabric) || 0;

  if (orderType === "custom") {
    for (const row of tailorGrossByShop(order).values()) {
      const shop =
        catalogs?.tailorShopsById instanceof Map
          ? catalogs.tailorShopsById.get(row.shopId)
          : null;
      const split = splitCommissionFils(row.grossAed, tailorPercent);
      if (split.netFils <= 0) continue;
      drafts.push({
        orderId,
        orderType: "custom",
        partnerId: row.shopId,
        partnerKind: "tailor",
        partnerName:
          String(shop?.name || row.nameHint || "Tailor shop").trim() ||
          "Tailor shop",
        component: "tailor",
        ...earningMoney(split),
        status,
        availableAt,
        provider,
        providerPaymentId,
        idempotencyKey: earningIdempotencyKey(orderId, row.shopId, "tailor"),
      });
    }
  }

  for (const row of fabricGrossByShop(order, orderType, catalogs).values()) {
    const shop =
      catalogs?.shopsById instanceof Map
        ? catalogs.shopsById.get(row.shopId)
        : null;
    const split = splitCommissionFils(row.grossAed, fabricPercent);
    if (split.netFils <= 0) continue;
    drafts.push({
      orderId,
      orderType,
      partnerId: row.shopId,
      partnerKind: "fabric",
      partnerName:
        String(shop?.name || row.nameHint || "Fabric store").trim() ||
        "Fabric store",
      component: "fabric",
      ...earningMoney(split),
      status,
      availableAt,
      provider,
      providerPaymentId,
      idempotencyKey: earningIdempotencyKey(orderId, row.shopId, "fabric"),
    });
  }

  const shippingAed = sumOrderShippingGross(order, {
    retail: orderType === "retail",
  });
  const shippingSplit = splitCommissionFils(shippingAed, 0);
  if (shippingSplit.netFils > 0) {
    drafts.push({
      orderId,
      orderType,
      partnerId: SHIPPING_PARTNER_ID,
      partnerKind: "shipping",
      partnerName: SHIPPING_PARTNER_NAME,
      component: "shipping",
      ...earningMoney(shippingSplit),
      status,
      availableAt,
      provider,
      providerPaymentId,
      idempotencyKey: earningIdempotencyKey(
        orderId,
        SHIPPING_PARTNER_ID,
        "shipping",
      ),
    });
  }

  return drafts;
}

/**
 * FIFO-fill oldest available earnings first. Last included earning may be partial.
 * `budgetFils` must be a positive integer not greater than sum(remaining).
 */
export function previewFifo(earnings, budgetFils) {
  const budget = Math.trunc(Number(budgetFils));
  if (!Number.isFinite(budget) || budget <= 0) {
    throw new PartnerPayoutError(
      "Enter an amount greater than zero.",
      400,
      "INVALID_AMOUNT",
    );
  }

  const sorted = [...(earnings || [])].sort((a, b) => {
    const at = new Date(a.availableAt || a.createdAt || 0).getTime();
    const bt = new Date(b.availableAt || b.createdAt || 0).getTime();
    if (at !== bt) return at - bt;
    return String(a._id || "").localeCompare(String(b._id || ""));
  });

  const availableFils = sorted.reduce(
    (sum, row) => sum + (Number(row.remainingFils) || 0),
    0,
  );
  if (budget > availableFils) {
    throw new PartnerPayoutError(
      "That amount is more than what is ready to pay.",
      400,
      "OVER_BUDGET",
    );
  }

  const lines = [];
  let left = budget;
  for (const earning of sorted) {
    if (left <= 0) break;
    const remaining = Number(earning.remainingFils) || 0;
    if (remaining <= 0) continue;
    const take = Math.min(remaining, left);
    lines.push({
      earningId: earning._id,
      orderId: earning.orderId,
      orderType: earning.orderType,
      partnerId: earning.partnerId,
      amountFils: take,
      commissionPercent: Number(earning.commissionPercent) || 0,
      grossFils: Number(earning.grossFils) || 0,
      commissionFils: Number(earning.commissionFils) || 0,
      remainingAfterFils: remaining - take,
    });
    left -= take;
  }

  if (left !== 0 || lines.length === 0) {
    throw new PartnerPayoutError(
      "Unable to allocate this amount across delivered orders. Please try again.",
      400,
      "ALLOCATION_FAILED",
    );
  }

  const sumLines = lines.reduce((sum, line) => sum + line.amountFils, 0);
  if (sumLines !== budget) {
    throw new PartnerPayoutError(
      "Something went wrong sending this payment. Try again.",
      500,
      "ALLOCATION_MISMATCH",
    );
  }

  return { amountFils: budget, availableFils, lines };
}

export { roundFils, splitCommissionFils };
