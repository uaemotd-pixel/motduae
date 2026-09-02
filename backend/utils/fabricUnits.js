/** 1 war = 0.9144 meters */
export const WAR_TO_METER = 0.9144;

/** 1 meter = 1.0936 war */
export const METER_TO_WAR = 1.0936;

export const CUT_UNITS = ["war", "meter"];

export function normalizeCutUnit(unit) {
  if (unit === "war" || unit === "wara") return "war";
  if (unit === "meter" || unit === "meters") return "meter";
  return null;
}

export function cutValueToMeters(value, unit) {
  const normalized = normalizeCutUnit(unit);
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Cut value must be greater than 0");
  }
  if (normalized === "war") {
    return Number((numeric * WAR_TO_METER).toFixed(4));
  }
  if (normalized === "meter") {
    return Number(numeric.toFixed(4));
  }
  throw new Error("Invalid cut unit");
}

export function metersToWar(meters) {
  const numeric = Number(meters);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Number((numeric * METER_TO_WAR).toFixed(4));
}

export function warToMeters(war) {
  return cutValueToMeters(war, "war");
}
