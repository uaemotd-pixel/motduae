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
} = {}) {
  const or = [
    { fabricStoreId: ownerUserId },
    { "items.fabricStoreId": ownerUserId },
  ];

  if (shop?._id) {
    or.push(
      { fabricStoreId: shop._id },
      { "items.fabricStoreId": shop._id },
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

  if (storeFabricIdValues.length) {
    or.push(
      { fabricId: { $in: storeFabricIdValues } },
      { "items.fabricId": { $in: storeFabricIdValues } },
    );
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
  if (!hasFabric && !hasAddons) return null;

  const storeItems = hasFabric
    ? Array.isArray(order.items) && order.items.length > 0
      ? order.items.filter((item) => isStoreOwnedCustomItem(item, ctx))
      : []
    : [];

  const fabricGross = hasFabric
    ? storeItems.length > 0
      ? storeItems.reduce(
          (sum, item) => sum + (Number(item.pricing?.fabricCost) || 0),
          0,
        )
      : Number(order.pricing?.fabricCost) || 0
    : 0;
  const addonsGross = storeAddons.reduce(
    (sum, addon) => sum + (Number(addon.price) || 0),
    0,
  );

  const view = {
    ...order,
    items: hasFabric ? storeItems : [],
    addons: storeAddons,
    shipments: filterStoreCustomShipments(order, {
      hasFabric,
      hasAddons,
      shopIdStr: ctx.shopIdStr,
      storeAddonIdSet: ctx.storeAddonIdSet,
    }),
    storeScope: {
      hasFabric,
      hasAddons,
      canUpdateFabricStatus: hasFabric,
      fabricGross,
      addonsGross,
      gross: Number((fabricGross + addonsGross).toFixed(2)),
    },
  };

  if (!hasFabric) {
    return stripOtherStoreFabricFields(view);
  }

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
