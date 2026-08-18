import AdminNotification from "../models/AdminNotification.js";
import CustomOrder from "../models/CustomOrder.js";
import RetailOrder from "../models/RetailOrder.js";
import User from "../models/User.js";
import { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } from "./emailService.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const NOTIFICATION_CATEGORIES = {
  orders: ["custom_order_placed", "retail_order_placed"],
  returns: ["custom_return_requested"],
  registrations: ["user_customer_registered", "customer_registered"],
  partners: ["user_tailor_registered", "user_fabric_store_registered"],
};

const CUSTOMER_STATUS_TYPES = {
  confirmed: {
    type: "custom_status_confirmed",
    title: "Order Confirmed",
    message: (id) =>
      `Your custom order ${id} has been confirmed and is being prepared.`,
  },
  fabric_delivered: {
    type: "custom_status_fabric_delivered",
    title: "Fabric Delivered",
    message: (id) => `Fabric for your custom order ${id} has been delivered.`,
  },
  at_tailor: {
    type: "custom_status_at_tailor",
    title: "At Tailor",
    message: (id) => `Your custom order ${id} has arrived at the tailor.`,
  },
  in_production: {
    type: "custom_status_in_production",
    title: "In Production",
    message: (id) => `Your custom order ${id} is now in production.`,
  },
  ready: {
    type: "custom_status_ready",
    title: "Order Ready",
    message: (id) => `Your custom order ${id} is ready.`,
  },
  out_for_delivery: {
    type: "custom_status_out_for_delivery",
    title: "Out for Delivery",
    message: (id) => `Your custom order ${id} is out for delivery.`,
  },
  delivered: {
    type: "custom_status_delivered",
    title: "Order Delivered",
    message: (id) => `Your custom order ${id} has been delivered.`,
  },
};

const RETAIL_CUSTOMER_STATUS_TYPES = {
  confirmed: {
    type: "retail_status_confirmed",
    title: "Order Confirmed",
    message: (id) => `Your order ${id} has been confirmed.`,
  },
  shipped: {
    type: "retail_status_shipped",
    title: "Order Shipped",
    message: (id) => `Your order ${id} has been shipped.`,
  },
  delivered: {
    type: "retail_status_delivered",
    title: "Order Delivered",
    message: (id) => `Your order ${id} has been delivered.`,
  },
  cancelled: {
    type: "retail_status_cancelled",
    title: "Order Cancelled",
    message: (id) => `Your order ${id} has been cancelled.`,
  },
};

function notDeletedFilter() {
  return { deletedAt: null };
}

function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(String(query.page || "1"), 10) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10) || DEFAULT_LIMIT),
  );
  return { page, limit, skip: (page - 1) * limit };
}

function parseReadFilter(read) {
  if (read === "true" || read === true) return true;
  if (read === "false" || read === false) return false;
  return undefined;
}

function buildListFilters(query = {}) {
  const filters = { ...notDeletedFilter() };

  if (query.type) {
    filters.type = String(query.type).trim();
  } else if (query.category && NOTIFICATION_CATEGORIES[query.category]) {
    filters.type = { $in: NOTIFICATION_CATEGORIES[query.category] };
  }

  const read = parseReadFilter(query.read);
  if (read !== undefined) {
    filters.read = read;
  }

  if (query.orderId && query.orderId.trim()) {
    filters.orderId = query.orderId.trim();
  }

  if (query.from || query.to) {
    filters.createdAt = {};
    if (query.from) {
      const fromDate = new Date(query.from);
      if (!Number.isNaN(fromDate.getTime())) {
        filters.createdAt.$gte = fromDate;
      }
    }
    if (query.to) {
      const toDate = new Date(query.to);
      if (!Number.isNaN(toDate.getTime())) {
        filters.createdAt.$lte = toDate;
      }
    }
    if (Object.keys(filters.createdAt).length === 0) {
      delete filters.createdAt;
    }
  }

  if (query.search && String(query.search).trim()) {
    const term = String(query.search).trim();
    filters.$or = [
      { title: { $regex: term, $options: "i" } },
      { message: { $regex: term, $options: "i" } },
      { type: { $regex: term, $options: "i" } },
    ];
  }

  return filters;
}

