import mongoose from "mongoose";

const guestContactOtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    otpHash: { type: String, default: undefined },
    otpExpires: { type: Date, default: undefined },
    otpSentAt: { type: Date, default: undefined },
    attemptCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

guestContactOtpSchema.index({ otpExpires: 1 }, { expireAfterSeconds: 0 });

const GuestContactOtp = mongoose.model("GuestContactOtp", guestContactOtpSchema);

export default GuestContactOtp;
