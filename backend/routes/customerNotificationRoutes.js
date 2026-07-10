import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import AdminNotification from "../models/AdminNotification.js";
import CustomOrder from "../models/CustomOrder.js";
import { isAuth } from "../middleware/auth.js";

const customerNotificationRouter = express.Router();

// GET /api/customer/notifications
// Returns notifications that belong to the authenticated customer.
// Current system stores both admin and customer-facing return notifications in AdminNotification.
customerNotificationRouter.get(
  "/notifications",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).send({ success: false, message: "Unauthorized" });
      return;
    }

    // Select custom orders owned by this customer that have return/refund related statuses.
    // This prevents showing notifications for other users.
    const orders = await CustomOrder.find({
      userId,
      status: { $in: ["return_requested", "refund_processed"] },
    }).select("_id");

    const orderIds = orders.map((o) => o._id);

    // Fallback: if no owned return orders exist, still allow displaying notifications
    // that directly reference orderId (e.g. if status hasn't updated yet).
    // This keeps customer flow resilient.
    const directReturnNotifications = await AdminNotification.find({
      orderId: { $in: orderIds },
    })
      .sort({ createdAt: -1 })
      .limit(100);

    res.send({
      success: true,
      notifications: directReturnNotifications,
    });
  }),
);

// POST /api/customer/notifications/mark-read
customerNotificationRouter.post(
  "/notifications/mark-read",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { id } = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res
        .status(400)
        .send({ success: false, message: "Invalid notification id" });
      return;
    }

    // Verify notification belongs to this user by checking associated order.
    const notification = await AdminNotification.findById(id);
    if (!notification) {
      res
        .status(404)
        .send({ success: false, message: "Notification not found" });
      return;
    }

    if (notification.orderId) {
      const order = await CustomOrder.findById(notification.orderId).select(
        "userId",
      );
      if (!order || order.userId.toString() !== userId.toString()) {
        res.status(403).send({ success: false, message: "Forbidden" });
        return;
      }
    }

    const updated = await AdminNotification.findByIdAndUpdate(
      id,
      { read: true, readAt: new Date() },
      { new: true },
    );

    res.send({ success: true, notification: updated });
  }),
);

// DELETE /api/customer/notifications/:id
customerNotificationRouter.delete(
  "/notifications/:id",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const { id } = req.params || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res
        .status(400)
        .send({ success: false, message: "Invalid notification id" });
      return;
    }

    const notification = await AdminNotification.findById(id);
    if (!notification) {
      res
        .status(404)
        .send({ success: false, message: "Notification not found" });
      return;
    }

    // Verify notification belongs to this user by checking associated order.
    if (notification.orderId) {
      const order = await CustomOrder.findById(notification.orderId).select(
        "userId",
      );
      if (!order || order.userId.toString() !== userId.toString()) {
        res.status(403).send({ success: false, message: "Forbidden" });
        return;
      }
    }

    await AdminNotification.findByIdAndDelete(id);

    res.send({ success: true, deletedId: id });
  }),
);

export default customerNotificationRouter;
