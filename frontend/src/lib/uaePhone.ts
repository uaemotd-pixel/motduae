// lib/uaePhone.ts

export const UAE_PHONE_9DIGIT_REGEX = /^\d{9}$/;
export const UAE_PHONE_E164_REGEX = /^\+971\d{9}$/;
export const UAE_PHONE_REGEX = /^(?:\+971)?\d{9}$/;

export function extractDigits(value: string | null | undefined): string {
  return String(value || "").replace(/\D/g, "");
}

/**
 * Extracts 9 local digits from any UAE phone string (+971XXXXXXXXX, 971XXXXXXXXX, 05XXXXXXXX, XXXXXXXXX).
 */
export function toUaePhoneDigits(value: string | null | undefined): string {
  if (!value) return "";
  let digits = extractDigits(value);
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 9);
}

/**
 * Normalizes phone number to 9 digits for database storage.
 * e.g., "+971 50 123 4567" -> "501234567"
 */
export function normalizeUaePhone(value: string | null | undefined): string {
  return toUaePhoneDigits(value);
}

/**
 * Checks if the phone number has exactly 9 UAE local digits.
 * Accepts "501234567", "+971501234567", "0501234567", etc.
 */
export function isValidUaePhone(value: string | null | undefined): boolean {
  if (!value) return false;
  const digits = toUaePhoneDigits(value);
  return UAE_PHONE_9DIGIT_REGEX.test(digits);
}

/**
 * Formats a phone number for display: "+971 50 123 4567".
 */
export function formatPhoneDisplay(value: string | null | undefined): string {
  if (!value) return "";
  const digits = toUaePhoneDigits(value);
  if (!digits) return "";
  if (digits.length <= 2) return `+971 ${digits}`;
  if (digits.length <= 5) return `+971 ${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `+971 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 9)}`;
}

/**
 * Read-only display: formatted UAE phone (+971 50 123 4567).
 */
export function displayUaePhone(value: string | null | undefined): string {
  return formatPhoneDisplay(value);
}

/**
 * 9 local digits for inputs beside a read-only +971 prefix.
 */
export function getUaePhoneInputValue(value: string | null | undefined): string {
  return toUaePhoneDigits(value);
}