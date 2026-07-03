"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomOrder } from "@/context/CustomOrderContext";
import {
    CUSTOM_ORDER_TOTAL_STEPS,
    getCustomOrderStepNumber,
    isMeasurementsStepComplete,
    type CustomOrderMeasurementField,
} from "@/lib/customOrder";
import {
    BODY_MEASUREMENT_FIELDS,
    NECK_MEASUREMENT_FIELDS,
    SLEEVE_MEASUREMENT_FIELDS,
    getMeasurementLetter,
} from "@/lib/measurementDiagramLabels";
import ConfiguratorStepHeader from "@/components/custom-order/ConfiguratorStepHeader";
import MeasurementBodyDiagram from "@/components/custom-order/measurement-diagram/MeasurementBodyDiagram";
import MeasurementNeckDiagram from "@/components/custom-order/measurement-diagram/MeasurementNeckDiagram";
import MeasurementSleeveDiagram from "@/components/custom-order/measurement-diagram/MeasurementSleeveDiagram";

function parseOptionalNumber(value: string): number | null {
    if (value.trim() === "") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatMeasurementValue(value: number | null): string {
    return value !== null && value > 0 ? String(value) : "";
}

type MeasurementInputProps = {
    field: CustomOrderMeasurementField;
    value: number | null;
    onChange: (field: CustomOrderMeasurementField, value: string) => void;
    t: ReturnType<typeof useTranslations<"CustomOrderMeasurements">>;
};

function MeasurementInput({ field, value, onChange, t }: MeasurementInputProps) {
    const letter = getMeasurementLetter(field);

    return (
        <div className="min-w-0">
            <label
                htmlFor={`measurement-${field}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-1 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black mb-2"
            >
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-black text-[9px] shrink-0">
                    {letter}
                </span>
                {t(`fields.${field}`)}
            </label>
            <div className="flex items-center gap-3">
                <input
                    id={`measurement-${field}`}
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputMode="decimal"
                    value={formatMeasurementValue(value)}
                    onChange={(e) => onChange(field, e.target.value)}
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
    );
}

export default function MeasurementsStep() {
    const t = useTranslations("CustomOrderMeasurements");
    const router = useRouter();
    const { draft, isHydrated, updateMeasurements } = useCustomOrder();

    const canContinue = isMeasurementsStepComplete(draft);
    const stepNumber = getCustomOrderStepNumber("measurements", draft.firstStep);

    const handleNumberChange = (field: CustomOrderMeasurementField, value: string) => {
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
                stepLabel={t("stepLabel", {
                    step: stepNumber,
                    total: CUSTOM_ORDER_TOTAL_STEPS,
                })}
            />

            <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) mb-8 max-w-2xl">
                {t("optionalNote")}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,540px)] gap-8 lg:gap-12 mb-10">
                <div className="space-y-10">
                    <section>
                        <h2 className="[font-family:var(--font-display)] text-[20px] sm:text-[22px] font-normal mb-2">
                            {t("bodySection")}
                        </h2>
                        <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mb-6">
                            {t("bodySectionHint")}
                        </p>
                        <div className="lg:hidden mb-6">
                            <MeasurementBodyDiagram />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            {BODY_MEASUREMENT_FIELDS.map((field) => (
                                <MeasurementInput
                                    key={field}
                                    field={field}
                                    value={draft.measurements[field]}
                                    onChange={handleNumberChange}
                                    t={t}
                                />
                            ))}
                        </div>
                    </section>

                    <section className="pt-6 border-t border-(--color-border)">
                        <h2 className="[font-family:var(--font-display)] text-[20px] sm:text-[22px] font-normal mb-2">
                            {t("neckSection")}
                        </h2>
                        <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mb-6">
                            {t("neckSectionHint")}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                            <div className="shrink-0">
                                <MeasurementNeckDiagram />
                            </div>
                            <div className="grid grid-cols-1 gap-6 flex-1 min-w-0 w-full sm:max-w-sm">
                                {NECK_MEASUREMENT_FIELDS.map((field) => (
                                    <MeasurementInput
                                        key={field}
                                        field={field}
                                        value={draft.measurements[field]}
                                        onChange={handleNumberChange}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="pt-6 border-t border-(--color-border)">
                        <h2 className="[font-family:var(--font-display)] text-[20px] sm:text-[22px] font-normal mb-2">
                            {t("fields.arabicSleeveSection")}
                        </h2>
                        <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) mb-6">
                            {t("fields.arabicSleeveSectionHint")}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-start">
                            <div className="shrink-0">
                                <MeasurementSleeveDiagram />
                            </div>
                            <div className="grid grid-cols-1 gap-6 flex-1 min-w-0 w-full sm:max-w-sm">
                                {SLEEVE_MEASUREMENT_FIELDS.map((field) => (
                                    <MeasurementInput
                                        key={field}
                                        field={field}
                                        value={draft.measurements[field]}
                                        onChange={handleNumberChange}
                                        t={t}
                                    />
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <aside className="hidden lg:block">
                    <div className="sticky top-28 space-y-4">
                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                            {t("diagramGuide")}
                        </p>
                        <MeasurementBodyDiagram />
                    </div>
                </aside>
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
                    className="w-full border border-(--color-border) bg-white px-4 py-3 [font-family:var(--font-body)] text-[15px] text-black focus:outline-none focus:border-black transition resize-y min-h-30"
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
