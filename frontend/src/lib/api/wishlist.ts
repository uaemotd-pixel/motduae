import type { WishlistItem } from "@/context/WishlistContext";
import { parseFabricCutCartId } from "@/lib/fabrics";
import { api } from "@/lib/api/client";

export type AccountWishlist = { items: WishlistItem[] };

export type WishlistLineInput = {
  lineId: string;
  productId: string;
  kind?: "readyMade" | "addon" | "fabric" | "design";
  cutId?: string | null;
  quantity: number;
};

export function wishlistItemToLine(
  item: Pick<WishlistItem, "id" | "type">,
  quantity: number,
): WishlistLineInput {
  const { fabricId, cutId } = parseFabricCutCartId(item.id);
  const kind =
    item.type === "addons"
      ? "addon"
      : item.type === "design" ||
          item.type === "fabric" ||
          item.type === "readyMade"
        ? item.type
        : cutId
          ? "fabric"
          : undefined;
  return {
    lineId: item.id,
    productId: fabricId,
    kind,
    cutId: cutId ?? null,
    quantity,
  };
}

export function getAccountWishlist() {
  return api.get<AccountWishlist>("/api/wishlist");
}

export function addAccountWishlistItem(line: WishlistLineInput) {
  return api.post<AccountWishlist>("/api/wishlist/items", line);
}

export function setAccountWishlistQuantity(lineId: string, quantity: number) {
  return api.patch<AccountWishlist>(
    `/api/wishlist/items/${encodeURIComponent(lineId)}`,
    { quantity },
  );
}

export function removeAccountWishlistItem(lineId: string) {
  return api.delete<AccountWishlist>(
    `/api/wishlist/items/${encodeURIComponent(lineId)}`,
  );
}

export function mergeAccountWishlist(items: WishlistLineInput[]) {
  return api.post<AccountWishlist>("/api/wishlist/merge", { items });
}

export function clearAccountWishlist() {
  return api.delete<AccountWishlist>("/api/wishlist");
}
