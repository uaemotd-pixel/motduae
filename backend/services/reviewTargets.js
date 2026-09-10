import mongoose from "mongoose";
import Customer from "../models/customer.js";
import Fabric from "../models/Fabric.js";
import FabricShop from "../models/FabricShop.js";
import AddOn from "../models/AddOn.js";
import Design from "../models/Design.js";

function idStr(value) {
  if (!value) return "";
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (typeof value.toString === "function" && mongoose.Types.ObjectId.isValid(value)) {
      return String(value);
    }
  }
  return String(value);
}

function asObject(value) {
  if (!value || typeof value !== "object") return null;
  if (value._id) return value;
  return null;
}

export function reviewedProductIdSet(reviews) {
  return new Set(
    (reviews || [])
      .filter((rev) => rev.productId)
      .map((rev) => String(rev.productId)),
  );
}

/**
 * Flatten a custom order into catalog review targets:
 * design(s), storefront fabric, each add-on.
 */
export function explodeCustomOrder(order, reviewedProductIds = new Set()) {
  if (!order) return [];

  const targets = [];
  const seen = new Set();
  const orderId = idStr(order._id);

  const push = (target) => {
    if (!target.productId || seen.has(target.productId)) return;
    if (reviewedProductIds.has(target.productId)) return;
    seen.add(target.productId);
    targets.push({
      ...target,
      orderId,
      orderType: "custom",
    });
  };

  const items =
    Array.isArray(order.items) && order.items.length
      ? order.items
      : [
          {
            designId: order.designId,
            designSnapshot: order.designSnapshot,
            tailorShopId: order.tailorShopId,
            fabricId: order.fabricId,
            fabricStoreId: order.fabricStoreId,
            fabricSnapshot: order.fabricSnapshot,
          },
        ];

  for (const item of items) {
    const populatedDesign = asObject(item.designId);
    const designId = populatedDesign?._id || item.designId || order.designId;
    if (designId) {
      const snap = item.designSnapshot || order.designSnapshot || {};
      push({
        productId: idStr(designId),
        kind: "design",
        name: String(snap.name || populatedDesign?.name || "").trim() || "Design",
        nameAr:
          String(snap.nameAr || populatedDesign?.nameAr || snap.name || "").trim() ||
          "تصميم",
        slug: String(snap.slug || populatedDesign?.slug || "").trim(),
        image: populatedDesign?.images?.[0] || "",
        tailorShopId:
          idStr(item.tailorShopId || order.tailorShopId || populatedDesign?.tailorShopId) ||
          null,
        fabricShopId: null,
      });
    }

    if (order.fabricSource === "storefront") {
      const populatedFabric = asObject(item.fabricId);
      const fabricId = populatedFabric?._id || item.fabricId || order.fabricId;
      if (fabricId) {
        const snap = item.fabricSnapshot || order.fabricSnapshot || {};
        push({
          productId: idStr(fabricId),
          kind: "fabric",
          name: String(snap.name || populatedFabric?.name || "").trim() || "Fabric",
          nameAr:
            String(
              snap.nameAr || populatedFabric?.nameAr || snap.name || "",
            ).trim() || "قماش",
          slug: String(snap.slug || populatedFabric?.slug || "").trim(),
          image: populatedFabric?.images?.[0] || "",
          tailorShopId: null,
          fabricShopId: idStr(populatedFabric?.fabricShopId) || null,
          fabricStoreId: item.fabricStoreId || order.fabricStoreId || null,
        });
      }
    }
  }

  for (const addon of order.addons || []) {
    const addonId = addon.addonId?._id || addon.addonId;
    if (!addonId) continue;
    push({
      productId: idStr(addonId),
      kind: "addon",
      name: String(addon.name || "").trim() || "Add-on",
      nameAr: String(addon.nameAr || addon.name || "").trim() || "إضافة",
      slug: String(addon.slug || "").trim(),
      image: addon.thumbnailImage || addon.images?.[0] || "",
      tailorShopId: null,
      fabricShopId: idStr(addon.fabricShopId) || null,
    });
  }

  return targets;
}

