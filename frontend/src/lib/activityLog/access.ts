/**
 * Opaque activity-log route key (looks like a hash — not a user-configured secret).
 * URL: /{locale}/x/{ACTIVITY_LOG_URL_KEY}/activity
 * Must stay in sync with backend/utils/activityLogAccessKey.js
 */
export const ACTIVITY_LOG_URL_KEY =
  "e7b3c91a4f82d06e5a1c8b94f27d03e6a9c5b18f";

export const ACTIVITY_LOG_ACCESS_HEADER = "x-motd-activity-key";
