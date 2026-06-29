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
import SuccessModal from "@/components/shared/SuccessModal";

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
  const { draft, isHydrated, updateDeliveryAddress, resetOrder } =
    useCustomOrder();
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

  const [profileLoading, setProfileLoading] = useState(true);

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
    async function fetchCustomerProfile() {
      if (!isAuthenticated) return;
      try {
        setProfileLoading(true);
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
          // No address: fill name and phone from top-level
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
    fetchCustomerProfile();
  }, [isAuthenticated, updateDeliveryAddress]);

  useEffect(() => {
    if (!isHydrated || !previewPayload) return;

    const fetchPreview = async () => {
      try {
        setLoadingPricing(true);
        setPricingError(null);

        const data = await api.post<{
          success: boolean;
          pricing: CustomOrderPricingBreakdown;
        }>("/api/orders/custom/preview", previewPayload);

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
  }, [isHydrated, previewPayload, t]);

  const getDisplayName = (name?: string, nameAr?: string) =>
    locale === "ar" ? nameAr || name : name;

  const address = draft.deliveryAddress;

  const handleFieldChange = (field: FormField, value: string) => {
    updateDeliveryAddress({ [field]: value });
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

  const handlePlaceOrder = async () => {
    const deliveryAddress = validateForm();
    if (!deliveryAddress || !previewPayload || isSubmitting) return;

    const payload = buildCustomOrderCreatePayload(draft, deliveryAddress);
    if (!payload) {
      setSubmitError(t("incompleteDraft"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await api.post<{
        success: boolean;
        orderId: string;
        message?: string;
      }>("/api/orders/custom", payload);

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
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isHydrated || isLoading || !isAuthenticated || profileLoading) {
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
          <div className="mb-10">
            <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3">
              {t("title")}
            </h1>
            <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
              {t("description")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-8">
            <aside className="border border-(--color-border) bg-[#FDFAF5] p-6 sm:p-8 h-fit">
              <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
                {t("summaryTitle")}
              </h2>

              <dl className="space-y-4 mb-6">
                {draft.lineItems.map((item) => (
                  <div key={item.id} className="border-b border-(--color-border) pb-4 last:border-b-0 last:pb-0">
                    <div>
                      <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                        {t("design")}
                      </dt>
                      <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                        {getDisplayName(item.design.name, item.design.nameAr) || "—"}
                      </dd>
                    </div>
                    <div className="mt-3">
                      <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                        {t("tailor")}
                      </dt>
                      <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                        {getDisplayName(item.tailor.name, item.tailor.nameAr) || "—"}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>

              <div className="pt-4 border-t border-(--color-border) flex justify-between items-center gap-4">
                <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-black">
                  {t("total")}
                </span>
                <span className="[font-family:var(--font-display)] text-[24px] text-black">
                  {pricing ? formatCurrency(pricing.total, locale) : "—"}
                </span>
              </div>
            </aside>

            <section>
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

              <div className="border border-(--color-border) bg-white p-6 sm:p-8 mb-6">
                <h2 className="[font-family:var(--font-display)] text-[22px] mb-4">
                  {t("paymentTitle")}
                </h2>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    id="custom-cod"
                    checked
                    readOnly
                    className="w-4 h-4 accent-black"
                  />
                  <label
                    htmlFor="custom-cod"
                    className="[font-family:var(--font-body)] text-[14px] text-black"
                  >
                    {t("codLabel")}
                  </label>
                </div>
                <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-2">
                  {t("codDescription")}
                </p>
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

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={
                  isSubmitting ||
                  loadingPricing ||
                  !pricing ||
                  !measurementsConfirmed
                }
                className="w-full px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed [font-family:var(--font-ui)]"
              >
                {isSubmitting
                  ? t("processing")
                  : pricing
                    ? `${t("placeOrder")} — ${formatCurrency(pricing.total, locale)}`
                    : t("placeOrder")}
              </button>

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
