import mongoose from "mongoose";

const NewsletterSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subscribedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

const NewsletterSubscriber = mongoose.model(
  "NewsletterSubscriber",
  NewsletterSubscriberSchema,
);

export default NewsletterSubscriber;
