import { createAdminNotificationForNewUser, createNotification } from "../adminNotificationService.js";
import { PARTNER_ROLES } from "../partnerApplication/policy.js";

/**
 * In-app admin notification when a partner submits an application.
 * Call from form submit only — not OTP verify or Google create.
 * Resubmit must use its own dedupe key — `createAdminNotificationForNewUser`
 * always keys `user_registered:{id}` and would silently skip a second notify.
 */
export async function notifyPartnerApplicationSubmitted(
  user,
  { resubmitted = false, resubmitCount = 0 } = {},
) {
  if (!user || !PARTNER_ROLES.has(user.role)) {
    return;
  }

  const roleLabel = user.role === "fabric_store" ? "fabric store" : "tailor";
  const number = user.requestNumber ? ` (${user.requestNumber})` : "";
  const tailorUserId = user.role === "tailor" ? user._id : null;

  if (resubmitted) {
    await createNotification({
      type: `user_${user.role}_application_resubmitted`,
      title: "Partner application resubmitted",
      message: `${user.name} resubmitted a ${roleLabel} application${number}.`,
      audience: "admin",
      createdBy: user._id,
      tailorUserId,
      dedupeKey: `partner_application_resubmitted:${user._id}:${resubmitCount}`,
    });
    return;
  }

  await createAdminNotificationForNewUser({
    type: `user_${user.role}_registered`,
    title: "Partner application submitted",
    message: `${user.name} submitted a ${roleLabel} application${number}.`,
    createdBy: user._id,
    tailorUserId,
  });
}

/** @deprecated Use notifyPartnerApplicationSubmitted */
export const markPartnerSubmittedAfterEmailVerify =
  notifyPartnerApplicationSubmitted;
