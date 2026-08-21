/** YYYY-MM-DD calendar date from an <input type="date">. */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parseLocalDay(dateStr: string): {
  year: number;
  monthIndex: number;
  day: number;
} | null {
  const match = DATE_ONLY_RE.exec(dateStr.trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    monthIndex: Number(match[2]) - 1,
    day: Number(match[3]),
  };
}

/** Start of the user's local calendar day as an ISO timestamp. */
export function localDayStartISO(dateStr: string): string {
  const parts = parseLocalDay(dateStr);
  if (!parts) return dateStr;
  return new Date(
    parts.year,
    parts.monthIndex,
    parts.day,
    0,
    0,
    0,
    0,
  ).toISOString();
}

/** Inclusive end of the user's local calendar day as an ISO timestamp. */
export function localDayEndISO(dateStr: string): string {
  const parts = parseLocalDay(dateStr);
  if (!parts) return dateStr;
  return new Date(
    parts.year,
    parts.monthIndex,
    parts.day,
    23,
    59,
    59,
    999,
  ).toISOString();
}

export function isWithinLocalDateRange(
  isoTimestamp: string,
  from?: string,
  to?: string,
): boolean {
  const time = new Date(isoTimestamp).getTime();
  if (Number.isNaN(time)) return false;

  if (from) {
    const start = new Date(localDayStartISO(from)).getTime();
    if (time < start) return false;
  }

  if (to) {
    const end = new Date(localDayEndISO(to)).getTime();
    if (time > end) return false;
  }

  return true;
}
