"use client";

import { useTranslations } from "next-intl";
import {
    ALL_MEASUREMENT_DISPLAY_ORDER,
    getMeasurementLetter,
} from "@/lib/measurementDiagramLabels";
import type { CustomOrderMeasurements } from "@/lib/customOrder";
import MeasurementBodyDiagram from "@/components/custom-order/measurement-diagram/MeasurementBodyDiagram";

type MeasurementsLike = Partial<
    Pick<
        CustomOrderMeasurements,
        | "totalLength"
        | "shoulderWidth"
        | "armLength"
        | "chestWidth"
        | "waist"
        | "hips"
        | "neckWidth"
        | "neckDepth"
        | "armholeHeight"
        | "sleeveOpeningWidth"
        | "cuffWidth"
        | "cuffLength"
        | "notes"
    >
>;

type CustomOrderMeasurementsPanelProps = {
    measurements: MeasurementsLike;
    showGuide?: boolean;
};

export default function CustomOrderMeasurementsPanel({
    measurements,
    showGuide = true,
}: CustomOrderMeasurementsPanelProps) {
    const t = useTranslations("CustomOrderMeasurements");

    const entries = ALL_MEASUREMENT_DISPLAY_ORDER.flatMap((field) => {
        const value = measurements[field];
        if (value === null || value === undefined) return [];

        return [{ field, value }];
    });

    const hasValues = entries.length > 0;
    const hasNotes = Boolean(measurements.notes?.trim());

    if (!hasValues && !hasNotes) {
        return null;
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,300px)] gap-6">
            <div className="space-y-4">
                {hasValues && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {entries.map(({ field, value }) => (
                            <div
                                key={field}
                                className="bg-white p-3 border border-gray-100 rounded-lg min-w-0"
                            >
                                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400 uppercase font-medium tracking-[0.16em]">
                                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border border-gray-300 text-[9px] text-black shrink-0">
                                        {getMeasurementLetter(field)}
                                    </span>
                                    {t(`fields.${field}`)}
                                </p>
                                <p className="text-sm font-semibold font-mono text-black mt-1.5">
                                    {value} {t("unit")}
                                </p>
                            </div>
                        ))}
                    </div>
                )}

                {hasNotes && (
                    <div className="bg-white p-3 border border-gray-100 rounded-lg">
                        <p className="text-[10px] text-gray-400 uppercase font-medium tracking-[0.16em]">
                            {t("fields.notes")}
                        </p>
                        <p className="text-xs text-gray-700 mt-1.5 whitespace-pre-wrap">
                            {measurements.notes}
                        </p>
                    </div>
                )}
            </div>

            {showGuide && (
                <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 uppercase font-medium tracking-[0.2em]">
                        {t("diagramGuide")}
                    </p>
                    <MeasurementBodyDiagram />
                </div>
            )}
        </div>
    );
}
