import crypto from "crypto";

const PREFIX = "MOTD-CS-";
const PARTNER_PREFIX = "MOTD-PI-";

export function generateFaqSupportReference() {
  return `${PREFIX}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

/** Tailor / partner issues routed to Admin Queries (Care-mediated). */
export function generatePartnerIssueReference() {
  return `${PARTNER_PREFIX}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
