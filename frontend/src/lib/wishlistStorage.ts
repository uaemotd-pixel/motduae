export const WISHLIST_KEY = "wishlist";
export const WISHLIST_OWNER_KEY = "wishlistOwner";

export function clearLocalWishlistStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(WISHLIST_KEY);
  localStorage.removeItem(WISHLIST_OWNER_KEY);
}
