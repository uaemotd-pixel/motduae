"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomOrder } from "@/context/CustomOrderContext";
import { isMetersStepComplete, useOwnFabric } from "@/lib/customOrder";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

export default function FabricMetersStep() {
    const t = useTranslations("CustomOrderMeters");
    const router = useRouter();
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";

    const { draft, isHydrated, setFabricMeters } = useCustomOrder();
    const usingOwnFabric = useOwnFabric(draft);

    const [metersInput, setMetersInput] = useState("");
    const [initialized, setInitialized] = useState(false);

    useEffect(() => {
        if (!isHydrated || initialized) return;

        if (draft.fabricMeters !== null && draft.fabricMeters > 0) {
            setMetersInput(String(draft.fabricMeters));
        } else if (draft.design?.estimatedMeters && draft.design.estimatedMeters > 0) {
            setFabricMeters(draft.design.estimatedMeters);
            setMetersInput(String(draft.design.estimatedMeters));
        }

        setInitialized(true);
    }, [
        draft.design?.estimatedMeters,
        draft.fabricMeters,
        initialized,
        isHydrated,
        setFabricMeters,
    ]);

    const canContinue = isMetersStepComplete(draft);

    const designName =
        locale === "ar"
            ? draft.design?.nameAr || draft.design?.name
            : draft.design?.name;

    const suggestedMeters = draft.design?.estimatedMeters;

    const handleInputChange = (value: string) => {
        setMetersInput(value);

        if (value.trim() === "") {
            setFabricMeters(null);
            return;
        }

        const parsed = Number(value);
        if (Number.isFinite(parsed) && parsed > 0) {
            setFabricMeters(parsed);
        } else {
            setFabricMeters(null);
        }
    };

    const handleContinue = () => {
        if (!canContinue) return;
        router.push("/custom-order/measurements");
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
                stepLabel={t("stepLabel", { step: 3, total: 5 })}
            />

            {draft.design && (
                <div className="border border-(--color-border) bg-[#FDFAF5] p-6 sm:p-8 mb-8 max-w-xl">
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2">
                        {t("designLabel")}
                    </p>
                    <p className="[font-family:var(--font-display)] text-[20px] mb-4">{designName}</p>
                    {suggestedMeters && suggestedMeters > 0 && (
                        <p className="[font-family:var(--font-ui)] text-[11px] tracking-[0.16em] uppercase text-(--color-grey-muted)">
                            {t("suggestedLabel")}: {suggestedMeters} {t("meters")}
                        </p>
                    )}
                </div>
            )}

            <div className="max-w-xl mb-8">
                <label
                    htmlFor="fabric-meters"
                    className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-3"
                >
                    {t("inputLabel")}
                </label>
                <div className="flex items-center gap-3">
                    <input
                        id="fabric-meters"
                        type="number"
                        min="0.1"
                        step="0.1"
                        inputMode="decimal"
                        value={metersInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={t("inputPlaceholder")}
                        className="flex-1 border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[16px] text-black focus:outline-none focus:border-black transition"
                    />
                    <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-(--color-grey-muted) shrink-0">
                        {t("meters")}
                    </span>
                </div>
                <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mt-2">
                    {t("inputHint")}
                </p>
            </div>

            <div className="border border-(--color-border) bg-white p-6 max-w-xl mb-10">
                <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted)">
                    {usingOwnFabric ? t("ownFabricNote") : t("platformFabricNote")}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-(--color-border) max-w-xl">
                <Link
                    href="/custom-order/tailor"
                    className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
                >
                    {t("backToTailor")}
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
    );
}
