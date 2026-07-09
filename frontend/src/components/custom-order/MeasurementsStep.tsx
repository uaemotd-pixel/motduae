"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCustomOrder } from "@/context/CustomOrderContext";
import { api } from "@/lib/api/client";
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

function MeasurementInput({
  field,
  value,
  onChange,
  t,
}: MeasurementInputProps) {
  const letter = getMeasurementLetter(field);

  return (
    <div className="min-w-0 w-full">
      <label
        htmlFor={`measurement-${field}`}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[10px] uppercase tracking-[0.24em] text-black mb-2"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-black text-[9px] shrink-0">
          {letter}
        </span>
        <span className="wrap-break-word">{t(`fields.${field}`)}</span>
      </label>
      <div className="flex items-center gap-2 sm:gap-3">
        <input
          id={`measurement-${field}`}
          type="number"
          min="0.1"
          step="0.1"
          inputMode="decimal"
          value={formatMeasurementValue(value)}
          onChange={(e) => onChange(field, e.target.value)}
          className="flex-1 min-w-0 border border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 font-body text-[15px] sm:text-[16px] text-black focus:outline-none focus:border-black transition rounded-lg w-full"
        />
        <span className="font-ui text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-gray-400 shrink-0">
          {t("unit")}
        </span>
      </div>
      <p className="font-body text-[11px] sm:text-[12px] text-gray-400 mt-2">
        {t(`fields.${field}Hint`)}
      </p>
    </div>
  );
}

