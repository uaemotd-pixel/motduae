"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
    CUSTOM_ORDER_TOTAL_STEPS,
    getCustomOrderStepNumber,
    getNextPathAfterFabric,
    isFabricStepComplete,
    isTailorStepComplete,
    toCustomOrderFabricSelection,
} from "@/lib/customOrder";
import {
    FABRIC_FILTER_OPTIONS,
    type FabricFilter,
    type FabricListItem,
    filterFabricsByMaterial,
    formatMaterialLabel,
    formatPricePerMeter,
    getFabricDisplayFields,
    resolveFabricImage,
} from "@/lib/fabrics";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

export default function FabricSelectionStep() {
    const t = useTranslations("CustomOrderFabric");
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";
    const fabricSlug = searchParams.get("fabricSlug");

    const {
        draft,
        isHydrated,
        useOwnFabric,
        setUseOwnFabric,
        setFabric,
        setFabricSource,
        setFirstStepIfUnset,
        resetOrder,
    } = useCustomOrder();

    const [fabrics, setFabrics] = useState<FabricListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedFilter, setSelectedFilter] = useState<FabricFilter>("all");
    const [prefillDone, setPrefillDone] = useState(false);

    useEffect(() => {
        const fetchFabrics = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await api.get<{ success: boolean; items: FabricListItem[] }>(
                    "/api/fabrics?limit=100",
                );

                if (!data?.success) {
                    throw new Error("Failed to load fabrics");
                }

                setFabrics(data.items || []);
            } catch (err: unknown) {
                const message =
                    (err as ApiError)?.message ||
                    (err instanceof Error ? err.message : "Failed to load fabrics");
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchFabrics();
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        setFirstStepIfUnset("fabric");
        // Ensure that platform fabric is chosen since we are hiding the selection options
        if (useOwnFabric) {
            setUseOwnFabric(false);
        }
    }, [isHydrated, setFirstStepIfUnset, useOwnFabric, setUseOwnFabric]);

    useEffect(() => {
        if (!isHydrated || prefillDone || !fabricSlug) return;

        const prefillFabric = async () => {
            try {
                resetOrder("fabric");
                const data = await api.get<{ success: boolean; item: FabricListItem }>(
                    `/api/fabrics/${fabricSlug}`,
                );

                if (data?.success && data.item) {
                    setFabricSource("storefront");
                    setFabric(toCustomOrderFabricSelection(data.item));
                }
            } catch {
                // Ignore invalid slug — customer can still pick manually
            } finally {
                setPrefillDone(true);
            }
        };

        prefillFabric();
    }, [fabricSlug, isHydrated, prefillDone, setFabric, setFabricSource]);

    const filteredFabrics = useMemo(
        () => filterFabricsByMaterial(fabrics, selectedFilter),
        [fabrics, selectedFilter],
    );

    const canContinue = isFabricStepComplete(draft);
    const stepNumber = getCustomOrderStepNumber("fabric", draft.firstStep);
    const continueLabel = draft.firstStep === "fabric"
        ? t("continueToTailor")
        : isTailorStepComplete(draft)
          ? t("continueToMeters")
          : t("continueToTailor");
    const showBackToTailor = draft.firstStep === "tailor";

    const handleSelectFabric = (item: FabricListItem) => {
        setFabricSource("storefront");
        setFabric(toCustomOrderFabricSelection(item));
    };

    const handleUseOwnFabric = () => {
        setUseOwnFabric(true);
        setFabric(null);
    };

    const handleUsePlatformFabric = () => {
        setUseOwnFabric(false);
        setFabricSource("storefront");
    };

    const handleContinue = () => {
        if (!canContinue) return;
        router.push(getNextPathAfterFabric(draft));
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

            {/* Commented out Platform Fabric and Use My Own Fabric options selection for now
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                <button
                    type="button"
                    onClick={handleUsePlatformFabric}
                    className={`text-left p-6 border transition-all duration-200 ${
                        !useOwnFabric
                            ? "border-black bg-black text-white"
                            : "border-(--color-border) bg-white hover:border-black"
                    }`}
                >
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] mb-2 opacity-80">
                        {t("platformOptionEyebrow")}
                    </p>
                    <h2 className="[font-family:var(--font-display)] text-[22px] font-normal mb-2">
                        {t("platformOptionTitle")}
                    </h2>
                    <p className="[font-family:var(--font-body)] text-[13px] leading-relaxed opacity-90">
                        {t("platformOptionDescription")}
                    </p>
                </button>

                <button
                    type="button"
                    onClick={handleUseOwnFabric}
                    className={`text-left p-6 border transition-all duration-200 ${
                        useOwnFabric
                            ? "border-black bg-black text-white"
                            : "border-(--color-border) bg-white hover:border-black"
                    }`}
                >
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] mb-2 opacity-80">
                        {t("ownFabricOptionEyebrow")}
                    </p>
                    <h2 className="[font-family:var(--font-display)] text-[22px] font-normal mb-2">
                        {t("ownFabricOptionTitle")}
                    </h2>
                    <p className="[font-family:var(--font-body)] text-[13px] leading-relaxed opacity-90">
                        {t("ownFabricOptionDescription")}
                    </p>
                </button>
            </div>
            */}

            {useOwnFabric ? (
                <div className="border border-(--color-border) bg-[#FDFAF5] p-8 mb-10">
                    <h3 className="[font-family:var(--font-display)] text-[20px] mb-3">
                        {t("ownFabricConfirmedTitle")}
                    </h3>
                    <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
                        {t("ownFabricConfirmedDescription")}
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                        <button
                            type="button"
                            onClick={() => setSelectedFilter("all")}
                            className={`px-3 py-1.5 border text-[9px] uppercase tracking-[0.24em] whitespace-nowrap [font-family:var(--font-ui)] transition-all ${
                                selectedFilter === "all"
                                    ? "bg-black text-white border-black"
                                    : "text-black border-(--color-border) hover:bg-black hover:text-white hover:border-black"
                            }`}
                        >
                            {t("filters.all")}
                        </button>
                        {FABRIC_FILTER_OPTIONS.map((material) => (
                            <button
                                key={material}
                                type="button"
                                onClick={() => setSelectedFilter(material)}
                                className={`px-3 py-1.5 border text-[9px] uppercase tracking-[0.24em] whitespace-nowrap [font-family:var(--font-ui)] transition-all ${
                                    selectedFilter === material
                                        ? "bg-black text-white border-black"
                                        : "text-black border-(--color-border) hover:bg-black hover:text-white hover:border-black"
                                }`}
                            >
                                {t(`filters.${material}`)}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16">
                            {t("loadingFabrics")}
                        </p>
                    ) : error ? (
                        <p className="text-center text-red-600 py-16">{error}</p>
                    ) : filteredFabrics.length === 0 ? (
                        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16 text-(--color-grey-muted)">
                            {t("empty")}
                        </p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                            {filteredFabrics.map((item) => {
                                const { title, location } = getFabricDisplayFields(item, locale);
                                const imageUrl = resolveFabricImage(item.images?.[0]);
                                const isSelected = draft.fabric?._id === item._id;

                                return (
                                    <button
                                        key={item._id}
                                        type="button"
                                        onClick={() => handleSelectFabric(item)}
                                        className={`text-left border overflow-hidden transition-all duration-200 ${
                                            isSelected
                                                ? "border-black ring-2 ring-black"
                                                : "border-(--color-border) hover:border-black"
                                        }`}
                                    >
                                        <div className="aspect-square bg-[#F0EBE3] overflow-hidden">
                                            <img
                                                src={imageUrl}
                                                alt={title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="p-4">
                                            <h3 className="[font-family:var(--font-display)] text-[16px] mb-1 line-clamp-2">
                                                {title}
                                            </h3>
                                            <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
                                                {location}
                                            </p>
                                            <p className="[font-family:var(--font-ui)] text-[11px] text-black">
                                                {formatPricePerMeter(item.pricePerMeter, locale)}
                                            </p>
                                            <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-1">
                                                {formatMaterialLabel(item.material, locale)}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-(--color-border)">
                {showBackToTailor ? (
                    <Link
                        href="/custom-order/tailor"
                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
                    >
                        {t("backToTailor")}
                    </Link>
                ) : (
                    <Link
                        href="/fabrics/fabricStore"
                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
                    >
                        {t("browseFabrics")}
                    </Link>
                )}

                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={!canContinue}
                    className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed [font-family:var(--font-ui)]"
                >
                    {continueLabel}
                </button>
            </div>
        </div>
    );
}
