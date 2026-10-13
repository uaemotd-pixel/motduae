import express from "express";
import { isAuth } from "../middleware/auth.js";
import { publicOrderTrackLimiter } from "../middleware/rateLimiter.js";
import {
  getPublicOrderByPublicId,
  getPublicOrderByPublicIdAndEmail,
  getPublicOrderByTrackingToken,
} from "../services/publicOrderTrackingService.js";

const orderPublicTrackRoutes = express.Router();

const NOT_FOUND = {
  success: false,
  message: "This tracking link is invalid.",
};

const ORDER_ID_NOT_FOUND = {
  success: false,
  message:
    "You can only track orders placed on this account. That Order ID isn't one of yours.",
};

const GUEST_ORDER_NOT_FOUND = {
  success: false,
  message:
    "We couldn't match that Order ID with the email you entered. Use the Order ID and email from your confirmation.",
};

const NOT_LOGGED_IN = {
  success: false,
  code: "NOT_LOGGED_IN",
  message: "You are not logged in yet.",
};

const INVALID_GUEST_TRACK = {
  success: false,
  message: "Please provide a valid Order ID and email.",
};

function sendNotFound(res, body = NOT_FOUND) {
  res.set("Cache-Control", "private, no-store");
  return res.status(404).json(body);
}

function sendTrackSuccess(res, result) {
  res.set("Cache-Control", "private, no-store");
  return res.json({
    success: true,
    orderType: result.orderType,
    order: result.order,
  });
}

/**
 * Guest / anonymous chatbot lookup: Order ID + checkout email.
 * Must be registered before /:token and before /by-id/:publicOrderId.
 */
orderPublicTrackRoutes.post(
  "/by-id",
  publicOrderTrackLimiter,
  async (req, res) => {
    try {
      const publicOrderId = req.body?.publicOrderId ?? req.body?.orderId;
      const email = req.body?.email;

      if (!String(publicOrderId || "").trim() || !String(email || "").trim()) {
        res.set("Cache-Control", "private, no-store");
        return res.status(400).json(INVALID_GUEST_TRACK);
      }

      const result = await getPublicOrderByPublicIdAndEmail(
        publicOrderId,
        email,
      );
      if (!result) {
        return sendNotFound(res, GUEST_ORDER_NOT_FOUND);
      }

      return sendTrackSuccess(res, result);
    } catch (error) {
      console.error("POST /api/orders/track/by-id error:", error);
      res.set("Cache-Control", "private, no-store");
      return res.status(500).json({
        success: false,
        message: "Failed to load order",
      });
    }
  },
);

/** Chatbot lookup by public Order ID (RO-… / CO-…). Signed-in customers only. Must be before /:token. */
orderPublicTrackRoutes.get(
  "/by-id/:publicOrderId",
  isAuth,
  publicOrderTrackLimiter,
  async (req, res) => {
    try {
      if (!req.user || req.user.isGuest) {
        res.set("Cache-Control", "private, no-store");
        return res.status(401).json(NOT_LOGGED_IN);
      }

      const result = await getPublicOrderByPublicId(
        req.params.publicOrderId,
        req.user._id,
      );
      if (!result) {
        return sendNotFound(res, ORDER_ID_NOT_FOUND);
      }

      return sendTrackSuccess(res, result);
    } catch (error) {
      console.error("GET /api/orders/track/by-id/:publicOrderId error:", error);
      res.set("Cache-Control", "private, no-store");
      return res.status(500).json({
        success: false,
        message: "Failed to load order",
      });
    }
  },
);

orderPublicTrackRoutes.get(
  "/:token",
  publicOrderTrackLimiter,
  async (req, res) => {
    try {
      const result = await getPublicOrderByTrackingToken(req.params.token);
      if (!result) {
        return sendNotFound(res);
      }

      return sendTrackSuccess(res, result);
    } catch (error) {
      console.error("GET /api/orders/track/:token error:", error);
      res.set("Cache-Control", "private, no-store");
      return res.status(500).json({
        success: false,
        message: "Failed to load order",
      });
    }
  },
);

export default orderPublicTrackRoutes;
