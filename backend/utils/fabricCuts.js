import mongoose from "mongoose";
import Cut from "../models/Cut.js";
import { cutValueToMeters } from "./fabricUnits.js";

export function normalizeFabricCutsPayload(cutsInput) {
  if (!Array.isArray(cutsInput)) {
    return { ok: false, message: "cuts must be an array" };
  }

  if (cutsInput.length === 0) {
    return { ok: false, message: "At least one cut with price and stock is required" };
  }

  const normalized = [];
  const seenCutIds = new Set();

  for (const entry of cutsInput) {
    const cutId = entry?.cutId;
    if (!cutId || !mongoose.Types.ObjectId.isValid(cutId)) {
      return { ok: false, message: "Each cut entry must include a valid cutId" };
    }

    const cutIdStr = String(cutId);
    if (seenCutIds.has(cutIdStr)) {
      return { ok: false, message: "Duplicate cut entries are not allowed" };
    }
    seenCutIds.add(cutIdStr);

    const price = Number(entry.price);
    if (!Number.isFinite(price) || price <= 0) {
      return {
        ok: false,
        message: "Each cut must have a price greater than 0",
      };
    }

    const stock = Number(entry.stock ?? 0);
    if (!Number.isFinite(stock) || stock < 0) {
      return { ok: false, message: "Each cut stock must be 0 or greater" };
    }

    normalized.push({
      cutId: new mongoose.Types.ObjectId(cutIdStr),
      price: Number(price.toFixed(2)),
      stock: Math.floor(stock),
    });
  }

  return { ok: true, cuts: normalized };
}

export async function assertActiveCutsExist(cuts) {
  const cutIds = cuts.map((c) => c.cutId);
  const activeCuts = await Cut.find({
    _id: { $in: cutIds },
    isActive: true,
  }).select("_id");

  if (activeCuts.length !== cutIds.length) {
    return {
      ok: false,
      message: "One or more cuts are invalid or inactive",
    };
  }

  return { ok: true };
}

export async function loadCutsMap(cutIds = []) {
  const objectIds = cutIds
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (objectIds.length === 0) return new Map();

  const docs = await Cut.find({ _id: { $in: objectIds } }).lean();
  return new Map(docs.map((doc) => [String(doc._id), doc]));
}

export function computeFabricLegacyMetrics(cuts = [], cutsMap = new Map()) {
  let minPricePerMeter = null;
  let totalStockMeters = 0;

  for (const entry of cuts) {
    const cutId = String(entry.cutId?._id || entry.cutId || "");
    const cutDoc =
      entry.cut && typeof entry.cut === "object"
        ? entry.cut
        : cutsMap.get(cutId) || entry.cutId;
    if (!cutDoc || typeof cutDoc !== "object") continue;

    const meters = cutValueToMeters(cutDoc.value, cutDoc.unit);
    const stock = Number(entry.stock) || 0;
    const price = Number(entry.price) || 0;

    totalStockMeters += stock * meters;

    if (meters > 0 && price > 0) {
      const pricePerMeter = price / meters;
      if (minPricePerMeter === null || pricePerMeter < minPricePerMeter) {
        minPricePerMeter = pricePerMeter;
      }
    }
  }

  return {
    pricePerMeter:
      minPricePerMeter !== null ? Number(minPricePerMeter.toFixed(2)) : 0,
    stockInMeters: Number(totalStockMeters.toFixed(2)),
  };
}

export async function prepareFabricCutsInput(cutsInput) {
  const normalized = normalizeFabricCutsPayload(cutsInput);
  if (!normalized.ok) {
    return normalized;
  }

  const activeCheck = await assertActiveCutsExist(normalized.cuts);
  if (!activeCheck.ok) {
    return activeCheck;
  }

  return { ok: true, cuts: normalized.cuts };
}

export async function enrichFabricWithCuts(fabric) {
  const obj = fabric?.toObject ? fabric.toObject() : { ...fabric };
  const cutIds = (obj.cuts || []).map((c) => c.cutId);
  const cutsMap = await loadCutsMap(cutIds);

  obj.cuts = (obj.cuts || []).map((entry) => {
    const cutId = String(entry.cutId?._id || entry.cutId || "");
    const cutDoc = cutsMap.get(cutId);
    return {
      cutId,
      price: entry.price,
      stock: entry.stock,
      cut: cutDoc
        ? {
            _id: String(cutDoc._id),
            name: cutDoc.name,
            nameAr: cutDoc.nameAr || "",
            value: cutDoc.value,
            unit: cutDoc.unit,
            lengthInMeters: cutValueToMeters(cutDoc.value, cutDoc.unit),
          }
        : null,
    };
  });

  const legacy = computeFabricLegacyMetrics(obj.cuts, cutsMap);
  obj.pricePerMeter = legacy.pricePerMeter;
  obj.stockInMeters = legacy.stockInMeters;

  return obj;
}
