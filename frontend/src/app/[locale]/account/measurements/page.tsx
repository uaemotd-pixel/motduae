"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import MeasurementBodyDiagram from "@/components/custom-order/measurement-diagram/MeasurementBodyDiagram";
import MeasurementNeckDiagram from "@/components/custom-order/measurement-diagram/MeasurementNeckDiagram";
import MeasurementSleeveDiagram from "@/components/custom-order/measurement-diagram/MeasurementSleeveDiagram";
import {
  BODY_MEASUREMENT_FIELDS,
  NECK_MEASUREMENT_FIELDS,
  SLEEVE_MEASUREMENT_FIELDS,
  getMeasurementLetter,
} from "@/lib/measurementDiagramLabels";
import { type CustomOrderMeasurementField } from "@/lib/customOrder";
import { api } from "@/lib/api/client";
import toast from "react-hot-toast";

type MeasurementData = {
  totalLength: number | null;
  shoulderWidth: number | null;
  armLength: number | null;
  chestWidth: number | null;
  waist: number | null;
  hips: number | null;
  neckWidth: number | null;
  neckDepth: number | null;
  armholeHeight: number | null;
  sleeveOpeningWidth: number | null;
  cuffWidth: number | null;
  cuffLength: number | null;
  notes: string;
};

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
  error?: string;
  disabled?: boolean;
};

function MeasurementInput({
  field,
  value,
  onChange,
  t,
  error,
  disabled = false,
}: MeasurementInputProps) {
  const letter = getMeasurementLetter(field);

  return (
    <div className="space-y-1.5 w-full">
      <label
        htmlFor={`measurement-${field}`}
        className="flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[10px] uppercase tracking-[0.24em] text-black"
      >
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-black text-[9px] shrink-0">
          {letter}
        </span>
        <span className="min-w-0 wrap-break-word">{t(`fields.${field}`)}</span>
      </label>
      <div className="flex items-center gap-2 sm:gap-3">
        <input
          id={`measurement-${field}`}
          type={disabled ? "text" : "number"}
          min="0.1"
          step="0.1"
          inputMode={disabled ? "none" : "decimal"}
          value={formatMeasurementValue(value)}
          onChange={(e) => onChange(field, e.target.value)}
          disabled={disabled}
          className={`flex-1 min-w-0 border ${error ? "border-red-500" : "border-gray-200"} ${
            disabled ? "bg-gray-50 text-gray-700" : "bg-white text-black"
          } px-2.5 sm:px-4 py-2.5 sm:py-3 font-body text-[15px] sm:text-[16px] focus:outline-none focus:border-black transition rounded-lg w-full`}
        />
        <span className="font-ui text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-gray-400 shrink-0">
          {t("unit")}
        </span>
      </div>
      {error && (
        <p className="text-red-500 text-[11px] sm:text-[12px] mt-1">{error}</p>
      )}
      {!disabled && (
        <p className="font-body text-[11px] sm:text-[12px] text-gray-400 mt-1">
          {t(`fields.${field}Hint`)}
        </p>
      )}
    </div>
  );
}

const DEFAULT_MEASUREMENTS: MeasurementData = {
  totalLength: null,
  shoulderWidth: null,
  armLength: null,
  chestWidth: null,
  waist: null,
  hips: null,
  neckWidth: null,
  neckDepth: null,
  armholeHeight: null,
  sleeveOpeningWidth: null,
  cuffWidth: null,
  cuffLength: null,
  notes: "",
};

