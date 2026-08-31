import { isCompleteShopPickupAddress } from "./shopPickupAddress.js";

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
