import mongoose from "mongoose";

const adminNotificationSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: "", trim: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "CustomOrder", default: null },
    tailorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    createdAt: { type: Date, default: Date.now },
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: false }
);

adminNotificationSchema.index({ createdAt: -1 });
adminNotificationSchema.index({ read: 1, createdAt: -1 });

const AdminNotification = mongoose.model(
  "AdminNotification",
  adminNotificationSchema
);

export default AdminNotification;