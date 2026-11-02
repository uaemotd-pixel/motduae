import mongoose from "mongoose";
import CustomOrder from "../models/CustomOrder.js";
import RetailOrder from "../models/RetailOrder.js";
import FabricShop from "../models/FabricShop.js";
import User from "../models/User.js";

function asObjectId(value) {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

/**
 * Fabric stores (shops) this customer has dealt with via custom or retail orders.
 * @param {string} customerUserId
 * @returns {Promise<Array<{ shopId: string, ownerId: string, name: string, nameAr?: string, logo?: string, slug?: string }>>}
 */
export async function listDealtWithFabricStores(customerUserId) {
  const uid = asObjectId(customerUserId);
  if (!uid) return [];

  const [customOwnerIds, customItemOwnerIds, retailShopIds] = await Promise.all([
    CustomOrder.distinct("fabricStoreId", {
      userId: uid,
      fabricSource: "storefront",
      fabricStoreId: { $ne: null },
    }),
    CustomOrder.distinct("items.fabricStoreId", {
      userId: uid,
      "items.fabricStoreId": { $ne: null },
    }),
    RetailOrder.distinct("orderItems.fabricShopId", {
      userId: uid,
      "orderItems.fabricShopId": { $ne: null },
    }),
  ]);

  const ownerIdSet = new Set(
    [...customOwnerIds, ...customItemOwnerIds]
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );
  const shopIdSet = new Set(
    retailShopIds.map((id) => String(id || "").trim()).filter(Boolean),
  );

  if (!ownerIdSet.size && !shopIdSet.size) return [];

  const ownerObjectIds = [...ownerIdSet]
    .map((id) => asObjectId(id))
    .filter(Boolean);
  const shopObjectIds = [...shopIdSet].map((id) => asObjectId(id)).filter(Boolean);

  const shops = await FabricShop.find({
    $or: [
      ...(ownerObjectIds.length ? [{ ownerId: { $in: ownerObjectIds } }] : []),
      ...(shopObjectIds.length ? [{ _id: { $in: shopObjectIds } }] : []),
    ],
  })
    .select("name nameAr logo slug ownerId")
    .lean();

  if (!shops.length) return [];

  const ownerIds = [
    ...new Set(shops.map((s) => String(s.ownerId || "")).filter(Boolean)),
  ];
  const owners = await User.find({
    _id: { $in: ownerIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) },
    role: "fabric_store",
  })
    .select("_id isActive approvalStatus name")
    .lean();

  const okOwners = new Set(
    owners
      .filter(
        (u) =>
          u.isActive !== false &&
          (!u.approvalStatus || u.approvalStatus === "approved"),
      )
      .map((u) => String(u._id)),
  );

  const byOwner = new Map();
  for (const shop of shops) {
    const ownerId = String(shop.ownerId || "");
    if (!ownerId || !okOwners.has(ownerId)) continue;
    if (byOwner.has(ownerId)) continue;
    byOwner.set(ownerId, {
      shopId: String(shop._id),
      ownerId,
      name: String(shop.name || "Fabric store").trim() || "Fabric store",
      nameAr: shop.nameAr ? String(shop.nameAr) : undefined,
      logo: shop.logo ? String(shop.logo) : undefined,
      slug: shop.slug ? String(shop.slug) : undefined,
    });
  }

  return [...byOwner.values()].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
  );
}

/**
 * @param {string} customerUserId
 * @param {string} fabricStoreOwnerId
 */
export async function customerCanChatWithFabricStore(
  customerUserId,
  fabricStoreOwnerId,
) {
  const ownerId = String(fabricStoreOwnerId || "").trim();
  if (!ownerId) return false;
  const stores = await listDealtWithFabricStores(customerUserId);
  return stores.some((s) => s.ownerId === ownerId);
}
