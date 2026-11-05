import mongoose from "mongoose";
import CustomOrder from "../models/CustomOrder.js";
import TailorShop from "../models/TailorShop.js";
import User from "../models/User.js";

function asObjectId(value) {
  const raw = String(value || "").trim();
  if (!raw || !mongoose.Types.ObjectId.isValid(raw)) return null;
  return new mongoose.Types.ObjectId(raw);
}

/**
 * Tailors (shops) this customer has dealt with via custom orders.
 * @param {string} customerUserId
 * @returns {Promise<Array<{ shopId: string, ownerId: string, name: string, nameAr?: string, logo?: string, slug?: string }>>}
 */
export async function listDealtWithTailors(customerUserId) {
  const uid = asObjectId(customerUserId);
  if (!uid) return [];

  const [orderShopIds, itemShopIds] = await Promise.all([
    CustomOrder.distinct("tailorShopId", {
      userId: uid,
      tailorShopId: { $ne: null },
    }),
    CustomOrder.distinct("items.tailorShopId", {
      userId: uid,
      "items.tailorShopId": { $ne: null },
    }),
  ]);

  const shopIdSet = new Set(
    [...orderShopIds, ...itemShopIds]
      .map((id) => String(id || "").trim())
      .filter(Boolean),
  );

  if (!shopIdSet.size) return [];

  const shopObjectIds = [...shopIdSet].map((id) => asObjectId(id)).filter(Boolean);
  if (!shopObjectIds.length) return [];

  const shops = await TailorShop.find({
    _id: { $in: shopObjectIds },
  })
    .select("name nameAr logo slug ownerId")
    .lean();

  if (!shops.length) return [];

  const ownerIds = [
    ...new Set(shops.map((s) => String(s.ownerId || "")).filter(Boolean)),
  ];
  const owners = await User.find({
    _id: { $in: ownerIds.filter((id) => mongoose.Types.ObjectId.isValid(id)) },
    role: "tailor",
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
      name: String(shop.name || "Tailor").trim() || "Tailor",
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
 * @param {string} tailorOwnerId
 */
export async function customerCanChatWithTailor(customerUserId, tailorOwnerId) {
  const ownerId = String(tailorOwnerId || "").trim();
  if (!ownerId) return false;
  const tailors = await listDealtWithTailors(customerUserId);
  return tailors.some((t) => t.ownerId === ownerId);
}