export async function createNotification({
  type,
  title,
  message = "",
  audience,
  recipientUserId = null,
  orderType = undefined,
  orderId = null,
  tailorUserId = null,
  createdBy = null,
  dedupeKey = null,
} = {}) {
  if (!type || !title || !audience) {
    throw new Error("type, title, and audience are required");
  }

  if (dedupeKey) {
    const existing = await AdminNotification.findOne({
      dedupeKey,
      deletedAt: null,
    });
    if (existing) {
      return existing;
    }
  }

  try {
    const doc = {
      type,
      title,
      message,
      audience,
      recipientUserId,
      orderId,
      tailorUserId,
      createdBy,
      dedupeKey,
      read: false,
    };
    if (orderType === "custom" || orderType === "retail") {
      doc.orderType = orderType;
    }
    return await AdminNotification.create(doc);
  } catch (error) {
    if (dedupeKey && error?.code === 11000) {
      return AdminNotification.findOne({ dedupeKey, deletedAt: null });
    }
    throw error;
  }
}

export async function createAdminNotificationForNewUser({
  type = "user_registered",
  title = "New user registered",
  message,
  createdBy = null,
  orderId = null,
  tailorUserId = null,
} = {}) {
  return createNotification({
    type,
    title,
    message: message || "A new user has registered.",
    audience: "admin",
    createdBy,
    orderId,
    tailorUserId,
    dedupeKey: createdBy ? `user_registered:${createdBy}` : null,
  });
}

export async function notifyCustomOrderPlacedAdmin(order, createdBy, message) {
  return createNotification({
    type: "custom_order_placed",
    title: "New Custom order",
    message,
    audience: "admin",
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `admin:custom_order_placed:${order._id}`,
  });
}

export async function notifyCustomOrderPlacedCustomer(order, createdBy) {
  try {
    const user = await User.findById(order.userId).select("email name");
    if (user && user.email) {
      sendOrderConfirmationEmail({ order, user }).catch((err) => {
        console.error("Failed to send custom order confirmation email:", err);
      });
    }
  } catch (err) {
    console.error("Error finding user for custom order confirmation email:", err);
  }

  return createNotification({
    type: "custom_order_received",
    title: "Order Received",
    message: `We received your custom order. Our team will confirm it shortly.`,
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:custom_order_received:${order._id}`,
  });
}

export async function notifyRetailOrderPlacedAdmin(order, createdBy, message) {
  return createNotification({
    type: "retail_order_placed",
    title: "New Ready-made order",
    message,
    audience: "admin",
    orderType: "retail",
    orderId: order._id,
    createdBy,
    dedupeKey: `admin:retail_order_placed:${order._id}`,
  });
}

export async function notifyRetailOrderPlacedCustomer(order, createdBy) {
  try {
    const user = await User.findById(order.userId).select("email name");
    if (user && user.email) {
      sendOrderConfirmationEmail({ order, user }).catch((err) => {
        console.error("Failed to send retail order confirmation email:", err);
      });
    }
  } catch (err) {
    console.error("Error finding user for retail order confirmation email:", err);
  }

  return createNotification({
    type: "retail_order_received",
    title: "Order Received",
    message: `We received your order. You'll be notified when it's confirmed.`,
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "retail",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:retail_order_received:${order._id}`,
  });
}

export async function notifyCustomReturnRequested(order, createdBy) {
  return createNotification({
    type: "custom_return_requested",
    title: "Return requested",
    message: `Customer requested a return for order ${order._id}`,
    audience: "admin",
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `admin:custom_return_requested:${order._id}`,
  });
}

export async function notifyCustomReturnReceivedByCustomer(order, createdBy) {
  return createNotification({
    type: "custom_return_received",
    title: "Return Request Received",
    message: `We received your return request for order ${order._id}. Our team will review it shortly.`,
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:custom_return_received:${order._id}`,
  });
}

export async function notifyCustomReturnApproved(order, createdBy) {
  return createNotification({
    type: "custom_return_approved",
    title: "Return Approved",
    message: `Your return request for order ${order._id} has been approved. Refund will be processed shortly.`,
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:custom_return_approved:${order._id}`,
  });
}

export async function notifyCustomReturnRejected(order, createdBy) {
  return createNotification({
    type: "custom_return_rejected",
    title: "Return request rejected",
    message: `Your return request for order ${order._id} has been rejected.`,
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:custom_return_rejected:${order._id}`,
  });
}

export async function notifyCustomRefundProcessed(order, createdBy) {
  const amount = order.pricing?.total;
  const currency = order.pricing?.currency || "AED";
  const amountText =
    typeof amount === "number"
      ? `${currency} ${amount.toFixed(2)}`
      : null;

  return createNotification({
    type: "custom_refund_processed",
    title: "Refund Processed",
    message: amountText
      ? `Your refund of ${amountText} for order ${order._id} has been processed. Funds typically arrive within 5–7 business days.`
      : `Your refund for order ${order._id} has been processed. Funds typically arrive within 5–7 business days.`,
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:custom_refund_processed:${order._id}`,
  });
}

