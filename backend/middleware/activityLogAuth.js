import crypto from "crypto";
import {
  ACTIVITY_LOG_ACCESS_HEADER,
  resolveActivityLogAccessKey,
} from "../utils/activityLogAccessKey.js";

function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requestKey(req) {
  const header = req.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return String(
    req.get(ACTIVITY_LOG_ACCESS_HEADER) ||
      req.get("x-activity-log-secret") ||
      "",
  ).trim();
}

/** Protects the developer activity-log API with the baked-in access key. */
export function requireActivityLogSecret(req, res, next) {
  const expected = resolveActivityLogAccessKey();
  if (!timingSafeEqualString(requestKey(req), expected)) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }
  next();
}
