import mongoose from "mongoose";
import { filsToAed } from "../../utils/fils.js";
import PartnerEarning from "../../models/PartnerEarning.js";
import PartnerPayoutBatch from "../../models/PartnerPayoutBatch.js";
import PartnerPayoutLine from "../../models/PartnerPayoutLine.js";
import PartnerPayoutRequest from "../../models/PartnerPayoutRequest.js";
import TailorShop from "../../models/TailorShop.js";
import FabricShop from "../../models/FabricShop.js";
import User from "../../models/User.js";
import CustomOrder from "../../models/CustomOrder.js";
import RetailOrder from "../../models/RetailOrder.js";
import {
  PAYOUT_STATUSES,
  SHIPPING_PARTNER_ID,
  SHIPPING_PARTNER_NAME,
} from "./constants.js";
import { healDeliveredEarnings, loadExcludedOrderIdSet } from "./available.js";
import { previewFifo } from "./split.js";
import {
  emptyPayoutBank,
  isPayoutBankComplete,
  payoutBankForApi,
} from "../../utils/partnerPayoutBank.js";

export function serializeFils(fils) {
  const n = Number(fils) || 0;
  return { fils: n, aed: filsToAed(n) };
}

function uniqueNonEmpty(values) {
  const seen = new Set();
  const out = [];
  for (const value of values) {
    const next = String(value || "").trim();
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(next);
  }
  return out;
}

function joinLabeled(label, names) {
  const list = uniqueNonEmpty(names);
  if (!list.length) return "";
  if (list.length === 1) return `${label}: ${list[0]}`;
  return `${label}: ${list.join(", ")}`;
}

function customOrderLabels(order) {
  const designNames = [
    order?.designSnapshot?.name,
    ...(Array.isArray(order?.items)
      ? order.items.map((item) => item?.designSnapshot?.name)
      : []),
  ];
  const fabricNames = [
    order?.fabricSnapshot?.name,
    ...(Array.isArray(order?.items)
      ? order.items.map((item) => item?.fabricSnapshot?.name)
      : []),
  ];
  return {
    designName: joinLabeled("Design", designNames),
    fabricName: joinLabeled("Fabric", fabricNames),
    productName: joinLabeled("Design", designNames) || joinLabeled("Fabric", fabricNames),
  };
}

function retailOrderLabels(order, partnerId, partnerKind) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const forPartner =
    partnerKind === "fabric" && partnerId
      ? items.filter(
          (item) =>
            item?.fabricShopId &&
            String(item.fabricShopId) === String(partnerId),
        )
      : items;
  const scoped = forPartner.length ? forPartner : items;
  const names = scoped.map((item) => item?.name);
  const productName = uniqueNonEmpty(names).join(", ");
  return {
    designName: "",
    fabricName: productName ? `Product: ${productName}` : "",
    productName: productName
      ? partnerKind === "fabric"
        ? `Product: ${productName}`
        : productName
      : "",
  };
}

function productNameForEarning(earning, labels) {
  if (!labels) return "";
  if (earning.partnerKind === "tailor") {
    return labels.designName || labels.productName || "";
  }
  if (earning.partnerKind === "fabric") {
    return labels.fabricName || labels.productName || "";
  }
  return labels.productName || labels.designName || labels.fabricName || "";
}

/**
 * Batch-load design/product labels for settlement order lines.
 * Keyed by orderId string.
 */
async function loadOrderProductLabels(earnings) {
  const customIds = [];
  const retailIds = [];
  for (const earning of earnings || []) {
    const id = earning?.orderId;
    if (!id) continue;
    if (earning.orderType === "custom") customIds.push(id);
    else if (earning.orderType === "retail") retailIds.push(id);
  }

  const uniqueCustom = [...new Set(customIds.map(String))];
  const uniqueRetail = [...new Set(retailIds.map(String))];

  const [customs, retails] = await Promise.all([
    uniqueCustom.length
      ? CustomOrder.find({
          _id: {
            $in: uniqueCustom.filter((id) => mongoose.isValidObjectId(id)),
          },
        })
          .select(
            "designSnapshot.name fabricSnapshot.name items.designSnapshot.name items.fabricSnapshot.name",
          )
          .lean()
      : Promise.resolve([]),
    uniqueRetail.length
      ? RetailOrder.find({
          _id: {
            $in: uniqueRetail.filter((id) => mongoose.isValidObjectId(id)),
          },
        })
          .select("items.name items.fabricShopId")
          .lean()
      : Promise.resolve([]),
  ]);

  const customById = new Map(
    customs.map((order) => [String(order._id), customOrderLabels(order)]),
  );
  const retailById = new Map(retails.map((order) => [String(order._id), order]));

  return { customById, retailById };
}

