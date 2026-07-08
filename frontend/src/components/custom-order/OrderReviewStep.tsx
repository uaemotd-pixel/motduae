"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
  buildCustomOrderPreviewPayload,
  CUSTOM_ORDER_MEASUREMENT_FIELD_KEYS,
  CUSTOM_ORDER_TOTAL_STEPS,
  getCustomOrderEntryPath,
  getCustomOrderStepNumber,
  isReviewStepComplete,
  type CustomOrderMeasurements,
  type CustomOrderPricingBreakdown,
  useOwnFabric,
  WARA_TO_METERS,
  type FabricUnit,
} from "@/lib/customOrder";
import { formatCurrency } from "@/lib/format";
import { formatDesignCategory } from "@/lib/tailors";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

type DeliveryType = "pickup" | "delivery";

function hasAnyMeasurements(measurements: CustomOrderMeasurements): boolean {
  return CUSTOM_ORDER_MEASUREMENT_FIELD_KEYS.some(
    (field) => measurements[field] !== null,
  );
}

export default function OrderReviewStep() {
  const t = useTranslations("CustomOrderReview");
  const tMeasurements = useTranslations("CustomOrderMeasurements");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const { draft, isHydrated, deliveryType, setDeliveryType } = useCustomOrder();
  const usingOwnFabric = useOwnFabric(draft);

  const [pricing, setPricing] = useState<CustomOrderPricingBreakdown | null>(
    null,
  );
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [shippingFee, setShippingFee] = useState<number | null>(null);
  const [vatRate, setVatRate] = useState<number | null>(null);

  const previewPayload = useMemo(
    () => (isHydrated ? buildCustomOrderPreviewPayload(draft) : null),
    [draft, isHydrated],
  );

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.get<{
          defaultDeliveryFee: number;
          vatRate: number;
        }>("/api/orders/settings");
        setShippingFee(data.defaultDeliveryFee);
        setVatRate(data.vatRate);
      } catch (error) {
        console.error("Failed to fetch settings:", error);
        setShippingFee(35);
        setVatRate(0.05);
      }
    };
    fetchSettings();
  }, []);

  // Recalculate pricing when delivery type changes
  useEffect(() => {
    if (!isHydrated) return;
    if (!previewPayload) {
      setPricing(null);
      setPricingError(null);
      return;
    }
    if (shippingFee === null || vatRate === null) return;

    const fetchPreview = async () => {
      try {
        setLoadingPricing(true);
        setPricingError(null);

        const payload = {
          ...previewPayload,
          deliveryType,
        };

        const data = await api.post<{
          success: boolean;
          pricing: CustomOrderPricingBreakdown;
        }>("/api/orders/custom/preview", payload);

        if (!data?.success || !data.pricing) {
          throw new Error("Failed to load price preview");
        }

        setPricing(data.pricing);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : t("pricingError"));
        setPricingError(message);
      } finally {
        setLoadingPricing(false);
      }
    };

    fetchPreview();
  }, [isHydrated, previewPayload, deliveryType, t, shippingFee, vatRate]);

  const canContinue = isReviewStepComplete(draft, pricing !== null);

  const getDisplayName = (name?: string, nameAr?: string) =>
    locale === "ar" ? nameAr || name : name;

  const vatPercent = vatRate !== null ? Math.round(vatRate * 100) : 5;
  const stepNumber = getCustomOrderStepNumber("review", draft.firstStep);
  const editOrderPath = getCustomOrderEntryPath(draft.firstStep);

  const handleContinue = () => {
    if (!canContinue) return;
    router.push("/custom-order/checkout");
  };

  const invalidPreviewReason = useMemo(() => {
    if (!draft.lineItems || draft.lineItems.length === 0) {
      // Fallback string so we don't crash when translation keys are missing
      return "Add at least one item to calculate pricing.";
    }

    if (draft.fabricSource === "storefront") {
      const missingFabric = draft.lineItems.some((li) => !li.fabric);
      if (missingFabric) return "Please select fabric for all items.";
    }

    const invalidMeters = draft.lineItems.some((li) => {
      if (li.fabricMeters === null) return true;
      if (li.fabricMeters === 0) return true;
      const metersInMeters =
        li.fabricUnit === "wara"
          ? li.fabricMeters * WARA_TO_METERS
          : li.fabricMeters;
      return metersInMeters < 2 || metersInMeters > 7;
    });

    if (invalidMeters) return t("pricingNotReady.invalidMeters");
    // Fallback for any other invalid state.
    return t("pricingNotReady.generic");
  }, [draft.fabricSource, draft.lineItems, t]);

  if (!isHydrated) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <ConfiguratorStepHeader
        title={t("title")}
        description={t("description")}
        stepLabel={t("stepLabel", {
          step: stepNumber,
          total: CUSTOM_ORDER_TOTAL_STEPS,
        })}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
        {/* Left column - Order summary */}
        <section className="border border-(--color-border) bg-[#FDFAF5] p-6 sm:p-8">
          <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
            {t("summaryTitle")}
            {draft.lineItems.length > 1 && (
              <span className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mt-2">
                {t("itemCount", { count: draft.lineItems.length })}
              </span>
            )}
          </h2>

          <div className="space-y-6 mb-6">
            {draft.lineItems.map((item) => {
              const designName = getDisplayName(
                item.design.name,
                item.design.nameAr,
              );
              const fabricName = item.fabric
                ? getDisplayName(item.fabric.name, item.fabric.nameAr)
                : t("ownFabric");
              const tailorName = getDisplayName(
                item.tailor.name,
                item.tailor.nameAr,
              );
              const category = formatDesignCategory(
                item.design.category,
                locale,
              );

              return (
                <div
                  key={item.id}
                  className="border-b border-(--color-border) pb-4 last:border-b-0 last:pb-0"
                >
                  <dl className="space-y-3">
                    <div>
                      <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                        {t("design")}
                      </dt>
                      <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                        {designName}
                        {category && (
                          <span className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-1">
                            {category}
                          </span>
                        )}
                      </dd>
                    </div>

                    <div>
                      <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                        {t("tailor")}
                      </dt>
                      <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                        {tailorName}
                      </dd>
                    </div>

                    <div>
                      <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                        {t("fabric")}
                      </dt>
                      <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                        {fabricName}
                      </dd>
                    </div>

                    <div>
                      <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                        {t("fabricMeters")}
                      </dt>
                      <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                        {item.fabricMeters ? (
                          <span>
                            {item.fabricUnit === "wara"
                              ? `${item.fabricMeters.toFixed(2)} wara / ${(item.fabricMeters * WARA_TO_METERS).toFixed(2)} ${t("meters")}`
                              : `${item.fabricMeters} ${t("meters")} / ${(item.fabricMeters / WARA_TO_METERS).toFixed(2)} wara`}
                          </span>
                        ) : (
                          "—"
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <dl className="space-y-4 pt-4 border-t border-(--color-border)">
            <div>
              <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                {t("measurements")}
              </dt>
              <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                {hasAnyMeasurements(draft.measurements) ? (
                  <ul className="space-y-1 mt-1">
                    {CUSTOM_ORDER_MEASUREMENT_FIELD_KEYS.map((field) => {
                      const value = draft.measurements[field];
                      if (value === null) return null;

                      return (
                        <li
                          key={field}
                          className="[font-family:var(--font-ui)] text-[11px] tracking-[0.12em] uppercase text-(--color-grey-muted)"
                        >
                          {tMeasurements(`fields.${field}`)}: {value}{" "}
                          {tMeasurements("unit")}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  t("measurementsNotProvided")
                )}

                {draft.measurements.notes.trim() && (
                  <p className="mt-3 text-[14px] normal-case tracking-normal text-(--color-grey-muted)">
                    <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-black block mb-1">
                      {t("notes")}
                    </span>
                    {draft.measurements.notes}
                  </p>
                )}
              </dd>
            </div>
          </dl>
        </section>

        {/* Right column - Pricing with toggle */}
        <section className="border border-(--color-border) bg-white p-6 sm:p-8">
          <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
            {t("pricingTitle")}
          </h2>

          {pricingError ? (
            <p className="text-red-600 py-8">{pricingError}</p>
          ) : pricing ? (
            <div className="relative">
              {loadingPricing && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                  <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {t("loadingPricing")}
                  </p>
                </div>
              )}

              <div className={loadingPricing ? "opacity-50" : ""}>
                <div className="space-y-3 [font-family:var(--font-body)] text-[14px]">
                  <div className="flex justify-between gap-4">
                    <span className="text-(--color-grey-muted)">
                      {t("lines.designBase")}
                    </span>
                    <span className="text-black shrink-0">
                      {formatCurrency(pricing.designBase, locale)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-(--color-grey-muted)">
                      {t("lines.fabricCost")}
                      {!usingOwnFabric && pricing.fabricPricePerMeter > 0 && (
                        <span className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.12em] mt-1">
                          {t("lines.fabricDetail", {
                            meters: pricing.fabricMeters,
                            pricePerMeter: formatCurrency(
                              pricing.fabricPricePerMeter,
                              locale,
                            ),
                          })}
                        </span>
                      )}
                    </span>
                    <span className="text-black shrink-0">
                      {formatCurrency(pricing.fabricCost, locale)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-(--color-grey-muted)">
                      {t("lines.tailoringFee")}
                    </span>
                    <span className="text-black shrink-0">
                      {formatCurrency(pricing.tailoringFee, locale)}
                    </span>
                  </div>

                  {/* Delivery/Pickup Toggle */}
                  <div className="py-3 border-t border-(--color-border) first:border-t-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <span className="text-(--color-grey-muted) [font-family:var(--font-body)] text-[14px]">
                        Delivery Method
                      </span>

                      <div className="flex items-center justify-between sm:justify-end gap-2">
                        <label className="inline-flex items-center cursor-pointer select-none">
                          <span
                            className={`text-[10px] uppercase tracking-[0.2em] font-ui transition-colors mr-2 ${
                              deliveryType === "pickup"
                                ? "text-black"
                                : "text-gray-400"
                            }`}
                          >
                            Pickup
                          </span>
                          <input
                            type="checkbox"
                            checked={deliveryType === "delivery"}
                            onChange={(e) =>
                              setDeliveryType(
                                e.target.checked ? "delivery" : "pickup",
                              )
                            }
                            className="sr-only peer"
                          />
                          <div className="relative w-11 h-6 bg-[#D1CDC5] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-0.5 after:inset-s-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black shadow-inner" />
                          <span
                            className={`text-[10px] uppercase tracking-[0.2em] font-ui transition-colors ml-2 ${
                              deliveryType === "delivery"
                                ? "text-black"
                                : "text-gray-400"
                            }`}
                          >
                            Delivery
                          </span>
                        </label>
                      </div>
                    </div>

                    <p className="mt-1.5 text-[10px] text-gray-400 font-ui tracking-[0.12em] text-right">
                      {deliveryType === "delivery"
                        ? `AED ${shippingFee ?? 35} delivery fee applies`
                        : "Free pickup from store"}
                    </p>
                  </div>

                  <div className="flex justify-between gap-4 pt-3 border-t border-(--color-border)">
                    <span className="text-(--color-grey-muted)">
                      {t("lines.subtotal")}
                    </span>
                    <span className="text-black shrink-0">
                      {formatCurrency(pricing.subtotal, locale)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-(--color-grey-muted)">
                      {t("lines.vat", { rate: vatPercent })}
                    </span>
                    <span className="text-black shrink-0">
                      {formatCurrency(pricing.vatAmount, locale)}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 pt-3 border-t border-black">
                    <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-black">
                      {t("lines.total")}
                    </span>
                    <span className="[font-family:var(--font-display)] text-[22px] text-black shrink-0">
                      {formatCurrency(pricing.total, locale)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : loadingPricing ? (
            <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted) py-8">
              {t("loadingPricing")}
            </p>
          ) : (
            <p className="text-(--color-grey-muted) py-8">
              {invalidPreviewReason}
            </p>
          )}
        </section>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-(--color-border)">
        <Link
          href="/custom-order/measurements"
          className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
        >
          {t("backToMeasurements")}
        </Link>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <Link
            href={editOrderPath}
            className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) border-b border-(--color-grey-muted) pb-0.5 hover:opacity-50 transition text-center"
          >
            {t("editOrder")}
          </Link>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed [font-family:var(--font-ui)] hover:cursor-pointer"
          >
            {t("continue")}
          </button>
        </div>
      </div>
    </div>
  );
}
