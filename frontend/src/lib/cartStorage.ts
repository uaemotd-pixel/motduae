export const CART_KEY = "readyMadeCart";
export const CART_OWNER_KEY = "readyMadeCartOwner";

export function clearLocalCartStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(CART_OWNER_KEY);
}
