export const CART_KEY = "readyMadeCart";
export const CART_OWNER_KEY = "readyMadeCartOwner";
/** Line ids selected on the cart page for a partial checkout. */
export const CART_CHECKOUT_SELECTION_KEY = "readyMadeCartCheckoutSelection";

export function clearLocalCartStorage() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(CART_OWNER_KEY);
  try {
    sessionStorage.removeItem(CART_CHECKOUT_SELECTION_KEY);
  } catch {
    /* ignore */
  }
}


export function saveCartCheckoutSelection(ids: string[]): void {
  if (typeof window === "undefined") return;
  try {
    const unique = Array.from(
      new Set(ids.map((id) => String(id || "").trim()).filter(Boolean)),
    );
    sessionStorage.setItem(CART_CHECKOUT_SELECTION_KEY, JSON.stringify(unique));
  } catch {
    /* ignore quota / private mode */
  }
}

/** Returns selected cart line ids, or null when none were saved. */
export function readCartCheckoutSelection(): string[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CART_CHECKOUT_SELECTION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed
      .map((id) => String(id || "").trim())
      .filter(Boolean);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function clearCartCheckoutSelection(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(CART_CHECKOUT_SELECTION_KEY);
  } catch {
    /* ignore */
  }
}
