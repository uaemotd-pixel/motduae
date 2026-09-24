import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";
import FabricShop from "../models/FabricShop.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { applyMotdCommission } from "../utils/motdCommission.js";
import { resolveRetailFabricCutLine } from "../utils/fabricCuts.js";
import { metersToWar } from "../utils/fabricUnits.js";

const MAX_ATTEMPTS = 5;
const MAX_LINES = 50;
const MAX_QUANTITY = 999;

export class CartError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function fallbackSlug(product) {
  if (product?.slug) return product.slug;
  return String(product?.name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function formatMeasure(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "";
  return String(Number(numeric.toFixed(2)));
}

function formatCutLength(snapshot) {
  if (!snapshot || snapshot.value == null) return undefined;
  const valueLabel = formatMeasure(snapshot.value);
  if (snapshot.unit === "war") {
    return `${valueLabel} war ≈ ${formatMeasure(snapshot.lengthInMeters)}m`;
  }
  return `${valueLabel} m ≈ ${formatMeasure(metersToWar(snapshot.lengthInMeters))} war`;
}

function readyMadeSizeLabel(value) {
  const meters = Number(value);
  if (!Number.isFinite(meters)) return "";
  return `${meters.toFixed(2)} m`;
}

function firstImage(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return "";
}

function plainItem(item) {
  return {
    lineId: String(item.lineId),
    productId: item.productId,
    kind: item.kind,
    cutId: item.cutId || null,
    quantity: Math.floor(Number(item.quantity) || 0),
  };
}

function sameStored(left, right) {
  if (left.length !== right.length) return false;
  return left.every((item, index) => {
    const other = right[index];
    return (
      item.lineId === String(other.lineId) &&
      String(item.productId) === String(other.productId) &&
      item.kind === other.kind &&
      String(item.cutId || "") === String(other.cutId || "") &&
      item.quantity === Math.floor(Number(other.quantity) || 0)
    );
  });
}

async function resolveLineFabricShopId(product) {
  if (product?.fabricShopId) return product.fabricShopId;
  if (product?.listedByStore) {
    const shop = await FabricShop.findOne({ ownerId: product.listedByStore }).select(
      "_id",
    );
    return shop?._id || null;
  }
  return null;
}

async function loadActiveProduct(productId) {
  if (!mongoose.Types.ObjectId.isValid(productId)) return null;

  const readyMade = await ReadyMadeProduct.findOne({
    _id: productId,
    isActive: true,
  });
  if (readyMade) return { product: readyMade, kind: "readyMade" };

  const addon = await AddOn.findOne({ _id: productId, isActive: true });
  if (addon) return { product: addon, kind: "addon" };

  const fabric = await Fabric.findOne({ _id: productId, isActive: true });
  if (fabric) return { product: fabric, kind: "fabric" };

  return null;
}

async function assertShopActive(product) {
  const fabricShopId = await resolveLineFabricShopId(product);
  if (!fabricShopId) return true;
  const shop = await FabricShop.findById(fabricShopId).select("isActive");
  return Boolean(shop?.isActive);
}

function pieceStock(product, kind, cutId) {
  if (kind === "addon") return Math.floor(Number(product.stock) || 0);
  if (kind === "readyMade") {
    return Math.floor(Number(product.availableFabricStock) || 0);
  }

  const hasCuts = Array.isArray(product.cuts) && product.cuts.length > 0;
  if (!cutId) {
    if (hasCuts) return null;
    return Math.floor(Number(product.stockInMeters) || 0);
  }

  const cutIdStr = String(cutId);
  const entry = (product.cuts || []).find(
    (row) => String(row.cutId?._id || row.cutId) === cutIdStr,
  );
  if (!entry) return null;
  return Math.floor(Number(entry.stock) || 0);
}

export function parseCartLineInput(body, { allowZero = false } = {}) {
  const lineId = typeof body?.lineId === "string" ? body.lineId.trim() : "";
  if (!lineId) throw new CartError("Invalid cart item");

  const separator = lineId.indexOf("::");
  const productId = separator === -1 ? lineId : lineId.slice(0, separator);
  const cutId = separator === -1 ? null : lineId.slice(separator + 2);
  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new CartError("Invalid cart item");
  }
  if (cutId && !mongoose.Types.ObjectId.isValid(cutId)) {
    throw new CartError("Invalid cart item");
  }

  const quantity = Math.floor(Number(body?.quantity));
  const min = allowZero ? 0 : 1;
  if (!Number.isFinite(quantity) || quantity < min || quantity > MAX_QUANTITY) {
    throw new CartError(
      allowZero
        ? "Quantity must be between 0 and 999"
        : "Quantity must be at least 1",
    );
  }

  const kind = body?.kind;
  if (kind != null && kind !== "readyMade" && kind !== "addon" && kind !== "fabric") {
    throw new CartError("Invalid cart item");
  }
  if (cutId && kind && kind !== "fabric") {
    throw new CartError("Invalid cart item");
  }

  return {
    lineId,
    productId,
    cutId: cutId || null,
    quantity,
    kind: kind || (cutId ? "fabric" : undefined),
  };
}

async function ensureCart(userId) {
  try {
    await Cart.updateOne(
      { userId },
      { $setOnInsert: { items: [], version: 0 } },
      { upsert: true },
    );
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }
}

async function mutateCart(userId, mutator) {
  await ensureCart(userId);
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const cart = await Cart.findOne({ userId }).lean();
    if (!cart) continue;
    const nextItems = mutator((cart.items || []).map(plainItem));
    const updated = await Cart.findOneAndUpdate(
      { userId, version: cart.version },
      { $set: { items: nextItems }, $inc: { version: 1 } },
      { new: true },
    );
    if (updated) return updated;
  }
  throw new CartError(
    "Cart was updated in another tab. Please try again.",
    409,
  );
}

