const ADDON_SHIPMENT_TYPES = new Set(["addon_to_customer", "addon_to_motd"]);

export function asEntityId(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
    if (typeof value.toHexString === "function") return value.toHexString();
  }
  return String(value);
}

export function isStoreOwnedCustomItem(
  item,
  { ownerUserIdStr, shopIdStr, storeFabricIdSet },
) {
  const sid = asEntityId(item?.fabricStoreId);
  if (sid && (sid === ownerUserIdStr || (shopIdStr && sid === shopIdStr))) {
    return true;
  }
  const fabricId = asEntityId(item?.fabricId);
  return Boolean(fabricId && storeFabricIdSet?.has(fabricId));
}

export function isStoreOwnedCustomAddon(
  addon,
  { shopIdStr = "", storeAddonIdSet } = {},
) {
  const addonId = asEntityId(addon?.addonId);
  if (addonId && storeAddonIdSet instanceof Set && storeAddonIdSet.has(addonId)) {
    return true;
  }
  const addonShopId = asEntityId(addon?.fabricShopId);
  return Boolean(shopIdStr && addonShopId === shopIdStr);
}

export function orderHasFabricForThisStore(order, ctx) {
  if (String(order?.fabricSource || "") === "self") return false;

  if (Array.isArray(order?.items) && order.items.length > 0) {
    return order.items.some((item) => isStoreOwnedCustomItem(item, ctx));
  }

  return isStoreOwnedCustomItem(
    {
      fabricStoreId: order?.fabricStoreId,
      fabricId: order?.fabricId,
    },
    ctx,
  );
}

export function filterStoreCustomAddons(order, ctx) {
  return (order?.addons || []).filter((addon) =>
    isStoreOwnedCustomAddon(addon, ctx),
  );
}

export function buildFabricStoreCustomOrderMatch({
  ownerUserId,
  shop = null,
  storeFabricIdValues = [],
  storeAddonIdValues = [],
  /** When false, only fabric ownership matches (Custom Orders tab). */
  includeAddons = true,
} = {}) {
  const or = [
    { fabricStoreId: ownerUserId },
    { "items.fabricStoreId": ownerUserId },
  ];

  if (shop?._id) {
    or.push(
      { fabricStoreId: shop._id },
      { "items.fabricStoreId": shop._id },
    );
    if (includeAddons) {
      or.push(
        { "addons.fabricShopId": shop._id },
        { "addons.fabricShopId": String(shop._id) },
      );
    }
  }

  if (includeAddons && storeAddonIdValues.length) {
    or.push({ "addons.addonId": { $in: storeAddonIdValues } });
    const addonIdStrings = storeAddonIdValues.map((id) => String(id));
    if (addonIdStrings.some(Boolean)) {
      or.push({ "addons.addonId": { $in: addonIdStrings } });
    }
  }

  if (storeFabricIdValues.length) {
    or.push(
      { fabricId: { $in: storeFabricIdValues } },
      { "items.fabricId": { $in: storeFabricIdValues } },
    );
  }

  return { $or: or };
}

/** Match custom orders that reference this store's add-ons (any fabric store). */
export function buildFabricStoreAddonOnlyMatch({
  shop = null,
  storeAddonIdValues = [],
} = {}) {
  const or = [];

  if (shop?._id) {
    or.push(
      { "addons.fabricShopId": shop._id },
      { "addons.fabricShopId": String(shop._id) },
    );
  }

  if (storeAddonIdValues.length) {
    or.push({ "addons.addonId": { $in: storeAddonIdValues } });
    const addonIdStrings = storeAddonIdValues.map((id) => String(id));
    if (addonIdStrings.some(Boolean)) {
      or.push({ "addons.addonId": { $in: addonIdStrings } });
    }
  }

  if (!or.length) {
    return { _id: { $exists: false } };
  }

  return { $or: or };
}

function shipmentBelongsToAddonStore(shipment, { shopIdStr, storeAddonIdSet }) {
  const fromId = asEntityId(shipment?.from?.id);
  const shopOnShip = asEntityId(shipment?.fabricShopId);
  if (shopIdStr && (fromId === shopIdStr || shopOnShip === shopIdStr)) {
    return true;
  }
  const addonIds = Array.isArray(shipment?.addonIds)
    ? shipment.addonIds.map(asEntityId)
    : [];
  return addonIds.some(
    (id) => id && storeAddonIdSet instanceof Set && storeAddonIdSet.has(id),
  );
}

export function filterStoreCustomShipments(
  order,
  { hasFabric, hasAddons, shopIdStr, storeAddonIdSet },
) {
  const shipments = Array.isArray(order?.shipments) ? order.shipments : [];
  return shipments.filter((shipment) => {
    const type = String(shipment?.type || "");
    const isAddonLeg = ADDON_SHIPMENT_TYPES.has(type);
    if (isAddonLeg) {
      return (
        Boolean(hasAddons) &&
        shipmentBelongsToAddonStore(shipment, { shopIdStr, storeAddonIdSet })
      );
    }
    return Boolean(hasFabric);
  });
}

