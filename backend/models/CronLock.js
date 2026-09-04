import mongoose from "mongoose";

const cronLockSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    lockedBy: { type: String, required: true },
    lockToken: { type: String, required: true },
    lockedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: false },
);

cronLockSchema.index({ expiresAt: 1 });

const CronLock =
  mongoose.models.CronLock || mongoose.model("CronLock", cronLockSchema);

export default CronLock;
