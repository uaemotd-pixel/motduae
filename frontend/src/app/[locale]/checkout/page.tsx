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
import { ShoppingBag } from "lucide-react";
import { getTranslation } from "@/lib/getTranslation";
import { useLocale } from "next-intl";
import SuccessModal from "@/components/shared/SuccessModal";
import { api } from "@/lib/api/client"; // for POST request

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

    const { items, clearCart } = useCart();
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
    const [paymentMethod, setPaymentMethod] = useState<"card" | "paypal">("card");
    const [billingAddressSame, setBillingAddressSame] = useState(true);

    // --- success modal state ---
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [lastOrderId, setLastOrderId] = useState<string | null>(null);
    const [lastOrderItems, setLastOrderItems] = useState<Array<{ name: string }>>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            const redirect = encodeURIComponent(`/${locale}/checkout`);
            router.push(`/${locale}/auth/login?redirect=${redirect}`);
        }
    }, [isLoading, isAuthenticated, router, locale]);

    if (isLoading) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4">
                    <div className="text-center">
                        <div className="w-12 h-12 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                            {t.checkout.pageTitle}
                        </p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    // Cart empty guard
    if (items.length === 0 && !showSuccessModal) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4 py-12">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
                            <ShoppingBag className="w-10 h-10 text-[#5A5A56]" />
                        </div>
                        <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] text-black mb-3">
                            {t.checkout.emptyCartTitle}
                        </h1>
                        <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
                            {t.checkout.emptyCartMessage}
                        </p>
                        <button
                            onClick={() => {
                                const element = document.getElementById('ready-made');
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth' });
                                } else {
                                    // Fallback: go to home page and then scroll after navigation
                                    router.push(`/${locale}`);
                                    setTimeout(() => {
                                        const el = document.getElementById('ready-made');
                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                    }, 300);
                                }
                            }}
                            className="inline-block px-6 py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition duration-300 cursor-pointer"
                        >
                            {t.checkout.continueShopping}
                        </button>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const vat = subtotal * 0.05;
    const total = subtotal + vat;

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;

        let processedValue = value;
        if (name === "fullName") {
            processedValue = value.replace(/[^A-Za-z\s\-']/g, "");
        }
        if (name === "city") {
            processedValue = value.replace(/[^A-Za-z\s\-']/g, "");
        }
        if (name === "phone") {
            processedValue = value.replace(/[^0-9+]/g, "");
        }
        // Use processedValue instead of value
        setFormData((prev) => ({ ...prev, [name]: processedValue }));
        if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
        if (errorMessage) setErrorMessage(null);
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

    const handlePlaceOrder = async () => {
        if (!validateForm()) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        setErrorMessage(null);

        // Build orderItems with productId (which worked in your log)
        const orderItems = items.map((item) => ({
            productId: item.id,      // ✅ this field gave a valid ID earlier
            size: item.size,
            quantity: item.quantity,
            price: item.price,
            name: item.name,         // optional
        }));

        const payload = {
            orderItems,              // ✅ backend expects 'orderItems' (not 'items')
            shippingAddress: {
                fullName: formData.fullName,
                phone: formData.phone,
                emirate: formData.emirate,
                city: formData.city,
                street: formData.street,
                notes: formData.deliveryNotes,
            },
            paymentMethod: "COD",
        };

        try {
            const response = await api.post("/api/orders/retail", payload);
            if (response.success) {
                setLastOrderId(response.orderId);
                setLastOrderItems(items.map((item) => ({ name: item.name })));
                setShowSuccessModal(true);
                clearCart();
            } else {
                throw new Error(response.message || "Order failed");
            }
        } catch (err: any) {
            console.error("Order error:", err);
            setErrorMessage(err.message || "Something went wrong. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
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
                                                <li className="flex flex-wrap gap-4">
                                                    {t.checkout.vat}
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

                                {/* Error message */}
                                {errorMessage && (
                                    <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 text-sm">
                                        {errorMessage}
                                    </div>
                                )}

                                {/* Place Order Button */}
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={isSubmitting}
                                    className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 md:mt-7 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            {t.checkout.processing}
                                        </span>
                                    ) : (
                                        `${t.checkout.placeOrder} AED ${total.toFixed(2)}`
                                    )}
                                </button>
                                <p className="text-center text-[12px] text-(--color-grey-muted) mt-4">
                                    {t.checkout.agreeToTerms}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </FadeInSection>

            {/* --- SUCCESS MODAL --- */}
            <SuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    router.push(`/${locale}#ready-made`);
                }}
                title={t.checkout.successTitle}
                message={t.checkout.successMessage}
                orderId={lastOrderId?.slice(-8) ?? undefined}
                orderIdLabel={t.checkout.orderIdLabel}
                itemsInOrderLabel={t.checkout.itemsInOrder}
                okLabel={t.checkout.okButton}
                orderItems={lastOrderItems}
            />
        </MainLayout>
    );
}