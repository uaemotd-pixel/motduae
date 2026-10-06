import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import AdminNotification from "../models/AdminNotification.js";
import CustomOrder from "../models/CustomOrder.js";
import RetailOrder from "../models/RetailOrder.js";
import { isAuth, isAdmin } from "../middleware/auth.js";
import {
  buildAdminNotificationFilter,
  listNotifications,
  countUnread,
  softDeleteNotification,
  getAdminNotificationSummary,
  bulkMarkNotificationsRead,
  bulkSoftDeleteNotifications,
} from "../services/notificationService.js";
import { displayPublicOrderId } from "../services/publicOrderId.js";

const notificationRouter = express.Router();

function rewriteOrderIdInMessage(message, orderId, publicOrderId) {
  const text = String(message || "");
  const mongoId = String(orderId || "");
  const pub = String(publicOrderId || "").trim();
  if (!text || !mongoId || !pub) return text;
  if (!text.includes(mongoId)) return text;
  return text.split(mongoId).join(pub);
}

function buildReturnEnrichment(order) {
  if (!order) return {};

  const hasReturnFields =
    order.returnCondition ||
    order.returnReason ||
    order.returnComment ||
    order.returnPickupAddress;

  if (!hasReturnFields) return {};

  return {
    returnPickupAddress: order.returnPickupAddress || null,
    returnData: {
      condition: order.returnCondition || "",
      reason: order.returnReason || "",
      comment: order.returnComment || "",
      pickupAddress: order.returnPickupAddress || null,
    },
  };
}

async function enrichAdminNotifications(notifications) {
  const customOrderIds = [];
  const retailOrderIds = [];

  for (const notification of notifications) {
    if (!notification.orderId) continue;

    if (
      notification.orderType === "retail" ||
      notification.type === "retail_order_placed"
    ) {
      retailOrderIds.push(notification.orderId);
    } else {
      customOrderIds.push(notification.orderId);
    }
  }

  const customOrderMap = {};
  if (customOrderIds.length) {
      const orders = await CustomOrder.find({ _id: { $in: customOrderIds } })
        .select(
          "_id publicOrderId status userId returnCondition returnReason returnComment returnPickupAddress pricing total statusHistory",
        )
        .populate("statusHistory.changedBy", "name email")
        .lean();

    orders.forEach((order) => {
      customOrderMap[String(order._id)] = order;
    });
  }

  const retailOrderMap = {};
  if (retailOrderIds.length) {
    const orders = await RetailOrder.find({ _id: { $in: retailOrderIds } })
      .select("_id publicOrderId status totalPrice userId orderItems shippingAddress")
      .populate("userId", "name email phone")
      .lean();

    orders.forEach((order) => {
      retailOrderMap[String(order._id)] = order;
    });
  }

  return notifications.map((notification) => {
    const base = {
      ...notification,
      tailorId: notification.tailorUserId || null,
    };

    if (!notification.orderId) {
      return { ...base, status: null, publicOrderId: null };
    }

    const orderId = String(notification.orderId);
    const isRetail =
      notification.orderType === "retail" ||
      notification.type === "retail_order_placed";

    if (isRetail) {
      const retailOrder = retailOrderMap[orderId];
      const publicOrderId = displayPublicOrderId(retailOrder);
      return {
        ...base,
        status: retailOrder?.status || null,
        publicOrderId: publicOrderId || null,
        message: rewriteOrderIdInMessage(
          notification.message,
          orderId,
          publicOrderId,
        ),
        retailOrder: retailOrder || null,
      };
    }

      const customOrder = customOrderMap[orderId];
      const publicOrderId = displayPublicOrderId(customOrder);
      return {
        ...base,
        status: customOrder?.status || null,
        publicOrderId: publicOrderId || null,
        message: rewriteOrderIdInMessage(
          notification.message,
          orderId,
          publicOrderId,
        ),
        customerUserId: customOrder?.userId ? String(customOrder.userId) : null,
        statusHistory: customOrder?.statusHistory || [],
        ...buildReturnEnrichment(customOrder),
      };
  });
}

// GET /api/admin/notifications
notificationRouter.get(
  "/notifications",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const filter = buildAdminNotificationFilter(req.query);
    const { notifications, pagination } = await listNotifications(filter, req.query);
    const enriched = await enrichAdminNotifications(notifications);

    res.send({
      success: true,
      notifications: enriched,
      pagination,
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

    const updated = await AdminNotification.findOneAndUpdate(
      { _id: id, audience: "admin", deletedAt: null },
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
      { read: false, audience: "admin", deletedAt: null },
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

    const deleted = await softDeleteNotification({
      _id: id,
      audience: "admin",
      deletedAt: null,
    });

    if (!deleted) {
      res
        .status(404)
        .send({ success: false, message: "Notification not found" });
      return;
    }

    res.send({ success: true, deletedId: id });
  }),
);

// GET /api/admin/notifications/summary
notificationRouter.get(
  "/notifications/summary",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (_req, res) => {
    const summary = await getAdminNotificationSummary();
    res.send({ success: true, ...summary });
  }),
);

// POST /api/admin/notifications/bulk-mark-read
notificationRouter.post(
  "/notifications/bulk-mark-read",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).send({ success: false, message: "ids array is required" });
      return;
    }

    const result = await bulkMarkNotificationsRead(ids, "admin");
    res.send({
      success: true,
      updatedCount:
        typeof result?.modifiedCount === "number"
          ? result.modifiedCount
          : result?.nModified,
    });
  }),
);

// POST /api/admin/notifications/bulk-delete
notificationRouter.post(
  "/notifications/bulk-delete",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (req, res) => {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).send({ success: false, message: "ids array is required" });
      return;
    }

    const result = await bulkSoftDeleteNotifications(ids, "admin");
    res.send({
      success: true,
      deletedCount:
        typeof result?.modifiedCount === "number"
          ? result.modifiedCount
          : result?.nModified,
    });
  }),
);

// GET /api/admin/notifications/unread-count
notificationRouter.get(
  "/notifications/unread-count",
  isAuth,
  isAdmin,
  expressAsyncHandler(async (_req, res) => {
    const count = await countUnread(buildAdminNotificationFilter());
    res.send({ success: true, count });
  }),
);

export default notificationRouter;