function resolveProductName(earning, orderLabels) {
  const id = String(earning.orderId);
  if (earning.orderType === "custom") {
    return productNameForEarning(earning, orderLabels.customById.get(id));
  }
  if (earning.orderType === "retail") {
    const order = orderLabels.retailById.get(id);
    if (!order) return "";
    return productNameForEarning(
      earning,
      retailOrderLabels(order, earning.partnerId, earning.partnerKind),
    );
  }
  return "";
}

function serializeEarningLine(earning, productName = "") {
  const remaining = serializeFils(earning.remainingFils);
  const net = serializeFils(earning.netFils);
  const gross = serializeFils(earning.grossFils);
  const commission = serializeFils(earning.commissionFils);
  return {
    earningId: String(earning._id),
    orderId: String(earning.orderId),
    orderType: earning.orderType,
    productName: productName || "",
    remainingFils: remaining.fils,
    remainingAed: remaining.aed,
    amount: remaining.aed,
    netFils: net.fils,
    netAed: net.aed,
    grossFils: gross.fils,
    grossAed: gross.aed,
    commissionFils: commission.fils,
    commissionAed: commission.aed,
    commissionPercent: Number(earning.commissionPercent) || 0,
    availableAt: earning.availableAt || null,
    status: earning.status,
  };
}

async function loadShopProfiles(partners) {
  const tailorIds = partners
    .filter((p) => p.partnerKind === "tailor")
    .map((p) => p.partnerId);
  const fabricIds = partners
    .filter((p) => p.partnerKind === "fabric")
    .map((p) => p.partnerId);

  const [tailors, fabrics] = await Promise.all([
    tailorIds.length
      ? TailorShop.find({ _id: { $in: tailorIds } })
          .select("name phone city location pickupAddress ownerId payoutBank")
          .populate("ownerId", "name email phone")
          .lean()
      : Promise.resolve([]),
    fabricIds.length
      ? FabricShop.find({ _id: { $in: fabricIds } })
          .select("name phone city location pickupAddress ownerId payoutBank")
          .populate("ownerId", "name email phone")
          .lean()
      : Promise.resolve([]),
  ]);

  const map = new Map();
  const attach = (shop, kind) => {
    const owner =
      shop?.ownerId && typeof shop.ownerId === "object" ? shop.ownerId : null;
    const payoutBank = payoutBankForApi(shop.payoutBank);
    const hasPayoutBank = isPayoutBankComplete(shop.payoutBank);
    map.set(`${kind}:${shop._id}`, {
      partnerName: shop.name || "",
      payeeName: hasPayoutBank
        ? payoutBank.accountHolderName
        : shop.name || "",
      contact: shop.phone || owner?.phone || "",
      email: owner?.email || "",
      city: shop.city || "",
      location: shop.location || "",
      pickup: shop.pickupAddress?.line1
        ? [shop.pickupAddress.line1, shop.pickupAddress.city]
            .filter(Boolean)
            .join(", ")
        : "",
      ownerUserId: owner?._id ? String(owner._id) : shop.ownerId || null,
      payoutBank,
      hasPayoutBank,
    });
  };
  for (const shop of tailors) attach(shop, "tailor");
  for (const shop of fabrics) attach(shop, "fabric");
  return map;
}

