/**
 * Missing/undefined emailVerified = grandfathered verified (pre-OTP accounts).
 * Explicit false = unverified local signup.
 */
export function isEmailVerified(user) {
  if (!user) return false;
  return user.emailVerified !== false;
}
