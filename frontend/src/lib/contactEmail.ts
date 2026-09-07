/** Public contact address for mailto links. Match backend CONTACT_INBOX. */
export function getContactEmail() {
  const value = String(process.env.NEXT_PUBLIC_CONTACT_EMAIL || "")
    .trim()
    .toLowerCase();
  return value || "care@motd.ae";
}

export function buildContactMailto(opts?: {
  subject?: string;
  body?: string;
}) {
  const email = getContactEmail();
  const parts: string[] = [];
  if (opts?.subject?.trim()) {
    parts.push(`subject=${encodeURIComponent(opts.subject.trim())}`);
  }
  if (opts?.body?.trim()) {
    parts.push(`body=${encodeURIComponent(opts.body.trim())}`);
  }
  return parts.length ? `mailto:${email}?${parts.join("&")}` : `mailto:${email}`;
}

export function partnerSupportMailto(opts?: {
  requestNumber?: string | null;
  role?: "tailor" | "fabric_store";
}) {
  const number = String(opts?.requestNumber || "").trim();
  const roleLabel =
    opts?.role === "fabric_store" ? "fabric store" : "tailor";
  const subject = number
    ? `Partner application ${number}`
    : `Partner ${roleLabel} application`;
  const body = [
    "Hello MOTD team,",
    "",
    number ? `Request number: ${number}` : null,
    `I am writing about my ${roleLabel} application.`,
    "",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");
  return buildContactMailto({ subject, body });
}
