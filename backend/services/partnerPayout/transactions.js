import mongoose from "mongoose";
import {
  isReplicaSetRequiredError,
  PartnerPayoutError,
} from "./errors.js";

/**
 * Mongo multi-document transactions need a replica set (Atlas is fine).
 * A local standalone `mongod` cannot run partner payout releases.
 */
export async function withMongoSession(work) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } catch (err) {
    if (isReplicaSetRequiredError(err)) {
      throw new PartnerPayoutError(
        "This payment cannot be processed on the current database. Please use MOTD production and try again.",
        503,
        "REPLICA_SET_REQUIRED",
      );
    }
    throw err;
  } finally {
    session.endSession();
  }
}
