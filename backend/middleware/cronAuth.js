import crypto from "crypto";
import { env } from "../config/env.js";

function timingSafeEqualString(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function requestSecret(req) {
  const header = req.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) {
    return header.slice(7).trim();
  }
  return String(req.get("x-cron-secret") || "").trim();
}

/**
 * Production always requires CRON_SECRET (including Postman).
 * Development with no CRON_SECRET allows local Postman.
 */
export function requireCronSecret(req, res, next) {
  const isProd = env.nodeEnv === "production";
  const secret = env.cronSecret;

  if (isProd) {
    if (!secret) {
      res.status(503).json({
        success: false,
        message: "CRON_SECRET is required in production",
      });
      return;
    }
    if (!timingSafeEqualString(requestSecret(req), secret)) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }
    next();
    return;
  }

  if (!secret) {
    next();
    return;
  }

  if (!timingSafeEqualString(requestSecret(req), secret)) {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return;
  }

  next();
}
