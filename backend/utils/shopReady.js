import { isCompleteShopPickupAddress } from "./shopPickupAddress.js";
import Fabric from "../models/Fabric.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Design from "../models/Design.js";

export const SHOP_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const SHOP_INCOMPLETE_CODE = "SHOP_PROFILE_INCOMPLETE";
export const SHOP_INCOMPLETE_MESSAGE =
  "Complete your shop profile (URL slug and pickup address) before adding items.";

export function isValidShopSlug(value) {
  return SHOP_SLUG_PATTERN.test(String(value || "").trim());
}

export function publicShopSlugFilter() {
  return { slug: { $exists: true, $nin: [null, ""] } };
}

export function isShopProfileComplete(shop) {
  if (!shop) return false;
  return Boolean(
    String(shop.name || "").trim() &&
      String(shop.nameAr || "").trim() &&
      isValidShopSlug(shop.slug) &&
      String(shop.phone || "").trim() &&
      isCompleteShopPickupAddress(shop.pickupAddress),
  );
}

export function respondIfShopNotReady(shop, res) {
  if (!shop) {
    res.status(404).json({
      success: false,
      code: "SHOP_NOT_FOUND",
      message: "Shop not found",
    });
    return true;
  }
  if (!isShopProfileComplete(shop)) {
    res.status(403).json({
      success: false,
      code: SHOP_INCOMPLETE_CODE,
      message: SHOP_INCOMPLETE_MESSAGE,
    });
    return true;
  }
  return false;
}

/** Sync fabrics / ready-made / addons with fabric shop visibility. */
export async function syncFabricShopCatalogActive(shopId, isActive) {
  if (!shopId) return;

  await Promise.all([
    Fabric.updateMany({ fabricShopId: shopId }, { $set: { isActive } }),
    ReadyMadeProduct.updateMany(
      { fabricShopId: shopId },
      { $set: { isActive } },
    ),
    AddOn.updateMany({ fabricShopId: shopId }, { $set: { isActive } }),
  ]);
}

/**
 * Set shop visibility and catalog. Does not touch User.isActive
 * (partner self-pause must keep portal access).
 * Always clears legacy inactiveUntil schedules.
 */
export async function applyFabricShopVisibility(shop, isActive) {
  shop.isActive = Boolean(isActive);
  shop.inactiveUntil = null;
  await shop.save();
  await syncFabricShopCatalogActive(shop._id, shop.isActive);
  return shop;
}

/** Sync designs with tailor shop visibility. */
export async function syncTailorShopCatalogActive(shopId, isActive) {
  if (!shopId) return;
  await Design.updateMany(
    { tailorShopId: shopId },
    { $set: { isActive } },
  );
}

/**
 * Set tailor shop visibility and designs. Does not touch User.isActive
 * (partner self-pause must keep portal access).
 */
export async function applyTailorShopVisibility(shop, isActive) {
  shop.isActive = Boolean(isActive);
  await shop.save();
  await syncTailorShopCatalogActive(shop._id, shop.isActive);
  return shop;
}
