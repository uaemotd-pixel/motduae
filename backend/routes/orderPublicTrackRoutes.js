import express from "express";
import { publicOrderTrackLimiter } from "../middleware/rateLimiter.js";
import {
  getPublicOrderByPublicId,
  getPublicOrderByTrackingToken,
} from "../services/publicOrderTrackingService.js";

const orderPublicTrackRoutes = express.Router();

const NOT_FOUND = {
  success: false,
  message: "This tracking link is invalid.",
};

const ORDER_ID_NOT_FOUND = {
  success: false,
  message: "We couldn't find an order with that Order ID.",
};

function sendNotFound(res, body = NOT_FOUND) {
  res.set("Cache-Control", "private, no-store");
  return res.status(404).json(body);
}

/** Chatbot / guest lookup by public Order ID (RO-… / CO-…). Must be before /:token. */
orderPublicTrackRoutes.get(
  "/by-id/:publicOrderId",
  publicOrderTrackLimiter,
  async (req, res) => {
    try {
      const result = await getPublicOrderByPublicId(req.params.publicOrderId);
      if (!result) {
        return sendNotFound(res, ORDER_ID_NOT_FOUND);
      }

      res.set("Cache-Control", "private, no-store");
      return res.json({
        success: true,
        orderType: result.orderType,
        order: result.order,
      });
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

      res.set("Cache-Control", "private, no-store");
      return res.json({
        success: true,
        orderType: result.orderType,
        order: result.order,
      });
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
