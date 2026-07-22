// app/[locale]/checkout/page.tsx
"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { getTranslation } from "@/lib/getTranslation";
import { useLocale } from "next-intl";
import SuccessModal from "@/components/shared/SuccessModal";
import { api } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/client";
import type { CartItem } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { resolveMediaUrl } from "@/lib/media";
import ApplePayCheckout from "@/components/payments/ApplePayCheckout";
import toast from "react-hot-toast";
import { SUCCESS_TOAST, ERROR_TOAST } from "@/lib/tailorPortalToast";

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

// Customer address type (matches new schema)
type CustomerAddress = {
  _id?: string;
  fullName: string;
  phone: string;
  emirate: string;
  city: string;
  street: string;
  building: string;
  postalCode: string;
  isDefault?: boolean;
};

type CustomerProfile = {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  dob?: string;
  profilePic?: string;
  gender?: string;
  addresses?: CustomerAddress[];
  defaultAddressId?: string;
};

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <MainLayout>
          <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4">
            <div className="w-12 h-12 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          </div>
        </MainLayout>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}

function CheckoutPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const localeParams = params.locale as string;
  const t = getTranslation(localeParams);
  const locale = useLocale();
  const initialFillDone = useRef<boolean>(false);
  const checkoutItemsRef = useRef<CartItem[] | null>(null);
  const fromWishlistAllRef = useRef<boolean>(false);
  const [vatRate, setVatRate] = useState(0);

  const { items, clearCart } = useCart();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { clearWishlist, removeItem: removeWishlistItem } = useWishlist();
  const fromWishlist = searchParams.get("fromWishlist") === "true";

  // Fetch VAT rate from platform settings
  useEffect(() => {
    async function fetchVatRate() {
      try {
        const data = await api.get("/api/orders/settings");
        if (data?.vatRate !== undefined && data?.vatRate !== null) {
          const rate = data.vatRate > 1 ? data.vatRate / 100 : data.vatRate;
          setVatRate(rate);
        }
      } catch (error) {
        console.error("Failed to fetch VAT rate:", error);
      }
    }
    fetchVatRate();
  }, []);

  // --- Buy Now state ---
  const [buyNowState, setBuyNowState] = useState<{
    isBuyNow: boolean;
    item: CartItem | null;
    items: CartItem[] | null;
  } | null>(null);

  useEffect(() => {
    const isBuyNow = searchParams.get("buyNow") === "true";
    const fromWishlistAll = searchParams.get("fromWishlistAll") === "true";
    fromWishlistAllRef.current = fromWishlistAll;

    let item: CartItem | null = null;
    let itemsArray: CartItem[] | null = null;

    if (isBuyNow && fromWishlistAll) {
      if (!checkoutItemsRef.current) {
        const stored = sessionStorage.getItem("checkoutItems");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && Array.isArray(parsed) && parsed.length > 0) {
              checkoutItemsRef.current = parsed;
            }
          } catch (error) {
            console.error("Failed to parse wishlist items:", error);
            checkoutItemsRef.current = null;
          }
        }
      }

      if (checkoutItemsRef.current && checkoutItemsRef.current.length > 0) {
        itemsArray = checkoutItemsRef.current;
        item = itemsArray[0];
      }
    }

    if (
      isBuyNow &&
      (!fromWishlistAll || !itemsArray || itemsArray.length === 0)
    ) {
      item = {
        id: searchParams.get("productId") || "",
        slug: searchParams.get("slug") || "",
        name: searchParams.get("name") || "",
        image: searchParams.get("image") || "",
        price: parseFloat(searchParams.get("price") || "0"),
        size: searchParams.get("size") || "",
        quantity: parseInt(searchParams.get("quantity") || "2"),
        maxStock: parseInt(searchParams.get("maxStock") || "0"),
      };
      itemsArray = null;
    }

    setBuyNowState({ isBuyNow, item, items: itemsArray });
  }, [searchParams]);

  useEffect(() => {
    if (
      buyNowState?.isBuyNow &&
      buyNowState.items &&
      buyNowState.items.length > 0
    ) {
      sessionStorage.removeItem("checkoutItems");
    }
  }, [buyNowState]);

  const isBuyNow = buyNowState?.isBuyNow ?? false;
  const buyNowItem = buyNowState?.item ?? null;
  const buyNowItems = buyNowState?.items ?? null;

  // Determine display items: multiple wishlist items > single buyNow > cart
  const getDisplayItems = (): CartItem[] => {
    if (isBuyNow && buyNowItems && buyNowItems.length > 0) {
      return buyNowItems;
    }
    if (isBuyNow && buyNowItem) {
      return [buyNowItem];
    }
    return items;
  };

  const displayItems = getDisplayItems();

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    emirate: "",
    city: "",
    street: "",
    building: "",
    deliveryNotes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [billingAddressSame, setBillingAddressSame] = useState(true);

  // --- State for customer profile & loading ---
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // --- success modal state ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<Array<{ name: string }>>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "apple_pay">(
    "cod",
  );

  // Redirect if not logged in — preserve query params
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const query = searchParams.toString();
      const checkoutPath = query
        ? `/${locale}/checkout?${query}`
        : `/${locale}/checkout`;
      const redirect = encodeURIComponent(checkoutPath);
      router.push(`/auth/login?redirect=${redirect}`);
    }
  }, [isLoading, isAuthenticated, router, locale, searchParams]);

  // --- Fetch customer profile and auto-fill form ---
  useEffect(() => {
    async function fetchCustomerProfile() {
      if (!isAuthenticated) return;
      try {
        setProfileLoading(true);
        const data = await api.get<CustomerProfile>("/api/customer/profile");
        setCustomerProfile(data);
        const defaultAddr =
          data.addresses?.find((a) => a.isDefault) || data.addresses?.[0];
        if (defaultAddr) {
          setFormData((prev) => ({
            ...prev,
            fullName: defaultAddr.fullName || data.name || prev.fullName,
            phone: defaultAddr.phone || data.phone || prev.phone,
            emirate: defaultAddr.emirate || "",
            city: defaultAddr.city || "",
            street: defaultAddr.street || "",
            building: defaultAddr.building || "",
          }));
        } else {
          setFormData((prev) => ({
            ...prev,
            fullName: data.name || prev.fullName,
            phone: data.phone || prev.phone,
          }));
        }
        initialFillDone.current = true;
      } catch (err: any) {
        if (err.status === 404) {
          console.log("No customer profile found.");
        } else {
          console.error("Failed to fetch customer profile:", err);
        }
      } finally {
        setProfileLoading(false);
      }
    }
    fetchCustomerProfile();
  }, [isAuthenticated]);

  // --- Fallback: if no customer profile and user exists, fill name from auth user ---
  useEffect(() => {
    if (
      user &&
      !customerProfile &&
      !profileLoading &&
      !initialFillDone.current
    ) {
      setFormData((prev) => ({
        ...prev,
        fullName: user.name || prev.fullName,
      }));
      initialFillDone.current = true;
    }
  }, [user, customerProfile, profileLoading]);

  // --- Loading while determining Buy Now state or fetching profile ---
  if (isLoading || buyNowState === null || profileLoading) {
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

  // Calculate totals using displayItems
  const subtotal = displayItems.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0,
  );
  const vat = subtotal * vatRate;
  const total = subtotal + vat;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
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
    if (!formData.street.trim()) newErrors.street = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildOrderPayload = () => {
    const orderItems = displayItems.map((item) => ({
      productId: item.id,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      price: item.price,
    }));

    return {
      orderItems,
      shippingAddress: {
        fullName: formData.fullName,
        phone: formData.phone,
        emirate: formData.emirate,
        city: formData.city,
        street: formData.street,
        building: formData.building,
        notes: formData.deliveryNotes,
      },
    };
  };

  const clearCompletedCheckoutItems = () => {
    if (!isBuyNow) {
      clearCart();
    }

    if (fromWishlistAllRef.current) {
      clearWishlist();
      return;
    }

    if (fromWishlist && buyNowItem?.id) {
      removeWishlistItem(buyNowItem.id);
    }
  };

  const createRetailPaymentIntent = async () => {
    if (!validateForm()) {
      toast.error(
        locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة." : "Please fill in all required fields.",
        ERROR_TOAST
      );
      throw new Error("Please complete all required delivery fields.");
    }

    const { orderItems } = buildOrderPayload();
    const response = await api.post<{
      success: boolean;
      clientSecret: string;
      paymentIntentId: string;
      message?: string;
    }>("/api/payments/intent/retail", { orderItems });

    if (!response.success || !response.clientSecret) {
      throw new Error(response.message || "Failed to start Apple Pay");
    }

    return {
      clientSecret: response.clientSecret,
      paymentIntentId: response.paymentIntentId,
    };
  };

  const completeRetailOrder = async (paymentIntentId: string) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = buildOrderPayload();
      const response = await api.post<{
        success: boolean;
        orderId: string;
        message?: string;
      }>("/api/orders/retail", {
        ...payload,
        paymentMethod: "apple_pay",
        paymentIntentId,
      });

      if (response.success) {
        setLastOrderId(response.orderId);
        setLastOrderItems(displayItems.map((item) => ({ name: item.name })));
        setShowSuccessModal(true);

        clearCompletedCheckoutItems();
      } else {
        throw new Error(response.message || "Order failed");
      }
    } catch (err: unknown) {
      console.error("Order error:", err);
      const message =
        (err as ApiError)?.message ||
        (err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.");
      setErrorMessage(message);
      toast.error(message, ERROR_TOAST);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (message: string) => {
    setErrorMessage(message);
  };

  const placeCodOrder = async () => {
    if (!validateForm()) {
      toast.error(
        locale === "ar" ? "يرجى ملء جميع الحقول المطلوبة." : "Please fill in all required fields.",
        ERROR_TOAST
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = buildOrderPayload();
      const response = await api.post<{
        success: boolean;
        orderId: string;
        message?: string;
      }>("/api/orders/retail", {
        ...payload,
        paymentMethod: "cod",
      });

      if (response.success) {
        setLastOrderId(response.orderId);
        setLastOrderItems(displayItems.map((item) => ({ name: item.name })));
        setShowSuccessModal(true);

        clearCompletedCheckoutItems();
      } else {
        throw new Error(response.message || "Order failed");
      }
    } catch (err: unknown) {
      console.error("Order error:", err);
      const message =
        (err as ApiError)?.message ||
        (err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.");
      setErrorMessage(message);
      toast.error(message, ERROR_TOAST);
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
              {/* LEFT COLUMN – ORDER SUMMARY */}
              <div className="w-full md:w-95 lg:w-105 shrink-0">
                <div className="md:sticky md:top-24">
                  <div className="bg-white border border-(--color-border) rounded-lg p-6 md:p-8">
                    <ul className="space-y-6">
                      {displayItems.map((item, index) => (
                        <li
                          key={item.id || index}
                          className="flex items-start gap-4"
                        >
                          <div className="w-20 h-20 shrink-0 bg-[#F5F5F0] rounded-md overflow-hidden">
                            <img
                              src={resolveMediaUrl(item.image)}
                              className="w-full h-full object-cover"
                              alt={item.name}
                            />
                          </div>
                          <div className="w-full">
                            <h3 className="[font-family:var(--font-display)] text-[18px] text-black">
                              {item.name}
                            </h3>
                            <ul className="mt-2 space-y-1 [font-family:var(--font-ui)] text-[12px] text-(--color-grey-muted)">
                              <li className="flex flex-wrap gap-4">
                                {t.checkout.size}{" "}
                                <span className="ml-auto">{item.size}</span>
                              </li>
                              <li className="flex flex-wrap gap-4">
                                {t.checkout.quantity}{" "}
                                <span className="ml-auto">{item.quantity}</span>
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

                    <div>
                      <ul className="space-y-3 [font-family:var(--font-ui)] text-[13px] text-(--color-grey-muted)">
                        <li className="flex flex-wrap gap-4">
                          {t.checkout.subtotal}
                          <span className="ml-auto text-black">
                            AED {subtotal.toFixed(2)}
                          </span>
                        </li>
                        <li className="flex flex-wrap gap-4">
                          {t.checkout.vat} ({(vatRate * 100).toFixed(0)}%)
                          <span className="ml-auto text-black">
                            AED {vat.toFixed(2)}
                          </span>
                        </li>
                        <hr className="border-(--color-border) my-2" />
                        <li className="flex flex-wrap gap-4 text-[16px] font-normal text-black">
                          {t.checkout.total}
                          <span className="ml-auto">
                            AED {total.toFixed(2)}
                          </span>
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
                      {errors.fullName && (
                        <p className="text-red-500 text-[11px] mt-1">
                          {errors.fullName}
                        </p>
                      )}
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
                      {errors.phone && (
                        <p className="text-red-500 text-[11px] mt-1">
                          {errors.phone}
                        </p>
                      )}
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
                          <option key={em} value={em}>
                            {em}
                          </option>
                        ))}
                      </select>
                      {errors.emirate && (
                        <p className="text-red-500 text-[11px] mt-1">
                          {errors.emirate}
                        </p>
                      )}
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
                      {errors.city && (
                        <p className="text-red-500 text-[11px] mt-1">
                          {errors.city}
                        </p>
                      )}
                    </div>
                    <div>
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
                      {errors.street && (
                        <p className="text-red-500 text-[11px] mt-1">
                          {errors.street}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                        {t.checkout.building}
                      </label>
                      <input
                        type="text"
                        name="building"
                        value={formData.building}
                        onChange={handleChange}
                        className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block">
                        {t.checkout.deliveryNotes}{" "}
                        <span className="normal-case">
                          ({t.checkout.optional})
                        </span>
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

                {/* Payment */}
                <div className="border border-(--color-border) rounded-lg p-6 md:p-8 mt-6">
                  <h2 className="[font-family:var(--font-display)] text-xl mb-4">
                    {t.checkout.paymentMethod}
                  </h2>
                  <div className="space-y-3">
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        onChange={() => setPaymentMethod("cod")}
                        className="w-4 h-4 mt-0.5 accent-black shrink-0"
                      />
                      <span>
                        <span className="block [font-family:var(--font-body)] text-[15px] text-black">
                          {t.checkout.codLabel}
                        </span>
                        <span className="block [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-0.5">
                          {t.checkout.codDescription}
                        </span>
                      </span>
                    </label>
                    <label className="flex items-start gap-3 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="apple_pay"
                        checked={paymentMethod === "apple_pay"}
                        onChange={() => setPaymentMethod("apple_pay")}
                        className="w-4 h-4 mt-0.5 accent-black shrink-0"
                      />
                      <span>
                        <span className="block [font-family:var(--font-body)] text-[15px] text-black">
                          Apple Pay
                        </span>
                        <span className="block [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-0.5">
                          {t.checkout.applePayDescription}
                        </span>
                      </span>
                    </label>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-300 text-red-700 text-sm">
                    {errorMessage}
                  </div>
                )}

                <div className="mt-6 md:mt-7">
                  {paymentMethod === "cod" ? (
                    <button
                      type="button"
                      onClick={placeCodOrder}
                      disabled={isSubmitting || displayItems.length === 0}
                      className="w-full h-12 bg-black text-white [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting
                        ? t.checkout.processing
                        : t.checkout.placeOrder}
                    </button>
                  ) : (
                    <ApplePayCheckout
                      amountAed={total}
                      orderLabel={t.checkout.applePayOrderLabel}
                      disabled={isSubmitting || displayItems.length === 0}
                      processingLabel={t.checkout.processing}
                      loadingLabel={t.checkout.loadingApplePay}
                      unavailableLabel={t.checkout.applePayUnavailable}
                      notConfiguredLabel={t.checkout.applePayNotConfigured}
                      createIntent={createRetailPaymentIntent}
                      onPaid={completeRetailOrder}
                      onError={handlePaymentError}
                    />
                  )}
                </div>
                <p className="text-center text-[12px] text-(--color-grey-muted) mt-4">
                  {t.checkout.agreeToTerms}
                </p>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>

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
