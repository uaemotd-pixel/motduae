import { isGuestUser } from "./isGuestUser.js";

/**
 * Where order/tracking mail should go (Phase B). Does not send.
 * Account: live User.email. Guest: order.contactEmail.
 */
export function resolveOrderMailTo(order, user) {
  if (user && isGuestUser(user)) {
    return String(order?.contactEmail || "").toLowerCase().trim();
  }
  if (user?.email) {
    return String(user.email).toLowerCase().trim();
  }
  return String(order?.contactEmail || "").toLowerCase().trim();
}
