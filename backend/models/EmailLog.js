import mongoose from "mongoose";

const EMAIL_STATUSES = ["pending", "sent", "failed", "skipped"];
const EMAIL_PROVIDERS = ["ses", "console"];
const ORDER_TYPES = ["custom", "retail"];

const emailLogSchema = new mongoose.Schema(
  {
    event: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    from: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: EMAIL_STATUSES,
      required: true,
      default: "pending",
    },
    provider: {
      type: String,
      enum: EMAIL_PROVIDERS,
      required: true,
    },
    providerMessageId: { type: String, default: null, trim: true },
    error: { type: String, default: null, trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    payloadSnapshot: { type: mongoose.Schema.Types.Mixed, default: null },
    dedupeKey: { type: String, default: null, trim: true },
    locale: { type: String, default: "en", trim: true },
    attemptCount: { type: Number, default: 1 },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true },
);

emailLogSchema.index({ createdAt: -1 });
emailLogSchema.index({ status: 1, createdAt: -1 });
emailLogSchema.index({ to: 1, createdAt: -1 });
emailLogSchema.index({ orderId: 1, event: 1 });
emailLogSchema.index({ userId: 1, createdAt: -1 });
emailLogSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

const EmailLog = mongoose.model("EmailLog", emailLogSchema);

export default EmailLog;
export { EMAIL_STATUSES, EMAIL_PROVIDERS };
