export const EMAIL_EVENTS = {
  AUTH_WELCOME: "auth.welcome",
  AUTH_PASSWORD_RESET: "auth.password_reset",
  OPS_CONTACT: "ops.contact",
};

export function buildDedupeKey(event, parts = []) {
  const suffix = parts.filter((p) => p !== undefined && p !== null && p !== "").join(":");
  return suffix ? `email:${event}:${suffix}` : `email:${event}`;
}
