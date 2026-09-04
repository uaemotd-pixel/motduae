import { randomUUID } from "crypto";
import os from "os";
import CronLock from "../models/CronLock.js";

const LOCK_TTL_MS = 5 * 60 * 1000;

export function cronInstanceId() {
  return `${os.hostname()}:${process.pid}`;
}

function isDuplicateKey(error) {
  return Boolean(error && (error.code === 11000 || error.code === 11001));
}

/**
 * Cluster-safe lock: only one backend instance can run a given cron job at a time.
 */
export async function acquireCronLock(jobId, ttlMs = LOCK_TTL_MS) {
  const now = new Date();
  const owner = cronInstanceId();
  const lockToken = randomUUID();
  const expiresAt = new Date(now.getTime() + ttlMs);
  const filter = {
    _id: jobId,
    $or: [{ expiresAt: { $lte: now } }, { expiresAt: { $exists: false } }],
  };
  const update = {
    $set: {
      lockedBy: owner,
      lockToken,
      lockedAt: now,
      expiresAt,
    },
  };

  try {
    await CronLock.findOneAndUpdate(filter, update, { upsert: true });
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
  }

  const current = await CronLock.findById(jobId).lean();
  if (current?.lockToken === lockToken) {
    return { acquired: true, owner, lockToken, expiresAt };
  }

  return {
    acquired: false,
    owner: current?.lockedBy || "another-instance",
    expiresAt: current?.expiresAt || null,
  };
}

export async function releaseCronLock(jobId, lockToken) {
  if (!jobId || !lockToken) return;
  await CronLock.deleteOne({ _id: jobId, lockToken });
}
