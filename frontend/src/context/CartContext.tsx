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

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);

    // Load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem(CART_KEY);
        if (stored) {
            setItems(JSON.parse(stored));
        }
    }, []);

    // Save to localStorage
    useEffect(() => {
        localStorage.setItem(CART_KEY, JSON.stringify(items));
    }, [items]);

    // ADD ITEM
    const addItem = (item: Omit<CartItem, "quantity">) => {
        setItems((prev) => {
            const existing = prev.find((p) => p.id === item.id);

            if (existing) {
                return prev.map((p) =>
                    p.id === item.id
                        ? { ...p, quantity: p.quantity + 1 }
                        : p
                );
            }

            return [...prev, { ...item, quantity: 1 }];
        });
    };

    // REMOVE ITEM
    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((p) => p.id !== id));
    };

    // UPDATE QTY
    const updateQuantity = (id: string, quantity: number) => {
        if (quantity <= 0) {
            setItems((prev) => prev.filter((p) => p.id !== id));
            return;
        }

        setItems((prev) =>
            prev.map((p) =>
                p.id === id ? { ...p, quantity } : p
            )
        );
    };

    // CLEAR CART
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

// Hook
export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used inside CartProvider");
    }
    return context;
}