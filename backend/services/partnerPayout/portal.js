import TailorShop from "../../models/TailorShop.js";
import FabricShop from "../../models/FabricShop.js";
import PartnerPayoutRequest from "../../models/PartnerPayoutRequest.js";
import PartnerPayoutBatch from "../../models/PartnerPayoutBatch.js";
import { filsToAed } from "../../utils/fils.js";
import { PartnerPayoutError } from "./errors.js";
import { shouldCloseStalePayoutRequest } from "./compensation.js";
import {
  findPendingPayoutRequest,
  getPartnerSettlement,
  listPayoutBatches,
} from "./settlement.js";
import { ensurePartnerPayoutReleasedNotification } from "../notificationService.js";
import {
  isPayoutBankComplete,
  PAYOUT_BANK_REQUIRED_PARTNER,
  payoutBankForApi,
} from "../../utils/partnerPayoutBank.js";

export async function resolveOwnedShop(ownerUserId, partnerKind) {
  if (partnerKind === "tailor") {
    return TailorShop.findOne({ ownerId: ownerUserId });
  }
  return FabricShop.findOne({ ownerId: ownerUserId });
}

export function shopIdentity(shop, partnerKind) {
  const partnerId = shop?._id ? String(shop._id) : "";
  const name = String(shop?.name || "").trim();
  const payoutBank = payoutBankForApi(shop?.payoutBank);
  const hasPayoutBank = isPayoutBankComplete(shop?.payoutBank);
  const partnerName =
    name || (partnerKind === "tailor" ? "Tailor shop" : "Fabric store");
  return {
    partnerKey: partnerId ? `${partnerKind}:${partnerId}` : `${partnerKind}:unknown`,
    partnerKind,
    partnerId,
    partnerName,
    payeeName: hasPayoutBank ? payoutBank.accountHolderName : partnerName,
    payoutBank,
    hasPayoutBank,
  };
}

export async function healStalePendingRequests({
  partnerId,
  partnerKind,
  availableFils,
  recipientUserId,
} = {}) {
  if (!shouldCloseStalePayoutRequest(availableFils)) return [];
  const pending = await PartnerPayoutRequest.find({
    partnerKind,
    status: "pending",
    $or: [
      { partnerId: String(partnerId) },
      { partnerKey: `${partnerKind}:${partnerId}` },
    ],
  });
  if (pending.length === 0) return [];

  const healed = [];
  for (const requestDoc of pending) {
    const laterRelease = await PartnerPayoutBatch.findOne({
      partnerKind,
      partnerId: String(partnerId),
      status: { $in: ["processing", "completed"] },
      releasedAt: { $gte: requestDoc.requestedAt || requestDoc.createdAt },
    })
      .sort({ releasedAt: -1 })
      .select("_id releasedAt amountFils")
      .lean();
    if (!laterRelease) continue;

    requestDoc.status = "approved";
    requestDoc.payoutId = laterRelease._id;
    requestDoc.reviewedAt = laterRelease.releasedAt || new Date();
    requestDoc.adminNote =
      requestDoc.adminNote || "Fulfilled by payment release";
    await requestDoc.save();
    healed.push(requestDoc);

    await ensurePartnerPayoutReleasedNotification({
      partnerKind,
      amount: filsToAed(laterRelease.amountFils),
      partnerKey: requestDoc.partnerKey,
      partnerId: requestDoc.partnerId,
      recipientUserId: requestDoc.requestedBy || recipientUserId,
      requestId: requestDoc._id,
      payoutId: laterRelease._id,
      approvedRequest: true,
    }).catch(() => null);
  }
  return healed;
}