function emptySettlement(partnerId, partnerKind, partnerName = "") {
  return {
    partnerId: String(partnerId),
    partnerKind,
    partnerName: partnerName || (partnerKind === "shipping" ? SHIPPING_PARTNER_NAME : ""),
    payeeName: partnerName || "",
    availableFils: 0,
    availableAed: 0,
    pendingFils: 0,
    pendingAed: 0,
    processingFils: 0,
    processingAed: 0,
    paidFils: 0,
    paidAed: 0,
    availableOrders: [],
    pendingOrders: [],
    contact: "",
    email: "",
    city: "",
    location: "",
    pickup: "",
    payoutBank: emptyPayoutBank(),
    hasPayoutBank: partnerKind === "shipping",
  };
}

function applyProfile(row, profiles) {
  if (row.partnerKind === "shipping") {
    row.partnerName = row.partnerName || SHIPPING_PARTNER_NAME;
    row.payeeName = row.payeeName || SHIPPING_PARTNER_NAME;
    row.hasPayoutBank = true;
    row.payoutBank = row.payoutBank || emptyPayoutBank();
    return row;
  }
  const profile = profiles.get(`${row.partnerKind}:${row.partnerId}`);
  if (!profile) {
    row.hasPayoutBank = Boolean(row.hasPayoutBank);
    row.payoutBank = row.payoutBank || emptyPayoutBank();
    return row;
  }
  return {
    ...row,
    partnerName: row.partnerName || profile.partnerName,
    payeeName: profile.payeeName || row.payeeName,
    contact: profile.contact,
    email: profile.email,
    city: profile.city,
    location: profile.location,
    pickup: profile.pickup,
    payoutBank: profile.payoutBank,
    hasPayoutBank: profile.hasPayoutBank,
  };
}

export async function attachPayoutBankToItems(items) {
  if (!Array.isArray(items) || items.length === 0) return items || [];
  const profiles = await loadShopProfiles(items);
  return items.map((item) => {
    const next = applyProfile(
      {
        ...item,
        partnerId: String(item.partnerId || ""),
        partnerKind: item.partnerKind,
        partnerName: item.partnerName || "",
        payeeName: item.payeeName || "",
      },
      profiles,
    );
    return {
      ...item,
      payeeName: next.payeeName || item.payeeName,
      payoutBank: next.payoutBank,
      hasPayoutBank: Boolean(next.hasPayoutBank),
    };
  });
}

async function processingAndPaidFils(partnerId, partnerKind) {
  const batches = await PartnerPayoutBatch.find({
    partnerId: String(partnerId),
    partnerKind,
    status: { $in: ["processing", "completed"] },
  })
    .select("status amountFils")
    .lean();
  let processingFils = 0;
  let paidFils = 0;
  for (const batch of batches) {
    if (batch.status === "processing") processingFils += batch.amountFils || 0;
    if (batch.status === "completed") paidFils += batch.amountFils || 0;
  }
  return { processingFils, paidFils };
}

export async function getPartnerSettlement(partnerId, partnerKind) {
  const id = String(partnerId || "").trim();
  const kind = String(partnerKind || "").trim();
  if (!id || !kind) {
    return emptySettlement(id, kind);
  }

  await healDeliveredEarnings({ partnerId: id, partnerKind: kind });

  const earnings = await PartnerEarning.find({
    partnerId: id,
    partnerKind: kind,
    status: { $in: ["pending", "available"] },
  })
    .sort({ availableAt: 1, createdAt: 1 })
    .lean();

  const excluded = await loadExcludedOrderIdSet(earnings);
  const orderLabels = await loadOrderProductLabels(earnings);
  const availableOrders = [];
  const pendingOrders = [];
  let availableFils = 0;
  let pendingFils = 0;

  for (const earning of earnings) {
    if (excluded.has(String(earning.orderId))) continue;
    const line = serializeEarningLine(
      earning,
      resolveProductName(earning, orderLabels),
    );
    if (earning.status === "available" && (earning.remainingFils || 0) > 0) {
      availableFils += earning.remainingFils;
      availableOrders.push(line);
    } else if (earning.status === "pending") {
      pendingFils += earning.remainingFils || earning.netFils || 0;
      pendingOrders.push(line);
    }
  }

  const { processingFils, paidFils } = await processingAndPaidFils(id, kind);
  const name =
    availableOrders[0]?.partnerName ||
    pendingOrders[0]?.partnerName ||
    earnings[0]?.partnerName ||
    "";

  const row = {
    ...emptySettlement(id, kind, name),
    availableFils,
    availableAed: filsToAed(availableFils),
    pendingFils,
    pendingAed: filsToAed(pendingFils),
    processingFils,
    processingAed: filsToAed(processingFils),
    paidFils,
    paidAed: filsToAed(paidFils),
    availableOrders,
    pendingOrders,
    partnerName: earnings[0]?.partnerName || name,
    payeeName: earnings[0]?.partnerName || name,
  };

  const profiles = await loadShopProfiles([row]);
  return applyProfile(row, profiles);
}

