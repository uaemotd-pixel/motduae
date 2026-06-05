"use client";

import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";

export type CartItem = {
    id: string;
    slug: string;
    name: string;
    image: string;
    price: number;
    size: string;
    quantity: number;
    maxStock: number;
};

type CartContextType = {
    items: CartItem[];
    addItem: (item: Omit<CartItem, "quantity" | "maxStock"> & { maxStock: number }) => void;
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
            maxStock: Math.max(1, Number(item.maxStock) || 1),
        }));
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);

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

    // ADD ITEM
    const addItem = (item: Omit<CartItem, "quantity" | "maxStock"> & { maxStock: number }) => {
        setItems((prev) => {
            const existing = prev.find((p) => p.id === item.id);

            if (existing) {
                // Check if we can increase quantity
                if (existing.quantity < existing.maxStock) {
                    setTimeout(() => toast.success(`${item.name} quantity increased to ${existing.quantity + 1}`), 0);
                    return prev.map((p) =>
                        p.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
                    );
                } else {
                    setTimeout(() => toast.error(`Only ${existing.maxStock} in stock`), 0);
                    return prev; // no change
                }
            }

            // New item: quantity starts at 1, maxStock = item.maxStock
            setTimeout(() => toast.success(`${item.name} added to cart`), 0);
            return [...prev, { ...item, quantity: 1, maxStock: item.maxStock }];
        });
    };

    const removeItem = (id: string) => {
        const removedItem = items.find((p) => p.id === id);
        if (removedItem) {
            toast.success(`${removedItem.name} removed from cart`);
        }
        setItems((prev) => prev.filter((p) => p.id !== id));
    };

    const updateQuantity = (id: string, quantity: number) => {
        const item = items.find(p => p.id === id);
        if (!item) return;

        if (quantity > item.maxStock) {
            toast.error(`Only ${item.maxStock} in stock`);
            return;
        }
        if (quantity <= 0) {
            removeItem(id);
            return;
        }

        setItems(prev => prev.map(p => p.id === id ? { ...p, quantity } : p));
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
