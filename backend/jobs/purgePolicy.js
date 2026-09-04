/**
 * Retention windows for daily purge jobs — NOT cron schedules.
 * Jobs run every day; these values mean "delete documents older than N days".
 */
export const PURGE_DEFAULTS = {
  guestOtpDays: 2,
  pendingCheckoutDays: 15,
  pendingCheckoutSettledDays: 30,
  emailLogDays: 90,
  notificationSoftDeleteDays: 30,
  notificationReadDays: 90,
  deleteBatchSize: 1000,
  deleteMaxBatches: 40,
  pendingCheckoutRecoverLimit: 40,
};

/** Disaster-net TTL: longer than settled-checkout retention so cron stays in charge. */
export const PENDING_CHECKOUT_TTL_SECONDS =
  PURGE_DEFAULTS.pendingCheckoutSettledDays * 24 * 60 * 60;

export const ABANDONED_CHECKOUT_STATUSES = ["pending", "failed", "expired"];
export const SETTLED_CHECKOUT_STATUSES = ["completed"];