export async function listAllPartnerSettlements() {
  await healDeliveredEarnings();

  const earnings = await PartnerEarning.find({
    status: { $in: ["pending", "available"] },
  })
    .sort({ availableAt: 1, createdAt: 1 })
    .lean();

  const excluded = await loadExcludedOrderIdSet(earnings);
  const orderLabels = await loadOrderProductLabels(earnings);
  const byKey = new Map();

  const ensure = (earning) => {
    const key = `${earning.partnerKind}:${earning.partnerId}`;
    if (!byKey.has(key)) {
      byKey.set(
        key,
        emptySettlement(
          earning.partnerId,
          earning.partnerKind,
          earning.partnerName,
        ),
      );
    }
    return byKey.get(key);
  };

  for (const earning of earnings) {
    if (excluded.has(String(earning.orderId))) continue;
    const row = ensure(earning);
    row.partnerName = row.partnerName || earning.partnerName;
    row.payeeName = row.payeeName || earning.partnerName;
    const line = serializeEarningLine(
      earning,
      resolveProductName(earning, orderLabels),
    );
    if (earning.status === "available" && (earning.remainingFils || 0) > 0) {
      row.availableFils += earning.remainingFils;
      row.availableOrders.push(line);
    } else if (earning.status === "pending") {
      row.pendingFils += earning.remainingFils || earning.netFils || 0;
      row.pendingOrders.push(line);
    }
  }

  const processing = await PartnerPayoutBatch.find({
    status: { $in: ["processing", "completed"] },
  })
    .select("partnerId partnerKind status amountFils")
    .lean();

  for (const batch of processing) {
    const key = `${batch.partnerKind}:${batch.partnerId}`;
    if (!byKey.has(key)) {
      byKey.set(
        key,
        emptySettlement(batch.partnerId, batch.partnerKind, batch.partnerName),
      );
    }
    const row = byKey.get(key);
    if (batch.status === "processing") {
      row.processingFils += batch.amountFils || 0;
    }
    if (batch.status === "completed") {
      row.paidFils += batch.amountFils || 0;
    }
  }

  const partners = [...byKey.values()].map((row) => ({
    ...row,
    availableAed: filsToAed(row.availableFils),
    pendingAed: filsToAed(row.pendingFils),
    processingAed: filsToAed(row.processingFils),
    paidAed: filsToAed(row.paidFils),
  }));

  const profiles = await loadShopProfiles(partners);
  const withProfiles = partners.map((row) => applyProfile(row, profiles));

  withProfiles.sort(
    (a, b) =>
      b.availableFils - a.availableFils ||
      b.pendingFils - a.pendingFils ||
      a.partnerName.localeCompare(b.partnerName),
  );

  return {
    partners: withProfiles,
    totals: {
      availableFils: withProfiles.reduce((s, p) => s + p.availableFils, 0),
      pendingFils: withProfiles.reduce((s, p) => s + p.pendingFils, 0),
      processingFils: withProfiles.reduce((s, p) => s + p.processingFils, 0),
      paidFils: withProfiles.reduce((s, p) => s + p.paidFils, 0),
    },
  };
}