export async function getPortalPayoutView(ownerUserId, partnerKind) {
  const shop = await resolveOwnedShop(ownerUserId, partnerKind);
  const identity = shopIdentity(shop, partnerKind);
  if (!shop) {
    return {
      shop: null,
      identity,
      settlement: null,
      pendingRequest: null,
      releases: [],
    };
  }

  const settlement = await getPartnerSettlement(identity.partnerId, partnerKind);
  await healStalePendingRequests({
    partnerId: identity.partnerId,
    partnerKind,
    availableFils: settlement.availableFils,
    recipientUserId: ownerUserId,
  });
  const pendingRequest = await findPendingPayoutRequest(
    identity.partnerId,
    partnerKind,
  );
  const listed = await listPayoutBatches({
    partnerId: identity.partnerId,
    partnerKind,
    limit: 50,
  });

  return {
    shop,
    identity,
    settlement,
    pendingRequest: pendingRequest
      ? {
          _id: pendingRequest._id,
          amount: pendingRequest.amount,
          status: pendingRequest.status,
          requestedAt: pendingRequest.requestedAt,
          orderCount: Array.isArray(pendingRequest.orders)
            ? pendingRequest.orders.length
            : 0,
        }
      : null,
    releases: listed.items.filter((row) =>
      ["processing", "completed"].includes(row.status),
    ),
  };
}

export async function createPartnerPayoutRequest({
  ownerUserId,
  partnerKind,
  note,
}) {
  const view = await getPortalPayoutView(ownerUserId, partnerKind);
  if (!view.shop) {
    throw new PartnerPayoutError(
      partnerKind === "tailor"
        ? "Create your tailor shop before requesting a payout."
        : "Create your fabric store before requesting a payout.",
      400,
      "SHOP_REQUIRED",
    );
  }
  if (!view.identity.hasPayoutBank) {
    throw new PartnerPayoutError(
      PAYOUT_BANK_REQUIRED_PARTNER,
      400,
      "MISSING_PAYOUT_BANK",
    );
  }
  if (view.pendingRequest) {
    const err = new PartnerPayoutError(
      "You already have a pending payout request. Please wait for MOTD to review it.",
      409,
      "REQUEST_PENDING",
    );
    err.pendingRequest = view.pendingRequest;
    throw err;
  }
  if (!view.settlement?.availableFils || view.settlement.availableOrders.length === 0) {
    throw new PartnerPayoutError(
      "No amount is ready to pay yet. Amounts become available after the order is delivered.",
      400,
      "NOTHING_AVAILABLE",
    );
  }

  const { identity, settlement } = view;
  return PartnerPayoutRequest.create({
    partnerKey: identity.partnerKey,
    partnerKind,
    partnerId: identity.partnerId,
    partnerName: identity.partnerName,
    payeeName: identity.payeeName,
    amount: settlement.availableAed,
    amountFils: settlement.availableFils,
    currency: "AED",
    orders: settlement.availableOrders.map((line) => ({
      orderId: line.orderId,
      orderType: line.orderType,
      amount: line.remainingAed,
    })),
    status: "pending",
    note: note || "",
    requestedBy: ownerUserId,
    requestedAt: new Date(),
  });
}

export async function deleteOwnPayoutRequest({
  requestId,
  ownerUserId,
  partnerKind,
}) {
  const requestDoc = await PartnerPayoutRequest.findById(requestId);
  if (!requestDoc) {
    throw new PartnerPayoutError("We could not find this request.", 404, "REQUEST_NOT_FOUND");
  }
  if (requestDoc.partnerKind !== partnerKind) {
    throw new PartnerPayoutError(
      "You are not allowed to delete this request.",
      403,
      "FORBIDDEN",
    );
  }
  const view = await getPortalPayoutView(ownerUserId, partnerKind);
  const isOwn =
    requestDoc.partnerId === view.identity.partnerId ||
    requestDoc.partnerKey === view.identity.partnerKey ||
    String(requestDoc.requestedBy) === String(ownerUserId);
  if (!isOwn) {
    throw new PartnerPayoutError(
      "You are not allowed to delete this request.",
      403,
      "FORBIDDEN",
    );
  }
  if (requestDoc.status === "pending") {
    throw new PartnerPayoutError(
      "Pending requests cannot be deleted. Please wait for MOTD to review them.",
      400,
      "REQUEST_PENDING",
    );
  }
  await requestDoc.deleteOne();
  return { id: String(requestId) };
}
