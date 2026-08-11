import EmailLog from "../../models/EmailLog.js";

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.code === 11001));
}

export function createMongoEmailLogStore() {
  return {
    async createPending(doc) {
      try {
        const created = await EmailLog.create({
          ...doc,
          status: "pending",
        });
        return { created: true, log: created };
      } catch (error) {
        if (isDuplicateKeyError(error) && doc.dedupeKey) {
          const existing = await EmailLog.findOne({ dedupeKey: doc.dedupeKey });
          return { created: false, log: existing, skipped: true };
        }
        throw error;
      }
    },

    async markSent(logId, { providerMessageId, subject, from } = {}) {
      return EmailLog.findByIdAndUpdate(
        logId,
        {
          status: "sent",
          providerMessageId: providerMessageId || null,
          subject: subject || undefined,
          from: from || undefined,
          error: null,
          sentAt: new Date(),
        },
        { new: true },
      );
    },

    async markFailed(logId, { error, subject, from } = {}) {
      return EmailLog.findByIdAndUpdate(
        logId,
        {
          status: "failed",
          error: error ? String(error).slice(0, 2000) : "Unknown error",
          subject: subject || undefined,
          from: from || undefined,
        },
        { new: true },
      );
    },

    async markSkipped(logId, { reason } = {}) {
      return EmailLog.findByIdAndUpdate(
        logId,
        {
          status: "skipped",
          error: reason || "Duplicate dedupe key",
        },
        { new: true },
      );
    },
  };
}
