import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";
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
      "name email role isAdmin isActive approvalStatus emailVerified",
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
      emailVerified: isEmailVerified(user),
      isGuest,
      guestContactEmail: isGuest
        ? normalizeEmail(decode.guestContactEmail) || undefined
        : undefined,
      guestPendingEmail: isGuest
        ? normalizeEmail(decode.guestPendingEmail) || undefined
        : undefined,
    };
    next();
  } catch {
    res.status(401).send({ message: "Invalid Token" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user?.isAdmin) {
    next();
    return;
  }
  res.status(403).send({ message: "Forbidden: Admin access required" });
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
      res.status(403).send({ message: "Forbidden: Fabric Store access required" });
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
