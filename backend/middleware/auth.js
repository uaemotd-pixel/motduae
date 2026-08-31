import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";
import SubAdmin from "../models/SubAdmin.js";
import { extractAuthToken } from "../utils/authCookie.js";
import { isEmailVerified } from "../services/emailVerification/isEmailVerified.js";
import { isGuestUser } from "../services/emailVerification/isGuestUser.js";
import { normalizeEmail } from "../services/emailVerification/emailOccupancy.js";

export const generateToken = (
  user,
  { guestContactEmail, guestPendingEmail } = {},
) => {
  const isGuest = isGuestUser(user);
  const payload = {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isAdmin: user.isAdmin,
    emailVerified: isEmailVerified(user),
    isGuest,
  };

  if (isGuest) {
    const contact = normalizeEmail(guestContactEmail);
    const pending = normalizeEmail(guestPendingEmail);
    if (contact) payload.guestContactEmail = contact;
    if (pending) payload.guestPendingEmail = pending;
  }

  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
};

export const isAuth = async (req, res, next) => {
  const token = extractAuthToken(req);
  if (!token) {
    res.status(401).send({ message: "No Token" });
    return;
  }

  try {
    const decode = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decode._id).select(
      "name email role isAdmin isActive approvalStatus emailVerified applicationSubmittedAt requestNumber rejectionNote",
    );

    if (!user) {
      res.status(401).send({ message: "User not found" });
      return;
    }

    if (user.isActive === false) {
      res.status(403).send({
        message: "Account is deactivated",
        isActive: false,
      });
      return;
    }

    const isGuest = isGuestUser(user);
    // Revalidate privileged claims from DB so revoked admin/role cannot linger in JWT
    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      approvalStatus: user.approvalStatus,
      applicationSubmittedAt: user.applicationSubmittedAt || null,
      requestNumber: user.requestNumber || "",
      rejectionNote: user.rejectionNote || "",
      emailVerified: isEmailVerified(user),
      isGuest,
      guestContactEmail: isGuest
        ? normalizeEmail(decode.guestContactEmail) || undefined
        : undefined,
      guestPendingEmail: isGuest
        ? normalizeEmail(decode.guestPendingEmail) || undefined
        : undefined,
      perms: null,
    };

    if (user.role === "sub-admin") {
      const profile = await SubAdmin.findOne({ email: user.email })
        .select("perms")
        .lean();
      req.user.perms = profile?.perms || {};
    }

    next();
  } catch {
    res.status(401).send({ message: "Invalid Token" });
  }
};

/** Full admin or sub-admin (staff). */
export const isAdmin = (req, res, next) => {
  if (req.user?.isAdmin) {
    next();
    return;
  }
  res.status(403).send({ message: "Forbidden: Admin access required" });
};

/** Full admin only — not sub-admins. */
export const isFullAdmin = (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
    return;
  }
  res.status(403).send({ message: "Forbidden: Full admin access required" });
};

/**
 * Map /api/admin/* path (and /api/admin/orders/*) to a SubAdmin.perms key.
 * Returns null for open staff routes, "__full_admin__" for admin-only.
 */
