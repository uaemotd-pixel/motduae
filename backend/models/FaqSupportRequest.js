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
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    locale: { type: String, enum: ["en", "ar"], default: "en" },
    source: { type: String, default: "faq_chatbot", trim: true },
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
