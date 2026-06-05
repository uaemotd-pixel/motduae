"use client";

import { createContext, useContext, useEffect, useState } from "react";

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
    addItem: (item: Omit<CartItem, "quantity">) => void;
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

    const addItem = (item: Omit<CartItem, "quantity">) => {
        const maxStock = Math.max(1, item.maxStock);

        setItems((prev) => {
            const existing = prev.find((p) => p.id === item.id);

            if (existing) {
                const nextQuantity = Math.min(existing.quantity + 1, maxStock);
                if (nextQuantity === existing.quantity) return prev;

                return prev.map((p) =>
                    p.id === item.id
                        ? { ...p, ...item, quantity: nextQuantity, maxStock }
                        : p
                );
            }

            return [...prev, { ...item, maxStock, quantity: 1 }];
        });
    };

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((p) => p.id !== id));
    };

    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            setItems((prev) => prev.filter((p) => p.id !== id));
            return;
        }

        setItems((prev) =>
            prev.map((p) => {
                if (p.id !== id) return p;
                const capped = Math.min(quantity, p.maxStock);
                return { ...p, quantity: capped };
            })
        );
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
