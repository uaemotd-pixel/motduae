/** Add MOTD commission on top of the partner's price (100 + 20% → 120). */
export function applyMotdCommission(netAmount, commissionPercent = 0) {
  const net = Number(Math.max(0, Number(netAmount) || 0).toFixed(2));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  if (percent <= 0) return net;
  return Number((net * (1 + percent / 100)).toFixed(2));
}

/** Reverse of applyMotdCommission: 120 at 20% → partner 100, MOTD 20. */
export function splitMotdCommission(grossAmount, commissionPercent = 0) {
  const gross = Number(Math.max(0, Number(grossAmount) || 0).toFixed(2));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  if (percent <= 0) {
    return { gross, commission: 0, net: gross, percent };
  }
  const net = Number((gross / (1 + percent / 100)).toFixed(2));
  const commission = Number((gross - net).toFixed(2));
  return { gross, commission, net, percent };
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

export function withCustomerReadyMadePrice(item, commissionPercent) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : { ...item };
  return {
    ...obj,
    finalSellingPriceAED: applyMotdCommission(
      obj.finalSellingPriceAED,
      commissionPercent,
    ),
  };
}

export function withCustomerAddonPrice(item, commissionPercent) {
  if (!item) return item;
  const obj = item.toObject ? item.toObject() : { ...item };
  return {
    ...obj,
    price: applyMotdCommission(obj.price, commissionPercent),
  };
}

export function sumCustomerAddonPrices(addons = [], commissionPercent = 0) {
  return Number(
    addons
      .reduce(
        (sum, addon) =>
          sum + applyMotdCommission(addon?.price, commissionPercent),
        0,
      )
      .toFixed(2),
  );
}
