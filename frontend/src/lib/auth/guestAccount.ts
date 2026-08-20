/** Seed guest identity — keep in sync with backend GUEST_CUSTOMER_EMAIL. */
export const GUEST_CUSTOMER_EMAIL = (
  process.env.NEXT_PUBLIC_GUEST_CUSTOMER_EMAIL || "guestcustomer@motd.test"
)
  .toLowerCase()
  .trim();

export function isGuestAccountEmail(email?: string | null) {
  return String(email || "").toLowerCase().trim() === GUEST_CUSTOMER_EMAIL;
}

export function isGuestOrderUser(
  userId: { email?: string } | string | null | undefined,
) {
  if (!userId || typeof userId !== "object") return false;
  return isGuestAccountEmail(userId.email);
}

/** Guest orders: checkout contact. Account orders: live User.email. */
export function resolveOrderDisplayEmail(order: {
  contactEmail?: string | null;
  userId?: { email?: string } | string | null;
}) {
  const accountEmail =
    order.userId && typeof order.userId === "object"
      ? order.userId.email || ""
      : "";
  if (isGuestAccountEmail(accountEmail)) {
    return String(order.contactEmail || "").trim();
  }
  return accountEmail;
}