export function resolveAdminApiPerm(path = "") {
  let p = String(path || "").split("?")[0];

  // Normalize traversal / duplicate slashes before matching.
  const segments = [];
  for (const part of p.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      segments.pop();
      continue;
    }
    segments.push(part);
  }
  p = `/${segments.join("/")}`;
  if (p === "//") p = "/";

  // Root / empty path under /api/admin mount — open to staff (dashboard-equivalent).
  if (p === "/" || p === "") {
    return null;
  }

  if (p === "/health" || p === "/dashboard" || p.startsWith("/dashboard/")) {
    return null;
  }

  const matchPrefix = (prefix) => p === prefix || p.startsWith(`${prefix}/`);

  if (matchPrefix("/partner-payouts")) return "payments";
  if (matchPrefix("/payout-requests")) return "payments";
  if (matchPrefix("/customers")) return "customers";
  if (matchPrefix("/ready-made")) return "readyMade";
  if (matchPrefix("/fabrics")) return "fabrics";
  if (matchPrefix("/tailors")) return "tailors";
  if (matchPrefix("/addons")) return "addons";
  if (matchPrefix("/orders")) return "orders";
  if (matchPrefix("/partners")) return "partners";
  if (matchPrefix("/notifications")) return "notifications";
  if (
    matchPrefix("/settings") ||
    matchPrefix("/categories") ||
    matchPrefix("/materials") ||
    matchPrefix("/patterns") ||
    matchPrefix("/seasons") ||
    matchPrefix("/tags")
  ) {
    return "settings";
  }

  // Unknown admin routes stay full-admin only for safety.
  return "__full_admin__";
}

/** Enforce SubAdmin.perms on /api/admin after isAuth + isAdmin. */
export const enforceStaffPerm = (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
    return;
  }

  if (req.user?.role !== "sub-admin") {
    res.status(403).send({ message: "Forbidden" });
    return;
  }

  // Use originalUrl so nested mounts (e.g. /api/admin/orders) still map correctly.
  const raw = String(req.originalUrl || req.url || req.path || "");
  const path = raw.replace(/^\/api\/admin/, "").split("?")[0] || "/";
  const perm = resolveAdminApiPerm(path);
  if (!perm) {
    next();
    return;
  }

  if (perm === "__full_admin__") {
    res.status(403).send({ message: "Forbidden: Full admin access required" });
    return;
  }

  if (req.user?.perms?.[perm] === true) {
    next();
    return;
  }

  res.status(403).send({
    message: `Forbidden: missing permission (${perm})`,
  });
};

export const requirePerm = (permKey) => (req, res, next) => {
  if (req.user?.role === "admin") {
    next();
    return;
  }
  if (req.user?.role === "sub-admin" && req.user?.perms?.[permKey] === true) {
    next();
    return;
  }
  res.status(403).send({
    message: `Forbidden: missing permission (${permKey})`,
  });
};

export const isApprovedTailor = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      res.status(401).send({ message: "No Token" });
      return;
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      res.status(401).send({ message: "User not found" });
      return;
    }

    if (user.role !== "tailor") {
      res.status(403).send({ message: "Forbidden: Tailor access required" });
      return;
    }

    if (user.isActive === false) {
      res.status(403).send({
        message: "Tailor account is deactivated",
        isActive: false,
      });
      return;
    }

    if (user.approvalStatus !== "approved") {
      res.status(403).send({
        message:
          user.approvalStatus === "rejected"
            ? "Tailor account was rejected"
            : "Tailor account is pending admin approval",
        approvalStatus: user.approvalStatus,
      });
      return;
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      approvalStatus: user.approvalStatus,
    };
    next();
  } catch {
    res.status(500).send({ message: "Failed to verify tailor access" });
  }
};

export const isApprovedFabricStore = async (req, res, next) => {
  try {
    if (!req.user?._id) {
      res.status(401).send({ message: "No Token" });
      return;
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      res.status(401).send({ message: "User not found" });
      return;
    }

    if (user.role !== "fabric_store") {
      res
        .status(403)
        .send({ message: "Forbidden: Fabric Store access required" });
      return;
    }

    if (user.isActive === false) {
      res.status(403).send({
        message: "Fabric Store account is deactivated",
        isActive: false,
      });
      return;
    }

    if (user.approvalStatus !== "approved") {
      res.status(403).send({
        message:
          user.approvalStatus === "rejected"
            ? "Fabric Store account was rejected"
            : "Fabric Store account is pending admin approval",
        approvalStatus: user.approvalStatus,
      });
      return;
    }

    req.user = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      approvalStatus: user.approvalStatus,
    };
    next();
  } catch {
    res.status(500).send({ message: "Failed to verify fabric store access" });
  }
};
