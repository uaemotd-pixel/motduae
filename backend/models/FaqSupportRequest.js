import mongoose from "mongoose";

const FaqSupportRequestSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    concern: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: ["general", "damage_claim", "tailor_issue"],
      default: "general",
      index: true,
    },
    publicOrderId: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
      index: true,
    },
    orderType: {
      type: String,
      enum: ["custom", "retail"],
      required: false,
    },
    damageKind: {
      type: String,
      enum: [
        "torn",
        "stained",
        "missing_parts",
        "wrong_item",
        "packaging_damaged",
        "other",
      ],
      required: false,
    },
    /** Tailor/partner issue type (fabric problems reported to MOTD Care). */
    partnerIssueKind: {
      type: String,
      enum: ["fabric_insufficient", "fabric_damaged", "other"],
      required: false,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomOrder",
      default: null,
      index: true,
    },
    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TailorShop",
      default: null,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    locale: { type: String, enum: ["en", "ar"], default: "en" },
    source: {
      type: String,
      default: "faq_chatbot",
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true },
);

const FaqSupportRequest = mongoose.model(
  "FaqSupportRequest",
  FaqSupportRequestSchema,
);

export default FaqSupportRequest;
