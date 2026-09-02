import mongoose from "mongoose";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";
import FabricShop from "../models/FabricShop.js";

function idStr(value) {
  if (value == null || value === "") return "";
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (typeof value.toString === "function" && value.toString !== Object.prototype.toString) {
      const asString = String(value);
      if (asString && asString !== "[object Object]") return asString;
    }
  }
  return String(value);
}

function isValidId(value) {
  const id = idStr(value);
  return Boolean(id) && mongoose.Types.ObjectId.isValid(id);
}

function inferKind(item, matchedKind) {
  if (item?.kind) return item.kind;
  if (matchedKind) return matchedKind;
  if (item?.cutId) return "fabric";
  if (item?.size === "Per Meter") return "fabric";
  if (item?.size === "N/A") return "addon";
  return "readyMade";
}

function toPlain(order) {
  if (!order) return order;
  if (typeof order.toObject === "function") {
    return order.toObject({ virtuals: true });
  }
  return { ...order };
}

/**
 * Retail lines can be ready-made, add-on, or fabric-by-the-meter. The
 * schema cannot use a single `ref: ReadyMadeProduct` without nulling
 * fabric/add-on IDs on populate. This hydrator looks up all three
 * collections and attaches fabric shops for admin/partner views.
 */
export async function hydrateRetailOrders(orders) {
  const isArray = Array.isArray(orders);
  const list = (isArray ? orders : [orders]).filter(Boolean);
  if (list.length === 0) {
    return isArray ? [] : null;
  }

  const productIds = [];
  const shopIds = new Set();

  for (const order of list) {
    for (const item of order.orderItems || []) {
      if (isValidId(item.productId)) {
        productIds.push(idStr(item.productId));
      }
      if (isValidId(item.fabricShopId)) {
        shopIds.add(idStr(item.fabricShopId));
      }
    }
  }

  const uniqueProductIds = [...new Set(productIds)];

  const [readyMade, addons, fabrics] = await Promise.all([
    uniqueProductIds.length
      ? ReadyMadeProduct.find({ _id: { $in: uniqueProductIds } })
          .select(
            "thumbnailImage images fabricShopId name nameAr fabricType fabricTypeAr fabricId designId",
          )
          .populate("fabricId", "name nameAr images slug")
          .populate("designId", "name nameAr images slug")
          .lean()
      : [],
    uniqueProductIds.length
      ? AddOn.find({ _id: { $in: uniqueProductIds } })
          .select("thumbnailImage images fabricShopId name nameAr")
          .lean()
      : [],
    uniqueProductIds.length
      ? Fabric.find({ _id: { $in: uniqueProductIds } })
          .select("images fabricShopId listedByStore name nameAr slug")
          .lean()
      : [],
  ]);

  const productById = new Map();
  const listedByStoreIds = new Set();

  for (const doc of readyMade) {
    productById.set(String(doc._id), { kind: "readyMade", doc });
    if (isValidId(doc.fabricShopId)) shopIds.add(idStr(doc.fabricShopId));
  }
  for (const doc of addons) {
    productById.set(String(doc._id), { kind: "addon", doc });
    if (isValidId(doc.fabricShopId)) shopIds.add(idStr(doc.fabricShopId));
  }
  for (const doc of fabrics) {
    productById.set(String(doc._id), { kind: "fabric", doc });
    if (isValidId(doc.fabricShopId)) shopIds.add(idStr(doc.fabricShopId));
    else if (isValidId(doc.listedByStore)) {
      listedByStoreIds.add(idStr(doc.listedByStore));
    }
  }

  const shopsByOwner = new Map();
  if (listedByStoreIds.size) {
    const ownerShops = await FabricShop.find({
      ownerId: { $in: [...listedByStoreIds] },
    })
      .select("name nameAr phone city location pickupAddress ownerId")
      .lean();
    for (const shop of ownerShops) {
      shopsByOwner.set(String(shop.ownerId), shop);
      shopIds.add(String(shop._id));
    }
  }

  const shops = shopIds.size
    ? await FabricShop.find({ _id: { $in: [...shopIds] } })
        .select("name nameAr phone city location pickupAddress ownerId")
        .lean()
    : [];
  const shopById = new Map(shops.map((shop) => [String(shop._id), shop]));

  const hydrated = list.map((order) => {
    const payload = toPlain(order);
    const seen = new Set();
    const fabricStores = [];

    payload.orderItems = (payload.orderItems || []).map((item) => {
      const pid = idStr(item.productId);
      const match = productById.get(pid);
      const kind = inferKind(item, match?.kind);
      const productDoc = match?.doc || null;

      let shop = null;
      if (isValidId(item.fabricShopId)) {
        shop = shopById.get(idStr(item.fabricShopId)) || null;
      }
      if (!shop && isValidId(productDoc?.fabricShopId)) {
        shop = shopById.get(idStr(productDoc.fabricShopId)) || null;
      }
      if (!shop && isValidId(productDoc?.listedByStore)) {
        shop = shopsByOwner.get(idStr(productDoc.listedByStore)) || null;
      }

      if (shop && !seen.has(String(shop._id))) {
        seen.add(String(shop._id));
        fabricStores.push(shop);
      }

      const populatedProduct = productDoc
        ? {
            _id: productDoc._id,
            thumbnailImage: productDoc.thumbnailImage || "",
            images: productDoc.images || [],
            fabricShopId: shop || productDoc.fabricShopId || null,
            name: productDoc.name,
            nameAr: productDoc.nameAr,
            fabricType: productDoc.fabricType,
            fabricTypeAr: productDoc.fabricTypeAr,
            fabricId: productDoc.fabricId || null,
            designId: productDoc.designId || null,
          }
        : item.productId;

      return {
        ...item,
        kind,
        productId: populatedProduct,
        fabricShopId: shop || item.fabricShopId || null,
      };
    });

    payload.fabricStores = fabricStores;
    payload.fabricStoreId = fabricStores[0] || payload.fabricStoreId || null;
    return payload;
  });

  return isArray ? hydrated : hydrated[0];
}
