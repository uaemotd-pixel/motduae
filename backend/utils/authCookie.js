import { env } from "../config/env.js";

export const AUTH_COOKIE_NAME = "motd_auth";

function jwtExpiresToMs(expiresIn) {
  if (typeof expiresIn === "number" && Number.isFinite(expiresIn)) {
    return expiresIn * 1000;
  }

  const match = String(expiresIn || "").trim().match(/^(\d+)\s*([smhd])$/i);
  if (!match) {
    return 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return amount * multipliers[unit];
}

export function getAuthCookieOptions() {
  const isProd = env.nodeEnv === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: jwtExpiresToMs(env.jwtExpiresIn),
  };
}

export function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "lax",
    path: "/",
  });
}

export function extractAuthToken(req) {
  const cookieToken = req.cookies?.[AUTH_COOKIE_NAME];
  if (typeof cookieToken === "string" && cookieToken.trim()) {
    return cookieToken.trim();
  }

  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    const bearer = authorization.slice(7).trim();
    if (bearer) return bearer;
  }

  return null;
}
