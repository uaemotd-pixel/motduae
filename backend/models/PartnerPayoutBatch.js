import mongoose from "mongoose";
import {
  PARTNER_KINDS,
  PAYOUT_STATUSES,
  CURRENCY,
} from "../services/partnerPayout/constants.js";

const partnerPayoutBatchSchema = new mongoose.Schema(
  {
    partnerId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    partnerKind: {
      type: String,
      enum: PARTNER_KINDS,
      required: true,
      index: true,
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
    amountFils: { type: Number, required: true, min: 1 },
    currency: { type: String, default: CURRENCY, trim: true },
    status: {
      type: String,
      enum: PAYOUT_STATUSES,
      default: "processing",
      required: true,
      index: true,
    },
    method: {
      type: String,
      default: "manual_bank",
      trim: true,
    },
    bankRef: {
      type: String,
      default: "",
      trim: true,
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerPayoutRequest",
      default: null,
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    releasedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    completedAt: { type: Date, default: null },
    lastError: { type: String, default: "", trim: true },
    compensationAttempts: { type: Number, default: 0, min: 0 },
    compensationNeeded: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "partnerpayoutbatches" },
);

partnerPayoutBatchSchema.index({ idempotencyKey: 1 }, { unique: true });
partnerPayoutBatchSchema.index(
  { requestId: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { requestId: { $type: "objectId" } },
  },
);
partnerPayoutBatchSchema.index({ partnerId: 1, partnerKind: 1, releasedAt: -1 });
partnerPayoutBatchSchema.index({ status: 1, releasedAt: -1 });

const PartnerPayoutBatch = mongoose.model(
  "PartnerPayoutBatch",
  partnerPayoutBatchSchema,
);

export default PartnerPayoutBatch;
