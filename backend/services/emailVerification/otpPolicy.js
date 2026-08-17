export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 15 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
export const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Purpose copy for the shared auth.otp email template.
 * Add keys here for future OTP uses — template/event stay the same.
 */
export const OTP_PURPOSES = {
  VERIFY_EMAIL_ADDRESS: "Verify your email address",
};
