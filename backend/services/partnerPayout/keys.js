import { PartnerPayoutError } from "./errors.js";

export function earningIdempotencyKey(orderId, partnerId, component) {
  return `earning:${String(orderId)}:${String(partnerId)}:${String(component)}`;
}

export function requireIdempotencyKey(key) {
  const value = String(key || "").trim();
  if (!value) {
    throw new PartnerPayoutError(
      "Unable to process this payment. Please try again.",
      400,
      "MISSING_IDEMPOTENCY_KEY",
    );
  }
  if (value.length > 200) {
    throw new PartnerPayoutError(
      "Unable to process this payment. Please try again.",
      400,
      "INVALID_IDEMPOTENCY_KEY",
    );
  }
  return value;
}
