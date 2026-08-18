export const EMAIL_EVENTS = {
  AUTH_WELCOME: "auth.welcome",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  /** Shared OTP email for any verify purpose (purpose string in payload). */
  AUTH_OTP: "auth.otp",
  /** @deprecated use AUTH_OTP — kept so old EmailLog queries still match if needed */
  AUTH_EMAIL_OTP: "auth.otp",
  OPS_CONTACT: "ops.contact",
  ORDER_CONFIRMED: "order.confirmed",
  ORDER_STATUS_UPDATED: "order.status_updated",
};

export function buildDedupeKey(event, parts = []) {
  const suffix = parts.filter((p) => p !== undefined && p !== null && p !== "").join(":");
  return suffix ? `email:${event}:${suffix}` : `email:${event}`;
}
