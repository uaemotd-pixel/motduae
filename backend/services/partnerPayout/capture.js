import PartnerEarning from "../../models/PartnerEarning.js";
import PartnerLedgerEntry from "../../models/PartnerLedgerEntry.js";
import PlatformSettings from "../../models/PlatformSettings.js";
import TailorShop from "../../models/TailorShop.js";
import FabricShop from "../../models/FabricShop.js";
import Fabric from "../../models/Fabric.js";
import { isDuplicateKeyError } from "../../utils/fils.js";
import {
  DEFAULT_FABRIC_COMMISSION_PERCENT,
  DEFAULT_TAILOR_COMMISSION_PERCENT,
} from "./constants.js";
import { asEntityId, buildEarningDraftsFromOrder } from "./split.js";

function resolvePercent(value, fallback) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : fallback;
}

export async function loadCommissionPercents() {
  const settings = await PlatformSettings.findOne({}).lean();
  return {
    tailor: resolvePercent(
      settings?.motdCommissionFromTailor,
      DEFAULT_TAILOR_COMMISSION_PERCENT,
    ),
    fabric: resolvePercent(
      settings?.motdCommissionFromFabricStore,
      DEFAULT_FABRIC_COMMISSION_PERCENT,
    ),
  };
}

function collectIds(order, orderType) {
  const tailorIds = [];
  const fabricRawIds = [];
  const fabricDocIds = [];

  const push = (arr, value) => {
    const id = asEntityId(value);
    if (id) arr.push(id);
  };

  if (orderType === "custom") {
    push(tailorIds, order?.tailorShopId);
    for (const item of order?.items || []) {
      push(tailorIds, item?.tailorShopId);
      push(fabricRawIds, item?.fabricStoreId);
      push(fabricDocIds, item?.fabricId);
    }
    push(fabricRawIds, order?.fabricStoreId);
    push(fabricDocIds, order?.fabricId);
    for (const addon of order?.addons || order?.addOns || []) {
      push(fabricRawIds, addon?.fabricShopId);
      push(fabricRawIds, addon?.fabricShop?._id);
    }
  } else {
    for (const item of order?.orderItems || []) {
      push(fabricRawIds, item?.fabricShopId);
    }
  }

  return {
    tailorIds: [...new Set(tailorIds)],
    fabricRawIds: [...new Set(fabricRawIds)],
    fabricDocIds: [...new Set(fabricDocIds)],
  };
}

export async function loadSplitCatalogs(order, orderType) {
  const { tailorIds, fabricRawIds, fabricDocIds } = collectIds(
    order,
    orderType,
  );

  const [tailorShops, fabrics] = await Promise.all([
    tailorIds.length
      ? TailorShop.find({ _id: { $in: tailorIds } })
          .select("name ownerId phone city location pickupAddress")
          .lean()
      : Promise.resolve([]),
    fabricDocIds.length
      ? Fabric.find({ _id: { $in: fabricDocIds } })
          .select("fabricShopId listedByStore")
          .lean()
      : Promise.resolve([]),
  ]);

  for (const fabric of fabrics) {
    const shopId = asEntityId(fabric.fabricShopId);
    const ownerId = asEntityId(fabric.listedByStore);
    if (shopId) fabricRawIds.push(shopId);
    if (ownerId) fabricRawIds.push(ownerId);
  }

  const uniqueFabricIds = [...new Set(fabricRawIds.filter(Boolean))];
  const fabricShops = uniqueFabricIds.length
    ? await FabricShop.find({
        $or: [
          { _id: { $in: uniqueFabricIds } },
          { ownerId: { $in: uniqueFabricIds } },
        ],
      })
        .select("name ownerId phone city location pickupAddress")
        .lean()
    : [];

  const tailorShopsById = new Map(
    tailorShops.map((shop) => [String(shop._id), shop]),
  );
  const shopsById = new Map(
    fabricShops.map((shop) => [String(shop._id), shop]),
  );
  const shopsByOwnerId = new Map(
    fabricShops.map((shop) => [String(shop.ownerId), shop]),
  );
  const fabricsById = new Map(
    fabrics.map((doc) => [String(doc._id), doc]),
  );

  return { tailorShopsById, shopsById, shopsByOwnerId, fabricsById };
}

async function upsertEarning(draft) {
  try {
    const created = await PartnerEarning.create(draft);
    return created.toObject();
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
    const existing = await PartnerEarning.findOne({
      idempotencyKey: draft.idempotencyKey,
    }).lean();
    if (!existing) throw err;
    return existing;
  }
}

async function upsertSaleLedger(earning) {
  const idempotencyKey = `ledger:sale:${earning._id}`;
  try {
    await PartnerLedgerEntry.create({
      partnerId: earning.partnerId,
      partnerKind: earning.partnerKind,
      amountFils: earning.netFils,
      type: "sale",
      earningId: earning._id,
      orderId: earning.orderId,
      idempotencyKey,
    });
  } catch (err) {
    if (!isDuplicateKeyError(err)) throw err;
  }
}

/**
 * Domain event: customer payment is confirmed. Provider-agnostic.
 * Idempotent via earning:{orderId}:{partnerId}:{component}.
 */
export async function onPaymentCaptured({
  order,
  orderType,
  provider = "",
  providerPaymentId = "",
} = {}) {
  if (!order?._id) return [];
  const type = orderType === "retail" ? "retail" : "custom";
  const [percents, catalogs] = await Promise.all([
    loadCommissionPercents(),
    loadSplitCatalogs(order, type),
  ]);

  const drafts = buildEarningDraftsFromOrder({
    order,
    orderType: type,
    percents,
    catalogs,
    provider: String(provider || ""),
    providerPaymentId: String(providerPaymentId || ""),
  });

  const earnings = [];
  for (const draft of drafts) {
    const earning = await upsertEarning(draft);
    await upsertSaleLedger(earning);
    earnings.push(earning);
  }
  return earnings;
}
