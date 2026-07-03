import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import User from "../models/User.js";

export const generateToken = (user) => {
  return jwt.sign(
    {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
    },
    env.jwtSecret,
    { expiresIn: "30d" },
  );
};

export const isAuth = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    res.status(401).send({ message: "No Token" });
    return;
  }

  const token = authorization.slice(7);
  jwt.verify(token, env.jwtSecret, (err, decode) => {
    if (err) {
      res.status(401).send({ message: "Invalid Token" });
      return;
    }
    req.user = decode;
    next();
  });
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
