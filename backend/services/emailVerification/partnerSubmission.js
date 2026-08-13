import { createAdminNotificationForNewUser } from "../adminNotificationService.js";

const PARTNER_ROLES = new Set(["tailor", "fabric_store"]);

/**
 * Side effect when a partner email is trusted (OTP verify or Google create).
 * Today: admin in-app notification. Later: call from application form submit instead.
 */
export async function markPartnerSubmittedAfterEmailVerify(user) {
  if (!user || !PARTNER_ROLES.has(user.role)) {
    return;
  }

  await createAdminNotificationForNewUser({
    type: `user_${user.role}_registered`,
    title: "User registration",
    message: `${user.name} is registered as ${user.role.replace("_", " ")}.`,
    createdBy: user._id,
    tailorUserId: user.role === "tailor" ? user._id : null,
  });
}