export function previewPartnerFifo(settlement, budgetFils) {
  const earnings = (settlement.availableOrders || []).map((line) => ({
    _id: line.earningId,
    orderId: line.orderId,
    orderType: line.orderType,
    partnerId: settlement.partnerId,
    remainingFils: line.remainingFils,
    commissionPercent: line.commissionPercent,
    grossFils: line.grossFils,
    commissionFils: line.commissionFils,
    availableAt: line.availableAt,
  }));
  const amount =
    budgetFils == null ? settlement.availableFils : Number(budgetFils);
  return previewFifo(earnings, amount);
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parsePayoutStatuses(status) {
  if (status == null || status === "") return null;
  const list = String(status)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => PAYOUT_STATUSES.includes(part));
  if (list.length === 0) return null;
  if (list.length === 1) return list[0];
  return { $in: list };
}

async function payoutIdsMatchingOrderQuery(q) {
  const term = String(q || "").trim();
  if (term.length < 2) return [];

  const ids = new Set();
  if (/^[a-fA-F0-9]{24}$/.test(term)) {
    const exact = await PartnerPayoutLine.find({ orderId: term })
      .select("payoutId")
      .lean();
    for (const row of exact) ids.add(String(row.payoutId));
  }

  const escaped = escapeRegex(term);
  const matched = await PartnerPayoutLine.aggregate([
    {
      $match: {
        $expr: {
          $regexMatch: {
            input: { $toString: "$orderId" },
            regex: escaped,
            options: "i",
          },
        },
      },
    },
    { $group: { _id: "$payoutId" } },
  ]);
  for (const row of matched) {
    if (row?._id) ids.add(String(row._id));
  }
  return [...ids];
}

async function hydratePayoutBatches(items) {
  const ids = items.map((item) => item._id);
  const lines = ids.length
    ? await PartnerPayoutLine.find({ payoutId: { $in: ids } }).lean()
    : [];
  const linesByPayout = new Map();
  for (const line of lines) {
    const key = String(line.payoutId);
    if (!linesByPayout.has(key)) linesByPayout.set(key, []);
    linesByPayout.get(key).push({
      earningId: String(line.earningId),
      orderId: String(line.orderId),
      orderType: line.orderType,
      amountFils: line.amountFils,
      amountAed: filsToAed(line.amountFils),
      amount: filsToAed(line.amountFils),
      commissionPercent: line.commissionPercent,
      grossFils: line.grossFils,
      commissionFils: line.commissionFils,
    });
  }

  return items.map((item) => {
    const payoutLines = linesByPayout.get(String(item._id)) || [];
    return {
      ...item,
      amountFils: item.amountFils,
      amountAed: filsToAed(item.amountFils),
      amount: filsToAed(item.amountFils),
      lines: payoutLines,
      orders: payoutLines.map((line) => ({
        orderId: line.orderId,
        orderType: line.orderType,
        amount: line.amountAed,
        amountFils: line.amountFils,
        commissionPercent: line.commissionPercent,
      })),
    };
  });
}