export async function notifyReviewPrompt(order, orderType, createdBy) {
  const isRetail = orderType === "retail";

  return createNotification({
    type: isRetail ? "retail_review_prompt" : "custom_review_prompt",
    title: "Leave a review",
    message: isRetail
      ? "Your order has been delivered. Share your experience with us!"
      : "Your custom order has been delivered. We'd love to hear your feedback!",
    audience: "customer",
    recipientUserId: order.userId,
    orderType,
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:${isRetail ? "retail" : "custom"}_review_prompt:${order._id}`,
  });
}

export async function notifyCustomStatusChange(order, status, createdBy) {
  try {
    const user = await User.findById(order.userId).select("email name");
    if (user && user.email) {
      sendOrderStatusUpdateEmail({ order, status, user }).catch((err) => {
        console.error("Failed to send custom order status email:", err);
      });
    }
  } catch (err) {
    console.error("Error finding user for custom status email:", err);
  }

  const config = CUSTOMER_STATUS_TYPES[status];
  if (!config) return null;

  const notification = await createNotification({
    type: config.type,
    title: config.title,
    message: config.message(order._id),
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "custom",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:${config.type}:${order._id}`,
  });

  if (status === "delivered") {
    await notifyReviewPrompt(order, "custom", createdBy);
  }

  return notification;
}

export async function notifyRetailStatusChange(order, status, createdBy) {
  try {
    const user = await User.findById(order.userId).select("email name");
    if (user && user.email) {
      sendOrderStatusUpdateEmail({ order, status, user }).catch((err) => {
        console.error("Failed to send retail order status email:", err);
      });
    }
  } catch (err) {
    console.error("Error finding user for retail status email:", err);
  }

  const config = RETAIL_CUSTOMER_STATUS_TYPES[status];
  if (!config) return null;

  const notification = await createNotification({
    type: config.type,
    title: config.title,
    message: config.message(order._id),
    audience: "customer",
    recipientUserId: order.userId,
    orderType: "retail",
    orderId: order._id,
    createdBy,
    dedupeKey: `customer:${config.type}:${order._id}`,
  });

  if (status === "delivered") {
    await notifyReviewPrompt(order, "retail", createdBy);
  }

  return notification;
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

function resolveDesignImage(designRef) {
  if (!designRef) return null;
  if (Array.isArray(designRef.images) && designRef.images.length > 0) {
    return designRef.images[0];
  }
  return null;
}

function buildCustomOrderSummary(customOrder) {
  if (!customOrder) return null;

  const firstItem = customOrder.items?.[0];
  const designSnapshot = firstItem?.designSnapshot || customOrder.designSnapshot;
  const designRef = firstItem?.designId || customOrder.designId;
  const total = customOrder.pricing?.total ?? customOrder.total ?? null;
  const currency = customOrder.pricing?.currency || "AED";
  const isRefund =
    customOrder.status === "refund_processed" ||
    customOrder.status === "return_approved";

  return {
    designName: designSnapshot?.name || "",
    designNameAr: designSnapshot?.nameAr || "",
    image: resolveDesignImage(designRef),
    total,
    currency,
    refundAmount:
      customOrder.status === "refund_processed" && typeof total === "number"
        ? total
        : null,
    status: customOrder.status || null,
    itemCount: Array.isArray(customOrder.items) ? customOrder.items.length : 1,
    isRefund,
  };
}

function buildRetailOrderSummary(retailOrder) {
  if (!retailOrder) return null;

  const firstItem = retailOrder.orderItems?.[0];

  return {
    itemName: firstItem?.name || "",
    image: firstItem?.image || null,
    total: retailOrder.totalPrice ?? null,
    currency: retailOrder.currency || "AED",
    refundAmount: null,
    status: retailOrder.status || null,
    itemCount: Array.isArray(retailOrder.orderItems)
      ? retailOrder.orderItems.length
      : 0,
  };
}

export async function enrichCustomerNotifications(notifications) {
  const customOrderIds = [];
  const retailOrderIds = [];

  for (const notification of notifications) {
    if (!notification.orderId) continue;

    if (
      notification.orderType === "retail" ||
      notification.type?.startsWith("retail_")
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
        "_id status userId returnCondition returnReason returnComment returnPickupAddress pricing total designSnapshot items statusHistory designId",
      )
      .populate("designId", "images")
      .populate("items.designId", "images")
      .populate("statusHistory.changedBy", "name email")
      .lean();

    orders.forEach((order) => {
      customOrderMap[String(order._id)] = order;
    });
  }

  const retailOrderMap = {};
  if (retailOrderIds.length) {
    const orders = await RetailOrder.find({ _id: { $in: retailOrderIds } })
      .select("_id status totalPrice currency userId orderItems")
      .lean();

    orders.forEach((order) => {
      retailOrderMap[String(order._id)] = order;
    });
  }

  return notifications.map((notification) => {
    const base = { ...notification };

    if (!notification.orderId) {
      return { ...base, status: null, orderSummary: null };
    }

    const orderId = String(notification.orderId);
    const isRetail =
      notification.orderType === "retail" ||
      notification.type?.startsWith("retail_");

    if (isRetail) {
      const retailOrder = retailOrderMap[orderId];
      return {
        ...base,
        status: retailOrder?.status || null,
        retailOrder: retailOrder || null,
        orderSummary: buildRetailOrderSummary(retailOrder),
      };
    }

    const customOrder = customOrderMap[orderId];
    return {
      ...base,
      status: customOrder?.status || null,
      statusHistory: customOrder?.statusHistory || [],
      orderSummary: buildCustomOrderSummary(customOrder),
      ...buildReturnEnrichment(customOrder),
    };
  });
}

export async function getCustomerOrderIds(userId) {
  const [customOrders, retailOrders] = await Promise.all([
    CustomOrder.find({ userId }).select("_id"),
    RetailOrder.find({ userId }).select("_id"),
  ]);

  return [
    ...customOrders.map((order) => order._id),
    ...retailOrders.map((order) => order._id),
  ];
}

export function buildCustomerNotificationFilter(userId, orderIds, query = {}) {
  return {
    audience: "customer",
    ...buildListFilters(query),
    $or: [{ recipientUserId: userId }, { orderId: { $in: orderIds } }],
  };
}

export function buildAdminNotificationFilter(query = {}) {
  return {
    audience: "admin",
    ...buildListFilters(query),
  };
}

export async function listNotifications(filter, query = {}) {
  const { page, limit, skip } = parsePagination(query);

  const [items, total] = await Promise.all([
    AdminNotification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AdminNotification.countDocuments(filter),
  ]);

  return {
    notifications: items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
      hasMore: skip + items.length < total,
    },
  };
}

