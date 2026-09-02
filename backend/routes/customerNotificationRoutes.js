import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import AdminNotification from "../models/AdminNotification.js";
import { isAuth } from "../middleware/auth.js";
import {
  buildCustomerNotificationFilter,
  countUnread,
  customerOwnsNotification,
  enrichCustomerNotifications,
  getCustomerOrderIds,
  listNotifications,
  softDeleteNotification,
} from "../services/notificationService.js";

const customerNotificationRouter = express.Router();

// GET /api/customer/notifications
customerNotificationRouter.get(
  "/notifications",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).send({ success: false, message: "Unauthorized" });
      return;
    }

    const orderIds = await getCustomerOrderIds(userId);
    const filter = buildCustomerNotificationFilter(userId, orderIds, req.query);
    const { notifications, pagination } = await listNotifications(filter, req.query);
    const enriched = await enrichCustomerNotifications(notifications);

    res.send({
      success: true,
      notifications: enriched,
      pagination,
    });
  }),
);

// GET /api/customer/notifications/unread-count
customerNotificationRouter.get(
  "/notifications/unread-count",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).send({ success: false, message: "Unauthorized" });
      return;
    }

    const orderIds = await getCustomerOrderIds(userId);
    const filter = buildCustomerNotificationFilter(userId, orderIds);
    const count = await countUnread(filter);

    res.send({ success: true, count });
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

    const notification = await AdminNotification.findById(id);
    if (!notification) {
      res
        .status(404)
        .send({ success: false, message: "Notification not found" });
      return;
    }

    if (!(await customerOwnsNotification(notification, userId))) {
      res.status(403).send({ success: false, message: "Forbidden" });
      return;
    }

    const updated = await AdminNotification.findByIdAndUpdate(
      id,
      { read: true, readAt: new Date() },
      { new: true },
    );

    res.send({ success: true, notification: updated });
  }),
);

// POST /api/customer/notifications/mark-all-read
customerNotificationRouter.post(
  "/notifications/mark-all-read",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    const userId = req.user?._id;
    if (!userId) {
      res.status(401).send({ success: false, message: "Unauthorized" });
      return;
    }

    const orderIds = await getCustomerOrderIds(userId);
    const filter = buildCustomerNotificationFilter(userId, orderIds);

    const result = await AdminNotification.updateMany(
      {
        ...filter,
        read: false,
      },
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

    if (!(await customerOwnsNotification(notification, userId))) {
      res.status(403).send({ success: false, message: "Forbidden" });
      return;
    }

    await softDeleteNotification({ _id: id, deletedAt: null });

    res.send({ success: true, deletedId: id });
  }),
);

export default customerNotificationRouter;
