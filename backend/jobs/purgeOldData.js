import cluster from "node:cluster";
import User from "../models/User.js";
import GuestContactOtp from "../models/GuestContactOtp.js";
import PendingCheckout from "../models/PendingCheckout.js";
import EmailLog from "../models/EmailLog.js";
import AdminNotification from "../models/AdminNotification.js";
import { pendingEmailClearUpdate } from "../services/emailVerification/emailOccupancy.js";
import { env } from "../config/env.js";
import { acquireCronLock, releaseCronLock } from "./cronLock.js";
import { startCronRunRecord, finishCronRunRecord } from "./cronRunStore.js";
import {
  ABANDONED_CHECKOUT_STATUSES,
  PURGE_DEFAULTS,
  SETTLED_CHECKOUT_STATUSES,
} from "./purgePolicy.js";
import { recoverOrClassifyPendingCheckout } from "../services/pendingCheckoutService.js";

function daysAgo(days, now = new Date()) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function resultCount(result) {
  if (!result) return 0;
  return (
    result.deletedCount ??
    result.modifiedCount ??
    result.n ??
    result.nModified ??
    0
  );
}

async function deleteInBatches(model, filter, { dryRun }) {
  if (dryRun) {
    return model.countDocuments(filter);
  }

  const batchSize = PURGE_DEFAULTS.deleteBatchSize;
  const maxBatches = PURGE_DEFAULTS.deleteMaxBatches;
  let deleted = 0;

  for (let i = 0; i < maxBatches; i += 1) {
    const rows = await model.find(filter).select("_id").limit(batchSize).lean();
    if (!rows.length) break;
    const result = await model.deleteMany({
      _id: { $in: rows.map((row) => row._id) },
    });
    deleted += resultCount(result);
    if (rows.length < batchSize) break;
  }

  return deleted;
}

async function countOrUpdate(model, filter, update, { dryRun }) {
  if (dryRun) {
    return model.countDocuments(filter);
  }
  return resultCount(await model.updateMany(filter, update));
}

async function countOrDelete(model, filter, { dryRun }) {
  return deleteInBatches(model, filter, { dryRun });
}

function retentionSnapshot() {
  return {
    guestOtpDays: PURGE_DEFAULTS.guestOtpDays,
    pendingCheckoutDays: PURGE_DEFAULTS.pendingCheckoutDays,
    pendingCheckoutSettledDays: PURGE_DEFAULTS.pendingCheckoutSettledDays,
    emailLogDays: PURGE_DEFAULTS.emailLogDays,
    notificationSoftDeleteDays: PURGE_DEFAULTS.notificationSoftDeleteDays,
    notificationReadDays: PURGE_DEFAULTS.notificationReadDays,
  };
}

function skipped(reason) {
  return { skipped: true, reason, counts: {} };
}

export async function purgePendingEmails({ dryRun = false, now = new Date() } = {}) {
  const count = await countOrUpdate(
    User,
    {
      pendingEmail: { $exists: true, $nin: [null, ""] },
      pendingEmailExpiresAt: { $lte: now },
    },
    pendingEmailClearUpdate(),
    { dryRun },
  );
  return { counts: { pendingEmailsCleared: count } };
}

export async function purgeExpiredOtps({ dryRun = false, now = new Date() } = {}) {
  const count = await countOrUpdate(
    User,
    { emailVerificationOTPExpires: { $lte: now } },
    {
      $unset: {
        emailVerificationOTPHash: 1,
        emailVerificationOTPExpires: 1,
        emailVerificationOTPSentAt: 1,
      },
      $set: { emailVerificationAttemptCount: 0 },
    },
    { dryRun },
  );
  return { counts: { expiredOtpsCleared: count } };
}

export async function purgeResetTokens({ dryRun = false, now = new Date() } = {}) {
  const count = await countOrUpdate(
    User,
    { resetPasswordExpires: { $lte: now } },
    { $unset: { resetPasswordToken: 1, resetPasswordExpires: 1 } },
    { dryRun },
  );
  return { counts: { resetTokensCleared: count } };
}

export async function purgeGuestOtps({ dryRun = false, now = new Date() } = {}) {
  const days = PURGE_DEFAULTS.guestOtpDays;
  const leftover =
    days > 0
      ? {
          $and: [
            {
              $or: [
                { otpHash: { $exists: false } },
                { otpHash: null },
                { otpHash: "" },
              ],
            },
            {
              $or: [
                { otpExpires: { $exists: false } },
                { otpExpires: null },
              ],
            },
            { updatedAt: { $lte: daysAgo(days, now) } },
          ],
        }
      : null;
  const filter = leftover
    ? {
        $or: [
          { otpExpires: { $type: "date", $lte: now } },
          leftover,
        ],
      }
    : { otpExpires: { $type: "date", $lte: now } };
  const count = await countOrDelete(GuestContactOtp, filter, { dryRun });
  return { counts: { guestOtpsDeleted: count } };
}