export async function countUnread(filter) {
  return AdminNotification.countDocuments({ ...filter, read: false });
}

export async function softDeleteNotification(filter) {
  return AdminNotification.findOneAndUpdate(
    filter,
    { deletedAt: new Date() },
    { new: true },
  );
}

export async function customerOwnsNotification(notification, userId) {
  if (notification.audience !== "customer" || notification.deletedAt) {
    return false;
  }

  if (
    notification.recipientUserId &&
    notification.recipientUserId.toString() === userId.toString()
  ) {
    return true;
  }

  if (!notification.orderId) {
    return false;
  }

  const customOrder = await CustomOrder.findById(notification.orderId).select("userId");
  if (customOrder && customOrder.userId.toString() === userId.toString()) {
    return true;
  }

  const retailOrder = await RetailOrder.findById(notification.orderId).select("userId");
  if (retailOrder && retailOrder.userId.toString() === userId.toString()) {
    return true;
  }

  return false;
}

export async function getAdminNotificationSummary() {
  const base = buildAdminNotificationFilter();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const [unreadCount, pendingReturns, agingReturns] = await Promise.all([
    countUnread(base),
    AdminNotification.countDocuments({
      ...base,
      type: "custom_return_requested",
      read: false,
    }),
    AdminNotification.countDocuments({
      ...base,
      type: "custom_return_requested",
      read: false,
      createdAt: { $lte: twoDaysAgo },
    }),
  ]);

  return { unreadCount, pendingReturns, agingReturns };
}

export async function bulkMarkNotificationsRead(ids, audience = "admin") {
  const validIds = (ids || []).filter((id) => id);
  if (!validIds.length) {
    return { modifiedCount: 0 };
  }

  return AdminNotification.updateMany(
    { _id: { $in: validIds }, audience, deletedAt: null },
    { $set: { read: true, readAt: new Date() } },
  );
}

export async function bulkSoftDeleteNotifications(ids, audience = "admin") {
  const validIds = (ids || []).filter((id) => id);
  if (!validIds.length) {
    return { modifiedCount: 0 };
  }

  return AdminNotification.updateMany(
    { _id: { $in: validIds }, audience, deletedAt: null },
    { $set: { deletedAt: new Date() } },
  );
}
