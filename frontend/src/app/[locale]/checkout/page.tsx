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
import { useMeasurementUnit } from "@/hooks/useMeasurementUnit";
import SuccessModal from "@/components/shared/SuccessModal";
import { api } from "@/lib/api/client";
import type { ApiError } from "@/lib/api/client";
import type { CartItem } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { resolveMediaUrl } from "@/lib/media";
import ApplePayCheckout from "@/components/payments/ApplePayCheckout";
import CardPaymentForm from "@/components/payments/CardPaymentForm";
import toast from "react-hot-toast";
import { SUCCESS_TOAST, ERROR_TOAST } from "@/lib/tailorPortalToast";
import { FormPageSkeleton } from "@/components/ui/Skeleton";

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

function validateUaePhone(phone: string): boolean {
  const cleaned = phone.replace(/[^\d+]/g, "");
  return /^\+971\d{9}$/.test(cleaned);
}

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

type PricePreviewItem = {
  productId: string;
  size: string;
  quantity: number;
  unitPrice: number;
  name: string;
  image: string;
  maxStock: number;
};

type PricePreviewResponse = {
  items: PricePreviewItem[];
  subtotal: number;
  vat: number;
  total: number;
  vatRate: number;
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
  const fromWishlistAllRef = useRef<boolean>(false);

  const { items, clearCart } = useCart();
  const { user, isLoading, isAuthenticated } = useAuth();
  const { clearWishlist, removeItem: removeWishlistItem } = useWishlist();
  const { unit: measurementUnit } = useMeasurementUnit();
  const fromWishlist = searchParams.get("fromWishlist") === "true";

  // --- State ---
  const [buyNowProductId, setBuyNowProductId] = useState<string | null>(null);
  const [buyNowSize, setBuyNowSize] = useState<string>("");
  const [buyNowQuantity, setBuyNowQuantity] = useState<number>(2);
  const [buyNowSlug, setBuyNowSlug] = useState<string>("");
  const [buyNowName, setBuyNowName] = useState<string>("");
  const [buyNowImage, setBuyNowImage] = useState<string>("");
  const [buyNowMaxStock, setBuyNowMaxStock] = useState<number>(0);
  const [isBuyNow, setIsBuyNow] = useState(false);
  const [buyNowItemsArray, setBuyNowItemsArray] = useState<CartItem[] | null>(
    null,
  );
  const [pricePreview, setPricePreview] = useState<PricePreviewResponse | null>(
    null,
  );
  const [priceLoading, setPriceLoading] = useState(true);
  const [vatRate, setVatRate] = useState(0);

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

  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<Array<{ name: string }>>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<
    "cod" | "apple_pay" | "card"
  >("cod");

  // --- Fetch VAT rate ---
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

  // --- Parse Buy Now params (NO PRICE) ---
  useEffect(() => {
    const isBuyNowParam = searchParams.get("buyNow") === "true";
    const fromWishlistAll = searchParams.get("fromWishlistAll") === "true";
    fromWishlistAllRef.current = fromWishlistAll;

    setIsBuyNow(isBuyNowParam);

    if (isBuyNowParam && fromWishlistAll) {
      const stored = sessionStorage.getItem("checkoutItems");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (parsed && Array.isArray(parsed) && parsed.length > 0) {
            setBuyNowItemsArray(parsed);
            sessionStorage.removeItem("checkoutItems");
            return;
          }
        } catch (error) {
          console.error("Failed to parse wishlist items:", error);
        }
      }
    }

    if (isBuyNowParam) {
      const productId = searchParams.get("productId") || "";
      const size = searchParams.get("size") || "";
      const quantity = parseInt(searchParams.get("quantity") || "2");
      const slug = searchParams.get("slug") || "";
      const name = searchParams.get("name") || "";
      const image = searchParams.get("image") || "";
      const maxStock = parseInt(searchParams.get("maxStock") || "0");

      setBuyNowProductId(productId);
      setBuyNowSize(size);
      setBuyNowQuantity(quantity);
      setBuyNowSlug(slug);
      setBuyNowName(name);
      setBuyNowImage(image);
      setBuyNowMaxStock(maxStock);
      setBuyNowItemsArray(null);
    }
  }, [searchParams]);

  // --- Fetch server prices for display items ---
  useEffect(() => {
    async function fetchPrices() {
      setPriceLoading(true);
      try {
        let itemsToPreview: Array<{
          productId: string;
          size: string;
          quantity: number;
        }> = [];

        if (isBuyNow && buyNowItemsArray && buyNowItemsArray.length > 0) {
          itemsToPreview = buyNowItemsArray.map((item) => ({
            productId: item.id,
            size: item.size || "",
            quantity: item.quantity || 1,
          }));
        } else if (isBuyNow && buyNowProductId) {
          itemsToPreview = [
            {
              productId: buyNowProductId,
              size: buyNowSize,
              quantity: buyNowQuantity,
            },
          ];
        } else {
          itemsToPreview = items.map((item) => ({
            productId: item.id,
            size: item.size || "",
            quantity: item.quantity || 1,
          }));
        }

        if (itemsToPreview.length === 0) {
          setPricePreview(null);
          setPriceLoading(false);
          return;
        }

        const response = await api.post<PricePreviewResponse>(
          "/api/checkout/preview",
          {
            items: itemsToPreview,
          },
        );

        setPricePreview(response);
      } catch (error) {
        console.error("Failed to fetch price preview:", error);
        toast.error("Failed to load pricing. Please refresh.", ERROR_TOAST);
      } finally {
        setPriceLoading(false);
      }
    }

    fetchPrices();
  }, [
    isBuyNow,
    buyNowProductId,
    buyNowSize,
    buyNowQuantity,
    buyNowItemsArray,
    items,
  ]);

  // --- Build display items with server prices ---
  const getDisplayItems = (): CartItem[] => {
    if (!pricePreview) return [];

    if (isBuyNow && buyNowItemsArray && buyNowItemsArray.length > 0) {
      return buyNowItemsArray.map((item, index) => {
        const previewItem = pricePreview.items[index];
        return {
          ...item,
          price: previewItem?.unitPrice || 0,
        };
      });
    }

    if (isBuyNow && buyNowProductId) {
      const previewItem = pricePreview.items[0];
      return [
        {
          id: buyNowProductId,
          slug: buyNowSlug,
          name: previewItem?.name || buyNowName,
          image: previewItem?.image || buyNowImage,
          price: previewItem?.unitPrice || 0,
          size: buyNowSize,
          quantity: buyNowQuantity,
          maxStock: previewItem?.maxStock || buyNowMaxStock,
        },
      ];
    }

    return items.map((item, index) => {
      const previewItem = pricePreview.items[index];
      return {
        ...item,
        price: previewItem?.unitPrice || 0,
      };
    });
  };

  const displayItems = getDisplayItems();

  // --- Redirect if not logged in ---
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

  // --- Fetch customer profile ---
  useEffect(() => {
    async function fetchCustomerProfile() {
      if (!isAuthenticated) return;
      if (user?.isGuest) {
        setFormData((prev) => ({
          ...prev,
          fullName: "",
          phone: "",
          emirate: "",
          city: "",
          street: "",
          building: "",
        }));
        initialFillDone.current = true;
        setProfileLoading(false);
        return;
      }
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
  }, [isAuthenticated, user]);

  // --- Fallback fill name ---
  useEffect(() => {
    if (user?.isGuest) return;
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

  // --- Loading states ---
  if (isLoading || profileLoading || priceLoading) {
    return (
      <MainLayout>
        <FormPageSkeleton fields={8} />
      </MainLayout>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // --- Use server totals ---
  const subtotal = pricePreview?.subtotal || 0;
  const vat = pricePreview?.vat || 0;
  const total = pricePreview?.total || 0;
  const effectiveVatRate = pricePreview?.vatRate ?? vatRate;

  // --- Form handlers ---
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

    let processedValue = value;
    if (name === "fullName") {
      processedValue = value.replace(/[^a-zA-Z\u0600-\u06FF\s\-']/g, "");
    }
    if (name === "city") {
      processedValue = value.replace(/[^a-zA-Z\u0600-\u06FF\s\-']/g, "");
    }
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      processedValue = `+971${digits}`;
    }
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
    if (errorMessage) setErrorMessage(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Required";
    if (!formData.phone.trim() || formData.phone === "+971") {
      newErrors.phone = "Required";
    } else if (!validateUaePhone(formData.phone)) {
      newErrors.phone =
        localeParams === "ar"
          ? "رقم الهاتف غير صحيح. يجب أن يكون 9 أرقام بعد +971"
          : "Invalid phone number. Must be 9 digits after +971";
    }
    if (!formData.emirate) newErrors.emirate = "Required";
    if (!formData.city.trim()) newErrors.city = "Required";
    if (!formData.street.trim()) newErrors.street = "Required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Build order payload (NO PRICE) ---
  const buildOrderPayload = () => {
    const orderItems = displayItems.map((item) => ({
      productId: item.id,
      size: item.size,
      quantity: item.quantity,
      // NO price field
    }));

    const isArabic = localeParams === "ar";
    const guestSuffix = isArabic ? " - زائر" : " - Guest";
    const submittedName = user?.isGuest
      ? `${formData.fullName.trim()}${guestSuffix}`
      : formData.fullName.trim();

    return {
      orderItems,
      shippingAddress: {
        fullName: submittedName,
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

    if (fromWishlist && displayItems.length > 0) {
      displayItems.forEach((item) => removeWishlistItem(item.id));
    }
  };

  const createRetailPaymentIntent = async () => {
    if (!validateForm()) {
      toast.error(
        locale === "ar"
          ? "يرجى ملء جميع الحقول المطلوبة."
          : "Please fill in all required fields.",
        ERROR_TOAST,
      );
      throw new Error("Please complete all required delivery fields.");
    }

    const payload = buildOrderPayload();
    const response = await api.post<{
      success: boolean;
      clientSecret: string;
      paymentIntentId: string;
      message?: string;
    }>("/api/payments/intent/retail", payload);

    if (!response.success || !response.clientSecret) {
      throw new Error(response.message || "Failed to start payment");
    }

    return {
      clientSecret: response.clientSecret,
      paymentIntentId: response.paymentIntentId,
    };
  };

  const completeRetailOrder = async (
    paymentIntentId: string,
    method: "apple_pay" | "card" = "apple_pay",
  ) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = buildOrderPayload();
      let response: {
        success: boolean;
        orderId: string;
        message?: string;
      };

      try {
        response = await api.post("/api/orders/retail", {
          ...payload,
          paymentMethod: method,
          paymentIntentId,
        });
      } catch (orderErr) {
        response = await api.post("/api/payments/reconcile", {
          paymentIntentId,
          paymentMethod: method,
        });
        if (!response?.success) {
          throw orderErr;
        }
      }

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
      const recoveryHint =
        locale === "ar"
          ? " إذا تم خصم المبلغ، سيُنشأ طلبك تلقائياً — راجعي حسابك أو تواصلي مع الدعم مع مرجع الدفع."
          : " If you were charged, your order will be created automatically — check your account or contact support with the payment reference.";
      setErrorMessage(message + recoveryHint);
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
        locale === "ar"
          ? "يرجى ملء جميع الحقول المطلوبة."
          : "Please fill in all required fields.",
        ERROR_TOAST,
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
                    {displayItems.length === 0 ? (
                      <p className="text-center text-(--color-grey-muted) py-8">
                        No items in checkout.
                      </p>
                    ) : (
                      <>
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
                                    <span className="ml-auto">
                                      {item.quantity}
                                    </span>
                                  </li>
                                  <li className="flex flex-wrap gap-4">
                                    {t.checkout.totalPrice}
                                    <span className="ml-auto font-normal text-black">
                                      AED{" "}
                                      {(item.price * item.quantity).toFixed(2)}
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
                              {t.checkout.vat} (
                              {(effectiveVatRate * 100).toFixed(0)}%)
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
                      </>
                    )}
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
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          className={`w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black ${
                            user?.isGuest
                              ? localeParams === "ar"
                                ? "pl-20"
                                : "pr-20"
                              : ""
                          }`}
                        />
                        {user?.isGuest && (
                          <span
                            className={`absolute ${localeParams === "ar" ? "left-0" : "right-0"} text-gray-400 select-none pointer-events-none font-medium text-[14px] md:text-[15px] pb-1`}
                          >
                            {localeParams === "ar" ? " - زائر" : " - Guest"}
                          </span>
                        )}
                      </div>
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
                      <div className="relative flex items-center">
                        <span
                          className={`absolute ${localeParams === "ar" ? "right-0" : "left-0"} text-gray-500 font-mono text-[15px] md:text-[16px]`}
                        >
                          +971
                        </span>
                        <input
                          type="tel"
                          name="phone"
                          value={
                            formData.phone
                              ? formData.phone
                                  .replace(/\D/g, "")
                                  .startsWith("971")
                                ? formData.phone.replace(/\D/g, "").slice(3)
                                : formData.phone.replace(/\D/g, "").slice(0, 9)
                              : ""
                          }
                          onChange={handleChange}
                          placeholder="XXXXXXXXX"
                          maxLength={9}
                          className={`w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-mono rounded-none transition-all focus:border-black focus:outline-none placeholder:text-black/40 text-black ${
                            localeParams === "ar"
                              ? "pr-11 pl-0 text-right"
                              : "pl-11 pr-0 text-left"
                          }`}
                        />
                      </div>
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
                        value="card"
                        checked={paymentMethod === "card"}
                        onChange={() => setPaymentMethod("card")}
                        className="w-4 h-4 mt-0.5 accent-black shrink-0"
                      />
                      <span>
                        <span className="block [font-family:var(--font-body)] text-[15px] text-black">
                          {t.checkout.cardLabel}
                        </span>
                        <span className="block [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-0.5">
                          {t.checkout.cardDescription}
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
                  {paymentMethod === "cod" && (
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
                  )}

                  {paymentMethod === "card" && (
                    <CardPaymentForm
                      amountAed={total}
                      cardholderName={
                        user?.isGuest
                          ? `${formData.fullName.trim()} - ${localeParams === "ar" ? "زائر" : "Guest"}`
                          : formData.fullName
                      }
                      disabled={isSubmitting || displayItems.length === 0}
                      payLabel={t.checkout.payButton}
                      processingLabel={t.checkout.processing}
                      loadingLabel={t.checkout.loadingCard}
                      notConfiguredLabel={t.checkout.cardNotConfigured}
                      createIntent={createRetailPaymentIntent}
                      onPaid={(id) => completeRetailOrder(id, "card")}
                      onError={handlePaymentError}
                    />
                  )}

                  {paymentMethod === "apple_pay" && (
                    <ApplePayCheckout
                      amountAed={total}
                      orderLabel={t.checkout.applePayOrderLabel}
                      disabled={isSubmitting || displayItems.length === 0}
                      processingLabel={t.checkout.processing}
                      loadingLabel={t.checkout.loadingApplePay}
                      unavailableLabel={t.checkout.applePayUnavailable}
                      notConfiguredLabel={t.checkout.applePayNotConfigured}
                      createIntent={createRetailPaymentIntent}
                      onPaid={(id) => completeRetailOrder(id, "apple_pay")}
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