export default function MeasurementsStep() {
  const t = useTranslations("CustomOrderMeasurements");
  const router = useRouter();
  const { draft, isHydrated, updateMeasurements } = useCustomOrder();

  const [isHydratingCustomerMeasurements, setIsHydratingCustomerMeasurements] =
    useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    const measurements = draft.measurements;
    const isDraftEmpty =
      (BODY_MEASUREMENT_FIELDS as readonly CustomOrderMeasurementField[]).every(
        (f) => measurements[f] == null,
      ) &&
      (NECK_MEASUREMENT_FIELDS as readonly CustomOrderMeasurementField[]).every(
        (f) => measurements[f] == null,
      ) &&
      (
        SLEEVE_MEASUREMENT_FIELDS as readonly CustomOrderMeasurementField[]
      ).every((f) => measurements[f] == null) &&
      (measurements.notes ?? "").trim() === "";

    if (!isDraftEmpty) return;

    (async () => {
      setIsHydratingCustomerMeasurements(true);

      try {
        type ApiResponse = {
          success: boolean;
          measurements: Record<string, any> | null;
        };

        const res = await api.get<ApiResponse>(
          "/api/customer/customer_measurements",
        );

        const saved = res?.measurements;
        if (!saved) return;

        const mapped: Partial<typeof draft.measurements> = {
          totalLength:
            saved.totalLength !== undefined ? saved.totalLength : null,
          shoulderWidth:
            saved.shoulderWidth !== undefined ? saved.shoulderWidth : null,
          armLength: saved.armLength !== undefined ? saved.armLength : null,
          chestWidth: saved.chestWidth !== undefined ? saved.chestWidth : null,
          waist: saved.waist !== undefined ? saved.waist : null,
          hips: saved.hips !== undefined ? saved.hips : null,
          neckWidth: saved.neckWidth !== undefined ? saved.neckWidth : null,
          neckDepth: saved.neckDepth !== undefined ? saved.neckDepth : null,
          armholeHeight:
            saved.armholeHeight !== undefined ? saved.armholeHeight : null,
          sleeveOpeningWidth:
            saved.sleeveOpeningWidth !== undefined
              ? saved.sleeveOpeningWidth
              : null,
          cuffWidth: saved.cuffWidth !== undefined ? saved.cuffWidth : null,
          cuffLength: saved.cuffLength !== undefined ? saved.cuffLength : null,
          notes: typeof saved.notes === "string" ? saved.notes : "",
        };

        updateMeasurements(mapped as Partial<any>);
      } catch (e) {
        // ignore unauthorized/404: user might not be logged in
      } finally {
        setIsHydratingCustomerMeasurements(false);
      }
    })();
  }, [isHydrated]);

  const canContinue = isMeasurementsStepComplete(draft);
  const stepNumber = getCustomOrderStepNumber("measurements", draft.firstStep);

  const handleNumberChange = (
    field: CustomOrderMeasurementField,
    value: string,
  ) => {
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
        <p className="font-ui text-sm uppercase tracking-[0.2em] text-gray-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14">
      <ConfiguratorStepHeader
        title={t("title")}
        description={t("description")}
        stepLabel={t("stepLabel", {
          step: stepNumber,
          total: CUSTOM_ORDER_TOTAL_STEPS,
        })}
      />

      <p className="font-body text-[13px] sm:text-[14px] text-gray-400 mb-6 sm:mb-8 max-w-2xl">
        {t("optionalNote")}
      </p>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,480px)] gap-6 lg:gap-8 xl:gap-12 mb-8 sm:mb-10">
        <div className="space-y-8 sm:space-y-10">
          <section>
            <h2 className="font-display text-[18px] sm:text-[20px] md:text-[22px] font-normal mb-1.5 sm:mb-2">
              {t("bodySection")}
            </h2>
            <p className="font-body text-[12px] sm:text-[13px] text-gray-400 mb-4 sm:mb-6">
              {t("bodySectionHint")}
            </p>
            <div className="xl:hidden mb-4 sm:mb-6 flex justify-center overflow-hidden">
              <div className="w-full max-w-70 sm:max-w-[320px] md:max-w-90 lg:max-w-100 mx-auto">
                <MeasurementBodyDiagram />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6">
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

          <section className="pt-5 sm:pt-6 border-t border-gray-200">
            <h2 className="font-display text-[18px] sm:text-[20px] md:text-[22px] font-normal mb-1.5 sm:mb-2">
              {t("neckSection")}
            </h2>
            <p className="font-body text-[12px] sm:text-[13px] text-gray-400 mb-4 sm:mb-6">
              {t("neckSectionHint")}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
              <div className="shrink-0 flex justify-center w-full sm:w-auto">
                <div className="w-full max-w-50 sm:max-w-55 md:max-w-60 lg:max-w-65">
                  <MeasurementNeckDiagram />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 flex-1 min-w-0 w-full sm:max-w-sm">
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

          <section className="pt-5 sm:pt-6 border-t border-gray-200">
            <h2 className="font-display text-[18px] sm:text-[20px] md:text-[22px] font-normal mb-1.5 sm:mb-2">
              {t("fields.arabicSleeveSection")}
            </h2>
            <p className="font-body text-[12px] sm:text-[13px] text-gray-400 mb-4 sm:mb-6">
              {t("fields.arabicSleeveSectionHint")}
            </p>
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 items-center sm:items-start">
              <div className="shrink-0 flex justify-center w-full sm:w-auto">
                <div className="w-full max-w-50 sm:max-w-55 md:max-w-60 lg:max-w-65">
                  <MeasurementSleeveDiagram />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6 flex-1 min-w-0 w-full sm:max-w-sm">
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

        <aside className="hidden xl:block">
          <div className="sticky top-28 space-y-4">
            <p className="font-ui text-[10px] uppercase tracking-[0.24em] text-gray-400">
              {t("diagramGuide")}
            </p>
            <MeasurementBodyDiagram />
          </div>
        </aside>
      </div>

      <div className="max-w-3xl mb-8 sm:mb-10">
        <label
          htmlFor="measurement-notes"
          className="block font-ui text-[10px] uppercase tracking-[0.24em] text-black mb-1.5 sm:mb-2"
        >
          {t("fields.notes")}
        </label>
        <textarea
          id="measurement-notes"
          rows={4}
          value={draft.measurements.notes}
          onChange={(e) => handleNotesChange(e.target.value)}
          placeholder={t("fields.notesPlaceholder")}
          className="w-full border border-gray-200 bg-white px-3 sm:px-4 py-2.5 sm:py-3 font-body text-[14px] sm:text-[15px] text-black focus:outline-none focus:border-black transition resize-y min-h-25 sm:min-h-30 rounded-lg"
        />
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-5 sm:pt-6 border-t border-gray-200 max-w-3xl">
        <Link
          href="/custom-order/meters"
          className="font-ui text-[11px] sm:text-[12px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition text-center sm:text-left hover:cursor-pointer"
        >
          {t("backToMeters")}
        </Link>

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white text-[11px] sm:text-[12px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed font-ui hover:cursor-pointer rounded-lg"
        >
          {t("continue")}
        </button>
      </div>
    </div>
  );
}
