import crypto from 'crypto';
import Design from '../models/Design.js';
import Fabric from '../models/Fabric.js';
import FabricShop from '../models/FabricShop.js';
import TailorShop from '../models/TailorShop.js';
import AddOn from '../models/AddOn.js';
import ReadyMadeProduct from '../models/ReadyMadeProduct.js';
import { normalizeShopPickupAddress } from '../utils/shopPickupAddress.js';
import { isBillableShipmentType } from '../models/schemas/shipmentSchemas.js';

export const PARCEL_TYPES = Object.freeze({
  FABRIC_TO_TAILOR: 'fabric_to_tailor',
  CUSTOMER_FABRIC_TO_TAILOR: 'customer_fabric_to_tailor',
  ADDON_TO_CUSTOMER: 'addon_to_customer',
  TAILOR_TO_CUSTOMER: 'tailor_to_customer',
  RETAIL_TO_CUSTOMER: 'retail_to_customer',
  TAILOR_TO_MOTD: 'tailor_to_motd',
  ADDON_TO_MOTD: 'addon_to_motd',
  RETAIL_TO_MOTD: 'retail_to_motd',
  MOTD_TO_CUSTOMER: 'motd_to_customer',
});

const PARTY_KINDS = Object.freeze({
  FABRIC_SHOP: 'fabric_shop',
  TAILOR_SHOP: 'tailor_shop',
  CUSTOMER: 'customer',
  MOTD: 'motd',
});

const MOTD_PARTY_ID = 'motd';

const roundMoney = (amount) => Number(Number(amount).toFixed(2));

function idStr(value) {
  if (value == null) return null;
  return String(value);
}

function party(kind, id = null, label = '') {
  return {
    kind,
    id: idStr(id),
    label: label || '',
  };
}

function motdParty(id = MOTD_PARTY_ID, label = 'MOTD') {
  return party(PARTY_KINDS.MOTD, id, label);
}

function parcelKey(type, fromId, toId) {
  return `${type}:${fromId || 'customer'}:${toId || 'customer'}`;
}

const DEFAULT_LABELS = {
  [PARCEL_TYPES.FABRIC_TO_TAILOR]: 'Fabric shop → Tailor',
  [PARCEL_TYPES.CUSTOMER_FABRIC_TO_TAILOR]: 'Your fabric → Tailor',
  [PARCEL_TYPES.ADDON_TO_CUSTOMER]: 'Add-on → You',
  [PARCEL_TYPES.TAILOR_TO_CUSTOMER]: 'Tailor → You',
  [PARCEL_TYPES.RETAIL_TO_CUSTOMER]: 'Shop → You',
  [PARCEL_TYPES.TAILOR_TO_MOTD]: 'Tailor → MOTD',
  [PARCEL_TYPES.ADDON_TO_MOTD]: 'Add-on → MOTD',
  [PARCEL_TYPES.RETAIL_TO_MOTD]: 'Shop → MOTD',
  [PARCEL_TYPES.MOTD_TO_CUSTOMER]: 'Delivery to you',
};

