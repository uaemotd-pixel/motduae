import mongoose from "mongoose";
import { PARTNER_KINDS, CURRENCY } from "../services/partnerPayout/constants.js";

const LEDGER_TYPES = ["sale", "payout", "payout_void", "refund", "clawback", "adjustment"];

const partnerLedgerEntrySchema = new mongoose.Schema(
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
    },
    amountFils: { type: Number, required: true },
    type: {
      type: String,
      enum: LEDGER_TYPES,
      required: true,
    },
    currency: { type: String, default: CURRENCY, trim: true },
    earningId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerEarning",
      default: null,
    },
    payoutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PartnerPayoutBatch",
      default: null,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    idempotencyKey: {
      type: String,
      required: true,
      trim: true,
    },
    note: { type: String, default: "", trim: true },
  },
  { timestamps: true, collection: "partnerledgerentries" },
);

partnerLedgerEntrySchema.index({ idempotencyKey: 1 }, { unique: true });
partnerLedgerEntrySchema.index({ partnerId: 1, partnerKind: 1, createdAt: -1 });

const PartnerLedgerEntry = mongoose.model(
  "PartnerLedgerEntry",
  partnerLedgerEntrySchema,
);

export default PartnerLedgerEntry;
export { LEDGER_TYPES };
