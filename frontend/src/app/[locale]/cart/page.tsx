"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from "lucide-react";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { useCart } from "@/context/CartContext";

export default function CartPage() {
    const { items, removeItem, updateQuantity, clearCart } = useCart();
    const params = useParams();
    const locale = params.locale as string;

    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const vat = subtotal * 0.05;
    const total = subtotal + vat;
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

    // Quantity handlers (fixed)
    const increaseQty = (id: string, currentQty: number) => {
        updateQuantity(id, currentQty + 1);
    };
    const decreaseQty = (id: string, currentQty: number) => {
        if (currentQty > 1) updateQuantity(id, currentQty - 1);
    };

    // Empty cart state
    if (!items.length) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4 py-12">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-10 h-10 text-[#5A5A56]" />
                        </div>
                        <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] text-black mb-3">
                            Your cart is empty
                        </h1>
                        <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
                            Looks like you haven't added any ready‑made items yet.
                        </p>
                        <Link
                            href={`/${locale}/#ready-made`} scroll={true}
                            className="inline-block px-6 py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition duration-300"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24">
                    <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">

                        {/* Header with back link */}
                        <div className="flex flex-wrap justify-between items-center gap-4 mb-8 xs:mb-10 md:mb-12">
                            <div>
                                <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[36px] sm:text-[40px] md:text-[44px] lg:text-[48px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
                                    Shopping Cart
                                </h1>
                                <p className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mt-2">
                                    {totalItems} {totalItems === 1 ? "item" : "items"}
                                </p>
                            </div>
                            <Link
                                href={`/${locale}/#ready-made`} scroll={true}
                                className="flex items-center gap-2 [font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-1 hover:opacity-50 transition hover:cursor-pointer"
                            >
                                <ArrowLeft className="w-3 h-3" />
                                Continue Shopping
                            </Link>
                        </div>

                        {/* Main grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xs:gap-10 md:gap-12">

                            {/* Items list */}
                            <div className="lg:col-span-2 space-y-4">
                                <div className="bg-(--bg-page) border border-(--color-border) rounded-lg overflow-hidden divide-y divide-(--color-border)">
                                    {items.map((item) => (
                                        <div key={item.id} className="p-4 xs:p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6">
                                            {/* Image */}
                                            <div className="w-full sm:w-28 h-28 bg-[#F5F5F0] rounded-md overflow-hidden shrink-0">
                                                <img
                                                    src={item.image || "/placeholder.png"}
                                                    alt={item.name}
                                                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                                                />
                                            </div>

                                            {/* Details */}
                                            <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                                <div className="space-y-1">
                                                    <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] font-normal text-black">
                                                        {item.name}
                                                    </h3>
                                                    <p className="[font-family:var(--font-ui)] text-[11px] xs:text-[12px] text-(--color-grey-muted)">
                                                        Size: {item.size}
                                                    </p>
                                                    <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                                                        AED {item.price.toFixed(2)}
                                                    </p>
                                                </div>

                                                {/* Quantity & remove */}
                                                <div className="flex items-center gap-4">
                                                    {/* // In CartPage, inside the item mapping */}
                                                    <div className="flex items-center border border-(--color-border) rounded-md">
                                                        <button
                                                            onClick={() => decreaseQty(item.id, item.quantity)}
                                                            disabled={item.quantity <= 1}
                                                            className="px-2 py-1.5 disabled:opacity-40 hover:bg-black/5 transition hover:cursor-pointer"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                        <span className="w-8 text-center">{item.quantity}</span>
                                                        <button
                                                            onClick={() => increaseQty(item.id, item.quantity)}
                                                            disabled={item.quantity >= item.maxStock}   // <-- disabled when stock limit reached
                                                            className="px-2 py-1.5 disabled:opacity-40 hover:bg-black/5 transition hover:cursor-pointer"
                                                        >
                                                            <Plus size={14} />
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => removeItem(item.id)}
                                                        className="text-(--color-grey-muted) hover:text-red-600 transition hover:cursor-pointer"
                                                        aria-label="Remove item"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Item total (desktop only) */}
                                            <div className="hidden sm:block text-right min-w-20">
                                                <p className="[font-family:var(--font-ui)] text-[14px] xs:text-[16px] font-medium text-black">
                                                    AED {(item.price * item.quantity).toFixed(2)}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Clear cart button */}
                                <button
                                    onClick={clearCart}
                                    className="text-[11px] xs:text-[12px] text-(--color-grey-muted) underline hover:text-black transition hover:cursor-pointer"
                                >
                                    Clear cart
                                </button>
                            </div>

                            {/* Order summary */}
                            <div className="lg:sticky lg:top-24 h-fit">
                                <div className="bg-(--bg-page) border border-(--color-border) rounded-lg p-5 xs:p-6 md:p-8">
                                    <h2 className="[font-family:var(--font-display)] text-[22px] xs:text-[24px] sm:text-[26px] font-normal text-black mb-6">
                                        Order Summary
                                    </h2>
                                    <div className="space-y-3 border-b border-(--color-border) pb-5 mb-5">
                                        <div className="flex justify-between [font-family:var(--font-ui)] text-[13px] xs:text-[14px]">
                                            <span className="text-(--color-grey-muted)">Subtotal</span>
                                            <span className="text-black">AED {subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between [font-family:var(--font-ui)] text-[13px] xs:text-[14px]">
                                            <span className="text-(--color-grey-muted)">VAT (5%)</span>
                                            <span className="text-black">AED {vat.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between [font-family:var(--font-ui)] text-[16px] xs:text-[18px] font-bold mb-8">
                                        <span>Total</span>
                                        <span>AED {total.toFixed(2)}</span>
                                    </div>
                                    <Link href="/checkout">
                                        <button className="w-full py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] hover:bg-white hover:text-black border border-black transition duration-300 hover:cursor-pointer">
                                            Proceed to Checkout
                                        </button>
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}