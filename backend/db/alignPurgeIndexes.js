import mongoose from "mongoose";
import AdminNotification from "../models/AdminNotification.js";
import EmailLog from "../models/EmailLog.js";
import GuestContactOtp from "../models/GuestContactOtp.js";
import PendingCheckout from "../models/PendingCheckout.js";

const MIGRATION_ID = "purge_ttl_align_v1";
const DEDUPE_INDEX_MIGRATION_ID = "dedupe_key_partial_index_v1";

async function dropIndexIfExists(Model, indexName) {
  try {
    await Model.collection.dropIndex(indexName);
  } catch (err) {
    if (err?.code !== 27 && err?.codeName !== "IndexNotFound") {
      console.warn(
        `Could not drop ${indexName} on ${Model.collection.name}:`,
        err.message,
      );
    }
  }
}

async function runOnce(id, fn) {
  const col = mongoose.connection.collection("app_migrations");
  const existing = await col.findOne({ _id: id });
  if (existing) return;
  await fn();
  await col.insertOne({ _id: id, ranAt: new Date() });
}

/**
 * Old TTL indexes used createdAt (7d checkouts / 24h guest OTPs) and cannot
 * change expireAfterSeconds in place. Drop them so the new indexes apply.
 *
 * The old sparse unique dedupeKey indexes rejected a second document with
 * dedupeKey: null. Rebuild them as partial indexes over string keys only.
 */
export async function alignPurgeIndexes() {
  await runOnce(MIGRATION_ID, async () => {
    await dropIndexIfExists(GuestContactOtp, "createdAt_1");
    await dropIndexIfExists(PendingCheckout, "createdAt_1");
    await GuestContactOtp.createIndexes();
    await PendingCheckout.createIndexes();
  });

  await runOnce(DEDUPE_INDEX_MIGRATION_ID, async () => {
    await dropIndexIfExists(AdminNotification, "dedupeKey_1");
    await dropIndexIfExists(EmailLog, "dedupeKey_1");
    await AdminNotification.createIndexes();
    await EmailLog.createIndexes();
  });
}