export async function listPayoutBatches({
  partnerId,
  partnerKind,
  status,
  q,
  page,
  limit,
} = {}) {
  const filter = {};
  if (partnerId) filter.partnerId = String(partnerId);
  if (partnerKind) filter.partnerKind = partnerKind;
  const statusFilter = parsePayoutStatuses(status);
  if (statusFilter) filter.status = statusFilter;

  const term = String(q || "").trim();
  if (term.length >= 2) {
    const regex = new RegExp(escapeRegex(term), "i");
    const orderPayoutIds = await payoutIdsMatchingOrderQuery(term);
    filter.$or = [
      { partnerName: regex },
      { payeeName: regex },
      { bankRef: regex },
      ...(orderPayoutIds.length
        ? [
            {
              _id: {
                $in: orderPayoutIds
                  .filter((id) => mongoose.Types.ObjectId.isValid(id))
                  .map((id) => new mongoose.Types.ObjectId(id)),
              },
            },
          ]
        : []),
    ];
  }

  const paginated = page != null && page !== "";
  const pageNum = Math.max(1, Math.trunc(Number(page) || 1));
  const maxLimit = paginated ? 100 : 500;
  const defaultLimit = paginated ? 25 : 200;
  const limitNum = Math.min(
    Math.max(Number(limit) || defaultLimit, 1),
    maxLimit,
  );
  const skip = paginated ? (pageNum - 1) * limitNum : 0;

  const [total, items] = await Promise.all([
    PartnerPayoutBatch.countDocuments(filter),
    PartnerPayoutBatch.find(filter)
      .populate("releasedBy", "name email")
      .sort({ releasedAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
  ]);

  return {
    items: await hydratePayoutBatches(items),
    total,
    page: paginated ? pageNum : 1,
    limit: limitNum,
  };
}

export async function listProcessingPayouts() {
  const result = await listPayoutBatches({ status: "processing", limit: 200 });
  return result.items;
}

export async function getCompletedPayoutTotals(partnerId, partnerKind) {
  const batches = await PartnerPayoutBatch.find({
    partnerId: String(partnerId),
    partnerKind,
    status: { $in: ["processing", "completed"] },
  })
    .select("_id amountFils status releasedAt note currency")
    .sort({ releasedAt: -1 })
    .lean();

  const ids = batches.map((batch) => batch._id);
  const lines = ids.length
    ? await PartnerPayoutLine.find({ payoutId: { $in: ids } }).lean()
    : [];

  const linesByPayout = new Map();
  const paidByOrderId = new Map();
  let paidTotalFils = 0;

  for (const line of lines) {
    const payoutKey = String(line.payoutId);
    if (!linesByPayout.has(payoutKey)) linesByPayout.set(payoutKey, []);
    linesByPayout.get(payoutKey).push(line);
    const orderId = String(line.orderId || "");
    if (!orderId) continue;
    paidByOrderId.set(
      orderId,
      (paidByOrderId.get(orderId) || 0) + (Number(line.amountFils) || 0),
    );
  }

  for (const batch of batches) {
    if (batch.status === "completed") {
      paidTotalFils += Number(batch.amountFils) || 0;
    }
  }

  const releases = batches.map((batch) => {
    const payoutLines = linesByPayout.get(String(batch._id)) || [];
    return {
      _id: batch._id,
      amount: filsToAed(batch.amountFils),
      currency: batch.currency || "AED",
      orderCount: payoutLines.length,
      orders: payoutLines.map((line) => ({
        orderId: String(line.orderId),
        orderType: line.orderType,
        amount: filsToAed(line.amountFils),
      })),
      releasedAt: batch.releasedAt,
      note: batch.note || "",
      status: batch.status,
    };
  });

  const paidByOrderAed = new Map();
  for (const [orderId, fils] of paidByOrderId) {
    paidByOrderAed.set(orderId, filsToAed(fils));
  }

  return {
    paidTotal: filsToAed(paidTotalFils),
    paidByOrderId: paidByOrderAed,
    releases,
  };
}

export async function findPendingPayoutRequest(partnerId, partnerKind) {
  return PartnerPayoutRequest.findOne({
    partnerKind,
    status: "pending",
    $or: [
      { partnerId: String(partnerId) },
      { partnerKey: `${partnerKind}:${partnerId}` },
    ],
  })
    .sort({ requestedAt: -1 })
    .lean();
}

export async function getPayoutById(payoutId) {
  const found = await PartnerPayoutBatch.findById(payoutId)
    .populate("releasedBy", "name email")
    .lean();
  if (!found) return null;
  const lines = await PartnerPayoutLine.find({ payoutId: found._id }).lean();
  const payoutLines = lines.map((line) => ({
    earningId: String(line.earningId),
    orderId: String(line.orderId),
    orderType: line.orderType,
    amountFils: line.amountFils,
    amountAed: filsToAed(line.amountFils),
    amount: filsToAed(line.amountFils),
    commissionPercent: line.commissionPercent,
    grossFils: line.grossFils,
    commissionFils: line.commissionFils,
  }));
  return {
    ...found,
    amountFils: found.amountFils,
    amountAed: filsToAed(found.amountFils),
    amount: filsToAed(found.amountFils),
    lines: payoutLines,
    orders: payoutLines.map((line) => ({
      orderId: line.orderId,
      orderType: line.orderType,
      amount: line.amountAed,
      amountFils: line.amountFils,
      commissionPercent: line.commissionPercent,
    })),
  };
}
