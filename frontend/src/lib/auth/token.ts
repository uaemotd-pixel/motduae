// frontend/src/lib/auth/token.ts
// Auth JWT is stored in an httpOnly cookie set by the API.
// These helpers only clear any legacy localStorage token from older clients.

const LEGACY_TOKEN_KEY = "auth_token";

/**
 * Remove legacy JWT from localStorage (pre-httpOnly cookie migration).
 */
export function clearLegacyAuthToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}