function addressOriginId(address) {
  const key = [address.line1, address.line2, address.city, address.emirate]
    .map((part) => String(part || '').trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|');
  return `addr_${crypto.createHash('sha1').update(key).digest('hex').slice(0, 12)}`;
}

function customerSafeOriginName(name, fallback = '') {
  const trimmed = String(name || '').trim();
  if (!trimmed || /^motd$/i.test(trimmed)) return fallback;
  return trimmed;
}

function originAlreadyAtMotd(origin) {
  return Boolean(origin?.alreadyAtMotd || origin?.partyKind === PARTY_KINDS.MOTD);
}

function toBreakdownLine(parcel) {
  return {
    key: parcel.key,
    type: parcel.type,
    label: parcel.label,
    fee: parcel.fee,
    billable: parcel.billable,
    from: parcel.from,
    to: parcel.to,
    pickupAddress: parcel.pickupAddress || null,
    fabricShopId: parcel.fabricShopId ?? null,
    tailorShopId: parcel.tailorShopId ?? null,
    addonIds: parcel.addonIds ?? [],
  };
}

/**
 * Build a normalized parcel plan from unique route keys.
 * Fee = billable parcel count × perParcelFee (packing hops are AED 0).
 * `parcels` is the full graph (including hidden *_to_motd hops).
 * `breakdown` is billed legs only so checkout never shows MOTD packing hops.
 */
export function buildParcelPlan(parcelMap, perParcelFee) {
  const fee = typeof perParcelFee === 'number' && perParcelFee >= 0 ? perParcelFee : 30;
  const parcels = Array.from(parcelMap.values()).map((entry) => {
    const billable =
      typeof entry.billable === 'boolean'
        ? entry.billable
        : isBillableShipmentType(entry.type);
    return {
      key: entry.key,
      type: entry.type,
      from: entry.from,
      to: entry.to,
      label: entry.label,
      billable,
      fee: billable ? roundMoney(fee) : 0,
      fabricShopId: entry.fabricShopId ?? null,
      tailorShopId: entry.tailorShopId ?? null,
      addonIds: entry.addonIds ?? [],
      itemIndexes: entry.itemIndexes ?? [],
      pickupAddress: entry.pickupAddress ?? null,
    };
  });

  applyLastMileCustomerLabels(parcels);

  const billedParcels = parcels.filter((parcel) => parcel.billable);
  const billableCount = billedParcels.length;
  const deliveryFee = roundMoney(billableCount * fee);

  return {
    parcels,
    deliveryFee,
    parcelCount: billableCount,
    perParcelFee: roundMoney(fee),
    breakdown: billedParcels.map(toBreakdownLine),
  };
}

function applyLastMileCustomerLabels(parcels) {
  const lastMiles = parcels.filter(
    (parcel) => parcel.type === PARCEL_TYPES.MOTD_TO_CUSTOMER,
  );
  const multiple = lastMiles.length > 1;

  for (const parcel of lastMiles) {
    const originName = customerSafeOriginName(parcel.from?.label);
    parcel.label =
      multiple && originName
        ? `Delivery to you (${originName})`
        : DEFAULT_LABELS[PARCEL_TYPES.MOTD_TO_CUSTOMER];
  }
}

function upsertParcel(map, {
  type,
  from,
  to,
  fabricShopId,
  tailorShopId,
  addonId,
  itemIndex,
  label,
  pickupAddress,
  billable,
}) {
  const key = parcelKey(type, from.id, to.id);
  const existing = map.get(key);
  if (existing) {
    if (addonId) existing.addonIds.push(idStr(addonId));
    if (typeof itemIndex === 'number') existing.itemIndexes.push(itemIndex);
    if (!existing.pickupAddress && pickupAddress) existing.pickupAddress = pickupAddress;
    if (typeof billable === 'boolean' && existing.billable == null) {
      existing.billable = billable;
    }
    return;
  }

  map.set(key, {
    key,
    type,
    from,
    to,
    label: label || DEFAULT_LABELS[type] || type,
    fabricShopId: fabricShopId ? idStr(fabricShopId) : null,
    tailorShopId: tailorShopId ? idStr(tailorShopId) : null,
    addonIds: addonId ? [idStr(addonId)] : [],
    itemIndexes: typeof itemIndex === 'number' ? [itemIndex] : [],
    pickupAddress: pickupAddress || null,
    billable: typeof billable === 'boolean' ? billable : isBillableShipmentType(type),
  });
}

/**
 * Hidden packing hop (unless origin is already MOTD) + billed last mile per origin.
 * Last-mile `from.id` is the billed origin so multiple MOTD → customer AWBs stay distinct.
 */
function upsertMotdInboundAndLastMile(map, {
  inboundType,
  alreadyAtMotd = false,
  originParty,
  originId,
  originName,
  customerParty,
  fabricShopId,
  tailorShopId,
  addonId,
  itemIndex,
  pickupAddress,
}) {
  const safeName = customerSafeOriginName(originName, originParty?.label || '');

  if (inboundType && !alreadyAtMotd) {
    upsertParcel(map, {
      type: inboundType,
      from: originParty,
      to: motdParty(),
      fabricShopId,
      tailorShopId,
      addonId,
      itemIndex,
      label: `${originName || originParty?.label || 'Shop'} → MOTD`,
      pickupAddress,
      billable: false,
    });
  }

  upsertParcel(map, {
    type: PARCEL_TYPES.MOTD_TO_CUSTOMER,
    from: motdParty(originId, safeName),
    to: customerParty,
    fabricShopId,
    tailorShopId,
    addonId,
    itemIndex,
    label: DEFAULT_LABELS[PARCEL_TYPES.MOTD_TO_CUSTOMER],
    pickupAddress: alreadyAtMotd ? pickupAddress : null,
    billable: true,
  });
}

async function resolveFabricShopForFabric(fabric) {
  if (!fabric) return null;

  if (fabric.fabricShopId) {
    const shop = await FabricShop.findById(fabric.fabricShopId).select('name nameAr');
    if (shop) {
      return { id: shop._id, name: shop.name || shop.nameAr || 'Fabric shop' };
    }
    return { id: fabric.fabricShopId, name: 'Fabric shop' };
  }

  if (fabric.listedByStore) {
    const shop = await FabricShop.findOne({ ownerId: fabric.listedByStore }).select(
      'name nameAr',
    );
    if (shop) {
      return { id: shop._id, name: shop.name || shop.nameAr || 'Fabric shop' };
    }
  }

  // Fallback: still bill a distinct origin for this fabric listing
  return {
    id: `fabric:${fabric._id}`,
    name: fabric.name || 'Fabric shop',
  };
}

async function resolveFabricShopById(fabricShopId) {
  if (!fabricShopId) return null;
  const shop = await FabricShop.findById(fabricShopId).select('name nameAr');
  if (!shop) {
    return { id: fabricShopId, name: 'Shop' };
  }
  return { id: shop._id, name: shop.name || shop.nameAr || 'Shop' };
}

/**
 * Plan parcels for a custom order draft / create payload.
 *
 * Billed: fabric inbounds + one last mile per tailor and per addon origin.
 * Hidden: tailor → MOTD and addon → MOTD (skipped when the listing is already at MOTD).
 *
 * @param {object} params
 * @param {'storefront'|'self'} params.fabricSource
 * @param {Array<{ designId: string, fabricId?: string|null, fabricMeters?: number }>} params.items
 * @param {string[]} [params.addonIds]
 * @param {number} [params.perParcelFee]
 * @returns {Promise<object>} parcel plan
 */
export async function planCustomOrderParcels({
  fabricSource,
  items,
  addonIds = [],
  perParcelFee,
}) {
  if (!Array.isArray(items) || items.length === 0) {
    return buildParcelPlan(new Map(), perParcelFee ?? 30);
  }

  const parcelMap = new Map();
  const tailorCache = new Map();
  const customerParty = party(PARTY_KINDS.CUSTOMER, null, 'Customer');

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const design = await Design.findById(item.designId).select('tailorShopId name');
    if (!design?.tailorShopId) {
      continue;
    }

    const tailorShopId = idStr(design.tailorShopId);
    let tailorMeta = tailorCache.get(tailorShopId);
    if (!tailorMeta) {
      const shop = await TailorShop.findById(design.tailorShopId).select('name nameAr');
      tailorMeta = {
        id: design.tailorShopId,
        name: shop?.name || shop?.nameAr || 'Tailor',
      };
      tailorCache.set(tailorShopId, tailorMeta);
    }

    const tailorParty = party(PARTY_KINDS.TAILOR_SHOP, tailorMeta.id, tailorMeta.name);

    if (fabricSource === 'self') {
      upsertParcel(parcelMap, {
        type: PARCEL_TYPES.CUSTOMER_FABRIC_TO_TAILOR,
        from: customerParty,
        to: tailorParty,
        tailorShopId: tailorMeta.id,
        itemIndex: index,
        label: `Your fabric → ${tailorMeta.name}`,
        billable: true,
      });
    } else if (fabricSource === 'storefront' && item.fabricId) {
      const fabric = await Fabric.findById(item.fabricId).select(
        'fabricShopId listedByStore name',
      );
      const fabricShop = await resolveFabricShopForFabric(fabric);
      if (fabricShop) {
        upsertParcel(parcelMap, {
          type: PARCEL_TYPES.FABRIC_TO_TAILOR,
          from: party(PARTY_KINDS.FABRIC_SHOP, fabricShop.id, fabricShop.name),
          to: tailorParty,
          fabricShopId: String(fabricShop.id).startsWith('fabric:')
            ? null
            : fabricShop.id,
          tailorShopId: tailorMeta.id,
          itemIndex: index,
          label: `${fabricShop.name} → ${tailorMeta.name}`,
          billable: true,
        });
      }
    }

    upsertMotdInboundAndLastMile(parcelMap, {
      inboundType: PARCEL_TYPES.TAILOR_TO_MOTD,
      originParty: tailorParty,
      originId: tailorShopId,
      originName: tailorMeta.name,
      customerParty,
      tailorShopId: tailorMeta.id,
      itemIndex: index,
    });
  }

  if (Array.isArray(addonIds) && addonIds.length > 0) {
    const addons = await AddOn.find({ _id: { $in: addonIds }, isActive: true }).select(
      'fabricShopId name ownerName pickupAddress',
    );

    for (const addon of addons) {
      const origin = await resolveAddonOrigin(addon);
      const alreadyAtMotd = originAlreadyAtMotd(origin);

      upsertMotdInboundAndLastMile(parcelMap, {
        inboundType: PARCEL_TYPES.ADDON_TO_MOTD,
        alreadyAtMotd,
        originParty: party(origin.partyKind, origin.shopId, origin.shopName),
        originId: origin.shopId,
        originName: origin.shopName,
        customerParty,
        fabricShopId: origin.fabricShopId,
        addonId: addon._id,
        pickupAddress: origin.pickupAddress,
      });
    }
  }

  return buildParcelPlan(parcelMap, perParcelFee);
}

