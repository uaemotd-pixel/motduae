import CronRun from "../models/CronRun.js";

export async function startCronRunRecord({ jobId, dryRun }) {
  try {
    return await CronRun.create({
      jobId,
      dryRun: Boolean(dryRun),
      status: "running",
      startedAt: new Date(),
    });
  } catch (error) {
    console.error("[cron-run] failed to create history row:", error.message);
    return null;
  }
}

export async function finishCronRunRecord(runDoc, fields) {
  if (!runDoc?._id) return;
  const finishedAt = new Date();
  const startedAt = runDoc.startedAt ? new Date(runDoc.startedAt) : finishedAt;
  try {
    await CronRun.updateOne(
      { _id: runDoc._id },
      {
        $set: {
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          ...fields,
        },
      },
    );
  } catch (error) {
    console.error("[cron-run] failed to update history row:", error.message);
  }
}
