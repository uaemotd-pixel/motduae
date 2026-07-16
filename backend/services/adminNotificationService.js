import AdminNotification from "../models/AdminNotification.js";

export async function createAdminNotificationForNewUser({
  type = "user_registered",
  title = "New user registered",
  message,
  createdBy = null,
  orderId = null,
  tailorUserId = null,
} = {}) {
  // Avoid creating empty notifications
  if (!message) {
    message = "A new user has registered.";
  }

  const doc = await AdminNotification.create({
    type,
    title,
    message,
    createdBy,
    orderId,
    tailorUserId,
    read: false,
  });

  return doc;
}
