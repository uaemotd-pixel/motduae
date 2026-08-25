import mongoose from "mongoose";

const PARTNER_PAYOUT_KINDS = ["tailor", "fabric", "shipping"];
const ORDER_TYPES = ["custom", "retail"];

const partnerPayoutOrderSchema = new mongoose.Schema(
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
 * Each document is one collective payment release from Admin to a partner.
 * Paid totals for a partner = sum(PartnerPayout.amount) + sum(PartnerPayoutCredit.amount).
 */
const partnerPayoutSchema = new mongoose.Schema(
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
      type: [partnerPayoutOrderSchema],
      default: [],
    },
    note: {
      type: String,
      default: "",
      trim: true,
    },
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    releasedAt: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "partnerpayouts",
  },
);

partnerPayoutSchema.index({ partnerKey: 1, releasedAt: -1 });
partnerPayoutSchema.index({ partnerKind: 1, releasedAt: -1 });
partnerPayoutSchema.index({ releasedBy: 1, releasedAt: -1 });

const PartnerPayout = mongoose.model("PartnerPayout", partnerPayoutSchema);

export default PartnerPayout;
export { PARTNER_PAYOUT_KINDS, ORDER_TYPES };
