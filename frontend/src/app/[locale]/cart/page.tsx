// src/app/[locale]/cart/page.tsx
// This is a cart page for customers

"use client";

import Link from "next/link";
import { Trash2, Plus, Minus, ShoppingBag } from "lucide-react";
import MainLayout from "../main/layout";

// Mock cart data – for UI demonstration only
const mockCartItems = [
    {
        id: "1",
        name: "Premium Leather Wallet",
        price: 89.99,
        quantity: 1,
        image: "",
    },
    {
        id: "2",
        name: "Minimalist Watch",
        price: 249.99,
        quantity: 2,
        image: "",
    },
    {
        id: "3",
        name: "Cotton T-Shirt",
        price: 34.99,
        quantity: 1,
        image: "",
    },
];

export default function CartPage() {
    const subtotal = mockCartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalItems = mockCartItems.reduce((sum, item) => sum + item.quantity, 0);

    if (mockCartItems.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50 py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <div className="bg-white border border-gray-200 p-8 md:p-12">
                        <ShoppingBag className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                        <h1 className="text-3xl font-['Ivy_Ora'] text-black mb-2">Your cart is empty</h1>
                        <p className="text-gray-500 font-['TT_Norms_Pro'] mb-6">
                            Looks like you haven't added any items yet.
                        </p>
                        <Link
                            href="/"
                            className="inline-block px-6 py-3 bg-black text-white hover:bg-gray-900 transition-colors font-['TT_Norms_Pro'] text-sm"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <MainLayout>

                <div className="min-h-screen bg-gray-50 py-8 md:py-12">
                    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Header */}
                        <div className="mb-8 border-b border-gray-200 pb-4">
                            <h1 className="text-3xl md:text-4xl font-['Ivy_Ora'] text-black tracking-tight">
                                Shopping Cart
                            </h1>
                            <p className="text-gray-500 font-['TT_Norms_Pro'] mt-2">
                                {totalItems} {totalItems === 1 ? "item" : "items"}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Cart Items */}
                            <div className="lg:col-span-2">
                                <div className="bg-white border border-gray-200 divide-y divide-gray-200">
                                    {mockCartItems.map((item) => (
                                        <div key={item.id} className="p-6 flex flex-col sm:flex-row gap-4">
                                            {/* Image placeholder */}
                                            <div className="w-full sm:w-24 h-24 bg-gray-100 border border-gray-200 flex items-center justify-center">
                                                {item.image ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="text-gray-400 text-xs font-['TT_Norms_Pro']">No image</div>
                                                )}
                                            </div>

                                            {/* Item details */}
                                            <div className="flex-1">
                                                <h3 className="font-['TT_Norms_Pro_Mono'] text-black text-lg mb-1">
                                                    {item.name}
                                                </h3>
                                                <p className="text-black font-['TT_Norms_Pro'] mb-2">
                                                    ${item.price.toFixed(2)}
                                                </p>

                                                {/* Quantity controls (static, no logic) */}
                                                <div className="flex items-center gap-4 mt-2">
                                                    <div className="flex items-center border border-gray-200">
                                                        <button className="px-3 py-1 text-black hover:bg-gray-100 transition-colors cursor-pointer">
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="w-12 text-center font-['TT_Norms_Pro'] text-black">
                                                            {item.quantity}
                                                        </span>
                                                        <button className="px-3 py-1 text-black hover:bg-gray-100 transition-colors cursor-pointer">
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                    <button className="text-gray-400 hover:text-red-600 transition-colors cursor-pointer">
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Item total */}
                                            <div className="text-right sm:text-left">
                                                <p className="font-['TT_Norms_Pro_Mono'] text-black">
                                                    ${(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Action buttons */}
                                <div className="mt-6 flex justify-between">
                                    <button className="px-4 py-2 border border-gray-200 text-gray-500 hover:border-black hover:text-black transition-colors font-['TT_Norms_Pro'] text-sm cursor-pointer">
                                        Clear cart
                                    </button>
                                    <Link
                                        href="/"
                                        className="px-4 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors font-['TT_Norms_Pro'] text-sm"
                                    >
                                        Continue Shopping
                                    </Link>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div className="lg:col-span-1">
                                <div className="bg-white border border-gray-200 p-6">
                                    <h2 className="text-xl font-['TT_Norms_Pro_Mono'] text-black mb-4 tracking-wide">
                                        Order Summary
                                    </h2>
                                    <div className="space-y-3 border-b border-gray-200 pb-4">
                                        <div className="flex justify-between text-gray-600 font-['TT_Norms_Pro']">
                                            <span>Subtotal</span>
                                            <span>${subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-gray-600 font-['TT_Norms_Pro']">
                                            <span>Shipping</span>
                                            <span>Calculated at checkout</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between mt-4 mb-6 text-lg font-['TT_Norms_Pro_Mono'] text-black">
                                        <span>Total</span>
                                        <span>${subtotal.toFixed(2)}</span>
                                    </div>
                                    <button className="w-full py-3 bg-black text-white hover:bg-gray-900 transition-colors font-['TT_Norms_Pro'] text-sm cursor-pointer">
                                        Proceed to Checkout
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </MainLayout>
        </>
    );
}