async function commissionPercent() {
  const settings = await PlatformSettings.getSettings();
  return Number(settings.motdCommissionFromFabricStore) || 0;
}

async function displayFromStored(line, loaded, percent) {
  const { product, kind } = loaded;
  const quantity = line.quantity;

  if (kind === "fabric" && line.cutId) {
    const resolved = await resolveRetailFabricCutLine(
      product,
      line.cutId,
      quantity,
    );
    if (!resolved.ok) return null;
    const unitPrice = product.fabricShopId
      ? applyMotdCommission(resolved.unitPrice, percent)
      : resolved.unitPrice;
    return {
      id: line.lineId,
      slug: fallbackSlug(product),
      name: `${product.name} — ${resolved.sizeLabel}`,
      image: firstImage(product.images),
      price: unitPrice,
      size: resolved.sizeLabel,
      quantity: resolved.pieceQty,
      cutLength: formatCutLength(resolved.cutSnapshot),
      itemType: "fabric",
      maxStock: resolved.stockPieces,
    };
  }

  if (kind === "fabric") {
    const unitPrice = product.fabricShopId
      ? applyMotdCommission(product.pricePerMeter ?? 0, percent)
      : Number(product.pricePerMeter) || 0;
    return {
      id: line.lineId,
      slug: fallbackSlug(product),
      name: product.name || "",
      image: firstImage(product.images),
      price: unitPrice,
      size: "Per Meter",
      quantity,
      itemType: "fabric",
      maxStock: Math.floor(Number(product.stockInMeters) || 0),
    };
  }

  const rawPrice =
    kind === "addon" ? product.price : product.finalSellingPriceAED;
  const maxStock =
    kind === "addon"
      ? Math.floor(Number(product.stock) || 0)
      : Math.floor(Number(product.availableFabricStock) || 0);

  return {
    id: line.lineId,
    slug: fallbackSlug(product),
    name: product.name || "",
    image:
      kind === "addon"
        ? firstImage(product.thumbnailImage)
        : firstImage(product.images) || firstImage(product.thumbnailImage),
    price: applyMotdCommission(rawPrice, percent),
    size: kind === "addon" ? "N/A" : readyMadeSizeLabel(product.metersPerFabric),
    quantity,
    itemType: kind,
    maxStock,
  };
}

async function hydrateLines(items) {
  const percent = await commissionPercent();
  const stored = [];
  const display = [];

  for (const raw of items) {
    const line = plainItem(raw);
    if (!line.lineId || line.quantity < 1) continue;

    const loaded = await loadActiveProduct(line.productId);
    if (!loaded) continue;
    if (!(await assertShopActive(loaded.product))) continue;
    if (loaded.kind === "fabric" && line.cutId == null) {
      const hasCuts =
        Array.isArray(loaded.product.cuts) && loaded.product.cuts.length > 0;
      if (hasCuts) continue;
    }
    if (loaded.kind !== "fabric" && line.cutId) continue;

    const maxStock = pieceStock(loaded.product, loaded.kind, line.cutId);
    if (maxStock == null || maxStock < 1) continue;

    const quantity = Math.min(line.quantity, maxStock);
    const next = {
      lineId: line.lineId,
      productId: loaded.product._id,
      kind: loaded.kind,
      cutId: loaded.kind === "fabric" ? line.cutId : null,
      quantity,
    };
    const view = await displayFromStored(next, loaded, percent);
    if (!view) continue;
    stored.push(next);
    display.push(view);
  }

  return { stored, display };
}

async function readHydrated(userId) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const cart = await Cart.findOne({ userId }).lean();
    if (!cart) return { items: [] };

    const { stored, display } = await hydrateLines(cart.items || []);
    if (sameStored(stored, cart.items || [])) {
      return { items: display };
    }

    const updated = await Cart.findOneAndUpdate(
      { userId, version: cart.version },
      { $set: { items: stored }, $inc: { version: 1 } },
      { new: true },
    );
    if (updated) {
      const cleaned = await hydrateLines(updated.items || []);
      return { items: cleaned.display };
    }
  }

  throw new CartError(
    "Cart was updated in another tab. Please try again.",
    409,
  );
}

