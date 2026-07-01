"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
    CUSTOM_ORDER_TOTAL_STEPS,
    getCustomOrderStepNumber,
    getNextPathAfterTailor,
    isFabricStepComplete,
    isTailorStepComplete,
    toCustomOrderDesignSelection,
    toCustomOrderSelectedDesign,
    toCustomOrderTailorSelection,
} from "@/lib/customOrder";
import {
    type TailorDesignListItem,
    formatDesignBasePrice,
    getDesignDisplayFields,
    resolveDesignImage,
} from "@/lib/tailors";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

export default function TailorDesignSelectionStep() {
    const t = useTranslations("CustomOrderTailor");
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";
    const designSlugParam = searchParams.get("designSlug");

    const { draft, isHydrated, toggleDesign, setFirstStepIfUnset, resetOrder, setFabricSource } =
        useCustomOrder();

    const [designs, setDesigns] = useState<TailorDesignListItem[]>([]);
    const [loadingDesigns, setLoadingDesigns] = useState(true);
    const [designsError, setDesignsError] = useState<string | null>(null);
    const [prefillDone, setPrefillDone] = useState(false);

    useEffect(() => {
        if (!isHydrated) return;
        setFirstStepIfUnset("tailor");
        if (draft.selectedFabrics.length > 0 && !draft.fabricSource) {
            setFabricSource("storefront");
        }
    }, [isHydrated, setFirstStepIfUnset, draft.selectedFabrics.length, draft.fabricSource, setFabricSource]);

    useEffect(() => {
        if (!isHydrated || prefillDone || !designSlugParam) return;

        const prefillFromParams = async () => {
            try {
                resetOrder("tailor");
                const designData = await api.get<{
                    success: boolean;
                    item: TailorDesignListItem & { tailorShop?: Parameters<typeof toCustomOrderTailorSelection>[0] };
                }>(`/api/tailors/designs/${designSlugParam}`);

                if (!designData?.success || !designData.item) return;

                const selected = designData.item.tailorShop
                    ? {
                          ...toCustomOrderDesignSelection(designData.item),
                          tailor: toCustomOrderTailorSelection(designData.item.tailorShop),
                      }
                    : toCustomOrderSelectedDesign(designData.item);

                if (selected) {
                    toggleDesign(selected);
                }
            } catch {
                // Ignore invalid design slug — customer can still pick manually
            } finally {
                setPrefillDone(true);
            }
        };

        prefillFromParams();
    }, [
        designSlugParam,
        isHydrated,
        prefillDone,
        toggleDesign,
        resetOrder,
    ]);

    useEffect(() => {
        if (!isHydrated || designSlugParam) return;
        setPrefillDone(true);
    }, [isHydrated, designSlugParam]);

    useEffect(() => {
        const fetchAllDesigns = async () => {
            try {
                setLoadingDesigns(true);
                setDesignsError(null);

                const data = await api.get<{
                    success: boolean;
                    items: TailorDesignListItem[];
                }>("/api/tailors/designs/all?limit=100");

                if (!data?.success) {
                    throw new Error("Failed to load designs");
                }

                setDesigns(data.items || []);
            } catch (err: unknown) {
                const message =
                    (err as ApiError)?.message ||
                    (err instanceof Error ? err.message : "Failed to load designs");
                setDesignsError(message);
                setDesigns([]);
            } finally {
                setLoadingDesigns(false);
            }
        };

        fetchAllDesigns();
    }, []);

    const selectedCount = draft.selectedDesigns.length;
    const canContinue = isTailorStepComplete(draft);
    const stepNumber = getCustomOrderStepNumber("tailor", draft.firstStep);
    const continueLabel = draft.firstStep === "tailor"
        ? t("continueToFabric")
        : isFabricStepComplete(draft)
          ? t("continueToMeters")
          : t("continueToFabric");
    const showBackToFabric = draft.firstStep === "fabric";

    const handleToggleDesign = (item: TailorDesignListItem) => {
        const selected = toCustomOrderSelectedDesign(item);
        if (selected) {
            toggleDesign(selected);
        }
    };

    const handleContinue = () => {
        if (!canContinue) return;
        router.push(getNextPathAfterTailor(draft));
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
                description={t("descriptionMulti")}
                stepLabel={t("stepLabel", {
                    step: stepNumber,
                    total: CUSTOM_ORDER_TOTAL_STEPS,
                })}
            />

            {draft.selectedFabrics.length > 0 && (
                <div className="mb-6 border border-(--color-border) bg-white p-4 sm:p-6">
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-3">
                        {t("crossStepFabrics", { count: draft.selectedFabrics.length })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {draft.selectedFabrics.map((fabric) => {
                            const label =
                                locale === "ar"
                                    ? fabric.nameAr || fabric.name
                                    : fabric.name;
                            return (
                                <span
                                    key={fabric._id}
                                    className="px-3 py-1.5 border border-black text-black [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em]"
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            {selectedCount > 0 && (
                <div className="mb-8 border border-(--color-border) bg-[#FDFAF5] p-4 sm:p-6">
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-3">
                        {t("selectedCount", { count: selectedCount })}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {draft.selectedDesigns.map((design) => {
                            const label =
                                locale === "ar"
                                    ? design.nameAr || design.name
                                    : design.name;
                            return (
                                <span
                                    key={design._id}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-black text-white [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em]"
                                >
                                    {label}
                                    <button
                                        type="button"
                                        onClick={() => toggleDesign(design)}
                                        className="opacity-70 hover:opacity-100"
                                        aria-label={t("removeDesign", { name: label })}
                                    >
                                        ×
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                </div>
            )}

            <h2 className="[font-family:var(--font-display)] text-[22px] sm:text-[24px] font-normal mb-6">
                {t("designsTitle")}
            </h2>

            {loadingDesigns ? (
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16">
                    {t("loadingDesigns")}
                </p>
            ) : designsError ? (
                <p className="text-center text-red-600 py-16">{designsError}</p>
            ) : designs.length === 0 ? (
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16 text-(--color-grey-muted)">
                    {t("emptyDesigns")}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
                    {designs.map((item) => {
                        const { name, category } = getDesignDisplayFields(item, locale);
                        const imageUrl = resolveDesignImage(item.images?.[0]);
                        const isSelected = draft.selectedDesigns.some(
                            (design) => design._id === item._id,
                        );
                        const tailorName =
                            locale === "ar"
                                ? item.tailorNameAr || item.tailorName
                                : item.tailorName;

                        return (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => handleToggleDesign(item)}
                                className={`group text-left border rounded-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 ${
                                    isSelected
                                        ? "border-black ring-2 ring-black bg-[#FDFAF5]"
                                        : "border-(--color-border) bg-white hover:border-black"
                                }`}
                            >
                                <div className="aspect-4/5 bg-[#F0EBE3] overflow-hidden relative rounded-t-lg">
                                    <img
                                        src={imageUrl}
                                        alt={name}
                                        className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                                    />
                                    {isSelected && (
                                        <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center [font-family:var(--font-ui)] text-[12px]">
                                            ✓
                                        </span>
                                    )}
                                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <span className="absolute top-3 left-3 [font-family:var(--font-ui)] text-[10px] xs:text-[12px] uppercase tracking-[0.24em] bg-[#8B6F47] text-white px-2.5 xs:px-3 py-1 xs:py-1.25 font-bold">
                                        {category}
                                    </span>
                                </div>
                                <div className="p-4">
                                    <h3 className="[font-family:var(--font-display)] text-[16px] mb-1 line-clamp-2">
                                        {name}
                                    </h3>
                                    {tailorName && (
                                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mb-3">
                                            {t("tailorLabel", { name: tailorName })}
                                        </p>
                                    )}
                                    <div className="flex flex-col gap-1 [font-family:var(--font-ui)] text-[10px] tracking-[0.16em] uppercase text-(--color-grey-muted)">
                                        <span>
                                            {t("fromPrice")}{" "}
                                            <span className="text-black">
                                                {formatDesignBasePrice(item.basePrice, locale)}
                                            </span>
                                        </span>
                                        <span>
                                            {t("estimatedDays")}: {item.estimatedDays}{" "}
                                            {t("days")}
                                        </span>
                                        <span>
                                            {t("estimatedMeters")}: {item.estimatedMeters}{" "}
                                            {t("meters")}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-(--color-border)">
                {showBackToFabric ? (
                    <Link
                        href="/custom-order/fabric"
                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
                    >
                        {t("backToFabric")}
                    </Link>
                ) : (
                    <span />
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:ml-auto">
                    <Link
                        href="/tailors"
                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) border-b border-(--color-grey-muted) pb-0.5 hover:opacity-50 transition text-center"
                    >
                        {t("browseTailors")}
                    </Link>

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
        </div>
    );
}
