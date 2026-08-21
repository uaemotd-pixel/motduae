import crypto from "crypto";
import { env } from "../config/env.js";

const TOKEN_PATTERN = /^[a-f0-9]{64}$/;

export function createPublicTrackingToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function isPublicTrackingToken(value) {
  return typeof value === "string" && TOKEN_PATTERN.test(value);
}

export function isPublicTrackingTokenCollision(error) {
  if (error?.code !== 11000) return false;
  return Boolean(
    error?.keyPattern?.publicTrackingToken ||
      error?.keyValue?.publicTrackingToken,
  );
}

export function buildPublicOrderTrackingUrl(token) {
  if (!isPublicTrackingToken(token)) return "";
  const base = String(env.frontendUrl || "").replace(/\/$/, "");
  return `${base}/en/orders/track/${token}`;
}
