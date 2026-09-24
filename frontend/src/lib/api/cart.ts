import type { CartItem } from "@/context/CartContext";
import { parseFabricCutCartId } from "@/lib/fabrics";
import { api } from "@/lib/api/client";

export type AccountCart = { items: CartItem[] };

export type CartLineInput = {
  lineId: string;
  productId: string;
  kind?: CartItem["itemType"];
  cutId?: string | null;
  quantity: number;
};

export function cartItemToLine(
  item: Pick<CartItem, "id" | "itemType">,
  quantity: number,
): CartLineInput {
  const { fabricId, cutId } = parseFabricCutCartId(item.id);
  return {
    lineId: item.id,
    productId: fabricId,
    kind: item.itemType ?? (cutId ? "fabric" : undefined),
    cutId: cutId ?? null,
    quantity,
  };
}

export function getAccountCart() {
  return api.get<AccountCart>("/api/cart");
}

export function addAccountCartItem(line: CartLineInput) {
  return api.post<AccountCart>("/api/cart/items", line);
}

export function setAccountCartQuantity(lineId: string, quantity: number) {
  return api.patch<AccountCart>(
    `/api/cart/items/${encodeURIComponent(lineId)}`,
    { quantity },
  );
}

export function removeAccountCartItem(lineId: string) {
  return api.delete<AccountCart>(
    `/api/cart/items/${encodeURIComponent(lineId)}`,
  );
}

export function mergeAccountCart(items: CartLineInput[]) {
  return api.post<AccountCart>("/api/cart/merge", { items });
}

export function clearAccountCart() {
  return api.delete<AccountCart>("/api/cart");
}
