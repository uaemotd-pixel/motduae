import mongoose from "mongoose";
import {
  PARTNER_KINDS,
  ORDER_TYPES,
  EARNING_STATUSES,
  CURRENCY,
} from "../services/partnerPayout/constants.js";

const partnerEarningSchema = new mongoose.Schema(
  {
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
    component: {
      type: String,
      required: true,
      trim: true,
    },
    grossFils: { type: Number, required: true, min: 0 },
    commissionPercent: { type: Number, required: true, min: 0, max: 100 },
    commissionFils: { type: Number, required: true, min: 0 },
    netFils: { type: Number, required: true, min: 0 },
    remainingFils: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: EARNING_STATUSES,
      default: "pending",
      required: true,
      index: true,
    },
    availableAt: { type: Date, default: null },
    currency: { type: String, default: CURRENCY, trim: true },
    provider: { type: String, default: "", trim: true },
    providerPaymentId: { type: String, default: "", trim: true },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true, collection: "partnerearnings" },
);

partnerEarningSchema.index({ idempotencyKey: 1 }, { unique: true });
partnerEarningSchema.index({ partnerId: 1, partnerKind: 1, status: 1 });
partnerEarningSchema.index({ orderId: 1, partnerKind: 1 });
partnerEarningSchema.index({ status: 1, availableAt: 1 });

const PartnerEarning = mongoose.model("PartnerEarning", partnerEarningSchema);

export default PartnerEarning;
