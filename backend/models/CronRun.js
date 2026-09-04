import mongoose from "mongoose";

const CRON_RUN_STATUSES = ["running", "ok", "skipped", "error"];

const cronRunSchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true, trim: true, index: true },
    dryRun: { type: Boolean, default: false },
    status: {
      type: String,
      enum: CRON_RUN_STATUSES,
      required: true,
      default: "running",
    },
    skipped: { type: Boolean, default: false },
    reason: { type: String, default: "", trim: true },
    error: { type: String, default: "", trim: true },
    counts: { type: mongoose.Schema.Types.Mixed, default: {} },
    lockedBy: { type: String, default: "", trim: true },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, default: null },
  },
  { timestamps: false },
);

cronRunSchema.index({ startedAt: -1 });
cronRunSchema.index({ jobId: 1, startedAt: -1 });

const CronRun = mongoose.models.CronRun || mongoose.model("CronRun", cronRunSchema);

export default CronRun;
export { CRON_RUN_STATUSES };