export default function AccountMeasurementsPage() {
  const t = useTranslations("CustomOrderMeasurements");

  const [measurements, setMeasurements] =
    useState<MeasurementData>(DEFAULT_MEASUREMENTS);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasMeasurements, setHasMeasurements] = useState(false);

  useEffect(() => {
    const fetchMeasurements = async () => {
      try {
        setIsLoading(true);
        console.log("🔵 Fetching measurements...");

        const data = await api.get("/api/customer/customer_measurements");
        console.log("📄 Data:", data);

        if (data && data.measurements) {
          const hasData = Object.values(data.measurements).some(
            (val) => val !== null && val !== undefined && val !== "",
          );

          if (hasData) {
            setMeasurements({
              totalLength: data.measurements.totalLength ?? null,
              shoulderWidth: data.measurements.shoulderWidth ?? null,
              armLength: data.measurements.armLength ?? null,
              chestWidth: data.measurements.chestWidth ?? null,
              waist: data.measurements.waist ?? null,
              hips: data.measurements.hips ?? null,
              neckWidth: data.measurements.neckWidth ?? null,
              neckDepth: data.measurements.neckDepth ?? null,
              armholeHeight: data.measurements.armholeHeight ?? null,
              sleeveOpeningWidth: data.measurements.sleeveOpeningWidth ?? null,
              cuffWidth: data.measurements.cuffWidth ?? null,
              cuffLength: data.measurements.cuffLength ?? null,
              notes: data.measurements.notes || "",
            });
            setHasMeasurements(true);
            console.log("✅ Measurements loaded");
          }
        }
      } catch (error) {
        console.error("❌ Fetch error:", error);
        setHasMeasurements(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMeasurements();
  }, []);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    const required = [
      ...BODY_MEASUREMENT_FIELDS,
      ...NECK_MEASUREMENT_FIELDS,
      ...SLEEVE_MEASUREMENT_FIELDS,
    ];

    required.forEach((f) => {
      const v = measurements[f as keyof MeasurementData] as number | null;
      if (v === null || v <= 0) {
        errors[f] = "Required field";
      }
    });

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const canContinue = () => {
    const required = [
      ...BODY_MEASUREMENT_FIELDS,
      ...NECK_MEASUREMENT_FIELDS,
      ...SLEEVE_MEASUREMENT_FIELDS,
    ];
    return required.every((f) => {
      const v = measurements[f as keyof MeasurementData] as number | null;
      return typeof v === "number" && v > 0;
    });
  };

  const handleNumberChange = (
    field: CustomOrderMeasurementField,
    value: string,
  ) => {
    setMeasurements((prev) => ({
      ...prev,
      [field]: parseOptionalNumber(value),
    }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleNotesChange = (value: string) => {
    setMeasurements((prev) => ({ ...prev, notes: value }));
  };

  const handleSaveMeasurements = async () => {
    if (!validate()) return;

    setIsSaving(true);

    try {
      const data = await api.post("/api/customer/customer_measurements", {
        totalLength: measurements.totalLength,
        shoulderWidth: measurements.shoulderWidth,
        armLength: measurements.armLength,
        chestWidth: measurements.chestWidth,
        waist: measurements.waist,
        hips: measurements.hips,
        neckWidth: measurements.neckWidth,
        neckDepth: measurements.neckDepth,
        armholeHeight: measurements.armholeHeight,
        sleeveOpeningWidth: measurements.sleeveOpeningWidth,
        cuffWidth: measurements.cuffWidth,
        cuffLength: measurements.cuffLength,
        notes: measurements.notes,
      });

      console.log("✅ Measurements saved:", data);

      setHasMeasurements(true);
      setIsEditing(false);
      toast.success("Measurements saved successfully!");
    } catch (error) {
      console.error("❌ Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12 text-center">
          <p className="text-gray-500">Loading measurements...</p>
        </div>
      </div>
    );
  }

  const isViewMode = hasMeasurements && !isEditing;

  return (
    <div className="mx-auto max-w-7xl w-full space-y-4 sm:space-y-6 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="w-full sm:w-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-light text-black tracking-tight">
            {isViewMode ? "My Measurements" : "Measurements"}
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 sm:mt-1">
            {isViewMode ? "Review your saved measurements" : t("optionalNote")}
          </p>
        </div>
        {isViewMode && (
          <button
            type="button"
            onClick={handleEdit}
            className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 bg-black text-white text-[10px] sm:text-[11px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition font-ui rounded-lg hover:cursor-pointer whitespace-nowrap"
          >
            Edit Measurements
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 lg:gap-8 xl:gap-12 mb-8 sm:mb-10">
          <div className="space-y-8 sm:space-y-10">
            <section>
              <h2 className="font-display text-[18px] sm:text-[20px] md:text-[22px] font-normal mb-1.5 sm:mb-2">
                {t("bodySection")}
              </h2>
              {!isViewMode && (
                <p className="font-body text-[12px] sm:text-[13px] text-gray-500 mb-4 sm:mb-6">
                  {t("bodySectionHint")}
                </p>
              )}
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
                    value={measurements[field]}
                    onChange={handleNumberChange}
                    t={t}
                    error={fieldErrors[field]}
                    disabled={isViewMode}
                  />
                ))}
              </div>
            </section>

            <section className="pt-5 sm:pt-6 border-t border-gray-200">
              <h2 className="font-display text-[18px] sm:text-[20px] md:text-[22px] font-normal mb-1.5 sm:mb-2">
                {t("neckSection")}
              </h2>
              {!isViewMode && (
                <p className="font-body text-[12px] sm:text-[13px] text-gray-500 mb-4 sm:mb-6">
                  {t("neckSectionHint")}
                </p>
              )}
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
                      value={measurements[field]}
                      onChange={handleNumberChange}
                      t={t}
                      error={fieldErrors[field]}
                      disabled={isViewMode}
                    />
                  ))}
                </div>
              </div>
            </section>

            <section className="pt-5 sm:pt-6 border-t border-gray-200">
              <h2 className="font-display text-[18px] sm:text-[20px] md:text-[22px] font-normal mb-1.5 sm:mb-2">
                {t("fields.arabicSleeveSection")}
              </h2>
              {!isViewMode && (
                <p className="font-body text-[12px] sm:text-[13px] text-gray-500 mb-4 sm:mb-6">
                  {t("fields.arabicSleeveSectionHint")}
                </p>
              )}
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
                      value={measurements[field]}
                      onChange={handleNumberChange}
                      t={t}
                      error={fieldErrors[field]}
                      disabled={isViewMode}
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

        <div className="mb-8 sm:mb-10">
          <label
            htmlFor="measurement-notes"
            className="block font-ui text-[10px] uppercase tracking-[0.24em] text-black mb-1.5 sm:mb-2"
          >
            {t("fields.notes")}
          </label>
          <textarea
            id="measurement-notes"
            rows={4}
            value={measurements.notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder={t("fields.notesPlaceholder")}
            disabled={isViewMode}
            className={`w-full border border-gray-200 px-3 sm:px-4 py-2.5 sm:py-3 font-body text-[14px] sm:text-[15px] focus:outline-none focus:border-black transition resize-y min-h-25 sm:min-h-30 rounded-lg ${
              isViewMode ? "bg-gray-50 text-gray-700" : "bg-white text-black"
            }`}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 pt-5 sm:pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {!isViewMode && (
              <>
                {hasMeasurements && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full sm:w-auto px-6 py-2.5 sm:py-3 bg-gray-200 text-black text-[10px] tracking-[0.22em] uppercase hover:bg-gray-300 transition font-ui rounded-lg"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveMeasurements}
                  disabled={!canContinue() || isSaving}
                  className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-black text-white text-[11px] sm:text-[12px] md:text-[13px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-40 disabled:cursor-not-allowed font-ui rounded-lg hover:cursor-pointer"
                >
                  {isSaving
                    ? "SAVING..."
                    : hasMeasurements
                      ? "Update"
                      : "Submit Measurement"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
