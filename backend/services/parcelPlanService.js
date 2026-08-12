import Design from '../models/Design.js';
import Fabric from '../models/Fabric.js';
import FabricShop from '../models/FabricShop.js';
import TailorShop from '../models/TailorShop.js';
import AddOn from '../models/AddOn.js';
import ReadyMadeProduct from '../models/ReadyMadeProduct.js';

export const PARCEL_TYPES = Object.freeze({
  FABRIC_TO_TAILOR: 'fabric_to_tailor',
  CUSTOMER_FABRIC_TO_TAILOR: 'customer_fabric_to_tailor',
  ADDON_TO_CUSTOMER: 'addon_to_customer',
  TAILOR_TO_CUSTOMER: 'tailor_to_customer',
  RETAIL_TO_CUSTOMER: 'retail_to_customer',
});

const PARTY_KINDS = Object.freeze({
  FABRIC_SHOP: 'fabric_shop',
  TAILOR_SHOP: 'tailor_shop',
  CUSTOMER: 'customer',
});

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

function parcelKey(type, fromId, toId) {
  return `${type}:${fromId || 'customer'}:${toId || 'customer'}`;
}

const DEFAULT_LABELS = {
  [PARCEL_TYPES.FABRIC_TO_TAILOR]: 'Fabric shop → Tailor',
  [PARCEL_TYPES.CUSTOMER_FABRIC_TO_TAILOR]: 'Your fabric → Tailor',
  [PARCEL_TYPES.ADDON_TO_CUSTOMER]: 'Add-on → You',
  [PARCEL_TYPES.TAILOR_TO_CUSTOMER]: 'Tailor → You',
  [PARCEL_TYPES.RETAIL_TO_CUSTOMER]: 'Shop → You',
};

/**
 * Build a normalized parcel plan from unique route keys.
 * Fee = parcels.length × perParcelFee.
 */
export function buildParcelPlan(parcelMap, perParcelFee) {
  const fee = typeof perParcelFee === 'number' && perParcelFee >= 0 ? perParcelFee : 30;
  const parcels = Array.from(parcelMap.values()).map((entry) => ({
    key: entry.key,
    type: entry.type,
    from: entry.from,
    to: entry.to,
    label: entry.label,
    fee: roundMoney(fee),
    fabricShopId: entry.fabricShopId ?? null,
    tailorShopId: entry.tailorShopId ?? null,
    addonIds: entry.addonIds ?? [],
    itemIndexes: entry.itemIndexes ?? [],
  }));

  const deliveryFee = roundMoney(parcels.length * fee);

  return {
    parcels,
    deliveryFee,
    parcelCount: parcels.length,
    perParcelFee: roundMoney(fee),
    breakdown: parcels.map(({ key, type, label, fee: lineFee, from, to }) => ({
      key,
      type,
      label,
      fee: lineFee,
      from,
      to,
    })),
  };
}

function upsertParcel(map, { type, from, to, fabricShopId, tailorShopId, addonId, itemIndex, label }) {
  const key = parcelKey(type, from.id, to.id);
  const existing = map.get(key);
  if (existing) {
    if (addonId) existing.addonIds.push(idStr(addonId));
    if (typeof itemIndex === 'number') existing.itemIndexes.push(itemIndex);
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
    const customerParty = party(PARTY_KINDS.CUSTOMER, null, 'Customer');

    if (fabricSource === 'self') {
      upsertParcel(parcelMap, {
        type: PARCEL_TYPES.CUSTOMER_FABRIC_TO_TAILOR,
        from: customerParty,
        to: tailorParty,
        tailorShopId: tailorMeta.id,
        itemIndex: index,
        label: `Your fabric → ${tailorMeta.name}`,
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
        });
      }
    }

    // Leg-2: one parcel per unique tailor → customer
    upsertParcel(parcelMap, {
      type: PARCEL_TYPES.TAILOR_TO_CUSTOMER,
      from: tailorParty,
      to: customerParty,
      tailorShopId: tailorMeta.id,
      itemIndex: index,
      label: `${tailorMeta.name} → You`,
    });
  }

  if (Array.isArray(addonIds) && addonIds.length > 0) {
    const addons = await AddOn.find({ _id: { $in: addonIds }, isActive: true }).select(
      'fabricShopId name',
    );
    const customerParty = party(PARTY_KINDS.CUSTOMER, null, 'Customer');

    for (const addon of addons) {
      const originId = addon.fabricShopId || addon._id;
      let shopName = addon.name || 'Add-on';
      if (addon.fabricShopId) {
        const shop = await resolveFabricShopById(addon.fabricShopId);
        if (shop) shopName = shop.name;
      }

      upsertParcel(parcelMap, {
        type: PARCEL_TYPES.ADDON_TO_CUSTOMER,
        from: party(PARTY_KINDS.FABRIC_SHOP, originId, shopName),
        to: customerParty,
        fabricShopId: addon.fabricShopId || null,
        addonId: addon._id,
        label: `${shopName} (add-on) → You`,
      });
    }
  }

  return buildParcelPlan(parcelMap, perParcelFee);
}

/**
 * Resolve FabricShop origin for a retail cart line (ready-made, addon, or fabric).
 */
async function resolveRetailLineShop(productId) {
  let product = await ReadyMadeProduct.findById(productId).select(
    'fabricShopId name nameAr',
  );
  if (product) {
    const shop = product.fabricShopId
      ? await resolveFabricShopById(product.fabricShopId)
      : { id: `product:${product._id}`, name: product.name || 'Shop' };
    return {
      fabricShopId: product.fabricShopId || null,
      shopId: shop.id,
      shopName: shop.name,
    };
  }

  product = await AddOn.findById(productId).select('fabricShopId name nameAr');
  if (product) {
    const shop = product.fabricShopId
      ? await resolveFabricShopById(product.fabricShopId)
      : { id: `addon:${product._id}`, name: product.name || 'Shop' };
    return {
      fabricShopId: product.fabricShopId || null,
      shopId: shop.id,
      shopName: shop.name,
    };
  }

  product = await Fabric.findById(productId).select(
    'fabricShopId listedByStore name nameAr',
  );
  if (product) {
    const fabricShop = await resolveFabricShopForFabric(product);
    return {
      fabricShopId:
        fabricShop && !String(fabricShop.id).startsWith('fabric:')
          ? fabricShop.id
          : product.fabricShopId || null,
      shopId: fabricShop?.id || `fabric:${product._id}`,
      shopName: fabricShop?.name || product.name || 'Shop',
    };
  }

  return null;
}

/**
 * Plan retail parcels: one retail_to_customer per unique FabricShop origin.
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

    upsertParcel(parcelMap, {
      type: PARCEL_TYPES.RETAIL_TO_CUSTOMER,
      from: party(PARTY_KINDS.FABRIC_SHOP, origin.shopId, origin.shopName),
      to: customerParty,
      fabricShopId: origin.fabricShopId,
      itemIndex: index,
      label: `${origin.shopName} → You`,
    });
  }

  return buildParcelPlan(parcelMap, perParcelFee);
}
