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
    toCustomOrderTailorSelection,
} from "@/lib/customOrder";
import {
    type TailorDesignListItem,
    type TailorShopDetailItem,
    type TailorShopListItem,
    formatDesignBasePrice,
    formatTailorRating,
    getDesignDisplayFields,
    getTailorDisplayFields,
    resolveDesignImage,
    resolveTailorImage,
} from "@/lib/tailors";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

export default function TailorDesignSelectionStep() {
    const t = useTranslations("CustomOrderTailor");
    const router = useRouter();
    const searchParams = useSearchParams();
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";
    const tailorSlugParam = searchParams.get("tailorSlug");
    const designSlugParam = searchParams.get("designSlug");

    const { draft, isHydrated, setTailor, setDesign, setFirstStepIfUnset, resetOrder } =
        useCustomOrder();

    const [tailors, setTailors] = useState<TailorShopListItem[]>([]);
    const [designs, setDesigns] = useState<TailorDesignListItem[]>([]);
    const [loadingTailors, setLoadingTailors] = useState(true);
    const [loadingDesigns, setLoadingDesigns] = useState(false);
    const [tailorsError, setTailorsError] = useState<string | null>(null);
    const [designsError, setDesignsError] = useState<string | null>(null);
    const [prefillDone, setPrefillDone] = useState(false);

    useEffect(() => {
        const fetchTailors = async () => {
            try {
                setLoadingTailors(true);
                setTailorsError(null);

                const data = await api.get<{ success: boolean; items: TailorShopListItem[] }>(
                    "/api/tailors?limit=100",
                );

                if (!data?.success) {
                    throw new Error("Failed to load tailors");
                }

                setTailors(data.items || []);
            } catch (err: unknown) {
                const message =
                    (err as ApiError)?.message ||
                    (err instanceof Error ? err.message : "Failed to load tailors");
                setTailorsError(message);
            } finally {
                setLoadingTailors(false);
            }
        };

        fetchTailors();
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        setFirstStepIfUnset("tailor");
    }, [isHydrated, setFirstStepIfUnset]);

    useEffect(() => {
        if (!isHydrated || prefillDone || !tailorSlugParam) return;

        const prefillFromParams = async () => {
            try {
                resetOrder("tailor");
                const tailorData = await api.get<{
                    success: boolean;
                    item: TailorShopDetailItem;
                }>(`/api/tailors/${tailorSlugParam}`);

                if (!tailorData?.success || !tailorData.item) return;

                setTailor(toCustomOrderTailorSelection(tailorData.item));

                const designsData = await api.get<{
                    success: boolean;
                    items: TailorDesignListItem[];
                }>(`/api/tailors/${tailorSlugParam}/designs`);

                if (!designsData?.success) return;

                const items = designsData.items || [];
                setDesigns(items);

                if (designSlugParam) {
                    const match = items.find((d) => d.slug === designSlugParam);
                    if (match) {
                        setDesign(toCustomOrderDesignSelection(match));
                    }
                }
            } catch {
                // Ignore invalid slug — customer can still pick manually
            } finally {
                setPrefillDone(true);
            }
        };

        prefillFromParams();
    }, [
        designSlugParam,
        isHydrated,
        prefillDone,
        setDesign,
        setTailor,
        tailorSlugParam,
    ]);

    useEffect(() => {
        if (!isHydrated || tailorSlugParam) return;
        setPrefillDone(true);
    }, [isHydrated, tailorSlugParam]);

    useEffect(() => {
        const slug = draft.tailor?.slug;
        if (!slug) {
            setDesigns([]);
            return;
        }

        if (tailorSlugParam && !prefillDone) return;

        const fetchDesigns = async () => {
            try {
                setLoadingDesigns(true);
                setDesignsError(null);

                const data = await api.get<{
                    success: boolean;
                    items: TailorDesignListItem[];
                }>(`/api/tailors/${slug}/designs`);

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

        fetchDesigns();
    }, [draft.tailor?.slug, prefillDone, tailorSlugParam]);

    const canContinue = isTailorStepComplete(draft);
    const stepNumber = getCustomOrderStepNumber("tailor", draft.firstStep);
    const continueLabel = draft.firstStep === "tailor"
        ? t("continueToFabric")
        : isFabricStepComplete(draft)
          ? t("continueToMeters")
          : t("continueToFabric");
    const showBackToFabric = draft.firstStep === "fabric";

    const handleSelectTailor = (item: TailorShopListItem) => {
        setTailor(toCustomOrderTailorSelection(item));
    };

    const handleSelectDesign = (item: TailorDesignListItem) => {
        setDesign(toCustomOrderDesignSelection(item));
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
                description={t("description")}
                stepLabel={t("stepLabel", {
                    step: stepNumber,
                    total: CUSTOM_ORDER_TOTAL_STEPS,
                })}
            />

            <h2 className="[font-family:var(--font-display)] text-[22px] sm:text-[24px] font-normal mb-6">
                {t("tailorsTitle")}
            </h2>

            {loadingTailors ? (
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16">
                    {t("loadingTailors")}
                </p>
            ) : tailorsError ? (
                <p className="text-center text-red-600 py-16">{tailorsError}</p>
            ) : tailors.length === 0 ? (
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16 text-(--color-grey-muted)">
                    {t("emptyTailors")}
                </p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                    {tailors.map((item) => {
                        const { name, location, badge } = getTailorDisplayFields(item, locale);
                        const imageUrl = resolveTailorImage(item.logo, item.coverImage);
                        const isSelected = draft.tailor?._id === item._id;
                        const rating = formatTailorRating(item.rating);

                        return (
                            <button
                                key={item._id}
                                type="button"
                                onClick={() => handleSelectTailor(item)}
                                className={`text-left border overflow-hidden transition-all duration-200 ${
                                    isSelected
                                        ? "border-black ring-2 ring-black"
                                        : "border-(--color-border) hover:border-black"
                                }`}
                            >
                                <div className="aspect-4/3 bg-[#F0EBE3] overflow-hidden relative">
                                    <img
                                        src={imageUrl}
                                        alt={name}
                                        className="w-full h-full object-cover"
                                    />
                                    {badge && (
                                        <span className="absolute bottom-3 left-3 [font-family:var(--font-ui)] text-[8px] uppercase tracking-[0.2em] bg-black text-white px-2 py-1">
                                            {badge}
                                        </span>
                                    )}
                                </div>
                                <div className="p-4">
                                    <h3 className="[font-family:var(--font-display)] text-[16px] mb-1 line-clamp-2">
                                        {name}
                                    </h3>
                                    <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
                                        {location}
                                    </p>
                                    <p className="[font-family:var(--font-ui)] text-[10px] tracking-[0.16em] text-black">
                                        ★ {rating}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {draft.tailor && (
                <>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                            {designs.map((item) => {
                                const { name, category } = getDesignDisplayFields(item, locale);
                                const imageUrl = resolveDesignImage(item.images?.[0]);
                                const isSelected = draft.design?._id === item._id;

                                return (
                                    <button
                                        key={item._id}
                                        type="button"
                                        onClick={() => handleSelectDesign(item)}
                                        className={`text-left border overflow-hidden transition-all duration-200 ${
                                            isSelected
                                                ? "border-black ring-2 ring-black"
                                                : "border-(--color-border) hover:border-black"
                                        }`}
                                    >
                                        <div className="aspect-4/5 bg-[#F0EBE3] overflow-hidden relative">
                                            <img
                                                src={imageUrl}
                                                alt={name}
                                                className="w-full h-full object-cover"
                                            />
                                            <span className="absolute top-3 left-3 [font-family:var(--font-ui)] text-[8px] uppercase tracking-[0.2em] bg-black text-white px-2 py-1">
                                                {category}
                                            </span>
                                        </div>
                                        <div className="p-4">
                                            <h3 className="[font-family:var(--font-display)] text-[16px] mb-2 line-clamp-2">
                                                {name}
                                            </h3>
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
                </>
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
