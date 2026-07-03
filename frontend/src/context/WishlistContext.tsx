"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

export type WishlistItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  maxStock?: number;
};

type WishlistContextType = {
  wishItems: WishlistItem[];
  addItem: (
    item: Omit<WishlistItem, "quantity"> & { maxStock?: number },
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  toggleItem?: (item: Omit<WishlistItem, "quantity"> & { maxStock?: number }) => void;
  clearWishlist: () => void;
  totalItems: number;
  isInWishlist: (id: string) => boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(
  undefined,
);
const WISHLIST_KEY = "wishlist";

function normalizeStoredItems(stored: unknown): WishlistItem[] {
  if (!Array.isArray(stored)) return [];
  return stored
    .filter((item) => item && typeof item.id === "string")
    .map((item) => {
      const rawMax = item.maxStock;
      const parsed = Number(rawMax);
      const maxStock = Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;

      return {
        id: item.id,
        slug: item.slug ?? "",
        name: item.name ?? "",
        image: item.image ?? "",
        price: Number(item.price) || 0,
        quantity: Math.max(1, Number(item.quantity) || 1),
        maxStock,
      } as WishlistItem;
    });
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const toastScheduledRef = useRef<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(WISHLIST_KEY);
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
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  }, [items, isHydrated]);

  const showToast = (
    message: string,
    type: "success" | "error" = "success",
  ) => {
    if (toastScheduledRef.current === message) return;
    toastScheduledRef.current = message;
    (type === "success" ? toast.success : toast.error)(message);
    setTimeout(() => {
      toastScheduledRef.current = null;
    }, 500);
  };

  const addItem = (
    item: Omit<WishlistItem, "quantity"> & { maxStock?: number },
  ) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);
      if (existing) {
        // if maxStock is undefined -> treat as unlimited
        if (existing.maxStock == null || existing.quantity < existing.maxStock) {
          setTimeout(
            () =>
              showToast(
                `${item.name} quantity increased to ${existing.quantity + 1}`,
              ),
            0,
          );
          return prev.map((p) =>
            p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p,
          );
        } else {
          setTimeout(
            () => showToast(`Only ${existing.maxStock} in stock`, "error"),
            0,
          );
          return prev;
        }
      }
      setTimeout(() => showToast(`${item.name} added to wishlist`), 0);
      // only include maxStock when it's a finite number
      const parsed = Number(item.maxStock);
      const maxStock = Number.isFinite(parsed) ? Math.max(0, parsed) : undefined;
      return [...prev, { ...item, quantity: 1, ...(maxStock != null ? { maxStock } : {}) }];
    });
  };

  // Toggle: add if not present, remove if present
  const toggleItem = (item: Omit<WishlistItem, "quantity"> & { maxStock?: number }) => {
    const exists = items.some((i) => i.id === item.id);
    if (exists) removeItem(item.id);
    else addItem(item);
  };

  const removeItem = (id: string) => {
    const removed = items.find((p) => p.id === id);
    if (removed) showToast(`${removed.name} removed from wishlist`);
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    const item = items.find((p) => p.id === id);
    if (!item) return;
    // if maxStock is defined and the requested quantity exceeds it, block
    if (item.maxStock != null && quantity > item.maxStock) {
      showToast(`Only ${item.maxStock} in stock`, "error");
      return;
    }
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity } : p)));
  };

  const clearWishlist = () => setItems([]);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const isInWishlist = (id: string) => items.some((i) => i.id === id);

  return (
    <WishlistContext.Provider
      value={{
        wishItems: items,
        addItem,
        toggleItem,
        removeItem,
        updateQuantity,
        clearWishlist,
        totalItems,
        isInWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
