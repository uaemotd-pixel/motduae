import mongoose from "mongoose";
import { ORDER_TYPES } from "../services/partnerPayout/constants.js";

const partnerPayoutLineSchema = new mongoose.Schema(
  {
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerPayoutBatch",
      required: true,
      index: true,
    },
    earningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerEarning",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ORDER_TYPES,
      required: true,
    },
    partnerId: {
      type: String,
      required: true,
      trim: true,
    },
    amountFils: { type: Number, required: true, min: 1 },
    commissionPercent: { type: Number, default: 0, min: 0, max: 100 },
    grossFils: { type: Number, default: 0, min: 0 },
    commissionFils: { type: Number, default: 0, min: 0 },
    unlockedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: "partnerpayoutlines" },
);

partnerPayoutLineSchema.index({ payoutId: 1, earningId: 1 }, { unique: true });
partnerPayoutLineSchema.index({ orderId: 1, partnerId: 1 });

const PartnerPayoutLine = mongoose.model(
  "PartnerPayoutLine",
  partnerPayoutLineSchema,
);

export default PartnerPayoutLine;
