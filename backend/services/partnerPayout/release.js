import mongoose from "mongoose";
import { isDuplicateKeyError, roundFils, filsToAed } from "../../utils/fils.js";
import PartnerEarning from "../../models/PartnerEarning.js";
import PartnerPayoutBatch from "../../models/PartnerPayoutBatch.js";
import PartnerPayoutLine from "../../models/PartnerPayoutLine.js";
import PartnerLedgerEntry from "../../models/PartnerLedgerEntry.js";
import PartnerPayoutRequest from "../../models/PartnerPayoutRequest.js";
import { PartnerPayoutError } from "./errors.js";
import { requireIdempotencyKey } from "./keys.js";
import { withMongoSession } from "./transactions.js";
import { previewFifo } from "./split.js";
import { getPartnerSettlement, getPayoutById } from "./settlement.js";
import { shouldWritePayoutVoidCredit } from "./compensation.js";
import { healStalePendingRequests } from "./portal.js";
import {
  ensurePartnerPayoutReleasedNotification,
  resolvePartnerOwnerUserId,
} from "../notificationService.js";

async function loadAvailableEarnings(partnerId, partnerKind, session) {
  const query = PartnerEarning.find({
    partnerId: String(partnerId),
    partnerKind,
    status: "available",
    remainingFils: { $gt: 0 },
  }).sort({ availableAt: 1, createdAt: 1, _id: 1 });
  if (session) query.session(session);
  return query.lean();
}

async function serializePayout(payoutId, { duplicate = false } = {}) {
  const match = await getPayoutById(payoutId);
  if (!match) return null;
  return { ...match, duplicate };
}

async function consumeAndInsertPayout(session, params) {
  const {
    partnerId,
    partnerKind,
    partnerName,
    payeeName,
    amountFils,
    note,
    idempotencyKey,
    requestId,
    releasedBy,
  } = params;

  const existing = await PartnerPayoutBatch.findOne({ idempotencyKey }).session(
    session,
  );
  if (existing) {
    return { payout: existing, duplicate: true };
  }
  if (requestId) {
    const byRequest = await PartnerPayoutBatch.findOne({ requestId }).session(
      session,
    );
    if (byRequest) {
      return { payout: byRequest, duplicate: true };
    }
  }

  const earnings = await loadAvailableEarnings(partnerId, partnerKind, session);
  const allocation = previewFifo(earnings, amountFils);

  let payout;
  try {
    const payoutDocs = await PartnerPayoutBatch.create(
      [
        {
          partnerId: String(partnerId),
          partnerKind,
          partnerName,
          payeeName: payeeName || "",
          amountFils: allocation.amountFils,
          status: "processing",
          method: "manual_bank",
          note: note || "",
          idempotencyKey,
          requestId: requestId || null,
          releasedBy: releasedBy || null,
          releasedAt: new Date(),
        },
      ],
      { session },
    );
    payout = payoutDocs[0];
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    const dup = await PartnerPayoutBatch.findOne({
      $or: [
        { idempotencyKey },
        ...(requestId ? [{ requestId }] : []),
      ],
    }).session(session);
    if (!dup) throw err;
    return { payout: dup, duplicate: true };
  }

  const lineDocs = allocation.lines.map((line) => ({
    payoutId: payout._id,
    earningId: line.earningId,
    orderId: line.orderId,
    orderType: line.orderType,
    partnerId: String(partnerId),
    amountFils: line.amountFils,
    commissionPercent: line.commissionPercent,
    grossFils: line.grossFils,
    commissionFils: line.commissionFils,
  }));

  await PartnerPayoutLine.insertMany(lineDocs, { session });

  for (const line of allocation.lines) {
    const updated = await PartnerEarning.findOneAndUpdate(
      {
        _id: line.earningId,
        status: "available",
        remainingFils: { $gte: line.amountFils },
      },
      {
        $inc: { remainingFils: -line.amountFils },
      },
      { session, new: true },
    );
    if (!updated) {
      throw new PartnerPayoutError(
        "This amount is already included in another payment. Please refresh and try again.",
        409,
        "EARNING_CONSUME_CONFLICT",
      );
    }
    if ((updated.remainingFils || 0) === 0) {
      updated.status = "paid";
      await updated.save({ session });
    }
  }

  return { payout, duplicate: false };
}

