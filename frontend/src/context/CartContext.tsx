"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import toast from "react-hot-toast";

export type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  size: string;
  quantity: number;
  // undefined means "unknown / unlimited"
  maxStock?: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (
    item: Omit<CartItem, "quantity" | "maxStock"> & { maxStock: number },
  ) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_KEY = "readyMadeCart";

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
  const addItem = (
    item: Omit<CartItem, "quantity" | "maxStock"> & { maxStock: number },
  ) => {
    setItems((prev) => {
      const existing = prev.find((p) => p.id === item.id);

      if (existing) {
        // if maxStock undefined -> unlimited
        if (
          existing.maxStock == null ||
          existing.quantity < existing.maxStock
        ) {
          // Schedule toast after state update (but ensure single)
          setTimeout(() => {
            showToast(
              `${item.name} quantity increased to ${existing.quantity + 1}`,
            );
          }, 0);
          return prev.map((p) =>
            p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p,
          );
        } else {
          setTimeout(() => {
            showToast(`Only ${existing.maxStock} in stock`, "error");
          }, 0);
          return prev;
        }
      }

      setTimeout(() => {
        showToast(`${item.name} added to cart`);
      }, 0);
      const parsed = Number(item.maxStock);
      const maxStock = Number.isFinite(parsed)
        ? Math.max(0, parsed)
        : undefined;
      return [
        ...prev,
        { ...item, quantity: 1, ...(maxStock != null ? { maxStock } : {}) },
      ];
    });
  };

  // REMOVE ITEM
  const removeItem = (id: string) => {
    const removedItem = items.find((p) => p.id === id);
    if (removedItem) {
      showToast(`${removedItem.name} removed from cart`);
    }
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  // UPDATE QTY
  const updateQuantity = (id: string, quantity: number) => {
    const item = items.find((p) => p.id === id);
    if (!item) return;

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

  const clearCart = () => setItems([]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
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