export async function purgePendingCheckouts({
  dryRun = false,
  now = new Date(),
  recover = recoverOrClassifyPendingCheckout,
} = {}) {
  const abandonedDays = PURGE_DEFAULTS.pendingCheckoutDays;
  const settledDays = PURGE_DEFAULTS.pendingCheckoutSettledDays;
  if (abandonedDays <= 0 && settledDays <= 0) {
    return skipped("pendingCheckoutDays=0");
  }

  if (dryRun) {
    const [abandonedCheckoutsDeleted, settledCheckoutsDeleted] = await Promise.all([
      abandonedDays > 0
        ? PendingCheckout.countDocuments({
            status: { $in: ABANDONED_CHECKOUT_STATUSES },
            createdAt: { $lte: daysAgo(abandonedDays, now) },
          })
        : 0,
      settledDays > 0
        ? PendingCheckout.countDocuments({
            status: { $in: SETTLED_CHECKOUT_STATUSES },
            createdAt: { $lte: daysAgo(settledDays, now) },
          })
        : 0,
    ]);
    return {
      counts: {
        pendingCheckoutsRecovered: 0,
        pendingCheckoutsKept: 0,
        pendingCheckoutsDeleted: abandonedCheckoutsDeleted + settledCheckoutsDeleted,
        abandonedCheckoutsDeleted,
        settledCheckoutsDeleted,
      },
    };
  }
  let recovered = 0;
  let keptForRetry = 0;
  const abandonIds = [];

  if (abandonedDays > 0) {
    const stale = await PendingCheckout.find({
      status: { $in: ABANDONED_CHECKOUT_STATUSES },
      createdAt: { $lte: daysAgo(abandonedDays, now) },
    })
      .limit(PURGE_DEFAULTS.pendingCheckoutRecoverLimit)
      .lean();

    for (const doc of stale) {
      const action = await recover(doc);
      if (action === "linked" || action === "fulfilled") {
        recovered += 1;
      } else if (action === "keep") {
        keptForRetry += 1;
      } else {
        abandonIds.push(doc._id);
      }
    }
  }

  const abandonedDeleted = abandonIds.length
    ? await countOrDelete(
        PendingCheckout,
        { _id: { $in: abandonIds } },
        { dryRun },
      )
    : 0;

  const settledDeleted =
    settledDays > 0
      ? await countOrDelete(
          PendingCheckout,
          {
            status: { $in: SETTLED_CHECKOUT_STATUSES },
            createdAt: { $lte: daysAgo(settledDays, now) },
          },
          { dryRun },
        )
      : 0;

  return {
    counts: {
      pendingCheckoutsRecovered: recovered,
      pendingCheckoutsKept: keptForRetry,
      pendingCheckoutsDeleted: abandonedDeleted + settledDeleted,
      abandonedCheckoutsDeleted: abandonedDeleted,
      settledCheckoutsDeleted: settledDeleted,
    },
  };
}

export async function purgeEmailLogs({ dryRun = false, now = new Date() } = {}) {
  const days = PURGE_DEFAULTS.emailLogDays;
  if (days <= 0) {
    return skipped("emailLogDays=0");
  }
  const count = await countOrDelete(
    EmailLog,
    { createdAt: { $lte: daysAgo(days, now) } },
    { dryRun },
  );
  return { counts: { emailLogsDeleted: count } };
}

export async function purgeNotifications({
  dryRun = false,
  now = new Date(),
} = {}) {
  const { notificationSoftDeleteDays, notificationReadDays } = PURGE_DEFAULTS;
  const [softDeletedNotificationsDeleted, oldReadNotificationsDeleted] =
    await Promise.all([
      notificationSoftDeleteDays > 0
        ? countOrDelete(
            AdminNotification,
            {
              deletedAt: {
                $ne: null,
                $lte: daysAgo(notificationSoftDeleteDays, now),
              },
            },
            { dryRun },
          )
        : 0,
      notificationReadDays > 0
        ? countOrDelete(
            AdminNotification,
            {
              read: true,
              deletedAt: null,
              createdAt: { $lte: daysAgo(notificationReadDays, now) },
            },
            { dryRun },
          )
        : 0,
    ]);
  return {
    counts: {
      softDeletedNotificationsDeleted,
      oldReadNotificationsDeleted,
    },
  };
}

/**
 * Run every purge. Does not touch orders, users, shops, payouts, or catalog data.
 */
