import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    audience: {
      type: String,
      enum: ["admin", "customer"],
      required: true,
    },
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    orderType: {
      type: String,
      enum: ["custom", "retail"],
      // omit when not an order notification — null is not a valid enum value
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    tailorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dedupeKey: { type: String, default: null, trim: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: false }
);

adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ read: 1, createdAt: -1 });
adminNotificationSchema.index({ audience: 1, createdAt: -1 });
adminNotificationSchema.index({ audience: 1, recipientUserId: 1, createdAt: -1 });
adminNotificationSchema.index({ audience: 1, read: 1, deletedAt: 1, createdAt: -1 });
adminNotificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
adminNotificationSchema.index({ deletedAt: 1, createdAt: -1 });

const AdminNotification = mongoose.model(
  "AdminNotification",
  adminNotificationSchema
);

export default AdminNotification;