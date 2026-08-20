import { env } from "../../config/env.js";
import { normalizeEmail } from "./emailOccupancy.js";

export function guestCustomerEmail() {
  return normalizeEmail(env.guestCustomerEmail);
}

export function isGuestCustomerEmail(email) {
  return normalizeEmail(email) === guestCustomerEmail();
}

/** Guest is the seed account — not a client/JWT flag. */
export function isGuestUser(user) {
  if (!user?.email) return false;
  return isGuestCustomerEmail(user.email);
}
