/**
 * Utility functions for UAE phone numbers (9 digits local storage).
 * Format: 9 digits (e.g. 501234567, 423456780).
 */

export const UAE_PHONE_9DIGIT_REGEX = /^\d{9}$/;

/**
 * Extracts local 9 digits from any phone format (+971XXXXXXXXX, 971XXXXXXXXX, 05XXXXXXXX, XXXXXXXXX).
 */
export function toUaePhoneDigits(value) {
  if (!value) return "";
  let digits = String(value).replace(/\D/g, "");
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

/**
 * Validates whether the given value contains exactly 9 UAE local digits.
 */
export function isValidUaePhone(value) {
  if (!value) return false;
  const digits = toUaePhoneDigits(value);
  return UAE_PHONE_9DIGIT_REGEX.test(digits);
}

/**
 * Normalizes phone number to 9 digits for database storage.
 * Returns the 9 digits if valid, or empty string if invalid.
 */
export function normalizeUaePhone(value) {
  const digits = toUaePhoneDigits(value);
  return digits.length === 9 ? digits : "";
}

/**
 * Formats a 9-digit or raw UAE phone number for display (+971 XX XXX XXXX).
 */
export function formatPhoneDisplay(value) {
  if (!value) return "";
  const digits = toUaePhoneDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `+971 ${digits}`;
  if (digits.length <= 5) return `+971 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `+971 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}
