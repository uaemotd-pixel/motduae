"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import toast from "react-hot-toast";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { buildRetailCheckoutItem } from "@/lib/fabrics";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  /** Cut length label for fabric cut lines (e.g. "3.5 m") */
  cutLength?: string;
  itemType?: "fabric" | "readyMade" | "addon";
  // undefined means "unknown / unlimited"
  maxStock?: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity" | "maxStock"> & {
      maxStock: number;
      quantity?: number;
    },
  ) => void;
  removeItem: (id: string, options?: { silent?: boolean }) => void;
  updateQuantity: (id: string, quantity: number) => void;
  /** Apply live stock from checkout preview; drops lines with maxStock < 1. */
  syncStockFromPreview: (
    stockByCartId: Array<{ id: string; maxStock: number }>,
  ) => string[];
  /** Drop sold-out / unavailable lines via checkout preview. */
  purgeUnavailableItems: (
    measurementUnit?: string,
  ) => Promise<{
    purgedNames: string[];
    lastError: string | null;
    remainingItems: CartItem[];
  }>;
  clearCart: () => void;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "readyMadeCart";

export function isCartAvailabilityError(message: string): boolean {
  return /out of stock|insufficient stock|not available|product not found|not found:/i.test(
    message,
  );
}

function findUnavailableCartItem(
  items: CartItem[],
  message: string,
): CartItem | undefined {
  const normalized = message.toLowerCase();
  const byName = items.find(
    (item) => item.name && normalized.includes(item.name.toLowerCase()),
  );
  if (byName) return byName;

  const idMatches = message.match(/[a-f0-9]{24}/gi) || [];
  for (const productId of idMatches) {
    const match = items.find(
      (item) =>
        item.id === productId || item.id.startsWith(`${productId}::`),
    );
    if (match) return match;
  }

  return undefined;
}

function buildPreviewPayload(
  items: CartItem[],
  measurementUnit?: string,
) {
  return items.map((item) => {
    const built = buildRetailCheckoutItem(item);
    return {
      ...built,
      ...(item.size === "Per Meter" && !built.cutId && measurementUnit
        ? { measurementUnit }
        : {}),
    };
  });
}

