/**
 * Retention windows — NOT cron schedules.
 * These values mean "delete documents older than N days".
 *
 * When a job runs is PURGE_JOB_CRON (UTC, five-field cron: min hour dom month dow).
 * Vercel calls that job's own path at that time — it does not poll every hour.
 */
export const PURGE_DEFAULTS = {
  guestOtpDays: 2,
  pendingCheckoutDays: 15,
  pendingCheckoutSettledDays: 30,
  emailLogDays: 90,
  notificationSoftDeleteDays: 30,
  notificationReadDays: 90,
  cartDays: 30,
  wishlistDays: 60,
  activityLogDays: 90,
  deleteBatchSize: 1000,
  deleteMaxBatches: 40,
  pendingCheckoutRecoverLimit: 40,
};

/** Disaster-net TTL: longer than settled-checkout retention so cron stays in charge. */
export const PENDING_CHECKOUT_TTL_SECONDS =
  PURGE_DEFAULTS.pendingCheckoutSettledDays * 24 * 60 * 60;

export const ABANDONED_CHECKOUT_STATUSES = ["pending", "failed", "expired"];
export const SETTLED_CHECKOUT_STATUSES = ["completed"];

const DEFAULT_CRON = "0 2 * * *";

/**
 * UTC cron per job. Keep vercel.json `crons` in sync (same path + schedule).
 */
export const PURGE_JOB_CRON = {
  "purge-pending-emails": "0 2 * * *",
  "purge-expired-otps": "0 2 * * *",
  "purge-reset-tokens": "0 2 * * *",
  "purge-guest-otps": "0 2 * * *",
  "purge-pending-checkouts": "0 2 * * *",
  "purge-email-logs": "0 2 * * *",
  "purge-notifications": "0 2 * * *",
  "purge-activity-logs": "0 2 * * *",
  "purge-carts": "0 3 * * *",
  "purge-wishlists": "0 4 * * *",
};

export function jobCron(jobId) {
  return PURGE_JOB_CRON[jobId] || DEFAULT_CRON;
}

function parseCronPart(part, min, max) {
  if (part === "*") {
    return { any: true };
  }
  const values = new Set();
  for (const chunk of String(part).split(",")) {
    const [range, stepRaw] = chunk.split("/");
    const step = stepRaw ? Number(stepRaw) : 1;
    if (!Number.isInteger(step) || step < 1) continue;
    if (range === "*") {
      for (let n = min; n <= max; n += step) values.add(n);
      continue;
    }
    const [startRaw, endRaw] = range.split("-");
    const start = Number(startRaw);
    const end = endRaw === undefined ? start : Number(endRaw);
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
    for (let n = start; n <= end; n += step) {
      if (n >= min && n <= max) values.add(n);
    }
  }
  return { any: false, values };
}

function partMatches(parsed, value) {
  return parsed.any || parsed.values.has(value);
}

export function parseCronExpression(expression) {
  const fields = String(expression || "")
    .trim()
    .split(/\s+/);
  if (fields.length !== 5) {
    throw new Error(`Invalid cron "${expression}". Use: min hour day month weekday`);
  }
  return {
    minute: parseCronPart(fields[0], 0, 59),
    hour: parseCronPart(fields[1], 0, 23),
    dayOfMonth: parseCronPart(fields[2], 1, 31),
    month: parseCronPart(fields[3], 1, 12),
    dayOfWeek: parseCronPart(fields[4], 0, 7),
  };
}

function cronMatchesUtc(date, parsed) {
  const dow = date.getUTCDay();
  const weekdayOk =
    parsed.dayOfWeek.any ||
    parsed.dayOfWeek.values.has(dow) ||
    (dow === 0 && parsed.dayOfWeek.values.has(7));
  return (
    partMatches(parsed.minute, date.getUTCMinutes()) &&
    partMatches(parsed.hour, date.getUTCHours()) &&
    partMatches(parsed.dayOfMonth, date.getUTCDate()) &&
    partMatches(parsed.month, date.getUTCMonth() + 1) &&
    weekdayOk
  );
}

/** Milliseconds until the next UTC instant that matches the five-field cron. */
export function msUntilNextCron(expression, from = new Date()) {
  const parsed = parseCronExpression(expression);
  const cursor = new Date(from.getTime());
  cursor.setUTCSeconds(0, 0);
  cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  const limit = 366 * 24 * 60;
  for (let i = 0; i < limit; i += 1) {
    if (cronMatchesUtc(cursor, parsed)) {
      return cursor.getTime() - from.getTime();
    }
    cursor.setUTCMinutes(cursor.getUTCMinutes() + 1);
  }
  throw new Error(`No next run found for cron "${expression}"`);
}
