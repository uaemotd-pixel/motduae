const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Parse a query date.
 *
 * Date-only values (YYYY-MM-DD from <input type="date">) are treated as
 * inclusive calendar days:
 *   bound "start" -> 00:00:00.000 UTC
 *   bound "end"   -> 23:59:59.999 UTC
 *
 * `new Date("YYYY-MM-DD")` is UTC midnight at the *start* of that day, so
 * using it as $lte drops every record created later that same day.
 *
 * Full datetime / ISO strings are used as-is so clients can send local-day
 * bounds (e.g. end of the user's local calendar day).
 */
export function parseQueryDate(value, { bound = "start", label = "date" } = {}) {
  if (value == null || String(value).trim() === "") {
    return { date: null };
  }

  const str = String(value).trim();
  const match = str.match(DATE_ONLY_RE);

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    if (bound === "end") {
      return { date: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)) };
    }
    return { date: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)) };
  }

  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    return { error: `Invalid ${label} date` };
  }
  return { date };
}

export function applyCreatedAtFilter(from, to) {
  if (!from && !to) {
    return { createdAt: null };
  }

  const createdAt = {};

  if (from) {
    const parsed = parseQueryDate(from, { bound: "start", label: "from" });
    if (parsed.error) return parsed;
    if (parsed.date) createdAt.$gte = parsed.date;
  }

  if (to) {
    const parsed = parseQueryDate(to, { bound: "end", label: "to" });
    if (parsed.error) return parsed;
    if (parsed.date) createdAt.$lte = parsed.date;
  }

  return {
    createdAt: Object.keys(createdAt).length ? createdAt : null,
  };
}

/**
 * Inclusive UTC window for dashboard timeframe pills (week / month / year).
 * Start is always 00:00:00.000 on the first day so that day is not dropped.
 */
export function getTimeframeWindow(timeframe, { includePrevious = false } = {}) {
  const now = new Date();
  const end = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999,
    ),
  );

  const start = new Date(end);
  if (timeframe === "week") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (timeframe === "year") {
    start.setUTCMonth(start.getUTCMonth() - 11);
  } else {
    start.setUTCDate(start.getUTCDate() - 29);
  }
  start.setUTCHours(0, 0, 0, 0);

  if (!includePrevious) {
    return { start, end };
  }

  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd);
  if (timeframe === "week") {
    prevStart.setUTCDate(prevStart.getUTCDate() - 6);
  } else if (timeframe === "year") {
    prevStart.setUTCMonth(prevStart.getUTCMonth() - 11);
  } else {
    prevStart.setUTCDate(prevStart.getUTCDate() - 29);
  }
  prevStart.setUTCHours(0, 0, 0, 0);

  return { start, end, prevStart, prevEnd };
}
