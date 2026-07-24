"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
  buildCustomOrderCreatePayload,
  buildCustomOrderPreviewPayload,
  getCustomOrderResumePath,
  type CustomOrderDeliveryAddress,
  type CustomOrderPricingBreakdown,
  useOwnFabric,
} from "@/lib/customOrder";
import { formatCurrency } from "@/lib/format";
import CustomOrderJourneyRibbon from "@/components/custom-order/CustomOrderJourneyRibbon";
import ApplePayCheckout from "@/components/payments/ApplePayCheckout";
import SuccessModal from "@/components/shared/SuccessModal";
import toast from "react-hot-toast";
import { ERROR_TOAST } from "@/lib/tailorPortalToast";

const EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
];

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

type TailorShop = {
  _id: string;
  name: string;
  nameAr: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  logo?: string;
  coverImage?: string;
  location?: string;
  city?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
  ownerId?: string;
  isActive?: boolean;
};

type FormField = keyof CustomOrderDeliveryAddress;

const REQUIRED_FIELDS: FormField[] = [
  "fullName",
  "phone",
  "line1",
  "city",
  "emirate",
];

export default function CustomOrderCheckoutStep() {
  const t = useTranslations("CustomOrderCheckout");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const { user, isLoading, isAuthenticated } = useAuth();
  const {
    draft,
    isHydrated,
    updateDeliveryAddress,
    resetOrder,
    deliveryType,
    addPocket,
    addBottomWideFold,
  } = useCustomOrder();
  const usingOwnFabric = useOwnFabric(draft);

  const [pricing, setPricing] = useState<CustomOrderPricingBreakdown | null>(
    null,
  );
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FormField, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [successOrderItems, setSuccessOrderItems] = useState<
    Array<{ name: string }>
  >([]);
  const [measurementsConfirmed, setMeasurementsConfirmed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "apple_pay">(
    "cod",
  );

  const [profileLoading, setProfileLoading] = useState(true);
  const [tailorShop, setTailorShop] = useState<TailorShop | null>(null);
  const [shopLoading, setShopLoading] = useState(true);

  const [addons, setAddons] = useState<any[]>([]);
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const data = await api.get<{ success: boolean; items: any[] }>("/api/addons");
        if (data && data.success) {
          setAddons(data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch addons in checkout:", err);
      }
    };
    fetchAddons();
  }, []);

  const previewPayload = useMemo(
    () => (isHydrated ? buildCustomOrderPreviewPayload(draft) : null),
    [draft, isHydrated],
  );

  useEffect(() => {
    if (isLoading || !isHydrated) return;

    if (!isAuthenticated) {
      const redirect = encodeURIComponent(`/${locale}/custom-order/checkout`);
      router.push(`/auth/login?redirect=${redirect}`);
    }
  }, [isLoading, isAuthenticated, isHydrated, locale, router]);

  useEffect(() => {
    if (!isHydrated || isLoading || !isAuthenticated || showSuccess) return;

    if (!previewPayload) {
      router.push(getCustomOrderResumePath(draft));
    }
  }, [
    isLoading,
    draft,
    isAuthenticated,
    isHydrated,
    previewPayload,
    router,
    showSuccess,
  ]);

  // Fetch tailor shop by tailor slug from draft
  useEffect(() => {
    async function fetchTailorShop() {
      const firstItem = draft.lineItems[0];
      if (!firstItem?.tailor?.slug) {
        setShopLoading(false);
        return;
      }

      try {
        setShopLoading(true);
        const data = await api.get<{
          success: boolean;
          item: TailorShop;
        }>(`/api/tailors/${firstItem.tailor.slug}`);

        if (data.success && data.item) {
          setTailorShop(data.item);
        }
      } catch (err: any) {
        if (err.status !== 404) {
          console.error("Failed to fetch tailor shop:", err);
        }
      } finally {
        setShopLoading(false);
      }
    }

    if (isHydrated && draft.lineItems.length > 0) {
      fetchTailorShop();
    }
  }, [isHydrated, draft.lineItems]);

  // In CustomOrderCheckoutStep - replace useEffect
  useEffect(() => {
    async function fetchCustomerOrMemberAddress() {
      if (!isAuthenticated) return;
      try {
        setProfileLoading(true);

        // NOTE: CustomOrderDraft currently only stores a deliveryAddress.
        // MeasurementsStep selection is NOT persisted into draft, so by design we
        // can only fetch the authenticated user's default customer address here.
        console.log("👤 Fetching customer profile for delivery address");

        const data = await api.get<CustomerProfile>("/api/customer/profile");
        const defaultAddr =
          data.addresses?.find((a) => a.isDefault) || data.addresses?.[0];

        if (defaultAddr) {
          updateDeliveryAddress({
            fullName: defaultAddr.fullName || data.name || "",
            phone: defaultAddr.phone || data.phone || "",
            emirate: defaultAddr.emirate || "",
            city: defaultAddr.city || "",
            line1: defaultAddr.street || "",
            line2: defaultAddr.building || "",
          });
        } else {
          updateDeliveryAddress({
            fullName: data.name || "",
            phone: data.phone || "",
          });
        }
      } catch (err: any) {
        if (err.status !== 404) {
          console.error("Failed to fetch customer profile:", err);
        }
      } finally {
        setProfileLoading(false);
      }
    }

    fetchCustomerOrMemberAddress();
  }, [isAuthenticated, updateDeliveryAddress]);

  useEffect(() => {
    if (!isHydrated || !previewPayload) return;

    const fetchPreview = async () => {
      try {
        setLoadingPricing(true);
        setPricingError(null);

        const payload = {
          ...previewPayload,
          deliveryType,
          addonIds: draft.addonIds || [],
        };

        const data = await api.post<{
          success: boolean;
          pricing: CustomOrderPricingBreakdown;
        }>("/api/orders/custom/preview", payload);

        if (!data?.success || !data.pricing) {
          throw new Error("Failed to load pricing");
        }

        setPricing(data.pricing);
      } catch (err: unknown) {
        setPricing(null);
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : t("pricingError"));
        setPricingError(message);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPreview();
  }, [isHydrated, previewPayload, deliveryType, t, draft.addonIds]);

  const getDisplayName = (name?: string, nameAr?: string) =>
    locale === "ar" ? nameAr || name : name;

  const getShopDisplayName = () => {
    if (!tailorShop) return "Store";
    return locale === "ar"
      ? tailorShop.nameAr || tailorShop.name
      : tailorShop.name;
  };

  const getShopLocation = () => {
    if (!tailorShop) return "";
    return tailorShop.location || "";
  };

  const getShopCity = () => {
    if (!tailorShop) return "";
    return tailorShop.city || "";
  };

  const address = draft.deliveryAddress;

  const handleFieldChange = (field: FormField, value: string) => {
    updateDeliveryAddress({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validateForm = (): CustomOrderDeliveryAddress | null => {
    if (deliveryType === "pickup") {
      return null;
    }

    const nextErrors: Partial<Record<FormField, string>> = {};

    for (const field of REQUIRED_FIELDS) {
      const value = address[field]?.trim();
      if (!value) {
        nextErrors[field] = t("required");
      }
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    return {
      fullName: address.fullName!.trim(),
      phone: address.phone!.trim(),
      line1: address.line1!.trim(),
      line2: address.line2?.trim() || "",
      city: address.city!.trim(),
      emirate: address.emirate!.trim(),
    };
  };

  const buildOrderPayload = () => {
    let deliveryAddress: CustomOrderDeliveryAddress | undefined = undefined;

    if (deliveryType === "delivery") {
      const validated = validateForm();
      if (!validated) {
        throw new Error(t("required"));
      }
      deliveryAddress = validated;
    }

    const payload = buildCustomOrderCreatePayload(
      draft,
      deliveryAddress || (undefined as any),
      paymentMethod,
    );
    if (!payload) {
      throw new Error(t("incompleteDraft"));
    }

    return {
      ...payload,
      addPocket,
      addBottomWideFold,
      deliveryType,
      deliveryAddress: deliveryType === "delivery" ? deliveryAddress : null,
      addonIds: draft.addonIds || [],
    };
  };

  const createCustomPaymentIntent = async () => {
    if (!previewPayload) {
      toast.error(t("incompleteDraft"), ERROR_TOAST);
      throw new Error(t("incompleteDraft"));
    }

    if (!measurementsConfirmed) {
      toast.error(t("confirmMeasurementsLabel"), ERROR_TOAST);
      throw new Error(t("confirmMeasurementsLabel"));
    }

    try {
      const orderPayload = buildOrderPayload();
      const response = await api.post<{
        success: boolean;
        clientSecret: string;
        paymentIntentId: string;
        message?: string;
      }>("/api/payments/intent/custom", orderPayload);

      if (!response.success || !response.clientSecret) {
        throw new Error(response.message || t("submitError"));
      }

      return {
        clientSecret: response.clientSecret,
        paymentIntentId: response.paymentIntentId,
      };
    } catch (err: any) {
      const message = err.message || t("submitError");
      toast.error(message, ERROR_TOAST);
      throw err;
    }
  };

  const completeCustomOrder = async (paymentIntentId: string) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderPayload = buildOrderPayload();
      const response = await api.post<{
        success: boolean;
        orderId: string;
        message?: string;
      }>("/api/orders/custom", {
        ...orderPayload,
        paymentMethod: "apple_pay",
        paymentIntentId,
      });

      if (!response?.success || !response.orderId) {
        throw new Error(response.message || t("submitError"));
      }

      const orderItemNames = draft.lineItems.map((item) => ({
        name:
          getDisplayName(item.design.name, item.design.nameAr) ||
          t("unknownDesign"),
      }));

      setOrderId(response.orderId);
      setSuccessOrderItems(orderItemNames);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message =
        (err as ApiError)?.message ||
        (err instanceof Error ? err.message : t("submitError"));
      setSubmitError(message);
      toast.error(message, ERROR_TOAST);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (message: string) => {
    setSubmitError(message);
  };

  const placeCodOrder = async () => {
    if (!measurementsConfirmed) {
      const msg = t("confirmMeasurementsLabel");
      setSubmitError(msg);
      toast.error(msg, ERROR_TOAST);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderPayload = buildOrderPayload();
      const response = await api.post<{
        success: boolean;
        orderId: string;
        message?: string;
      }>("/api/orders/custom", {
        ...orderPayload,
        paymentMethod: "cod",
      });

      if (!response?.success || !response.orderId) {
        throw new Error(response.message || t("submitError"));
      }

      const orderItemNames = draft.lineItems.map((item) => ({
        name:
          getDisplayName(item.design.name, item.design.nameAr) ||
          t("unknownDesign"),
      }));

      setOrderId(response.orderId);
      setSuccessOrderItems(orderItemNames);
      setShowSuccess(true);
    } catch (err: unknown) {
      const message =
        (err as ApiError)?.message ||
        (err instanceof Error ? err.message : t("submitError"));
      setSubmitError(message);
      toast.error(message, ERROR_TOAST);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (
    !isHydrated ||
    isLoading ||
    !isAuthenticated ||
    profileLoading ||
    shopLoading
  ) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (!previewPayload && !showSuccess) {
    return null;
  }

  return (
    <>
      {previewPayload && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <CustomOrderJourneyRibbon />
          <div className="mb-10">
            <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3">
              {t("title")}
            </h1>
            <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
              {t("description")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-8">
            <div className="space-y-6">
              <aside className="border border-(--color-border) bg-[#FDFAF5] p-6 sm:p-8 h-fit">
                <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
                  {t("summaryTitle")}
                </h2>

                <dl className="space-y-4 mb-6">
                  {draft.lineItems.map((item) => (
                    <div
                      key={item.id}
                      className="border-b border-(--color-border) pb-4 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                          {t("design")}
                        </dt>
                        <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                          {getDisplayName(
                            item.design.name,
                            item.design.nameAr,
                          ) || "—"}
                        </dd>
                      </div>
                      <div className="mt-3">
                        <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                          {t("tailor")}
                        </dt>
                        <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                          {getDisplayName(
                            item.tailor.name,
                            item.tailor.nameAr,
                          ) || "—"}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>

                 {draft.addonIds && draft.addonIds.length > 0 && (
                   <div className="pt-4 border-t border-(--color-border) mb-4">
                     <h3 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-3">
                       {locale === "ar" ? "الإضافات المختارة" : "Selected Add-Ons"}
                     </h3>
                     <ul className="space-y-2">
                       {addons
                         .filter((a) => draft.addonIds.includes(a._id))
                         .map((addon) => {
                           const name = locale === "ar" ? addon.nameAr || addon.name : addon.name;
                           return (
                             <li key={addon._id} className="flex justify-between items-center text-sm text-black">
                               <span className="[font-family:var(--font-body)] text-xs text-gray-700">{name}</span>
                               <span className="font-semibold text-xs">{addon.price.toFixed(2)} AED</span>
                             </li>
                           );
                         })}
                     </ul>
                   </div>
                 )}

                  <div className="pt-4 border-t border-(--color-border) flex justify-between items-center gap-4">
                   <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-black">
                     {t("total")}
                   </span>
                   <span className="[font-family:var(--font-display)] text-[24px] text-black">
                     {pricing ? formatCurrency(pricing.total, locale) : "—"}
                   </span>
                  </div>
                </aside>
              </div>

            <section>
              {/* Delivery Address or Pickup Info */}
              {deliveryType === "delivery" ? (
                <div className="border border-(--color-border) bg-white p-6 sm:p-8 mb-6">
                  <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
                    {t("deliveryTitle")}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label
                        htmlFor="checkout-fullName"
                        className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                      >
                        {t("fullName")}*
                      </label>
                      <input
                        id="checkout-fullName"
                        type="text"
                        value={address.fullName || ""}
                        onChange={(e) =>
                          handleFieldChange("fullName", e.target.value)
                        }
                        className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition"
                      />
                      {errors.fullName && (
                        <p className="text-red-600 text-[12px] mt-1">
                          {errors.fullName}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-phone"
                        className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                      >
                        {t("phone")}*
                      </label>
                      <input
                        id="checkout-phone"
                        type="tel"
                        value={address.phone || ""}
                        onChange={(e) =>
                          handleFieldChange("phone", e.target.value)
                        }
                        className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition"
                      />
                      {errors.phone && (
                        <p className="text-red-600 text-[12px] mt-1">
                          {errors.phone}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-emirate"
                        className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                      >
                        {t("emirate")}*
                      </label>
                      <select
                        id="checkout-emirate"
                        value={address.emirate || ""}
                        onChange={(e) =>
                          handleFieldChange("emirate", e.target.value)
                        }
                        className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition"
                      >
                        <option value="">{t("selectEmirate")}</option>
                        {EMIRATES.map((emirate) => (
                          <option key={emirate} value={emirate}>
                            {emirate}
                          </option>
                        ))}
                      </select>
                      {errors.emirate && (
                        <p className="text-red-600 text-[12px] mt-1">
                          {errors.emirate}
                        </p>
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="checkout-city"
                        className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                      >
                        {t("city")}*
                      </label>
                      <input
                        id="checkout-city"
                        type="text"
                        value={address.city || ""}
                        onChange={(e) =>
                          handleFieldChange("city", e.target.value)
                        }
                        className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition"
                      />
                      {errors.city && (
                        <p className="text-red-600 text-[12px] mt-1">
                          {errors.city}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="checkout-line1"
                        className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                      >
                        {t("line1")}*
                      </label>
                      <input
                        id="checkout-line1"
                        type="text"
                        value={address.line1 || ""}
                        onChange={(e) =>
                          handleFieldChange("line1", e.target.value)
                        }
                        className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition"
                      />
                      {errors.line1 && (
                        <p className="text-red-600 text-[12px] mt-1">
                          {errors.line1}
                        </p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label
                        htmlFor="checkout-line2"
                        className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                      >
                        {t("line2")}
                      </label>
                      <input
                        id="checkout-line2"
                        type="text"
                        value={address.line2 || ""}
                        onChange={(e) =>
                          handleFieldChange("line2", e.target.value)
                        }
                        className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition"
                      />
                    </div>
                  </div>

                  {usingOwnFabric && (
                    <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-6">
                      {t("ownFabricPickupNote")}
                    </p>
                  )}
                </div>
              ) : (
                <div className="border border-(--color-border) bg-white p-6 sm:p-8 mb-6">
                  <h2 className="[font-family:var(--font-display)] text-[22px] mb-4">
                    {locale === "ar"
                      ? "معلومات الاستلام"
                      : "Pickup Information"}
                  </h2>
                  <div className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) space-y-2">
                    <p>
                      {locale === "ar"
                        ? "يمكنك استلام طلبك من المتجر في:"
                        : "You selected pickup. Collect your order from our store at:"}
                    </p>
                    <div className="mt-3 space-y-1">
                      <p className="font-semibold text-black">
                        {getShopDisplayName()}
                      </p>
                      {getShopLocation() && <p>{getShopLocation()}</p>}
                      {getShopCity() && <p>{getShopCity()}</p>}
                      {tailorShop?.phone && (
                        <p className="mt-2 text-sm">
                          <span className="text-(--color-grey-muted)">
                            {locale === "ar" ? "هاتف: " : "Phone: "}
                          </span>
                          {tailorShop.phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="mt-4 text-[12px] text-gray-400">
                    {locale === "ar"
                      ? "لا توجد رسوم توصيل."
                      : "No delivery fee applies."}
                  </p>
                </div>
              )}

              {/* Payment */}
              <div className="border border-(--color-border) bg-white p-6 sm:p-8 mb-6">
                <h2 className="[font-family:var(--font-display)] text-[22px] mb-4">
                  {t("paymentTitle")}
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
                        {t("codLabel")}
                      </span>
                      <span className="block [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-0.5">
                        {t("codDescription")}
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
                        {t("applePayDescription")}
                      </span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Confirm measurements */}
              <label className="flex items-start gap-3 mt-6 mb-6 cursor-pointer select-none">
                <input
                  type="checkbox"
                  id="confirm-measurements-checkbox"
                  checked={measurementsConfirmed}
                  onChange={(e) => setMeasurementsConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-black shrink-0"
                />
                <span className="[font-family:var(--font-body)] text-[13px] text-black leading-tight">
                  {t("confirmMeasurementsLabel")}
                </span>
              </label>

              {submitError && (
                <p className="text-red-600 text-sm mb-4">{submitError}</p>
              )}

              {paymentMethod === "cod" ? (
                <button
                  type="button"
                  onClick={placeCodOrder}
                  disabled={
                    isSubmitting ||
                    loadingPricing ||
                    !pricing ||
                    !measurementsConfirmed
                  }
                  className="w-full h-12 bg-black text-white [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t("processing") : t("placeOrder")}
                </button>
              ) : (
                <ApplePayCheckout
                  amountAed={pricing?.total ?? 0}
                  orderLabel={t("applePayOrderLabel")}
                  disabled={
                    isSubmitting ||
                    loadingPricing ||
                    !pricing ||
                    !measurementsConfirmed
                  }
                  processingLabel={t("processing")}
                  loadingLabel={t("loadingApplePay")}
                  unavailableLabel={t("applePayUnavailable")}
                  notConfiguredLabel={t("applePayNotConfigured")}
                  createIntent={createCustomPaymentIntent}
                  onPaid={completeCustomOrder}
                  onError={handlePaymentError}
                />
              )}

              <p className="[font-family:var(--font-body)] text-[12px] text-(--color-grey-muted) text-center mt-4">
                {t("agreeToTerms")}
              </p>
            </section>
          </div>

          <div className="pt-8 mt-8 border-t border-(--color-border)">
            <Link
              href="/custom-order/review"
              className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition"
            >
              {t("backToReview")}
            </Link>
          </div>
        </div>
      )}

      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          resetOrder();
          router.push("/account/userAccount?tab=orders");
        }}
        title={t("successTitle")}
        message={t("successMessage")}
        orderId={orderId ?? undefined}
        orderIdLabel={t("orderIdLabel")}
        itemsInOrderLabel={t("itemsInOrder")}
        okLabel={t("okButton")}
        orderItems={successOrderItems}
      />
    </>
  );
}