async function notifyRelease({
  partnerKind,
  partnerId,
  amountAed,
  payoutId,
  releasedBy,
  requestId,
  approvedRequest,
}) {
  const recipientUserId = await resolvePartnerOwnerUserId(
    partnerKind,
    `${partnerKind}:${partnerId}`,
    partnerId,
  );
  if (!recipientUserId) return;
  await ensurePartnerPayoutReleasedNotification({
    partnerKind,
    amount: amountAed,
    partnerKey: `${partnerKind}:${partnerId}`,
    partnerId,
    recipientUserId,
    requestId: requestId || null,
    payoutId,
    createdBy: releasedBy || null,
    approvedRequest: Boolean(approvedRequest),
  });
}

export async function previewRelease({ partnerId, partnerKind, amountFils } = {}) {
  const settlement = await getPartnerSettlement(partnerId, partnerKind);
  const budget =
    amountFils == null || amountFils === ""
      ? settlement.availableFils
      : Number(amountFils);
  const allocation = previewFifo(
    settlement.availableOrders.map((line) => ({
      _id: line.earningId,
      orderId: line.orderId,
      orderType: line.orderType,
      partnerId: settlement.partnerId,
      remainingFils: line.remainingFils,
      commissionPercent: line.commissionPercent,
      grossFils: line.grossFils,
      commissionFils: line.commissionFils,
      availableAt: line.availableAt,
    })),
    budget,
  );
  return {
    partnerId: settlement.partnerId,
    partnerKind: settlement.partnerKind,
    partnerName: settlement.partnerName,
    availableFils: settlement.availableFils,
    availableAed: settlement.availableAed,
    amountFils: allocation.amountFils,
    amountAed: filsToAed(allocation.amountFils),
    lines: allocation.lines.map((line) => ({
      ...line,
      amountAed: filsToAed(line.amountFils),
      remainingAfterAed: filsToAed(line.remainingAfterFils),
    })),
  };
}

export async function releasePayout({
  partnerId,
  partnerKind,
  amountFils,
  note,
  idempotencyKey,
  requestId,
  releasedBy,
} = {}) {
  const key = requireIdempotencyKey(idempotencyKey);
  const id = String(partnerId || "").trim();
  const kind = String(partnerKind || "").trim();
  if (!id || !["tailor", "fabric", "shipping"].includes(kind)) {
    throw new PartnerPayoutError(
      "A partner is required to release this payment.",
      400,
      "INVALID_PARTNER",
    );
  }

  const settlement = await getPartnerSettlement(id, kind);
  const budget =
    amountFils == null || amountFils === ""
      ? settlement.availableFils
      : Math.trunc(Number(amountFils));

  const existing = await PartnerPayoutBatch.findOne({ idempotencyKey: key }).lean();
  if (existing) {
    const serialized = await serializePayout(existing._id, { duplicate: true });
    return { ...serialized, duplicate: true };
  }

  const result = await withMongoSession(async (session) =>
    consumeAndInsertPayout(session, {
      partnerId: id,
      partnerKind: kind,
      partnerName: settlement.partnerName,
      payeeName: settlement.payeeName,
      amountFils: budget,
      note,
      idempotencyKey: key,
      requestId: requestId || null,
      releasedBy,
    }),
  );

  const serialized = await serializePayout(result.payout._id, {
    duplicate: result.duplicate,
  });

  if (!result.duplicate) {
    await notifyRelease({
      partnerKind: kind,
      partnerId: id,
      amountAed: serialized.amountAed,
      payoutId: result.payout._id,
      releasedBy,
      requestId: requestId || null,
      approvedRequest: false,
    }).catch(() => null);

    const after = await getPartnerSettlement(id, kind);
    await healStalePendingRequests({
      partnerId: id,
      partnerKind: kind,
      availableFils: after.availableFils,
    });
  }

  return serialized;
}

