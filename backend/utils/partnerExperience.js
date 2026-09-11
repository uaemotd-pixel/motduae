/**
 * Partner experience helpers.
 * Baseline comes from application yearsOperating; elapsed time uses calendar months
 * (day-of-month aware so 30/31-day months and leap Februaries are handled).
 */

export const YEARS_OPERATING_BASELINE_MONTHS = {
  under_1: 0,
  "1_3": 12,
  "3_10": 36,
  "10_plus": 120,
};

export function baselineMonthsFromYearsOperating(yearsOperating) {
  const key = String(yearsOperating || "").trim();
  if (Object.prototype.hasOwnProperty.call(YEARS_OPERATING_BASELINE_MONTHS, key)) {
    return YEARS_OPERATING_BASELINE_MONTHS[key];
  }
  return null;
}

/**
 * Whole calendar months from `from` to `to`.
 * A month counts only once the same (or later) day-of-month is reached,
 * so Jan 31 → Feb 28/29 is not yet a full month, and leap years are safe.
 */
export function calendarMonthsBetween(fromInput, toInput = new Date()) {
  const from = toUtcDateOnly(fromInput);
  const to = toUtcDateOnly(toInput);
  if (!from || !to || to < from) return 0;

  let months =
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth());

  if (to.getUTCDate() < from.getUTCDate()) {
    months -= 1;
  }

  return Math.max(0, months);
}

function toUtcDateOnly(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * @returns {{ years: number, months: number, yearsOperating: string } | null}
 */
export function computePartnerExperience(application, now = new Date()) {
  if (!application) return null;

  const yearsOperating = String(application.yearsOperating || "").trim();
  const mappedBaseline = baselineMonthsFromYearsOperating(yearsOperating);
  if (mappedBaseline == null && application.experienceBaselineMonths == null) {
    return null;
  }

  const baselineMonths =
    typeof application.experienceBaselineMonths === "number" &&
    Number.isFinite(application.experienceBaselineMonths)
      ? Math.max(0, Math.floor(application.experienceBaselineMonths))
      : mappedBaseline ?? 0;

  const anchor =
    application.experienceAnchorAt ||
    application.submittedAt ||
    application.createdAt ||
    null;

  const elapsed = calendarMonthsBetween(anchor, now);
  const totalMonths = baselineMonths + elapsed;
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;

  return {
    years,
    months,
    yearsOperating,
  };
}

export function syncExperienceAnchor(doc, yearsOperatingValue) {
  const baseline = baselineMonthsFromYearsOperating(yearsOperatingValue);
  if (baseline == null) {
    doc.experienceBaselineMonths = undefined;
    doc.experienceAnchorAt = undefined;
    return;
  }
  doc.experienceBaselineMonths = baseline;
  doc.experienceAnchorAt = new Date();
}
