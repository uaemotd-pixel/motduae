import { SLUG_PATTERN } from "@/lib/tailorShop";

type ShopPickup = {
  fullName?: string;
  phone?: string;
  line1?: string;
  city?: string;
  emirate?: string;
};

type ShopLike = {
  name?: string;
  nameAr?: string;
  slug?: string;
  phone?: string;
  pickupAddress?: ShopPickup | null;
} | null | undefined;

export function isShopProfileComplete(shop: ShopLike): boolean {
  if (!shop) return false;
  const pickup = shop.pickupAddress;
  return Boolean(
    shop.name?.trim() &&
      shop.nameAr?.trim() &&
      SLUG_PATTERN.test(String(shop.slug || "").trim()) &&
      shop.phone?.trim() &&
      pickup?.fullName?.trim() &&
      pickup?.phone?.trim() &&
      pickup?.line1?.trim() &&
      pickup?.city?.trim() &&
      pickup?.emirate?.trim(),
  );
}

export function isShopIncompleteError(error: unknown): boolean {
  const err = error as { status?: number; data?: { code?: string } };
  return (
    err?.status === 403 && err?.data?.code === "SHOP_PROFILE_INCOMPLETE"
  );
}