export async function completePayout({
  payoutId,
  bankRef,
  idempotencyKey,
} = {}) {
  requireIdempotencyKey(idempotencyKey);
  const ref = String(bankRef || "").trim();
  if (!ref) {
    throw new PartnerPayoutError("A bank transfer number is required.", 400, "MISSING_BANK_REF");
  }
  if (!mongoose.Types.ObjectId.isValid(String(payoutId))) {
    throw new PartnerPayoutError("We could not find this payment.", 400, "INVALID_PAYOUT_ID");
  }

  const existing = await PartnerPayoutBatch.findById(payoutId);
  if (!existing) {
    throw new PartnerPayoutError("We could not find this payment.", 404, "PAYOUT_NOT_FOUND");
  }
  if (existing.status === "completed") {
    return serializePayout(existing._id, { duplicate: true });
  }
  if (existing.status !== "processing") {
    throw new PartnerPayoutError(
      "This payment is already finished or cancelled.",
      400,
      "INVALID_PAYOUT_STATUS",
    );
  }

  await withMongoSession(async (session) => {
    const payout = await PartnerPayoutBatch.findOne({
      _id: payoutId,
      status: "processing",
    }).session(session);
    if (!payout) {
      const current = await PartnerPayoutBatch.findById(payoutId).session(
        session,
      );
      if (current?.status === "completed") return;
      throw new PartnerPayoutError(
        "This payment is no longer waiting for a transfer.",
        409,
        "PAYOUT_STATUS_CHANGED",
      );
    }
    payout.status = "completed";
    payout.bankRef = ref;
    payout.completedAt = new Date();
    payout.lastError = "";
    await payout.save({ session });

    try {
      await PartnerLedgerEntry.create(
        [
          {
            partnerId: payout.partnerId,
            partnerKind: payout.partnerKind,
            amountFils: -payout.amountFils,
            type: "payout",
            payoutId: payout._id,
            idempotencyKey: `ledger:payout:${payout._id}`,
            note: `bankRef ${ref}`,
          },
        ],
        { session },
      );
    } catch (err) {
      if (!isDuplicateKeyError(err)) throw err;
    }
  });

  return serializePayout(payoutId);
}

async function unlockLine(session, line) {
  const claimed = await PartnerPayoutLine.findOneAndUpdate(
    {
      _id: line._id,
      $or: [{ unlockedAt: null }, { unlockedAt: { $exists: false } }],
    },
    { $set: { unlockedAt: new Date() } },
    { session, new: true },
  );
  if (!claimed) return { skipped: true };

  const updated = await PartnerEarning.findOneAndUpdate(
    { _id: line.earningId },
    { $inc: { remainingFils: line.amountFils } },
    { session, new: true },
  );
  if (!updated) {
    throw new PartnerPayoutError(
      "Could not undo this payment.",
      500,
      "UNLOCK_EARNING_MISSING",
    );
  }
  if (updated.status === "paid" && (updated.remainingFils || 0) > 0) {
    updated.status = "available";
    if (!updated.availableAt) updated.availableAt = new Date();
    await updated.save({ session });
  }
  return { skipped: false };
}

export async function cancelPayout({ payoutId, idempotencyKey } = {}) {
  requireIdempotencyKey(idempotencyKey);
  if (!mongoose.Types.ObjectId.isValid(String(payoutId))) {
    throw new PartnerPayoutError("We could not find this payment.", 400, "INVALID_PAYOUT_ID");
  }

  const payout = await PartnerPayoutBatch.findById(payoutId);
  if (!payout) {
    throw new PartnerPayoutError("We could not find this payment.", 404, "PAYOUT_NOT_FOUND");
  }
  if (payout.status === "cancelled" || payout.status === "failed") {
    return serializePayout(payout._id, { duplicate: true });
  }
  if (payout.status !== "processing") {
    throw new PartnerPayoutError(
      "This payment is already finished, so it cannot be cancelled.",
      400,
      "INVALID_PAYOUT_STATUS",
    );
  }
  if (payout.bankRef) {
    throw new PartnerPayoutError(
      "This payment already has a transfer number, so it cannot be cancelled.",
      400,
      "BANK_REF_PRESENT",
    );
  }

  try {
    await withMongoSession(async (session) => {
      const current = await PartnerPayoutBatch.findById(payoutId).session(
        session,
      );
      if (!current) {
        throw new PartnerPayoutError("We could not find this payment.", 404, "PAYOUT_NOT_FOUND");
      }
      if (current.status === "cancelled" || current.status === "failed") {
        return;
      }
      if (current.status !== "processing" || current.bankRef) {
        throw new PartnerPayoutError(
          "This payment cannot be cancelled.",
          409,
          "PAYOUT_STATUS_CHANGED",
        );
      }

      const lines = await PartnerPayoutLine.find({ payoutId: current._id })
        .sort({ _id: -1 })
        .session(session)
        .lean();

      for (const line of lines) {
        await unlockLine(session, line);
      }

      const debit = await PartnerLedgerEntry.findOne({
        idempotencyKey: `ledger:payout:${current._id}`,
      }).session(session);
      if (shouldWritePayoutVoidCredit(debit)) {
        try {
          await PartnerLedgerEntry.create(
            [
              {
                partnerId: current.partnerId,
                partnerKind: current.partnerKind,
                amountFils: current.amountFils,
                type: "payout_void",
                payoutId: current._id,
                idempotencyKey: `ledger:payout_void:${current._id}`,
                note: "Compensate completed-ledger on cancel",
              },
            ],
            { session },
          );
        } catch (err) {
          if (!isDuplicateKeyError(err)) throw err;
        }
      }

      current.status = "cancelled";
      current.lastError = "";
      current.compensationNeeded = false;
      await current.save({ session });
    });
  } catch (err) {
    payout.compensationAttempts = (payout.compensationAttempts || 0) + 1;
    payout.compensationNeeded = true;
    payout.lastError = String(err?.message || err).slice(0, 1000);
    await payout.save();
    throw err;
  }

  return serializePayout(payoutId);
}

