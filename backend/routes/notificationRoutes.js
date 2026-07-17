import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import AdminNotification from "../models/AdminNotification.js";
import CustomOrder from "../models/CustomOrder.js";
import { isAuth, isAdmin } from "../middleware/auth.js";

const notificationRouter = express.Router();

// GET /api/admin/notifications
notificationRouter.get(
  "/notifications",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const notifications = await AdminNotification.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    const orderIds = notifications
      .map((n) => (n.orderId ? String(n.orderId) : null))
      .filter(Boolean);

    let orderStatusMap = {};
    if (orderIds.length) {
      const orders = await CustomOrder.find({ _id: { $in: orderIds } }).select(
        "_id status",
      );
      orders.forEach((o) => {
        orderStatusMap[String(o._id)] = o.status;
      });
    }

    const enriched = notifications.map((n) => ({
      ...n,
      status: n.orderId ? orderStatusMap[String(n.orderId)] || null : null,
      tailorId: n.tailorUserId || null,
    }));

    res.send({
      success: true,
      notifications: enriched,
    });
  }),
);

// POST /api/admin/notifications/mark-read
notificationRouter.post(
  "/notifications/mark-read",

  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { id } = req.body || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res
        .status(400)
        .send({ success: false, message: "Invalid notification id" });
      return;
    }

    const updated = await AdminNotification.findByIdAndUpdate(
      id,
      { read: true, readAt: new Date() },
      { new: true },
    );

    if (!updated) {
      res
        .status(404)
        .send({ success: false, message: "Notification not found" });
      return;
    }

    res.send({ success: true, notification: updated });
  }),
);

// POST /api/admin/notifications/mark-all-read
notificationRouter.post(
  "/notifications/mark-all-read",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (_req, res) => {
    const result = await AdminNotification.updateMany(
      { read: false },
      { $set: { read: true, readAt: new Date() } },
    );

    res.send({
      success: true,
      updatedCount:
        typeof result?.modifiedCount === "number"
          ? result.modifiedCount
          : result?.nModified,
    });
  }),
);

// DELETE /api/admin/notifications/:id
notificationRouter.delete(
  "/notifications/:id",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params || {};

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      res
        .status(400)
        .send({ success: false, message: "Invalid notification id" });
      return;
    }

    const deleted = await AdminNotification.findByIdAndDelete(id);

    if (!deleted) {
      res
        .status(404)
        .send({ success: false, message: "Notification not found" });
      return;
    }

    res.send({ success: true, deletedId: id });
  }),
);

// GET /api/admin/notifications/unread-count
notificationRouter.get(
  "/notifications/unread-count",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (_req, res) => {
    const count = await AdminNotification.countDocuments({ read: false });
    res.send({ success: true, count });
  }),
);

export default notificationRouter;