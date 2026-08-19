// app/[locale]/custom-order/checkout/page.tsx
// COMPLETE UPDATED FILE

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
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
import { FormPageSkeleton } from "@/components/ui/Skeleton";
import CardPaymentForm from "@/components/payments/CardPaymentForm";
import SuccessModal from "@/components/shared/SuccessModal";
import EmailVerifyRequiredNotice from "@/components/auth/EmailVerifyRequiredNotice";
import {
  buildVerifyEmailHref,
  isEmailVerificationGateError,
} from "@/lib/auth/emailVerification";
import { getTranslation } from "@/lib/getTranslation";
import toast from "react-hot-toast";
import { ERROR_TOAST } from "@/lib/tailorPortalToast";
import {
  isValidUaePhone,
  normalizeUaePhone,
  extractDigits,
} from "@/lib/uaePhone";
import {
  UAE_EMIRATES,
  isValidEmirate,
  normalizeEmirate,
} from "@/lib/uaeAddress";

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
  const tVerify = getTranslation(locale).verifyEmail;
  const {
    draft,
    isHydrated,
    updateDeliveryAddress,
    resetOrder,
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
  const [paymentMethod, setPaymentMethod] = useState<"apple_pay" | "card">(
    "card",
  );
  const [emailVerifyEmphasize, setEmailVerifyEmphasize] = useState(false);
  const emailVerifyNoticeRef = useRef<HTMLDivElement>(null);

  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const needsEmailVerify = needsEmailVerification(user) && !user?.isGuest;

  const verifyEmailHref = buildVerifyEmailHref({
    locale,
    mode: "checkout",
    next: "/custom-order/checkout",
  });

  const requireEmailVerified = () => {
    if (!needsEmailVerify) return true;
    setEmailVerifyEmphasize(true);
    emailVerifyNoticeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
    return false;
  };

  useEffect(() => {
    if (!needsEmailVerify) setEmailVerifyEmphasize(false);
  }, [needsEmailVerify]);

  const [addons, setAddons] = useState<any[]>([]);
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        const data = await api.get<{ success: boolean; items: any[] }>(
          "/api/addons",
        );
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

  useEffect(() => {
    async function fetchCustomerOrMemberAddress() {
      if (!isAuthenticated) return;
      if (user?.isGuest) {
        updateDeliveryAddress({
          fullName: "",
          phone: "",
          emirate: "",
          city: "",
          line1: "",
          line2: "",
          postalCode: "",
        });
        setProfileLoading(false);
        return;
      }
      try {
        setProfileLoading(true);

        const data = await api.get<CustomerProfile>("/api/customer/profile");
        setCustomerProfile(data);

        const addresses = data.addresses || [];
        if (addresses.length > 0) {
          const defaultAddr =
            addresses.find((a) => a.isDefault) || addresses[0];
          setSelectedAddressId(defaultAddr._id || "");
          const normalizedPhone = normalizeUaePhone(
            defaultAddr.phone || data.phone || "",
          );
          updateDeliveryAddress({
            fullName: defaultAddr.fullName || data.name || "",
            phone: normalizedPhone,
            emirate: defaultAddr.emirate || "",
            city: defaultAddr.city || "",
            line1: defaultAddr.street || "",
            line2: defaultAddr.building || "",
            postalCode: defaultAddr.postalCode || "",
          });
        } else {
          const normalizedPhone = normalizeUaePhone(data.phone || "");
          updateDeliveryAddress({
            fullName: data.name || "",
            phone: normalizedPhone,
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
  }, [isAuthenticated, updateDeliveryAddress, user]);

  // --- Address selection handler ---
  const handleAddressSelect = (addressId: string) => {
    if (!customerProfile?.addresses) return;
    const address = customerProfile.addresses.find((a) => a._id === addressId);
    if (!address) return;

    setSelectedAddressId(addressId);
    const normalizedPhone = normalizeUaePhone(address.phone || "");
    updateDeliveryAddress({
      fullName: address.fullName || "",
      phone: normalizedPhone,
      emirate: address.emirate || "",
      city: address.city || "",
      line1: address.street || "",
      line2: address.building || "",
      postalCode: address.postalCode || "",
    });

    setErrors({});
    if (submitError) setSubmitError(null);
  };

  useEffect(() => {
    if (!isHydrated || !previewPayload) return;

    const fetchPreview = async () => {
      try {
        setLoadingPricing(true);
        setPricingError(null);

        const payload = {
          ...previewPayload,
          deliveryType: "delivery" as const,
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
  }, [isHydrated, previewPayload, t, draft.addonIds]);

  const getDisplayName = (name?: string, nameAr?: string) =>
    locale === "ar" ? nameAr || name : name;

  const address = draft.deliveryAddress;

  const getPhoneDisplayValue = (phone: string): string => {
    if (!phone) return "";
    const digits = extractDigits(phone);
    if (digits.startsWith("971")) {
      return digits.slice(3);
    }
    return digits.slice(0, 9);
  };

  const handleFieldChange = (field: FormField, value: string) => {
    let processedValue = value;
    if (field === "phone") {
      const digits = extractDigits(value);
      if (digits.length <= 9) {
        processedValue = normalizeUaePhone(digits);
      } else {
        return;
      }
    }
    if (field === "emirate") {
      processedValue = normalizeEmirate(value);
    }
    updateDeliveryAddress({ [field]: processedValue });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
    if (submitError) setSubmitError(null);
  };

  const validateForm = (): CustomOrderDeliveryAddress | null => {
    const nextErrors: Partial<Record<FormField, string>> = {};

    for (const field of REQUIRED_FIELDS) {
      const value = address[field]?.trim();
      if (!value) {
        nextErrors[field] = t("required");
      }
    }

    if (!address.emirate?.trim()) {
      nextErrors.emirate = t("required");
    } else if (!isValidEmirate(address.emirate)) {
      nextErrors.emirate =
        locale === "ar" ? "الإمارة غير صالحة" : "Valid UAE emirate required";
    }

    if (!address.phone?.trim() || address.phone === "+971") {
      nextErrors.phone = t("required");
    } else if (!isValidUaePhone(address.phone)) {
      nextErrors.phone =
        locale === "ar"
          ? "رقم الهاتف غير صحيح. يجب أن يكون 9 أرقام بعد +971"
          : "Invalid phone number. Must be 9 digits after +971";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return null;

    const isArabic = locale === "ar";
    const guestSuffix = isArabic ? " - زائر" : " - Guest";
    const submittedName = user?.isGuest
      ? `${address.fullName!.trim()}${guestSuffix}`
      : address.fullName!.trim();

    return {
      fullName: submittedName,
      phone: normalizeUaePhone(address.phone!.trim()),
      line1: address.line1!.trim(),
      line2: address.line2?.trim() || "",
      city: address.city!.trim(),
      emirate: normalizeEmirate(address.emirate!.trim()),
      postalCode: address.postalCode?.trim() || "",
    };
  };

  const buildOrderPayload = () => {
    const deliveryAddress = validateForm();
    if (!deliveryAddress) {
      throw new Error(t("required"));
    }

    const payload = buildCustomOrderCreatePayload(
      draft,
      deliveryAddress,
      paymentMethod,
    );
    if (!payload) {
      throw new Error(t("incompleteDraft"));
    }

    return {
      ...payload,
      addPocket,
      addBottomWideFold,
      deliveryType: "delivery" as const,
      deliveryAddress,
      addonIds: draft.addonIds || [],
    };
  };

  const createCustomPaymentIntent = async (): Promise<{
    clientSecret: string;
    paymentIntentId: string;
  } | null> => {
    if (!requireEmailVerified()) return null;

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
    } catch (err: unknown) {
      if (isEmailVerificationGateError(err)) {
        requireEmailVerified();
        return null;
      }
      const message = err instanceof Error ? err.message : t("submitError");
      toast.error(message, ERROR_TOAST);
      throw err;
    }
  };

  const completeCustomOrder = async (
    paymentIntentId: string,
    method: "apple_pay" | "card" = "apple_pay",
  ) => {
    if (!requireEmailVerified()) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const orderPayload = buildOrderPayload();
      let response: {
        success: boolean;
        orderId: string;
        message?: string;
      };

      try {
        response = await api.post("/api/orders/custom", {
          ...orderPayload,
          paymentMethod: method,
          paymentIntentId,
        });
      } catch (orderErr) {
        if (isEmailVerificationGateError(orderErr)) {
          requireEmailVerified();
          return;
        }
        response = await api.post("/api/payments/reconcile", {
          paymentIntentId,
          paymentMethod: method,
        });
        if (!response?.success) {
          throw orderErr;
        }
      }

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
      resetOrder();
      setShowSuccess(true);
    } catch (err: unknown) {
      if (isEmailVerificationGateError(err)) {
        requireEmailVerified();
        return;
      }
      const message =
        (err as ApiError)?.message ||
        (err instanceof Error ? err.message : t("submitError"));
      const recoveryHint =
        locale === "ar"
          ? " إذا تم خصم المبلغ، سيُنشأ طلبك تلقائياً — راجعي حسابك أو تواصلي مع الدعم مع مرجع الدفع."
          : " If you were charged, your order will be created automatically — check your account or contact support with the payment reference.";
      setSubmitError(message + recoveryHint);
      toast.error(message, ERROR_TOAST);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentError = (message: string) => {
    if (/verify your email/i.test(message)) {
      requireEmailVerified();
      return;
    }
    setSubmitError(message);
  };

  if (!isHydrated || isLoading || !isAuthenticated || profileLoading) {
    return <FormPageSkeleton fields={8} />;
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

          {needsEmailVerify ? (
            <EmailVerifyRequiredNotice
              ref={emailVerifyNoticeRef}
              className="mb-8"
              message={tVerify.gateCheckoutMessage}
              ctaLabel={tVerify.verifyNow}
              href={verifyEmailHref}
              emphasize={emailVerifyEmphasize}
            />
          ) : null}

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
                      {locale === "ar"
                        ? "الإضافات المختارة"
                        : "Selected Add-Ons"}
                    </h3>
                    <ul className="space-y-2">
                      {addons
                        .filter((a) => draft.addonIds.includes(a._id))
                        .map((addon) => {
                          const name =
                            locale === "ar"
                              ? addon.nameAr || addon.name
                              : addon.name;
                          return (
                            <li
                              key={addon._id}
                              className="flex justify-between items-center text-sm text-black"
                            >
                              <span className="[font-family:var(--font-body)] text-xs text-gray-700">
                                {name}
                              </span>
                              <span className="font-semibold text-xs">
                                {addon.price.toFixed(2)} AED
                              </span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                )}

                {pricing && (pricing.deliveryBreakdown?.length ?? 0) > 0 && (
                  <div className="pt-4 border-t border-(--color-border) mb-4 space-y-2">
                    <h3 className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2">
                      {locale === "ar" ? "التوصيل" : "Delivery"}
                    </h3>
                    {pricing.deliveryBreakdown!.map((line) => (
                      <div
                        key={line.key}
                        className="flex justify-between gap-4 text-xs text-gray-700"
                      >
                        <span>{line.label}</span>
                        <span className="shrink-0 font-semibold text-black">
                          {formatCurrency(line.fee, locale)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 text-xs pt-1 border-t border-(--color-border)/50">
                      <span className="text-(--color-grey-muted)">
                        {locale === "ar" ? "إجمالي التوصيل" : "Delivery total"}
                      </span>
                      <span className="font-semibold text-black shrink-0">
                        {formatCurrency(pricing.deliveryFee, locale)}
                      </span>
                    </div>
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
              <div className="border border-(--color-border) bg-white p-6 sm:p-8 mb-6">
                <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
                  {t("deliveryTitle")}
                </h2>

                {/* Address Dropdown */}
                {customerProfile?.addresses &&
                  customerProfile.addresses.length > 0 && (
                    <div className="mb-6 p-3 bg-gray-50/80 rounded-lg border border-gray-200/60">
                      <label className="font-label-sm text-[11px] md:text-[12px] text-black/50 uppercase tracking-[0.2em] block mb-2">
                        Select Address
                      </label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => handleAddressSelect(e.target.value)}
                        className="w-full h-11 md:h-12 bg-white border border-gray-200/80 rounded-md px-3 text-[15px] md:text-[16px] font-body-md transition-all focus:border-black/40 focus:outline-none focus:ring-0 text-black"
                      >
                        {customerProfile.addresses.map((addr, index) => (
                          <option
                            key={addr._id || index}
                            value={addr._id || ""}
                          >
                            {addr.fullName} - {addr.city}{" "}
                            {addr.isDefault ? "(Default)" : ""}
                          </option>
                        ))}
                      </select>
                      <p className="text-[11px] text-gray-400 mt-1.5">
                        {locale === "ar"
                          ? "اختر عنوانك للشحن"
                          : "Select your shipping address"}
                      </p>
                    </div>
                  )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label
                      htmlFor="checkout-fullName"
                      className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                    >
                      {t("fullName")}*
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id="checkout-fullName"
                        type="text"
                        value={address.fullName || ""}
                        readOnly
                        className="w-full border border-(--color-border) bg-gray-50 px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0"
                      />
                      {user?.isGuest && (
                        <span
                          className={`absolute ${locale === "ar" ? "left-4" : "right-4"} text-gray-400 select-none pointer-events-none font-medium text-[15px]`}
                        >
                          {locale === "ar" ? " - زائر" : " - Guest"}
                        </span>
                      )}
                    </div>
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
                    <div className="relative flex items-center">
                      <span
                        className={`absolute ${locale === "ar" ? "right-4" : "left-4"} text-gray-500 font-mono text-[15px]`}
                      >
                        +971
                      </span>
                      <input
                        id="checkout-phone"
                        type="tel"
                        value={getPhoneDisplayValue(address.phone || "")}
                        readOnly
                        className={`w-full border border-(--color-border) bg-gray-50 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0 ${
                          locale === "ar"
                            ? "pr-16 pl-4 text-right"
                            : "pl-16 pr-4 text-left"
                        }`}
                      />
                    </div>
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
                    <input
                      id="checkout-emirate"
                      type="text"
                      value={address.emirate || ""}
                      readOnly
                      className="w-full border border-(--color-border) bg-gray-50 px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0"
                    />
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
                      readOnly
                      className="w-full border border-(--color-border) bg-gray-50 px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0"
                    />
                    {errors.city && (
                      <p className="text-red-600 text-[12px] mt-1">
                        {errors.city}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
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
                        readOnly
                        className="w-full border border-(--color-border) bg-gray-50 px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0"
                      />
                      {errors.line1 && (
                        <p className="text-red-600 text-[12px] mt-1">
                          {errors.line1}
                        </p>
                      )}
                    </div>

                    <div>
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
                        readOnly
                        className="w-full border border-(--color-border) bg-gray-50 px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="checkout-postalCode"
                      className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                    >
                      {t("postalCode")}
                      <span className="normal-case font-normal text-(--color-grey-muted) ml-1">
                        ({t("optional")})
                      </span>
                    </label>
                    <input
                      id="checkout-postalCode"
                      type="text"
                      value={address.postalCode || ""}
                      readOnly
                      placeholder="12345"
                      className="w-full border border-(--color-border) bg-gray-50 px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black cursor-not-allowed focus:outline-none focus:ring-0"
                    />
                  </div>
                </div>

                {usingOwnFabric && (
                  <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-6">
                    {t("ownFabricPickupNote")}
                  </p>
                )}
              </div>

              <div className="border border-(--color-border) bg-white p-6 sm:p-8 mb-6">
                <h2 className="[font-family:var(--font-display)] text-[22px] mb-4">
                  {t("paymentTitle")}
                </h2>
                <div className="space-y-3">
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
                        {t("cardLabel")}
                      </span>
                      <span className="block [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-0.5">
                        {t("cardDescription")}
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

              {paymentMethod === "card" && (
                <CardPaymentForm
                  amountAed={pricing?.total ?? 0}
                  cardholderName={
                    user?.isGuest
                      ? `${address.fullName?.trim()} - ${locale === "ar" ? "زائر" : "Guest"}`
                      : address.fullName || ""
                  }
                  disabled={
                    isSubmitting ||
                    loadingPricing ||
                    !pricing ||
                    !measurementsConfirmed
                  }
                  payLabel={t("payButton")}
                  processingLabel={t("processing")}
                  loadingLabel={t("loadingCard")}
                  notConfiguredLabel={t("cardNotConfigured")}
                  createIntent={createCustomPaymentIntent}
                  onPaid={(id) => completeCustomOrder(id, "card")}
                  onError={handlePaymentError}
                />
              )}

              {paymentMethod === "apple_pay" && (
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
                  onPaid={(id) => completeCustomOrder(id, "apple_pay")}
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