export async function purgeOldData(opts = {}) {
  const results = await Promise.all(
    INDIVIDUAL_JOB_IDS.map((id) => CRON_JOBS[id].run(opts)),
  );
  const counts = {};
  for (const result of results) {
    Object.assign(counts, result.counts);
  }
  return { counts };
}

export const CRON_JOBS = {
  "purge-pending-emails": {
    description: "Clear expired email-change holds on User",
    run: purgePendingEmails,
  },
  "purge-expired-otps": {
    description: "Clear expired email-verification OTP fields on User",
    run: purgeExpiredOtps,
  },
  "purge-reset-tokens": {
    description: "Clear expired password-reset tokens on User",
    run: purgeResetTokens,
  },
  "purge-guest-otps": {
    description: "Delete expired and leftover guest-checkout OTP rows",
    run: purgeGuestOtps,
  },
  "purge-pending-checkouts": {
    description: "Delete pending checkout snapshots older than retention",
    run: purgePendingCheckouts,
  },
  "purge-email-logs": {
    description: "Delete EmailLog rows older than retention",
    run: purgeEmailLogs,
  },
  "purge-notifications": {
    description: "Hard-delete old soft-deleted and old read notifications",
    run: purgeNotifications,
  },
  "purge-old-data": {
    description: "Run every purge job",
    run: purgeOldData,
  },
};

const INDIVIDUAL_JOB_IDS = Object.keys(CRON_JOBS).filter(
  (id) => id !== "purge-old-data",
);

export function listCronJobs() {
  return Object.entries(CRON_JOBS).map(([id, job]) => ({
    id,
    description: job.description,
    methods: ["GET", "POST"],
    path: `/api/cron/${id}`,
    dryRun: "Pass ?dryRun=1 or JSON { \"dryRun\": true }",
  }));
}

export async function runCronJob(jobId, { dryRun = false, now = new Date() } = {}) {
  const job = CRON_JOBS[jobId];
  if (!job) return null;
  const startedAt = new Date();
  const runDoc = await startCronRunRecord({ jobId, dryRun });

  let lock = null;
  if (!dryRun) {
    lock = await acquireCronLock(jobId);
    if (!lock.acquired) {
      const skippedResult = {
        job: jobId,
        description: job.description,
        dryRun: false,
        skipped: true,
        reason: `locked by ${lock.owner} (another instance in the cluster)`,
        ranAt: startedAt.toISOString(),
        retention: retentionSnapshot(),
        counts: {},
      };
      await finishCronRunRecord(runDoc, {
        status: "skipped",
        skipped: true,
        reason: skippedResult.reason,
        lockedBy: lock.owner || "",
        counts: {},
      });
      return skippedResult;
    }
  }

  try {
    const result = await job.run({ dryRun, now });
    const summary = {
      job: jobId,
      description: job.description,
      dryRun,
      ranAt: startedAt.toISOString(),
      retention: retentionSnapshot(),
      lockedBy: lock?.owner,
      ...result,
    };
    await finishCronRunRecord(runDoc, {
      status: result.skipped ? "skipped" : "ok",
      skipped: Boolean(result.skipped),
      reason: result.reason || "",
      lockedBy: lock?.owner || "",
      counts: result.counts || {},
    });
    return summary;
  } catch (error) {
    await finishCronRunRecord(runDoc, {
      status: "error",
      error: error?.message ? String(error.message).slice(0, 2000) : "Unknown error",
      lockedBy: lock?.owner || "",
    });
    throw error;
  } finally {
    if (lock?.acquired) {
      await releaseCronLock(jobId, lock.lockToken);
    }
  }
}

function msUntilNextUtcHour(hour) {
  const now = new Date();
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      0,
      0,
      0,
    ),
  );
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

/**
 * Daily 02:00 UTC sweep for long-running Node (`npm start`).
 * Skipped on Vercel — use vercel.json crons instead.
 */
export function startOldDataPurgeScheduler() {
  if (process.env.VERCEL) return;
  if (cluster.isWorker) {
    console.log("[purge-old-data] cluster worker skip in-process scheduler");
    return;
  }
  if (!env.purgeOldData.schedulerEnabled) return;

  const hour = env.purgeOldData.schedulerHourUtc;

  const run = async () => {
    try {
      const summary = await runCronJob("purge-old-data");
      console.log("[purge-old-data]", JSON.stringify(summary));
    } catch (error) {
      console.error("[purge-old-data] failed:", error);
    }
  };

  const scheduleNext = () => {
    const timer = setTimeout(async () => {
      await run();
      scheduleNext();
    }, msUntilNextUtcHour(hour));
    if (typeof timer.unref === "function") timer.unref();
  };

  scheduleNext();
  console.log(
    `[purge-old-data] scheduler armed for ${String(hour).padStart(2, "0")}:00 UTC`,
  );
}
