import type { CustomOrderMeasurementField } from "@/lib/customOrder";

/** Matches numbered points on custom-order-measurement-guide.jpeg */
export const MEASUREMENT_FIELD_LABELS: Record<
    CustomOrderMeasurementField,
    string
> = {
    shoulderWidth: "1",
    neckWidth: "2",
    neckDepth: "3",
    chestWidth: "4",
    waist: "5",
    hips: "6",
    armLength: "7",
    sleeveOpeningWidth: "8",
    armholeHeight: "9",
    totalLength: "10",
    cuffWidth: "11",
    cuffLength: "12",
};

export const BODY_MEASUREMENT_FIELDS: CustomOrderMeasurementField[] = [
    "shoulderWidth",
    "chestWidth",
    "waist",
    "hips",
    "armLength",
    "armholeHeight",
    "totalLength",
];

export const NECK_MEASUREMENT_FIELDS: CustomOrderMeasurementField[] = [
    "neckWidth",
    "neckDepth",
];

export const SLEEVE_MEASUREMENT_FIELDS: CustomOrderMeasurementField[] = [
    "sleeveOpeningWidth",
    "cuffWidth",
    "cuffLength",
];

/** Display order matching numbered points on the measurement guide (1–12) */
export const ALL_MEASUREMENT_DISPLAY_ORDER: CustomOrderMeasurementField[] = [
    "shoulderWidth",
    "neckWidth",
    "neckDepth",
    "chestWidth",
    "waist",
    "hips",
    "armLength",
    "sleeveOpeningWidth",
    "armholeHeight",
    "totalLength",
    "cuffWidth",
    "cuffLength",
];

export function getMeasurementLetter(
    field: CustomOrderMeasurementField,
): string {
    return MEASUREMENT_FIELD_LABELS[field];
}
