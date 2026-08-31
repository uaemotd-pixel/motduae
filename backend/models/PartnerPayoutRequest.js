import mongoose from "mongoose";
import { PARTNER_PAYOUT_KINDS, ORDER_TYPES } from "./PartnerPayout.js";

const PAYOUT_REQUEST_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
];

const payoutRequestOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false },
);

/**
 * Partner-initiated payout request (fabric / tailor).
 * Approval creates a PartnerPayout release; rejection leaves settlement unchanged.
 */
const partnerPayoutRequestSchema = new mongoose.Schema(
  {
    partnerKey: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    partnerKind: {
      type: String,
      enum: PARTNER_PAYOUT_KINDS,
      required: true,
      index: true,
    },
    partnerId: {
      type: String,
      default: "",
      trim: true,
    },
    partnerName: {
      type: String,
      required: true,
      trim: true,
    },
    payeeName: {
      type: String,
      default: "",
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    currency: {
      type: String,
      default: "AED",
      trim: true,
    },
    orders: {
      type: [payoutRequestOrderSchema],
      default: [],
    },
    status: {
      type: String,
      enum: PAYOUT_REQUEST_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    adminNote: {
      type: String,
      default: "",
      trim: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerPayout",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "partnerpayoutrequests",
  },
);

partnerPayoutRequestSchema.index({ partnerKey: 1, status: 1, requestedAt: -1 });
partnerPayoutRequestSchema.index({ partnerKind: 1, status: 1, requestedAt: -1 });
partnerPayoutRequestSchema.index({ requestedBy: 1, requestedAt: -1 });

const PartnerPayoutRequest = mongoose.model(
  "PartnerPayoutRequest",
  partnerPayoutRequestSchema,
);

export default PartnerPayoutRequest;
export { PAYOUT_REQUEST_STATUSES };
