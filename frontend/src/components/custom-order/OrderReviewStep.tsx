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
} from "@/lib/customOrder";
import { formatCurrency } from "@/lib/format";
import { formatDesignCategory } from "@/lib/tailors";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

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

    const { draft, isHydrated } = useCustomOrder();
    const usingOwnFabric = useOwnFabric(draft);

    const [pricing, setPricing] = useState<CustomOrderPricingBreakdown | null>(null);
    const [loadingPricing, setLoadingPricing] = useState(false);
    const [pricingError, setPricingError] = useState<string | null>(null);

    const previewPayload = useMemo(
        () => (isHydrated ? buildCustomOrderPreviewPayload(draft) : null),
        [draft, isHydrated],
    );

    useEffect(() => {
        if (!isHydrated) return;

        if (!previewPayload) {
            setPricing(null);
            setPricingError(t("incompleteDraft"));
            return;
        }

        const fetchPreview = async () => {
            try {
                setLoadingPricing(true);
                setPricingError(null);

                const data = await api.post<{
                    success: boolean;
                    pricing: CustomOrderPricingBreakdown;
                }>("/api/orders/custom/preview", previewPayload);

                if (!data?.success || !data.pricing) {
                    throw new Error("Failed to load price preview");
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

    const canContinue = isReviewStepComplete(draft, pricing !== null);

    const fabricLabel = usingOwnFabric
        ? t("ownFabric")
        : locale === "ar"
          ? draft.fabric?.nameAr || draft.fabric?.name
          : draft.fabric?.name;

    const tailorLabel =
        locale === "ar"
            ? draft.tailor?.nameAr || draft.tailor?.name
            : draft.tailor?.name;

    const designLabel =
        locale === "ar"
            ? draft.design?.nameAr || draft.design?.name
            : draft.design?.name;

    const designCategory = draft.design
        ? formatDesignCategory(draft.design.category, locale)
        : "";

    const vatPercent = pricing ? Math.round(pricing.vatRate * 100) : 5;
    const stepNumber = getCustomOrderStepNumber("review", draft.firstStep);
    const editOrderPath = getCustomOrderEntryPath(draft.firstStep);

    const handleContinue = () => {
        if (!canContinue) return;
        router.push("/custom-order/checkout");
    };

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
                <section className="border border-(--color-border) bg-[#FDFAF5] p-6 sm:p-8">
                    <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
                        {t("summaryTitle")}
                    </h2>

                    <dl className="space-y-4">
                        <div>
                            <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                                {t("fabric")}
                            </dt>
                            <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                                {fabricLabel || "—"}
                            </dd>
                        </div>

                        <div>
                            <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                                {t("tailor")}
                            </dt>
                            <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                                {tailorLabel || "—"}
                            </dd>
                        </div>

                        <div>
                            <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                                {t("design")}
                            </dt>
                            <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                                {designLabel || "—"}
                                {designCategory && (
                                    <span className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-1">
                                        {designCategory}
                                    </span>
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1">
                                {t("fabricMeters")}
                            </dt>
                            <dd className="[font-family:var(--font-body)] text-[15px] text-black">
                                {draft.fabricMeters
                                    ? `${draft.fabricMeters} ${t("meters")}`
                                    : "—"}
                            </dd>
                        </div>

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

                <section className="border border-(--color-border) bg-white p-6 sm:p-8">
                    <h2 className="[font-family:var(--font-display)] text-[22px] mb-6">
                        {t("pricingTitle")}
                    </h2>

                    {loadingPricing ? (
                        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted) py-8">
                            {t("loadingPricing")}
                        </p>
                    ) : pricingError ? (
                        <p className="text-red-600 py-8">{pricingError}</p>
                    ) : pricing ? (
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

                            <div className="flex justify-between gap-4">
                                <span className="text-(--color-grey-muted)">
                                    {t("lines.deliveryFee")}
                                </span>
                                <span className="text-black shrink-0">
                                    {formatCurrency(pricing.deliveryFee, locale)}
                                </span>
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
                    ) : null}
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
                        className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed [font-family:var(--font-ui)]"
                    >
                        {t("continue")}
                    </button>
                </div>
            </div>
        </div>
    );
}
