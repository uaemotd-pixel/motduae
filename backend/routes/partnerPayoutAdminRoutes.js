import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import PartnerPayoutRequest from "../models/PartnerPayoutRequest.js";
import { PARTNER_PAYOUT_KINDS } from "../models/PartnerPayout.js";
import {
  createNotification,
} from "../services/notificationService.js";
import {
  PartnerPayoutError,
  approvePayoutRequest,
  cancelPayout,
  completePayout,
  getPartnerSettlement,
  listAllPartnerSettlements,
  listPayoutBatches,
  previewRelease,
  releasePayout,
} from "../services/partnerPayout/index.js";
import { healStalePendingRequests } from "../services/partnerPayout/portal.js";

function readIdempotencyKey(req) {
  return req.get("Idempotency-Key") || req.get("idempotency-key") || "";
}

function sendPayoutError(res, err) {
  if (err instanceof PartnerPayoutError) {
    res.status(err.status).send({ message: err.message, code: err.code });
    return true;
  }
  return false;
}

export function registerPartnerPayoutAdminRoutes(adminRouter) {
  adminRouter.get(
    "/partner-settlement",
    expressAsyncHandler(async (req, res) => {
      const { partnerId, partnerKind } = req.query;
      if (partnerId && partnerKind) {
        const partner = await getPartnerSettlement(partnerId, partnerKind);
        res.send({ partner });
        return;
      }
      const data = await listAllPartnerSettlements();
      res.send(data);
    }),
  );

  adminRouter.get(
    "/partner-payouts",
    expressAsyncHandler(async (req, res) => {
      const { partnerId, partnerKind, status, limit } = req.query;
      const items = await listPayoutBatches({
        partnerId,
        partnerKind:
          partnerKind && PARTNER_PAYOUT_KINDS.includes(partnerKind)
            ? partnerKind
            : undefined,
        status,
        limit,
      });
      res.send({ items });
    }),
  );

  adminRouter.post(
    "/partner-payouts/preview",
    expressAsyncHandler(async (req, res) => {
      try {
        const { partnerId, partnerKind, amountFils } = req.body || {};
        const preview = await previewRelease({
          partnerId,
          partnerKind,
          amountFils,
        });
        res.send(preview);
      } catch (err) {
        if (!sendPayoutError(res, err)) throw err;
      }
    }),
  );

  adminRouter.post(
    "/partner-payouts",
    expressAsyncHandler(async (req, res) => {
      try {
        const { partnerId, partnerKind, amountFils, note } = req.body || {};
        const payout = await releasePayout({
          partnerId,
          partnerKind,
          amountFils,
          note,
          idempotencyKey: readIdempotencyKey(req),
          releasedBy: req.user?._id,
        });
        res.status(payout?.duplicate ? 200 : 201).send(payout);
      } catch (err) {
        if (!sendPayoutError(res, err)) throw err;
      }
    }),
  );

  adminRouter.post(
    "/partner-payouts/:id/complete",
    expressAsyncHandler(async (req, res) => {
      try {
        const payout = await completePayout({
          payoutId: req.params.id,
          bankRef: req.body?.bankRef,
          idempotencyKey:
            readIdempotencyKey(req) || `payout:complete:${req.params.id}`,
        });
        res.send(payout);
      } catch (err) {
        if (!sendPayoutError(res, err)) throw err;
      }
    }),
  );

  adminRouter.post(
    "/partner-payouts/:id/cancel",
    expressAsyncHandler(async (req, res) => {
      try {
        const payout = await cancelPayout({
          payoutId: req.params.id,
          idempotencyKey:
            readIdempotencyKey(req) || `payout:cancel:${req.params.id}`,
        });
        res.send(payout);
      } catch (err) {
        if (!sendPayoutError(res, err)) throw err;
      }
    }),
  );

  adminRouter.get(
    "/payout-requests",
    expressAsyncHandler(async (req, res) => {
      const { status, partnerKind, limit } = req.query;
      const filter = {};
      if (
        status &&
        typeof status === "string" &&
        ["pending", "approved", "rejected", "cancelled"].includes(status)
      ) {
        filter.status = status;
      }
      if (
        partnerKind &&
        typeof partnerKind === "string" &&
        PARTNER_PAYOUT_KINDS.includes(partnerKind)
      ) {
        filter.partnerKind = partnerKind;
      }

      const stalePending = await PartnerPayoutRequest.find({
        status: "pending",
        ...(filter.partnerKind ? { partnerKind: filter.partnerKind } : {}),
      }).limit(200);

      const seen = new Set();
      for (const requestDoc of stalePending) {
        const partnerId = String(requestDoc.partnerId || "").trim();
        if (!partnerId) continue;
        const key = `${requestDoc.partnerKind}:${partnerId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const settlement = await getPartnerSettlement(
          partnerId,
          requestDoc.partnerKind,
        );
        await healStalePendingRequests({
          partnerId,
          partnerKind: requestDoc.partnerKind,
          availableFils: settlement.availableFils,
          recipientUserId: requestDoc.requestedBy,
        });
      }

      const limitNum = Math.min(Math.max(Number(limit) || 100, 1), 300);
      const items = await PartnerPayoutRequest.find(filter)
        .populate("requestedBy", "name email")
        .populate("reviewedBy", "name email")
        .sort({
          status: 1,
          requestedAt: -1,
        })
        .limit(limitNum)
        .lean();

      const pendingCount = await PartnerPayoutRequest.countDocuments({
        status: "pending",
        ...(filter.partnerKind ? { partnerKind: filter.partnerKind } : {}),
      });

      res.send({ items, pendingCount });
    }),
  );

  adminRouter.post(
    "/payout-requests/:id/approve",
    expressAsyncHandler(async (req, res) => {
      try {
        const adminNote =
          typeof req.body?.adminNote === "string"
            ? req.body.adminNote.trim().slice(0, 500)
            : "";
        const result = await approvePayoutRequest({
          requestId: req.params.id,
          reviewedBy: req.user?._id,
          adminNote,
          idempotencyKey:
            readIdempotencyKey(req) || `payout:request:${req.params.id}`,
        });
        res.send({
          success: true,
          request: result.request,
          payout: result.payout,
          payoutId: result.payout?._id,
        });
      } catch (err) {
        if (!sendPayoutError(res, err)) throw err;
      }
    }),
  );

  adminRouter.post(
    "/payout-requests/:id/reject",
    expressAsyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(id))) {
        res.status(400).send({ message: "We could not find this request." });
        return;
      }

      const requestDoc = await PartnerPayoutRequest.findById(id);
      if (!requestDoc) {
        res.status(404).send({ message: "We could not find this request." });
        return;
      }
      if (requestDoc.status !== "pending") {
        res.status(400).send({
          message: "This request was already reviewed.",
        });
        return;
      }

      const adminNote =
        typeof req.body?.adminNote === "string"
          ? req.body.adminNote.trim().slice(0, 500)
          : "";

      requestDoc.status = "rejected";
      requestDoc.reviewedBy = req.user._id;
      requestDoc.reviewedAt = new Date();
      requestDoc.adminNote = adminNote;
      await requestDoc.save();

      if (requestDoc.requestedBy) {
        const kind = requestDoc.partnerKind === "tailor" ? "tailor" : "fabric";
        await createNotification({
          type: `${kind}_payout_rejected`,
          title: "Payout request declined",
          message: adminNote
            ? `MOTD declined your payout request: ${adminNote}`
            : "MOTD declined your payout request.",
          audience: "customer",
          recipientUserId: requestDoc.requestedBy,
          createdBy: req.user._id,
          dedupeKey: `${kind}:payout_rejected:${requestDoc._id}`,
        }).catch(() => null);
      }

      const populated = await PartnerPayoutRequest.findById(requestDoc._id)
        .populate("requestedBy", "name email")
        .populate("reviewedBy", "name email")
        .lean();

      res.send({ success: true, request: populated });
    }),
  );

  adminRouter.delete(
    "/payout-requests/:id",
    expressAsyncHandler(async (req, res) => {
      const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(String(id))) {
        res.status(400).send({ message: "We could not find this request." });
        return;
      }

      const requestDoc = await PartnerPayoutRequest.findById(id);
      if (!requestDoc) {
        res.status(404).send({ message: "We could not find this request." });
        return;
      }

      if (requestDoc.status === "pending") {
        res.status(400).send({
          message:
            "Pending requests cannot be deleted. Approve or decline them first.",
        });
        return;
      }

      await requestDoc.deleteOne();
      res.send({ message: "Request deleted", id: String(id) });
    }),
  );
}
