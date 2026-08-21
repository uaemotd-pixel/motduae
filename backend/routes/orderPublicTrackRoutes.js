import express from "express";
import { publicOrderTrackLimiter } from "../middleware/rateLimiter.js";
import { getPublicOrderByTrackingToken } from "../services/publicOrderTrackingService.js";

const orderPublicTrackRoutes = express.Router();

const NOT_FOUND = {
  success: false,
  message: "This tracking link is invalid.",
};

function sendNotFound(res) {
  res.set("Cache-Control", "private, no-store");
  return res.status(404).json(NOT_FOUND);
}

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
