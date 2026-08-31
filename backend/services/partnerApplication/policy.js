export const PARTNER_ROLES = new Set(["tailor", "fabric_store"]);

export const YEARS_OPERATING = ["under_1", "1_3", "3_10", "10_plus"];
export const MAKE_TIMES = ["d3_5", "d7", "d10_14", "d21_plus"];
export const WORK_SETUPS = ["home", "workshop", "both"];
export const OFFERINGS = ["retail", "wholesale", "both"];

export const ABOUT_MAX_LENGTH = 400;
export const PARTNER_NOTE_MAX_LENGTH = 1000;
export const SOCIAL_MAX = 20;

const UAE_PHONE = /^\+971\d{9}$/;

export class PartnerApplicationError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.name = "PartnerApplicationError";
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export function assertPartnerDecisionAllowed(user) {
  const status = user?.approvalStatus;
  if (status === "pending" || status === "rejected") return;
  throw new PartnerApplicationError(
    "DECISION_NOT_ALLOWED",
    "Only pending or rejected applications can be approved or rejected",
    409,
  );
}

export function isPartnerRole(role) {
  return PARTNER_ROLES.has(role);
}

export function hasSubmittedApplication(user) {
  return Boolean(user?.applicationSubmittedAt);
}

export function submittedPendingFilter(role) {
  return {
    role,
    approvalStatus: "pending",
    applicationSubmittedAt: { $exists: true, $ne: null },
  };
}

export function hideUnsubmittedPendingClause() {
  return {
    $or: [
      { approvalStatus: { $ne: "pending" } },
      { applicationSubmittedAt: { $exists: true, $ne: null } },
    ],
  };
}

export function isValidUaePhone(value) {
  return UAE_PHONE.test(String(value || "").trim());
}

export function normalizeUaePhone(value) {
  const cleaned = String(value || "").replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  let digits = cleaned.replace(/\D/g, "");
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  }
  digits = digits.slice(0, 9);
  return digits.length === 9 ? `+971${digits}` : "";
}

export function trimText(value, max) {
  const text = String(value ?? "").trim();
  if (max && text.length > max) {
    return text.slice(0, max);
  }
  return text;
}

export function trimUrl(value) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  try {
    const parsed = new URL(text.includes("://") ? text : `https://${text}`);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.toString();
  } catch {
    return "";
  }
}

export function normalizeSocialLinks(social) {
  const toLink = (name, url) => {
    const label = trimText(name, 40);
    const href = trimUrl(url);
    if (!label || !href) return null;
    return { name: label, url: href };
  };

  if (Array.isArray(social)) {
    return social
      .map((item) => toLink(item?.name, item?.url))
      .filter(Boolean)
      .slice(0, SOCIAL_MAX);
  }

  if (social && typeof social === "object") {
    const keys = ["instagram", "facebook", "tiktok", "other"];
    const fromLegacy = keys
      .map((key) => toLink(key, social[key]))
      .filter(Boolean);
    if (fromLegacy.length) return fromLegacy;
  }

  return [];
}
