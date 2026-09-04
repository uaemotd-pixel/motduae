import mongoose from "mongoose";
import GuestContactOtp from "../models/GuestContactOtp.js";
import PendingCheckout from "../models/PendingCheckout.js";

const MIGRATION_ID = "purge_ttl_align_v1";

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

/**
 * Old TTL indexes used createdAt (7d checkouts / 24h guest OTPs) and cannot
 * change expireAfterSeconds in place. Drop them so the new indexes apply.
 */
export async function alignPurgeIndexes() {
  const col = mongoose.connection.collection("app_migrations");
  const existing = await col.findOne({ _id: MIGRATION_ID });
  if (existing) return;

  await dropIndexIfExists(GuestContactOtp, "createdAt_1");
  await dropIndexIfExists(PendingCheckout, "createdAt_1");
  await GuestContactOtp.createIndexes();
  await PendingCheckout.createIndexes();

  await col.insertOne({
    _id: MIGRATION_ID,
    ranAt: new Date(),
  });
}
