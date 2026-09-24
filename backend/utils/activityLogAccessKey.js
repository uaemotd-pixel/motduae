/**
 * Opaque activity-log access key — must match frontend/src/lib/activityLog/access.ts
 * Used for API auth. Optional env ACTIVITY_LOG_ACCESS_KEY overrides for rotation.
 */
export const ACTIVITY_LOG_URL_KEY =
  "e7b3c91a4f82d06e5a1c8b94f27d03e6a9c5b18f";

export const ACTIVITY_LOG_ACCESS_HEADER = "x-motd-activity-key";

export function resolveActivityLogAccessKey() {
  const fromEnv = String(process.env.ACTIVITY_LOG_ACCESS_KEY || "").trim();
  return fromEnv || ACTIVITY_LOG_URL_KEY;
}
