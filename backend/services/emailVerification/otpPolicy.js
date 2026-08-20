export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 15 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;
/** Abandoned email-change hold. Active resend refreshes this window. */
export const PENDING_EMAIL_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Purpose copy for the shared auth.otp email template.
 * Add keys here for future OTP uses — template/event stay the same.
 */
export const OTP_PURPOSES = {
  VERIFY_EMAIL_ADDRESS: "Verify your email address",
  CHANGE_EMAIL: "Confirm your new email address",
  GUEST_CHECKOUT: "Confirm your email for this order",
};

/** Stored on User.emailVerificationPurpose — not the email template copy. */
export const EMAIL_VERIFICATION_PURPOSES = {
  VERIFY_EMAIL: "verify_email",
  CHANGE_EMAIL: "change_email",
};
