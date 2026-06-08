// app/[locale]/checkout/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";
import { getTranslation } from "@/lib/getTranslation";
import { useLocale } from "next-intl";

const EMIRATES = [
    "Abu Dhabi",
    "Dubai",
    "Sharjah",
    "Ajman",
    "Ras Al Khaimah",
    "Fujairah",
    "Umm Al Quwain",
];

export default function CheckoutPage() {
    const router = useRouter();
    const params = useParams();
    const localeParams = params.locale as string;
    const t = getTranslation(localeParams);
    const locale = useLocale();

    const { items } = useCart();
    const { user, isLoading, isAuthenticated } = useAuth();

    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        emirate: "",
        city: "",
        street: "",
        deliveryNotes: "",
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [promoApplied, setPromoApplied] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
    const [billingAddressSame, setBillingAddressSame] = useState(true);

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push(`/${locale}/auth/login?redirect=/checkout`);
        }
    }, [isLoading, isAuthenticated, router, locale]);

    if (!user) return null;

    // Cart empty guard
    if (items.length === 0) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <h1 className="[font-family:var(--font-display)] text-2xl text-black mb-3">
                            Your cart is empty
                        </h1>
                        <p className="text-[13px] text-(--color-grey-muted) mb-6">
                            Add some items before checking out.
                        </p>
                        <Link
                            href="/ready-made"
                            className="inline-block px-6 py-3 bg-black text-white text-[10px] uppercase tracking-[0.22em]"
                        >
                            Continue Shopping
                        </Link>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const vat = subtotal * 0.05;
    const total = subtotal + vat - discount;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    };

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.fullName.trim()) newErrors.fullName = "Required";
        if (!formData.phone.trim()) newErrors.phone = "Required";
        if (!formData.emirate) newErrors.emirate = "Required";
        if (!formData.city.trim()) newErrors.city = "Required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePlaceOrder = () => {
        if (!validateForm()) return;
        console.log("Order data:", {
            cart: items,
            address: formData,
            payment: paymentMethod,
            user: user.id,
            discount,
            promoApplied,
            billingAddressSame,
        });
        alert("Order placement will be implemented in A-19");
    };

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-(--bg-page) min-h-screen py-12 xs:py-16 sm:py-20 md:py-24">
                    <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
                        <h1 className="sr-only">Checkout</h1>

                        <div className="flex flex-col h-full md:flex-row gap-8 lg:gap-12">
                            {/* LEFT COLUMN – ORDER SUMMARY (sticky on desktop) */}
                            <div className="w-full md:w-95 lg:w-105 shrink-0">
                                <div className="md:sticky md:top-24">
                                    <div className="bg-white border border-(--color-border) rounded-lg p-6 md:p-8">
                                        <ul className="space-y-6">
                                            {items.map((item) => (
                                                <li key={item.id} className="flex items-start gap-4">
                                                    <div className="w-20 h-20 shrink-0 bg-[#F5F5F0] rounded-md overflow-hidden">
                                                        <img
                                                            src={item.image}
                                                            className="w-full object-cover"
                                                            alt={item.name}
                                                        />
                                                    </div>
                                                    <div className="w-full">
                                                        <h3 className="[font-family:var(--font-display)] text-[18px] text-black">
                                                            {item.name}
                                                        </h3>
                                                        <ul className="mt-2 space-y-1 [font-family:var(--font-ui)] text-[12px] text-(--color-grey-muted)">
                                                            <li className="flex flex-wrap gap-4">
                                                                {t.checkout.size} <span className="ml-auto">{item.size}</span>
                                                            </li>
                                                            <li className="flex flex-wrap gap-4">
                                                                {t.checkout.quantity} <span className="ml-auto">{item.quantity}</span>
                                                            </li>
                                                            <li className="flex flex-wrap gap-4">
                                                                {t.checkout.totalPrice}
                                                                <span className="ml-auto font-normal text-black">
                                                                    AED {item.price * item.quantity}
                                                                </span>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>

                                        <hr className="border-(--color-border) my-6" />

                                        {/* Order totals */}
                                        <div>
                                            <ul className="space-y-3 [font-family:var(--font-ui)] text-[13px] text-(--color-grey-muted)">
                                                <li className="flex flex-wrap gap-4">
                                                    {t.checkout.subtotal}
                                                    <span className="ml-auto text-black">AED {subtotal.toFixed(2)}</span>
                                                </li>
                                                {discount > 0 && (
                                                    <li className="flex flex-wrap gap-4 text-green-600">
                                                        {t.checkout.discount} (10%)
                                                        <span className="ml-auto">- AED {discount.toFixed(2)}</span>
                                                    </li>
                                                )}
                                                <li className="flex flex-wrap gap-4">
                                                    {t.checkout.vat} (5%)
                                                    <span className="ml-auto text-black">AED {vat.toFixed(2)}</span>
                                                </li>
                                                <hr className="border-(--color-border) my-2" />
                                                <li className="flex flex-wrap gap-4 text-[16px] font-normal text-black">
                                                    {t.checkout.total}
                                                    <span className="ml-auto">AED {total.toFixed(2)}</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* RIGHT COLUMN – DELIVERY & PAYMENT */}
                            <div className="flex-1">
                                <div className="border border-(--color-border) rounded-lg p-6 md:p-8">
                                    <h2 className="font-headline-lg text-[20px] sm:text-[24px] md:text-[28px] lg:text-[32px] uppercase mb-8 tracking-[-0.01em] text-black">
                                        {t.checkout.deliveryDetails}
                                    </h2>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                        <div>
                                            <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                                {t.checkout.fullName}*
                                            </label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                            />
                                            {errors.fullName && <p className="text-red-500 text-[11px] mt-1">{errors.fullName}</p>}
                                        </div>
                                        <div>
                                            <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                                {t.checkout.phone}*
                                            </label>
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                            />
                                            {errors.phone && <p className="text-red-500 text-[11px] mt-1">{errors.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                                {t.checkout.emirate}*
                                            </label>
                                            <select
                                                name="emirate"
                                                value={formData.emirate}
                                                onChange={handleChange}
                                                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                            >
                                                <option value="">{t.checkout.selectEmirate}</option>
                                                {EMIRATES.map((em) => (
                                                    <option key={em} value={em}>{em}</option>
                                                ))}
                                            </select>
                                            {errors.emirate && <p className="text-red-500 text-[11px] mt-1">{errors.emirate}</p>}
                                        </div>
                                        <div>
                                            <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                                {t.checkout.city}*
                                            </label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={formData.city}
                                                onChange={handleChange}
                                                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                            />
                                            {errors.city && <p className="text-red-500 text-[11px] mt-1">{errors.city}</p>}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                                {t.checkout.streetBuilding} *
                                            </label>
                                            <input
                                                type="text"
                                                name="street"
                                                value={formData.street}
                                                onChange={handleChange}
                                                className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                                                {t.checkout.deliveryNotes} <span className="normal-case">({t.checkout.optional})</span>
                                            </label>
                                            <textarea
                                                name="deliveryNotes"
                                                rows={5}
                                                value={formData.deliveryNotes}
                                                onChange={handleChange}
                                                className="w-full border border-(--color-border) p-3 text-[14px] focus:outline-none focus:border-black"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Payment Methods – exactly as in the example */}
                                <div className="border border-(--color-border) rounded-lg p-6 md:p-8 mt-6">
                                    <h2 className="[font-family:var(--font-display)] text-xl mb-4">{t.checkout.paymentMethod}</h2>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" id="cod" name="payment" checked readOnly className="w-4 h-4 accent-black" />
                                        <label htmlFor="cod" className="[font-family:var(--font-body)] text-[14px] text-black">
                                            {t.checkout.codLabel}
                                        </label>
                                    </div>
                                    <p className="text-[11px] text-(--color-grey-muted) mt-2">{t.checkout.codDescription}</p>
                                </div>

                                {/* Place Order Button */}
                                <button
                                    onClick={handlePlaceOrder}
                                    className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 md:mt-7 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                >
                                    {t.checkout.placeOrder} AED {total.toFixed(2)}
                                </button>
                                <p className="text-center text-[12px] text-(--color-grey-muted) mt-4">
                                    {t.checkout.agreeToTerms}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>
        </MainLayout>
    );
}