/**
 * MOTD warehouse origin when the listing has a complete pickupAddress;
 * otherwise the linked fabric shop (legacy).
 */
async function resolveAddonOrigin(addon) {
  const productPickup = normalizeShopPickupAddress(addon.pickupAddress);
  if (productPickup) {
    return {
      fabricShopId: addon.fabricShopId || null,
      shopId: addressOriginId(productPickup),
      shopName: customerSafeOriginName(
        addon.ownerName || addon.name,
        addon.name || 'Add-on',
      ),
      partyKind: PARTY_KINDS.MOTD,
      alreadyAtMotd: true,
      pickupAddress: productPickup,
    };
  }

  const shop = addon.fabricShopId
    ? await resolveFabricShopById(addon.fabricShopId)
    : { id: `addon:${addon._id}`, name: addon.name || 'Add-on' };
  return {
    fabricShopId: addon.fabricShopId || null,
    shopId: shop.id,
    shopName: shop.name,
    partyKind: PARTY_KINDS.FABRIC_SHOP,
    alreadyAtMotd: false,
    pickupAddress: null,
  };
}

/**
 * Resolve origin for a retail cart line (ready-made, addon, or fabric).
 * Ready-made / add-on: listing pickupAddress (MOTD warehouse) wins; else linked shop.
 */
