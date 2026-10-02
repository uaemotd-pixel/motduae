import crypto from "crypto";

const PREFIX = "MOTD-CS-";

export function generateFaqSupportReference() {
  return `${PREFIX}${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}
