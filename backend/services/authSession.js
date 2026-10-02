import crypto from "crypto";
import AuthSession from "../models/AuthSession.js";
import { env } from "../config/env.js";
import { jwtExpiresToMs } from "../utils/authCookie.js";

export async function createAuthSession(userId) {
  const sid = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + jwtExpiresToMs(env.jwtExpiresIn));
  await AuthSession.create({ sid, userId, expiresAt });
  return sid;
}

export async function authSessionIsActive(sid, userId) {
  const sessionId = String(sid || "").trim();
  if (!sessionId || !userId) return false;
  const row = await AuthSession.findOne({
    sid: sessionId,
    userId,
    expiresAt: { $gt: new Date() },
  })
    .select("_id")
    .lean();
  return Boolean(row);
}

export async function deleteAuthSession(sid) {
  const sessionId = String(sid || "").trim();
  if (!sessionId) return;
  await AuthSession.deleteOne({ sid: sessionId });
}

export async function deleteAuthSessionsForUser(userId) {
  if (!userId) return;
  await AuthSession.deleteMany({ userId });
}
