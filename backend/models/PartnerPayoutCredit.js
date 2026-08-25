import mongoose from "mongoose";
import { PARTNER_PAYOUT_KINDS, ORDER_TYPES } from "./PartnerPayout.js";

const partnerPayoutCreditOrderSchema = new mongoose.Schema(
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
 * Keeps partner paid balances after a Transaction History row is hard-deleted.
 * Prefer per-order `orders[]` so credits cannot cover future orders.
 */
const partnerPayoutCreditSchema = new mongoose.Schema(
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
      type: [partnerPayoutCreditOrderSchema],
      default: [],
    },
    sourcePayoutId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "partnerpayoutcredits",
  },
);

partnerPayoutCreditSchema.index({ partnerKey: 1, createdAt: -1 });

const PartnerPayoutCredit = mongoose.model(
  "PartnerPayoutCredit",
  partnerPayoutCreditSchema,
);

export default PartnerPayoutCredit;
