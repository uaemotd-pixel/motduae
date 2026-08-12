// lib/uaePhone.ts
export const UAE_PHONE_REGEX = /^\+971\d{9}$/;

export function normalizeUaePhone(value: string): string {
  const cleaned = String(value || "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";

  let digits = cleaned.replace(/\D/g, "");
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  return digits ? `+971${digits}` : "";
}

export function isValidUaePhone(value: string): boolean {
  return UAE_PHONE_REGEX.test(String(value || "").replace(/[^\d+]/g, ""));
}

export function formatPhoneDisplay(value: string): string {
  const normalized = normalizeUaePhone(value);
  if (!normalized) return "";
  const digits = normalized.replace(/\D/g, "").slice(3);
  if (digits.length === 0) return "+971";
  return `+971 ${digits}`;
}

export function extractDigits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}