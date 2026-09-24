import mongoose from "mongoose";

const ACTOR_ROLES = [
  "admin",
  "sub-admin",
  "customer",
  "tailor",
  "fabric_store",
  "guest",
  "system",
];

const activityLogSchema = new mongoose.Schema(
  {
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    actorEmail: { type: String, default: "", trim: true, lowercase: true },
    actorName: { type: String, default: "", trim: true },
    actorRole: {
      type: String,
      enum: ACTOR_ROLES,
      default: "customer",
      index: true,
    },
    action: { type: String, required: true, trim: true, index: true },
    category: { type: String, required: true, trim: true, index: true },
    method: { type: String, default: "", trim: true, uppercase: true },
    path: { type: String, default: "", trim: true },
    resourceType: { type: String, default: "", trim: true },
    resourceId: { type: String, default: "", trim: true },
    summary: { type: String, required: true, trim: true },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: "", trim: true },
    userAgent: { type: String, default: "", trim: true },
    statusCode: { type: Number, default: null },
    success: { type: Boolean, default: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actorId: 1, createdAt: -1 });
activityLogSchema.index({ category: 1, createdAt: -1 });
activityLogSchema.index({ action: 1, createdAt: -1 });
activityLogSchema.index({ success: 1, createdAt: -1 });
activityLogSchema.index({ actorRole: 1, createdAt: -1 });

const ActivityLog = mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;
export { ACTOR_ROLES };
