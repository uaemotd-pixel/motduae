/** Convert a partner net price into the customer-facing gross (commission % of sale). */
export function applyMotdCommission(netAmount, commissionPercent = 0) {
  const net = Number(Math.max(0, Number(netAmount) || 0).toFixed(2));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  if (percent <= 0 || percent >= 100) return net;
  return Number((net / (1 - percent / 100)).toFixed(2));
}

export function isPartnerOwnedFabric(fabric) {
  if (!fabric?.fabricShopId) return false;
  if (typeof fabric.fabricShopId === "object") {
    return Boolean(fabric.fabricShopId._id || fabric.fabricShopId);
  }
  return true;
}

export function withCustomerDesignPrice(item, commissionPercent) {
  if (!item) return item;
  return {
    ...item,
    basePrice: applyMotdCommission(item.basePrice, commissionPercent),
  };
}

export function withCustomerFabricPrices(fabric, commissionPercent) {
  if (!fabric || !isPartnerOwnedFabric(fabric)) return fabric;
  const cuts = Array.isArray(fabric.cuts)
    ? fabric.cuts.map((entry) => ({
        ...entry,
        price: applyMotdCommission(entry.price, commissionPercent),
      }))
    : fabric.cuts;
  return {
    ...fabric,
    cuts,
    pricePerMeter: applyMotdCommission(fabric.pricePerMeter, commissionPercent),
  };
}

export function customerPriceForPartnerItem(
  netAmount,
  item,
  commissionPercent = 0,
) {
  const net = Number(Math.max(0, Number(netAmount) || 0).toFixed(2));
  if (!isPartnerOwnedFabric(item)) return net;
  return applyMotdCommission(net, commissionPercent);
}

export function withCustomerReadyMadePrice(item, commissionPercent) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : { ...item };
  return {
    ...obj,
    finalSellingPriceAED: customerPriceForPartnerItem(
      obj.finalSellingPriceAED,
      obj,
      commissionPercent,
    ),
  };
}

export function withCustomerAddonPrice(item, commissionPercent) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : { ...item };
  return {
    ...obj,
    price: customerPriceForPartnerItem(obj.price, obj, commissionPercent),
  };
}

export function sumCustomerAddonPrices(addons = [], commissionPercent = 0) {
  return Number(
    addons
      .reduce(
        (sum, addon) =>
          sum + customerPriceForPartnerItem(addon?.price, addon, commissionPercent),
        0,
      )
      .toFixed(2),
  );
}
