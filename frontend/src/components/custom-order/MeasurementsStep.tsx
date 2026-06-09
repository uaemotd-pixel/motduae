"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
    isMeasurementsStepComplete,
    type CustomOrderMeasurements,
} from "@/lib/customOrder";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";

type MeasurementField = Exclude<keyof CustomOrderMeasurements, "notes">;

const MEASUREMENT_FIELDS: MeasurementField[] = [
    "chest",
    "waist",
    "hips",
    "inseam",
    "sleeveLength",
];

function parseOptionalNumber(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatMeasurementValue(value: number | null): string {
    return value !== null && value > 0 ? String(value) : "";
}

export default function MeasurementsStep() {
    const t = useTranslations("CustomOrderMeasurements");
    const router = useRouter();
    const { draft, isHydrated, updateMeasurements } = useCustomOrder();

    const canContinue = isMeasurementsStepComplete(draft);

    const handleNumberChange = (field: MeasurementField, value: string) => {
        updateMeasurements({ [field]: parseOptionalNumber(value) });
    };

    const handleNotesChange = (value: string) => {
        updateMeasurements({ notes: value });
    };

    const handleContinue = () => {
        if (!canContinue) return;
        router.push("/custom-order/review");
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
                stepLabel={t("stepLabel", { step: 4, total: 5 })}
            />

            <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) mb-8 max-w-2xl">
                {t("optionalNote")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8 max-w-3xl">
                {MEASUREMENT_FIELDS.map((field) => (
                    <div key={field}>
                        <label
                            htmlFor={`measurement-${field}`}
                            className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                        >
                            {t(`fields.${field}`)}
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                id={`measurement-${field}`}
                                type="number"
                                min="0.1"
                                step="0.1"
                                inputMode="decimal"
                                value={formatMeasurementValue(draft.measurements[field])}
                                onChange={(e) => handleNumberChange(field, e.target.value)}
                                className="flex-1 border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[16px] text-black focus:outline-none focus:border-black transition"
                            />
                            <span className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-(--color-grey-muted) shrink-0">
                                {t("unit")}
                            </span>
                        </div>
                        <p className="[font-family:var(--font-body)] text-[12px] text-(--color-grey-muted) mt-2">
                            {t(`fields.${field}Hint`)}
                        </p>
                    </div>
                ))}
            </div>

            <div className="max-w-3xl mb-10">
                <label
                    htmlFor="measurement-notes"
                    className="block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
                >
                    {t("fields.notes")}
                </label>
                <textarea
                    id="measurement-notes"
                    rows={4}
                    value={draft.measurements.notes}
                    onChange={(e) => handleNotesChange(e.target.value)}
                    placeholder={t("fields.notesPlaceholder")}
                    className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition resize-y min-h-[120px]"
                />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-6 border-t border-(--color-border) max-w-3xl">
                <Link
                    href="/custom-order/meters"
                    className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left"
                >
                    {t("backToMeters")}
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
