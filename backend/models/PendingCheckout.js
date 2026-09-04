import mongoose from "mongoose";
import {
  PENDING_CHECKOUT_TTL_SECONDS,
} from "../jobs/purgePolicy.js";

const PENDING_STATUSES = [
  "pending",
  "fulfilling",
  "completed",
  "failed",
  "expired",
];

const pendingCheckoutSchema = new mongoose.Schema(
  {
    paymentIntentId: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ["retail", "custom"],
      required: true,
    },
    /** Full order-create payload (items, address, measurements, etc.) */
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    amountAed: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: PENDING_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    lastError: {
      type: String,
      default: "",
      trim: true,
    },
    fulfilledBy: {
      type: String,
      enum: ["client", "webhook", "reconcile", null],
      default: null,
    },
  },
  { timestamps: true },
);

pendingCheckoutSchema.index({ status: 1, createdAt: 1 });
pendingCheckoutSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: PENDING_CHECKOUT_TTL_SECONDS },
);

const PendingCheckout = mongoose.model("PendingCheckout", pendingCheckoutSchema);

export default PendingCheckout;
export { PENDING_STATUSES };