async function requireLineTarget(parsed) {
  const loaded = await loadActiveProduct(parsed.productId);
  if (!loaded) throw new CartError("Product not found");
  if (parsed.kind && parsed.kind !== loaded.kind) {
    throw new CartError("Invalid cart item");
  }
  if (!(await assertShopActive(loaded.product))) {
    throw new CartError("Product not available");
  }

  const hasCuts =
    loaded.kind === "fabric" &&
    Array.isArray(loaded.product.cuts) &&
    loaded.product.cuts.length > 0;
  if (loaded.kind === "fabric" && hasCuts && !parsed.cutId) {
    throw new CartError(`cutId is required when purchasing ${loaded.product.name}`);
  }
  if (loaded.kind !== "fabric" && parsed.cutId) {
    throw new CartError("Invalid cart item");
  }

  const maxStock = pieceStock(loaded.product, loaded.kind, parsed.cutId);
  if (maxStock == null) {
    throw new CartError(`Selected cut is not available on ${loaded.product.name}`);
  }

  return { loaded, maxStock, name: loaded.product.name || "Item" };
}

function storedFrom(parsed, kind, quantity) {
  return {
    lineId: parsed.lineId,
    productId: parsed.productId,
    kind,
    cutId: kind === "fabric" ? parsed.cutId : null,
    quantity,
  };
}

export async function getCart(userId) {
  return readHydrated(userId);
}

export async function addLine(userId, body) {
  const parsed = parseCartLineInput(body);
  const { loaded, maxStock, name } = await requireLineTarget(parsed);

  if (maxStock < 1) {
    throw new CartError(`${name} is out of stock`);
  }

  await mutateCart(userId, (items) => {
    if (items.length >= MAX_LINES && !items.some((item) => item.lineId === parsed.lineId)) {
      throw new CartError("Cart is full");
    }
    const index = items.findIndex((item) => item.lineId === parsed.lineId);
    if (index >= 0) {
      if (items[index].quantity >= maxStock) {
        throw new CartError(`Only ${maxStock} in stock`);
      }
      const nextQty = Math.min(items[index].quantity + parsed.quantity, maxStock);
      const next = items.slice();
      next[index] = storedFrom(parsed, loaded.kind, nextQty);
      return next;
    }
    return [...items, storedFrom(parsed, loaded.kind, Math.min(parsed.quantity, maxStock))];
  });

  return readHydrated(userId);
}

export async function setLineQuantity(userId, lineId, quantity) {
  const parsed = parseCartLineInput({ lineId, quantity }, { allowZero: true });
  if (parsed.quantity <= 0) {
    return removeLine(userId, parsed.lineId);
  }

  const { loaded, maxStock } = await requireLineTarget(parsed);
  if (parsed.quantity > maxStock) {
    throw new CartError(`Only ${maxStock} in stock`);
  }

  await mutateCart(userId, (items) => {
    const index = items.findIndex((item) => item.lineId === parsed.lineId);
    if (index < 0) return items;
    const next = items.slice();
    next[index] = storedFrom(parsed, loaded.kind, parsed.quantity);
    return next;
  });

  return readHydrated(userId);
}

export async function removeLine(userId, lineId) {
  const id = typeof lineId === "string" ? lineId.trim() : "";
  if (!id) throw new CartError("Invalid cart item");

  const existing = await Cart.findOne({ userId }).select("_id").lean();
  if (!existing) return { items: [] };

  await mutateCart(userId, (items) => items.filter((item) => item.lineId !== id));
  return readHydrated(userId);
}

export async function clearCart(userId) {
  const existing = await Cart.findOne({ userId }).select("_id").lean();
  if (!existing) return { items: [] };
  await mutateCart(userId, () => []);
  return { items: [] };
}

export async function mergeLines(userId, incoming) {
  if (!Array.isArray(incoming)) throw new CartError("items required");
  if (incoming.length > MAX_LINES) throw new CartError("Cart is full");

  const combined = new Map();
  for (const raw of incoming) {
    let parsed;
    try {
      parsed = parseCartLineInput(raw);
    } catch {
      continue;
    }
    const prev = combined.get(parsed.lineId);
    if (prev) {
      prev.quantity = Math.min(
        MAX_QUANTITY,
        Math.max(prev.quantity, parsed.quantity),
      );
    } else combined.set(parsed.lineId, parsed);
  }

  const accepted = [];
  for (const parsed of combined.values()) {
    try {
      const { loaded, maxStock } = await requireLineTarget(parsed);
      if (maxStock < 1) continue;
      accepted.push({ parsed, kind: loaded.kind, maxStock });
    } catch {
      continue;
    }
  }

  if (accepted.length) {
    await mutateCart(userId, (items) => {
      const next = items.slice();
      for (const { parsed, kind, maxStock } of accepted) {
        const index = next.findIndex((item) => item.lineId === parsed.lineId);
        if (index >= 0) {
          const quantity = Math.min(
            Math.max(next[index].quantity, parsed.quantity),
            maxStock,
          );
          next[index] = storedFrom(parsed, kind, quantity);
          continue;
        }
        if (next.length >= MAX_LINES) break;
        next.push(
          storedFrom(parsed, kind, Math.min(parsed.quantity, maxStock)),
        );
      }
      return next;
    });
  }

  return readHydrated(userId);
}