async function resolveRetailLineShop(productId) {
  let product = await ReadyMadeProduct.findById(productId).select(
    'fabricShopId name nameAr ownerName pickupAddress',
  );
  if (product) {
    const productPickup = normalizeShopPickupAddress(product.pickupAddress);
    if (productPickup) {
      return {
        fabricShopId: product.fabricShopId || null,
        shopId: addressOriginId(productPickup),
        shopName: customerSafeOriginName(
          product.ownerName || product.name,
          product.name || 'Shop',
        ),
        partyKind: PARTY_KINDS.MOTD,
        alreadyAtMotd: true,
        pickupAddress: productPickup,
      };
    }

    const shop = product.fabricShopId
      ? await resolveFabricShopById(product.fabricShopId)
      : { id: `product:${product._id}`, name: product.name || 'Shop' };
    return {
      fabricShopId: product.fabricShopId || null,
      shopId: shop.id,
      shopName: shop.name,
      partyKind: PARTY_KINDS.FABRIC_SHOP,
      alreadyAtMotd: false,
      pickupAddress: null,
    };
  }

  product = await AddOn.findById(productId).select(
    'fabricShopId name nameAr ownerName pickupAddress',
  );
  if (product) {
    return resolveAddonOrigin(product);
  }

  product = await Fabric.findById(productId).select(
    'fabricShopId listedByStore name nameAr',
  );
  if (product) {
    const fabricShop = await resolveFabricShopForFabric(product);
    const shopName = fabricShop?.name || product.name || 'Shop';
    return {
      fabricShopId:
        fabricShop && !String(fabricShop.id).startsWith('fabric:')
          ? fabricShop.id
          : product.fabricShopId || null,
      shopId: fabricShop?.id || `fabric:${product._id}`,
      shopName,
      partyKind: PARTY_KINDS.FABRIC_SHOP,
      alreadyAtMotd: false,
      pickupAddress: null,
    };
  }

  return null;
}

/**
 * Plan retail parcels: hidden shop → MOTD (skipped when already at MOTD)
 * plus one billed MOTD → customer last mile per unique pickup origin.
 *
 * @param {object} params
 * @param {Array<{ productId: string }>} params.items
 * @param {number} [params.perParcelFee]
 */
export async function planRetailOrderParcels({ items, perParcelFee }) {
  const parcelMap = new Map();
  const customerParty = party(PARTY_KINDS.CUSTOMER, null, 'Customer');

  if (!Array.isArray(items) || items.length === 0) {
    return buildParcelPlan(parcelMap, perParcelFee ?? 30);
  }

  for (let index = 0; index < items.length; index += 1) {
    const line = items[index];
    const origin = await resolveRetailLineShop(line.productId);
    if (!origin) continue;

    const alreadyAtMotd = originAlreadyAtMotd(origin);

    upsertMotdInboundAndLastMile(parcelMap, {
      inboundType: PARCEL_TYPES.RETAIL_TO_MOTD,
      alreadyAtMotd,
      originParty: party(
        origin.partyKind || PARTY_KINDS.FABRIC_SHOP,
        origin.shopId,
        origin.shopName,
      ),
      originId: origin.shopId,
      originName: origin.shopName,
      customerParty,
      fabricShopId: origin.fabricShopId,
      itemIndex: index,
      pickupAddress: origin.pickupAddress || null,
    });
  }

  return buildParcelPlan(parcelMap, perParcelFee);
}
