import crypto from "crypto";
import { env } from "../config/env.js";
import {
  EMAIL_EVENTS,
  buildDedupeKey,
  send,
  sendCritical,
  isConfigured,
} from "./email/index.js";

export { isConfigured, isConfigured as isEmailConfigured };

export async function sendPasswordResetEmail({ to, resetUrl, userId, tokenFingerprint }) {
  const dedupeKey = buildDedupeKey(EMAIL_EVENTS.AUTH_PASSWORD_RESET, [
    userId || to,
    tokenFingerprint || crypto.createHash("sha256").update(resetUrl || "").digest("hex").slice(0, 16),
  ]);

  return sendCritical(
    EMAIL_EVENTS.AUTH_PASSWORD_RESET,
    { to, resetUrl },
    {
      to,
      userId: userId || null,
      dedupeKey,
    },
  );
}

export async function sendContactMessageEmail({ name, email, subject, message }) {
  const contactInbox = env.email.contactInbox;
  const bucket = Math.floor(Date.now() / (5 * 60 * 1000));
  const fingerprint = crypto
    .createHash("sha256")
    .update(`${email}|${subject}|${bucket}`)
    .digest("hex")
    .slice(0, 16);

  return send(
    EMAIL_EVENTS.OPS_CONTACT,
    { name, email, subject, message },
    {
      to: contactInbox,
      replyTo: email,
      dedupeKey: buildDedupeKey(EMAIL_EVENTS.OPS_CONTACT, [fingerprint]),
    },
  );
}

export async function sendWelcomeEmail({ to, name, userId, storeUrl }) {
  return send(
    EMAIL_EVENTS.AUTH_WELCOME,
    {
      to,
      name,
      userId,
      storeUrl: storeUrl || env.frontendUrl,
    },
    {
      to,
      userId,
      dedupeKey: buildDedupeKey(EMAIL_EVENTS.AUTH_WELCOME, [userId]),
    },
  );
}

export async function sendOtpEmail({
  to,
  name,
  otp,
  userId,
  purpose,
}) {
  return send(
    EMAIL_EVENTS.AUTH_OTP,
    {
      to,
      name,
      otp,
      userId,
      purpose,
    },
    {
      to,
      userId,
      dedupeKey: buildDedupeKey(EMAIL_EVENTS.AUTH_OTP, [
        userId || to,
        Date.now(),
      ]),
    },
  );
}

/** @deprecated use sendOtpEmail */
export async function sendEmailOtpEmail(args) {
  return sendOtpEmail(args);
}

export async function sendOrderPlacedEmail({
  to,
  name,
  userId,
  orderId,
  orderType,
  trackingUrl,
  shortOrderId,
  totalAed,
}) {
  const event =
    orderType === "custom"
      ? EMAIL_EVENTS.ORDER_CUSTOM_PLACED
      : EMAIL_EVENTS.ORDER_RETAIL_PLACED;

  return send(
    event,
    {
      to,
      name,
      trackingUrl,
      orderType,
      shortOrderId,
      totalAed,
    },
    {
      to,
      userId,
      orderId,
      orderType,
      dedupeKey: buildDedupeKey(event, [orderId]),
    },
  );
}

const PARTNER_APPLICATION_EVENTS = {
  submitted: EMAIL_EVENTS.PARTNER_SUBMITTED,
  resubmitted: EMAIL_EVENTS.PARTNER_RESUBMITTED,
  approved: EMAIL_EVENTS.PARTNER_APPROVED,
  rejected: EMAIL_EVENTS.PARTNER_REJECTED,
};

export async function sendPartnerApplicationEmail({
  kind,
  to,
  name,
  userId,
  requestNumber,
  role,
  portalUrl,
  rejectionNote,
  resubmitCount,
  rejectedAtMs,
}) {
  const event = PARTNER_APPLICATION_EVENTS[kind];
  if (!event) {
    throw new Error(`Unknown partner application email kind: ${kind}`);
  }

  const dedupeParts = [userId];
  if (kind === "resubmitted") {
    dedupeParts.push(resubmitCount);
  } else if (kind === "rejected") {
    dedupeParts.push(rejectedAtMs);
  }

  return send(
    event,
    {
      kind,
      to,
      name,
      userId,
      requestNumber,
      role,
      portalUrl,
      rejectionNote: kind === "rejected" ? rejectionNote : undefined,
    },
    {
      to,
      userId,
      dedupeKey: buildDedupeKey(event, dedupeParts),
    },
  );
}
