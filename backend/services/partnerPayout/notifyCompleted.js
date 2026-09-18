import User from "../../models/User.js";
import { env } from "../../config/env.js";
import { EMAIL_EVENTS, buildDedupeKey } from "../email/emailEvents.js";
import { sendPartnerPayoutCompletedEmail } from "../emailService.js";
import {
  ensurePartnerPayoutCompletedNotification,
  resolvePartnerOwnerUserId,
} from "../notificationService.js";
import { getPayoutById } from "./settlement.js";

export const PAYOUT_COMPLETED_ORDER_LIMIT = 15;

export function shouldNotifyPayoutCompleted(partnerKind) {
  return partnerKind === "tailor" || partnerKind === "fabric";
}

export function formatAedDisplay(amount) {
  return new Intl.NumberFormat("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

export function shortOrderId(orderId) {
  const raw = String(orderId || "").replace(/^#/, "").trim();
  if (!raw) return "";
  return raw.slice(-6).toUpperCase();
}

export function formatCompletedDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function paidToName(payout) {
  return String(
    payout?.payoutBank?.accountHolderName || payout?.payeeName || "",
  ).trim();
}

export function payoutCompletedPortalUrl(origin, partnerKind) {
  const base = String(origin || "").replace(/\/$/, "");
  const path = partnerKind === "fabric" ? "/en/fabric" : "/en/tailor";
  return `${base}${path}`;
}

export function payoutCompletedBellDedupeKey(partnerKind, payoutId) {
  const kind = partnerKind === "fabric" ? "fabric" : "tailor";
  return `${kind}:payout_completed:${payoutId}`;
}

export function payoutCompletedEmailDedupeKey(payoutId) {
  return buildDedupeKey(EMAIL_EVENTS.PARTNER_PAYOUT_COMPLETED, [payoutId]);
}

const SKIP_LOG_KEYS = [
  "payoutId",
  "partnerKind",
  "partnerId",
  "ownerId",
  "status",
];

/** Fail-soft skip. Never throws. Never logs IBAN or email. */
export function logPayoutNotifySkip(reason, details = {}) {
  const parts = [];
  for (const key of SKIP_LOG_KEYS) {
    const value = details[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (!text) continue;
    parts.push(`${key}=${text}`);
  }
  const suffix = parts.length ? ` ${parts.join(" ")}` : "";
  console.warn(
    `[partnerPayout.notifyCompleted] skip ${String(reason || "unknown")}${suffix}`,
  );
}

export function formatOrderLinesForMail(
  lines = [],
  limit = PAYOUT_COMPLETED_ORDER_LIMIT,
) {
  const list = Array.isArray(lines) ? lines : [];
  const shown = list.slice(0, limit);
  return {
    rows: shown.map((line) => ({
      label: `#${shortOrderId(line.orderId)}`,
      amountAed: Number(line.amountAed ?? line.amount) || 0,
      amountLabel: formatAedDisplay(line.amountAed ?? line.amount),
    })),
    moreCount: Math.max(0, list.length - shown.length),
  };
}

export function buildPayoutCompletedMailPayload({
  payout,
  recipient,
  origin,
}) {
  const { rows, moreCount } = formatOrderLinesForMail(
    payout?.lines || payout?.orders || [],
  );
  return {
    name: String(recipient?.name || "").trim() || "Partner",
    amountAed: Number(payout?.amountAed ?? payout?.amount) || 0,
    amountLabel: formatAedDisplay(payout?.amountAed ?? payout?.amount),
    bankRef: String(payout?.bankRef || "").trim(),
    sentOn: formatCompletedDate(payout?.completedAt),
    paidTo: paidToName(payout),
    orderLines: rows.map((row) => ({
      label: row.label,
      amountLabel: row.amountLabel,
    })),
    moreCount,
    portalUrl: payoutCompletedPortalUrl(origin, payout?.partnerKind),
  };
}

export async function notifyPayoutCompleted(payoutId) {
  const id = String(payoutId || "").trim();
  if (!id) {
    logPayoutNotifySkip("missing_payout_id");
    return null;
  }

  const payout = await getPayoutById(id);
  if (!payout) {
    logPayoutNotifySkip("payout_not_found", { payoutId: id });
    return null;
  }
  if (payout.status !== "completed") {
    logPayoutNotifySkip("payout_not_completed", {
      payoutId: id,
      partnerKind: payout.partnerKind,
      partnerId: payout.partnerId,
      status: payout.status,
    });
    return null;
  }
  if (!shouldNotifyPayoutCompleted(payout.partnerKind)) {
    logPayoutNotifySkip("partner_kind_skipped", {
      payoutId: id,
      partnerKind: payout.partnerKind,
      partnerId: payout.partnerId,
    });
    return null;
  }

  const partnerId = String(payout.partnerId || "").trim();
  const partnerKind = payout.partnerKind;
  const ownerId = await resolvePartnerOwnerUserId(
    partnerKind,
    `${partnerKind}:${partnerId}`,
    partnerId,
  );
  if (!ownerId) {
    logPayoutNotifySkip("missing_owner", {
      payoutId: id,
      partnerKind,
      partnerId,
    });
    return null;
  }

  await ensurePartnerPayoutCompletedNotification({
    partnerKind,
    amount: payout.amountAed ?? payout.amount,
    bankRef: payout.bankRef,
    partnerKey: `${partnerKind}:${partnerId}`,
    partnerId,
    recipientUserId: ownerId,
    payoutId: payout._id || id,
  }).catch(() => null);

  const user = await User.findById(ownerId).select("name email").lean();
  const to = String(user?.email || "").trim();
  if (!to) {
    logPayoutNotifySkip("missing_email", {
      payoutId: id,
      partnerKind,
      partnerId,
      ownerId,
    });
    return null;
  }

  const payload = buildPayoutCompletedMailPayload({
    payout,
    recipient: { name: user?.name || "" },
    origin: env.frontendUrl,
  });

  await sendPartnerPayoutCompletedEmail({
    to,
    userId: ownerId,
    payoutId: payout._id || id,
    ...payload,
  }).catch(() => null);

  return true;
}
