import type { CartItem } from "@/context/CartContext";

export const BUY_NOW_STORAGE_KEY = "motdBuyNowCheckout";
export const BUY_NOW_ITEMS_STORAGE_KEY = "checkoutItems";

export type BuyNowCheckoutSnapshot = {
  fromWishlistAll: boolean;
  productId: string;
  size: string;
  quantity: number;
  slug: string;
  name: string;
  image: string;
  maxStock: number;
  cutId: string | null;
  cutLength: string;
  items: CartItem[] | null;
};

function isCartItemArray(value: unknown): value is CartItem[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((item) => item && typeof item === "object" && "id" in item)
  );
}

export function isBuyNowQuery(searchParams: URLSearchParams): boolean {
  if (searchParams.get("buyNow") === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(window.location.href).searchParams.get("buyNow") === "true";
  } catch {
    return false;
  }
}

export function isFromCartQuery(searchParams: URLSearchParams): boolean {
  if (searchParams.get("fromCart") === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(window.location.href).searchParams.get("fromCart") === "true";
  } catch {
    return false;
  }
}

export function resolveCheckoutSearchParams(
  searchParams: URLSearchParams,
): URLSearchParams {
  if (
    searchParams.get("buyNow") === "true" ||
    searchParams.get("fromCart") === "true"
  ) {
    return searchParams;
  }
  if (typeof window === "undefined") return searchParams;
  try {
    const fromWindow = new URL(window.location.href).searchParams;
    if (
      fromWindow.get("buyNow") === "true" ||
      fromWindow.get("fromCart") === "true"
    ) {
      return fromWindow;
    }
  } catch {
    /* ignore invalid URL */
  }
  return searchParams;
}

export function readBuyNowCheckout(): BuyNowCheckoutSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(BUY_NOW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BuyNowCheckoutSnapshot>;
    const items = isCartItemArray(parsed.items) ? parsed.items : null;
    const productId = typeof parsed.productId === "string" ? parsed.productId : "";
    if (!productId && !items) return null;
    return {
      fromWishlistAll: Boolean(parsed.fromWishlistAll),
      productId,
      size: typeof parsed.size === "string" ? parsed.size : "",
      quantity: Math.max(1, Number(parsed.quantity) || 1),
      slug: typeof parsed.slug === "string" ? parsed.slug : "",
      name: typeof parsed.name === "string" ? parsed.name : "",
      image: typeof parsed.image === "string" ? parsed.image : "",
      maxStock: Math.max(0, Number(parsed.maxStock) || 0),
      cutId: typeof parsed.cutId === "string" && parsed.cutId ? parsed.cutId : null,
      cutLength: typeof parsed.cutLength === "string" ? parsed.cutLength : "",
      items,
    };
  } catch {
    return null;
  }
}

export function saveBuyNowCheckout(snapshot: BuyNowCheckoutSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearBuyNowCheckout(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(BUY_NOW_STORAGE_KEY);
    sessionStorage.removeItem(BUY_NOW_ITEMS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function saveSingleBuyNowCheckout(item: {
  productId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  quantity: number;
  maxStock?: number;
  cutId?: string | null;
  cutLength?: string;
}): void {
  saveBuyNowCheckout({
    fromWishlistAll: false,
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    image: item.image,
    size: item.size,
    quantity: Math.max(1, Number(item.quantity) || 1),
    maxStock: Math.max(0, Number(item.maxStock) || 0),
    cutId: item.cutId || null,
    cutLength: item.cutLength || "",
    items: null,
  });
}

export function saveMultiBuyNowCheckout(items: CartItem[]): void {
  if (!items.length) return;
  const first = items[0];
  saveBuyNowCheckout({
    fromWishlistAll: true,
    productId: first.id,
    slug: first.slug,
    name: first.name,
    image: first.image,
    size: first.size,
    quantity: first.quantity,
    maxStock: first.maxStock || 0,
    cutId: null,
    cutLength: first.cutLength || "",
    items,
  });
  try {
    sessionStorage.setItem(BUY_NOW_ITEMS_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / private mode */
  }
}

export function parseBuyNowFromSearchParams(
  searchParams: URLSearchParams,
): Omit<BuyNowCheckoutSnapshot, "items" | "fromWishlistAll"> | null {
  if (searchParams.get("buyNow") !== "true") return null;
  const productId = searchParams.get("productId") || "";
  if (!productId) return null;
  const quantity = parseInt(searchParams.get("quantity") || "2", 10);
  const maxStock = parseInt(searchParams.get("maxStock") || "0", 10);
  const cutId = searchParams.get("cutId") || "";
  return {
    productId,
    size: searchParams.get("size") || "",
    quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 2,
    slug: searchParams.get("slug") || "",
    name: searchParams.get("name") || "",
    image: searchParams.get("image") || "",
    maxStock: Number.isFinite(maxStock) && maxStock > 0 ? maxStock : 0,
    cutId: cutId || null,
    cutLength: searchParams.get("cutLength") || "",
  };
}