export async function approvePayoutRequest({
  requestId,
  reviewedBy,
  adminNote,
  idempotencyKey,
} = {}) {
  if (!mongoose.Types.ObjectId.isValid(String(requestId))) {
    throw new PartnerPayoutError("We could not find this request.", 400, "INVALID_REQUEST_ID");
  }

  const existingBatch = await PartnerPayoutBatch.findOne({
    requestId,
  }).lean();
  if (existingBatch) {
    const requestDoc = await PartnerPayoutRequest.findById(requestId).lean();
    return {
      duplicate: true,
      request: requestDoc,
      payout: await serializePayout(existingBatch._id, { duplicate: true }),
    };
  }

  const requestDoc = await PartnerPayoutRequest.findById(requestId);
  if (!requestDoc) {
    throw new PartnerPayoutError(
      "We could not find this request.",
      404,
      "REQUEST_NOT_FOUND",
    );
  }
  if (requestDoc.status !== "pending") {
    throw new PartnerPayoutError(
      "This request was already reviewed.",
      400,
      "REQUEST_NOT_PENDING",
    );
  }

  const partnerId = String(requestDoc.partnerId || "").trim();
  const partnerKind = requestDoc.partnerKind;
  if (!partnerId) {
    throw new PartnerPayoutError(
      "This request is missing partner details. Contact support.",
      400,
      "REQUEST_MISSING_PARTNER",
    );
  }

  const settlement = await getPartnerSettlement(partnerId, partnerKind);
  const ticketFils = requestDoc.amountFils
    ? Number(requestDoc.amountFils)
    : roundFils(requestDoc.amount);
  const budgetFils = Math.min(ticketFils, settlement.availableFils);
  if (budgetFils <= 0) {
    throw new PartnerPayoutError(
      "No amount is ready to pay for this partner yet.",
      400,
      "NOTHING_AVAILABLE",
    );
  }

  const key = String(idempotencyKey || "").trim() || `payout:request:${requestId}`;

  const result = await withMongoSession(async (session) => {
    const claimed = await PartnerPayoutRequest.findOneAndUpdate(
      { _id: requestId, status: "pending" },
      {
        $set: {
          status: "approved",
          reviewedBy: reviewedBy || null,
          reviewedAt: new Date(),
          adminNote: adminNote ? String(adminNote).trim().slice(0, 500) : "",
        },
      },
      { session, new: true },
    );
    if (!claimed) {
      const already = await PartnerPayoutBatch.findOne({ requestId }).session(
        session,
      );
      if (already) return { payout: already, duplicate: true, request: claimed };
      throw new PartnerPayoutError(
        "This request was already reviewed.",
        409,
        "REQUEST_NOT_PENDING",
      );
    }

    const inserted = await consumeAndInsertPayout(session, {
      partnerId,
      partnerKind,
      partnerName: claimed.partnerName,
      payeeName: claimed.payeeName,
      amountFils: budgetFils,
      note: claimed.note
        ? `Approved request: ${claimed.note}`
        : `Approved ${partnerKind} payout request`,
      idempotencyKey: key,
      requestId: claimed._id,
      releasedBy: reviewedBy,
    });
    claimed.payoutId = inserted.payout._id;
    await claimed.save({ session });
    return { ...inserted, request: claimed };
  });

  const payout = await serializePayout(result.payout._id, {
    duplicate: result.duplicate,
  });

  if (!result.duplicate) {
    await notifyRelease({
      partnerKind,
      partnerId,
      amountAed: payout.amountAed,
      payoutId: result.payout._id,
      releasedBy: reviewedBy,
      requestId,
      approvedRequest: true,
    }).catch(() => null);
  }

  const populated = await PartnerPayoutRequest.findById(requestId)
    .populate("requestedBy", "name email")
    .populate("reviewedBy", "name email")
    .lean();

  return { duplicate: Boolean(result.duplicate), request: populated, payout };
}

export { roundFils };