export function findTargetInCustomOrder(order, productId) {
  const pid = String(productId);
  return explodeCustomOrder(order, new Set()).find((t) => t.productId === pid) || null;
}

export async function resolveFabricShopId({
  fabricId,
  fabricStoreId,
  existing = null,
} = {}) {
  if (existing && mongoose.Types.ObjectId.isValid(String(existing))) {
    return String(existing);
  }

  if (fabricId && mongoose.Types.ObjectId.isValid(String(fabricId))) {
    const fabric = await Fabric.findById(fabricId)
      .select("fabricShopId listedByStore")
      .lean();
    if (fabric?.fabricShopId) return String(fabric.fabricShopId);
    const ownerId = fabric?.listedByStore || fabricStoreId;
    if (ownerId) {
      const shop = await FabricShop.findOne({ ownerId }).select("_id").lean();
      if (shop) return String(shop._id);
    }
  }

  if (fabricStoreId && mongoose.Types.ObjectId.isValid(String(fabricStoreId))) {
    const shop = await FabricShop.findOne({ ownerId: fabricStoreId })
      .select("_id")
      .lean();
    if (shop) return String(shop._id);
  }

  return null;
}

export async function enrichReviewTarget(target) {
  if (!target) return target;
  const next = { ...target };

  if (next.kind === "fabric") {
    next.fabricShopId = await resolveFabricShopId({
      fabricId: next.productId,
      fabricStoreId: next.fabricStoreId,
      existing: next.fabricShopId,
    });
    if (!next.image || !next.slug) {
      const fabric = await Fabric.findById(next.productId)
        .select("images slug name nameAr")
        .lean();
      if (fabric) {
        next.image = next.image || fabric.images?.[0] || "";
        next.slug = next.slug || fabric.slug || "";
        next.name = next.name || fabric.name || "";
        next.nameAr = next.nameAr || fabric.nameAr || fabric.name || "";
      }
    }
  }

  if (next.kind === "addon") {
    if (!next.slug || !next.image || !next.fabricShopId) {
      const addon = await AddOn.findById(next.productId)
        .select("slug thumbnailImage images fabricShopId name nameAr")
        .lean();
      if (addon) {
        next.slug = next.slug || addon.slug || "";
        next.image =
          next.image || addon.thumbnailImage || addon.images?.[0] || "";
        next.fabricShopId =
          next.fabricShopId ||
          (addon.fabricShopId ? String(addon.fabricShopId) : null);
        next.name = next.name || addon.name || "";
        next.nameAr = next.nameAr || addon.nameAr || addon.name || "";
      }
    }
  }

  if (next.kind === "design") {
    if (!next.image || !next.slug || !next.tailorShopId) {
      const design = await Design.findById(next.productId)
        .select("images slug tailorShopId name nameAr")
        .lean();
      if (design) {
        next.image = next.image || design.images?.[0] || "";
        next.slug = next.slug || design.slug || "";
        next.tailorShopId =
          next.tailorShopId ||
          (design.tailorShopId ? String(design.tailorShopId) : null);
        next.name = next.name || design.name || "";
        next.nameAr = next.nameAr || design.nameAr || design.name || "";
      }
    }
  }

  delete next.fabricStoreId;
  return next;
}

export async function findOrCreateCustomer(user) {
  const userId = user._id;
  let customer = await Customer.findOne({ userId });
  if (customer) return customer;

  customer = await Customer.create({
    userId,
    name: String(user.name || user.email || "Customer").trim() || "Customer",
  });
  return customer;
}

export function isReviewCustomerRole(user) {
  const role = String(user?.role || "").toLowerCase();
  return !role || role === "customer";
}

export function toObjectIdOrNull(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(String(value))) return null;
  return new mongoose.Types.ObjectId(String(value));
}