function stripOtherStoreFabricFields(view) {
  view.items = [];
  view.fabricId = null;
  view.fabricStoreId = null;
  view.fabricSnapshot = null;
  view.fabricMeters = 0;
  view.selectedCuts = [];
  view.leftoverMeters = 0;
  view.cutId = null;
  view.cutIds = [];
  view.cutSelections = [];
  view.cutSnapshot = null;
  view.cutSnapshots = [];
  view.designId = null;
  view.designSnapshot = null;
  view.tailorShopId = null;
  view.measurements = null;
  return view;
}

export function toFabricPortalCustomOrderView(order, ctx) {
  const hasFabric = orderHasFabricForThisStore(order, ctx);
  const storeAddons = filterStoreCustomAddons(order, ctx);
  const hasAddons = storeAddons.length > 0;
  // Custom Orders tab is for fabric fulfillment. Cross-store add-on-only
  // rows belong under Retail instead of Custom.
  if (!hasFabric) return null;

  const storeItems =
    Array.isArray(order.items) && order.items.length > 0
      ? order.items.filter((item) => isStoreOwnedCustomItem(item, ctx))
      : [];

  const fabricGross =
    storeItems.length > 0
      ? storeItems.reduce(
          (sum, item) => sum + (Number(item.pricing?.fabricCost) || 0),
          0,
        )
      : Number(order.pricing?.fabricCost) || 0;
  const addonsGross = storeAddons.reduce(
    (sum, addon) => sum + (Number(addon.price) || 0),
    0,
  );

  const view = {
    ...order,
    items: storeItems,
    addons: storeAddons,
    shipments: filterStoreCustomShipments(order, {
      hasFabric: true,
      hasAddons,
      shopIdStr: ctx.shopIdStr,
      storeAddonIdSet: ctx.storeAddonIdSet,
    }),
    storeScope: {
      hasFabric: true,
      hasAddons,
      canUpdateFabricStatus: true,
      fabricGross,
      addonsGross,
      gross: Number((fabricGross + addonsGross).toFixed(2)),
    },
  };

  if (storeItems.length > 0) {
    const first = storeItems[0];
    view.fabricId = first.fabricId ?? view.fabricId;
    view.fabricStoreId = first.fabricStoreId ?? view.fabricStoreId;
    view.fabricSnapshot = first.fabricSnapshot ?? view.fabricSnapshot;
    view.designId = first.designId ?? view.designId;
    view.designSnapshot = first.designSnapshot ?? view.designSnapshot;
    view.selectedCuts = first.selectedCuts || view.selectedCuts;
    view.leftoverMeters =
      storeItems.reduce(
        (sum, item) => sum + (Number(item.leftoverMeters) || 0),
        0,
      ) || view.leftoverMeters;
    view.fabricMeters =
      storeItems.reduce(
        (sum, item) => sum + (Number(item.fabricMeters) || 0),
        0,
      ) || view.fabricMeters;
  }

  return view;
}

/**
 * Project a custom order where this shop only supplies add-ons into a
 * retail-shaped row for the Retail Orders tab.
 */
export function toFabricPortalCustomAddonRetailView(order, ctx) {
  const hasFabric = orderHasFabricForThisStore(order, ctx);
  const storeAddons = filterStoreCustomAddons(order, ctx);
  if (hasFabric || storeAddons.length === 0) return null;

  const addonsGross = storeAddons.reduce(
    (sum, addon) => sum + (Number(addon.price) || 0),
    0,
  );
  const currency = order?.pricing?.currency || "AED";

  return {
    _id: order._id,
    orderType: "retail",
    sourceCustomOrderId: String(order._id),
    fromCustomOrderAddons: true,
    userId: order.userId,
    orderItems: storeAddons.map((addon) => ({
      productId: addon.addonId,
      kind: "addon",
      name: addon.name || "Add-on",
      nameAr: addon.nameAr || "",
      image: addon.thumbnailImage || "",
      size: "N/A",
      price: Number(addon.price) || 0,
      quantity: 1,
      fabricShopId: addon.fabricShopId || ctx.shopIdStr || null,
    })),
    status: order.status || "confirmed",
    totalPrice: Number(addonsGross.toFixed(2)),
    shippingPrice: 0,
    parcelCount: 0,
    perParcelFee: null,
    currency,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    shipments: filterStoreCustomShipments(order, {
      hasFabric: false,
      hasAddons: true,
      shopIdStr: ctx.shopIdStr,
      storeAddonIdSet: ctx.storeAddonIdSet,
    }),
  };
}

/** @deprecated strip helper kept for callers that still import it */
export { stripOtherStoreFabricFields };
