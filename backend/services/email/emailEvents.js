export const EMAIL_EVENTS = {
  AUTH_WELCOME: "auth.welcome",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  /** Shared OTP email for any verify purpose (purpose string in payload). */
  AUTH_OTP: "auth.otp",
  /** @deprecated use AUTH_OTP — kept so old EmailLog queries still match if needed */
  AUTH_EMAIL_OTP: "auth.otp",
  OPS_CONTACT: "ops.contact",
  ORDER_RETAIL_PLACED: "order.retail.placed",
  ORDER_CUSTOM_PLACED: "order.custom.placed",
  ORDER_CUSTOM_PLACED_TAILOR: "order.custom.placed.tailor",
  ORDER_CUSTOM_PLACED_FABRIC: "order.custom.placed.fabric",
  ORDER_RETAIL_PLACED_FABRIC: "order.retail.placed.fabric",
  PARTNER_SUBMITTED: "partner.submitted",
  PARTNER_RESUBMITTED: "partner.resubmitted",
  PARTNER_APPROVED: "partner.approved",
  PARTNER_REJECTED: "partner.rejected",
};

export function buildDedupeKey(event, parts = []) {
  const suffix = parts.filter((p) => p !== undefined && p !== null && p !== "").join(":");
  return suffix ? `email:${event}:${suffix}` : `email:${event}`;
}