function normalizeStoredItems(stored: unknown): CartItem[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item) => item && typeof item.id === "string")
    .map((item) => ({
      id: item.id,
      slug: item.slug ?? "",
      name: item.name ?? "",
      image: item.image ?? "",
      price: Number(item.price) || 0,
      size: item.size ?? "",
      quantity: Math.max(1, Number(item.quantity) || 1),
      cutLength: typeof item.cutLength === "string" ? item.cutLength : undefined,
      itemType:
        item.itemType === "fabric" ||
        item.itemType === "readyMade" ||
        item.itemType === "addon"
          ? item.itemType
          : undefined,
      // keep undefined when not a finite number so we treat it as unlimited
      maxStock: ((): number | undefined => {
        const parsed = Number(item.maxStock);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;
      })(),
    }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const toastScheduledRef = useRef<string | null>(null); // to prevent duplicates
  const itemsRef = useRef<CartItem[]>([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const stored = localStorage.getItem(CART_KEY);
    if (stored) {
      try {
        setItems(normalizeStoredItems(JSON.parse(stored)));
      } catch {
        setItems([]);
      }
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  // Helper to show toast only once per message
  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    if (toastScheduledRef.current === message) return;
    toastScheduledRef.current = message;
    if (type === "success") {
      toast.success(message);
    } else {
      toast.error(message);
    }
    setTimeout(() => {
      toastScheduledRef.current = null;
    }, 500);
  };

  // ADD ITEM
  const addItem = useCallback(
    (
      item: Omit<CartItem, "quantity" | "maxStock"> & {
        maxStock: number;
        quantity?: number;
      },
    ) => {
      const addQty = Math.max(1, Number(item.quantity) || 1);
      setItems((prev) => {
        const existing = prev.find((p) => p.id === item.id);

        if (existing) {
          if (
            existing.maxStock != null &&
            existing.quantity >= existing.maxStock
          ) {
            setTimeout(() => {
              showToast(`Only ${existing.maxStock} in stock`, "error");
            }, 0);
            return prev;
          }

          const nextQty =
            existing.maxStock != null
              ? Math.min(existing.quantity + addQty, existing.maxStock)
              : existing.quantity + addQty;
          setTimeout(() => {
            showToast(`${item.name} quantity increased to ${nextQty}`);
          }, 0);
          return prev.map((p) =>
            p.id === item.id ? { ...p, quantity: nextQty } : p,
          );
        }

        setTimeout(() => {
          showToast(`${item.name} added to cart`);
        }, 0);
        const parsed = Number(item.maxStock);
        const maxStock = Number.isFinite(parsed)
          ? Math.max(0, parsed)
          : undefined;
        const initialQty =
          maxStock != null ? Math.min(addQty, Math.max(1, maxStock)) : addQty;
        return [
          ...prev,
          {
            id: item.id,
            slug: item.slug,
            name: item.name,
            image: item.image,
            price: item.price,
            size: item.size,
            quantity: initialQty,
            ...(item.cutLength ? { cutLength: item.cutLength } : {}),
            ...(item.itemType ? { itemType: item.itemType } : {}),
            ...(maxStock != null ? { maxStock } : {}),
          },
        ];
      });
    },
    [],
  );

  // REMOVE ITEM
  const removeItem = useCallback(
    (id: string, options?: { silent?: boolean }) => {
      const removedItem = itemsRef.current.find((p) => p.id === id);
      if (removedItem && !options?.silent) {
        showToast(`${removedItem.name} removed from cart`);
      }
      setItems((prev) => prev.filter((p) => p.id !== id));
    },
    [],
  );

  const syncStockFromPreview = useCallback(
    (stockByCartId: Array<{ id: string; maxStock: number }>): string[] => {
      const stockMap = new Map(
        stockByCartId.map((row) => [
          row.id,
          Math.max(0, Number(row.maxStock) || 0),
        ]),
      );
      const removedNames: string[] = [];

      setItems((prev) => {
        let changed = false;
        const next: CartItem[] = [];

        for (const item of prev) {
          if (!stockMap.has(item.id)) {
            next.push(item);
            continue;
          }

          const maxStock = stockMap.get(item.id)!;
          if (maxStock < 1) {
            removedNames.push(item.name || "Item");
            changed = true;
            continue;
          }

          const quantity = Math.min(item.quantity, maxStock);
          if (item.maxStock !== maxStock || item.quantity !== quantity) {
            changed = true;
            next.push({ ...item, maxStock, quantity });
          } else {
            next.push(item);
          }
        }

        return changed ? next : prev;
      });

      return removedNames;
    },
    [],
  );

  const purgeUnavailableItems = useCallback(
    async (
      measurementUnit?: string,
    ): Promise<{
      purgedNames: string[];
      lastError: string | null;
      /** Remaining cart lines after dropping unavailable ones. */
      remainingItems: CartItem[];
    }> => {
      const purgedNames: string[] = [];
      let remaining = [...itemsRef.current];
      let lastError: string | null = null;

      const dropItem = (item: CartItem) => {
        removeItem(item.id, { silent: true });
        purgedNames.push(item.name || "Item");
        remaining = remaining.filter((row) => row.id !== item.id);
      };

      /** When the bulk error does not name the product, probe each line. */
      const dropUnavailableByProbing = async () => {
        const candidates = [...remaining];
        const stillOk: CartItem[] = [];
        for (const item of candidates) {
          try {
            await api.post("/api/checkout/preview", {
              items: buildPreviewPayload([item], measurementUnit),
            });
            stillOk.push(item);
          } catch (err: unknown) {
            const message = getApiErrorMessage(err, "Failed to validate cart");
            if (isCartAvailabilityError(message)) {
              removeItem(item.id, { silent: true });
              purgedNames.push(item.name || "Item");
            } else {
              lastError = message;
              stillOk.push(item);
            }
          }
        }
        remaining = stillOk;
      };

      for (let attempt = 0; attempt < 12 && remaining.length > 0; attempt++) {
        try {
          await api.post("/api/checkout/preview", {
            items: buildPreviewPayload(remaining, measurementUnit),
          });
          lastError = null;
          break;
        } catch (err: unknown) {
          const message = getApiErrorMessage(err, "Failed to validate cart");
          lastError = message;

          if (!isCartAvailabilityError(message)) {
            break;
          }

          const match = findUnavailableCartItem(remaining, message);
          if (match) {
            dropItem(match);
            continue;
          }

          const before = remaining.length;
          await dropUnavailableByProbing();
          if (remaining.length === before || remaining.length === 0) {
            break;
          }
        }
      }

      return { purgedNames, lastError, remainingItems: remaining };
    },
    [removeItem],
  );

  // UPDATE QTY
  const updateQuantity = useCallback((id: string, quantity: number) => {
    const item = itemsRef.current.find((p) => p.id === id);
    if (!item) return;

    if (item.maxStock != null && quantity > item.maxStock) {
      showToast(`Only ${item.maxStock} in stock`, "error");
      return;
    }
    if (quantity <= 0) {
      removeItem(id);
      return;
    }

    setItems((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity } : p)),
    );
  }, [removeItem]);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        syncStockFromPreview,
        purgeUnavailableItems,
        clearCart,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return context;
}
