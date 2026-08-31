import { env } from "../../config/env.js";
import { isPartnerRole } from "./policy.js";
import { sendPartnerApplicationEmail } from "../emailService.js";

function frontendOrigin() {
  return String(env.frontendUrl || "").replace(/\/+$/, "");
}

function partnerBasePath(role) {
  return role === "fabric_store" ? "/en/fabric" : "/en/tailor";
}

function portalUrlForKind(role, kind) {
  const origin = frontendOrigin();
  if (!origin) return "";
  const base = `${origin}${partnerBasePath(role)}`;
  if (kind === "rejected") return `${base}/apply`;
  if (kind === "approved") return `${base}/shop`;
  return base;
}

function roleNoun(role) {
  return role === "fabric_store" ? "store" : "workshop";
}

export async function sendPartnerLifecycleEmail(
  user,
  kind,
  { rejectionNote, rejectedAtMs, resubmitCount } = {},
) {
  try {
    if (!user || !isPartnerRole(user.role)) return;
    const to = String(user.email || "").trim();
    const requestNumber = String(user.requestNumber || "").trim();
    if (!to || !requestNumber) {
      console.error(
        "Partner application email skipped: missing email or request number",
        { userId: user._id, kind },
      );
      return;
    }

    await sendPartnerApplicationEmail({
      kind,
      to,
      name: user.name || "Partner",
      userId: user._id,
      requestNumber,
      role: roleNoun(user.role),
      portalUrl: portalUrlForKind(user.role, kind),
      rejectionNote:
        kind === "rejected" ? String(rejectionNote || "").trim() : undefined,
      resubmitCount,
      rejectedAtMs,
    });
  } catch (error) {
    console.error(
      "Partner application email failed:",
      error?.message || error,
    );
  }
}

export async function mailAfterPartnerDecision(user, kind, extras = {}) {
  await sendPartnerLifecycleEmail(user, kind, extras);
}
