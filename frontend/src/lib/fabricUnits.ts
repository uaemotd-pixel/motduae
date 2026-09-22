/** 1 war = 0.9144 meters */
export const WAR_TO_METER = 0.9144;

/** 1 meter = 1.0936 war */
export const METER_TO_WAR = 1.0936;

/** Legacy alias used across custom-order UI */
export const WARA_TO_METERS = WAR_TO_METER;

export type CutUnit = "war" | "meter";
export type FabricUnit = "meters" | "war" | "wara";

export function normalizeCutUnit(unit: string): CutUnit | null {
  if (unit === "war" || unit === "wara") return "war";
  if (unit === "meter" || unit === "meters") return "meter";
  return null;
}

export function normalizeFabricUnit(value: unknown): FabricUnit {
  if (value === "war" || value === "wara") return "war";
  return "meters";
}

export function cutValueToMeters(value: number, unit: CutUnit): number {
  if (unit === "war") {
    return Number((value * WAR_TO_METER).toFixed(4));
  }
  return Number(value.toFixed(4));
}

export function metersToWar(meters: number): number {
  return Number((meters * METER_TO_WAR).toFixed(4));
}

export function convertToMeters(value: number, unit: FabricUnit): number {
  if (unit === "war" || unit === "wara") {
    return Number((value * WAR_TO_METER).toFixed(2));
  }
  return Number(value.toFixed(2));
}

export function convertToWar(value: number, fromUnit: FabricUnit): number {
  const meters =
    fromUnit === "war" || fromUnit === "wara"
      ? value * WAR_TO_METER
      : value;
  return Number((meters * METER_TO_WAR).toFixed(2));
}

/** @deprecated Use convertToWar */
export function convertToWara(value: number): number {
  return convertToWar(value, "meters");
}

export function getDisplayUnit(unit: FabricUnit): string {
  if (unit === "war" || unit === "wara") return "War";
  return "Meters";
}

export function fabricUnitFromCutUnit(unit: CutUnit): FabricUnit {
  return unit === "war" ? "war" : "meters";
}

export function formatCutLabel(
  value: number,
  unit: CutUnit,
  locale: "en" | "ar" = "en",
): string {
  const unitLabel =
    unit === "war"
      ? locale === "ar"
        ? "ور"
        : "war"
      : locale === "ar"
        ? "متر"
        : "meter";
  return `${value} ${unitLabel}`;
}

function formatCutMeasure(value: number): string {
  if (!Number.isFinite(value)) return "";
  return String(Number(value.toFixed(2)));
}

type CutMeasureInput = {
  value: number;
  unit: string;
  metersEquivalent?: number;
  lengthInMeters?: number;
  warEquivalent?: number;
};

function cutEquivalentClauses(cut: CutMeasureInput): { en: string; ar: string } {
  const unit = normalizeCutUnit(cut.unit) ?? "meter";
  const meters =
    cut.metersEquivalent ??
    cut.lengthInMeters ??
    cutValueToMeters(cut.value, unit);
  const valueLabel = formatCutMeasure(cut.value);

  if (unit === "war") {
    const metersLabel = formatCutMeasure(meters);
    return {
      en: `${valueLabel} war ≈ ${metersLabel}m`,
      ar: `${valueLabel} وار ≈ ${metersLabel}م`,
    };
  }

  const war = cut.warEquivalent ?? metersToWar(meters);
  const warLabel = formatCutMeasure(war);
  return {
    en: `${valueLabel} m ≈ ${warLabel} war`,
    ar: `${valueLabel} م ≈ ${warLabel} وار`,
  };
}

/** Size plus the other unit, in one language. */
export function formatCutEquivalentClause(
  cut: CutMeasureInput,
  locale: "en" | "ar" = "en",
): string {
  const clauses = cutEquivalentClauses(cut);
  return locale === "ar" ? clauses.ar : clauses.en;
}

/** English and Arabic cut labels. The ≈ side is the other unit. */
export function formatCatalogCutLabels(cut: CutMeasureInput & {
  name: string;
  nameAr?: string;
}): { en: string; ar: string } {
  const clauses = cutEquivalentClauses(cut);
  const arName = cut.nameAr?.trim() || cut.name;
  return {
    en: `${cut.name} (${clauses.en})`,
    ar: `${arName} (${clauses.ar})`,
  };
}

export function formatBilingualCutOption(cut: {
  name: string;
  nameAr?: string;
  value: number;
  unit: string;
  metersEquivalent?: number;
  lengthInMeters?: number;
  warEquivalent?: number;
}): string {
  const labels = formatCatalogCutLabels(cut);
  return `${labels.en} / \u2067${labels.ar}\u2069`;
}
