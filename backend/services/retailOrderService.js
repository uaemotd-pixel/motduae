import mongoose from "mongoose";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";
import FabricShop from "../models/FabricShop.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { planRetailOrderParcels } from "./parcelPlanService.js";
import { getPerParcelDeliveryFee } from "./pricingService.js";
import {
  isRetailFabricLine,
  resolveRetailFabricCutLine,
} from "../utils/fabricCuts.js";

// Legacy meter orders only
const WARA_TO_METERS = 0.9144;

function fallbackSlug(product) {
  if (product?.slug) return product.slug;
  return String(product?.name || "item")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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

async function prepareLegacyMeterFabricLine(product, item) {
  const quantity = item.quantity || 1;
  let quantityForStockCheck = quantity;
  if (item.measurementUnit === "wara") {
    quantityForStockCheck = quantity * WARA_TO_METERS;
  }

  const stock = product.stockInMeters ?? 0;
  if (stock < quantityForStockCheck) {
    throw new Error(`${product.name} is out of stock`);
  }

  return {
    productId: product._id,
    kind: "fabric",
    fabricShopId: await resolveLineFabricShopId(product),
    name: product.name,
    nameAr: product.nameAr || "",
    slug: fallbackSlug(product),
    image: product.images?.[0] || "",
    size: "Per Meter",
    price: product.pricePerMeter ?? 0,
    quantity,
    quantityInMeters: quantityForStockCheck,
    lineTotal: (product.pricePerMeter ?? 0) * quantityForStockCheck,
  };
}

export async function prepareRetailOrder(orderItems) {
  if (!orderItems || orderItems.length === 0) {
    throw new Error("No order items provided");
  }

  let itemsPrice = 0;
  const finalOrderItems = [];

  for (const item of orderItems) {
    let product = await ReadyMadeProduct.findOne({
      _id: item.productId,
      isActive: true,
    });

    let isAddon = false;
    let isFabric = false;

    if (!product) {
      product = await AddOn.findOne({
        _id: item.productId,
        isActive: true,
      });
      if (product) {
        isAddon = true;
      }
    }

    if (!product) {
      product = await Fabric.findOne({
        _id: item.productId,
        isActive: true,
      });
      if (product) {
        isFabric = true;
      }
    }

    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    const quantity = item.quantity || 1;
    const fabricShopId = await resolveLineFabricShopId(product);

    if (isFabric) {
      if (item.cutId) {
        const resolved = await resolveRetailFabricCutLine(
          product,
          item.cutId,
          quantity,
        );
        if (!resolved.ok) {
          throw new Error(resolved.message);
        }

        const line = {
          productId: product._id,
          kind: "fabric",
          fabricShopId,
          name: `${product.name} — ${resolved.sizeLabel}`,
          nameAr: product.nameAr || "",
          slug: fallbackSlug(product),
          image: product.images?.[0] || "",
          size: resolved.sizeLabel,
          price: resolved.unitPrice,
          quantity: resolved.pieceQty,
          cutId: resolved.cutId,
          cutSnapshot: resolved.cutSnapshot,
        };

        finalOrderItems.push(line);
        itemsPrice += resolved.lineTotal;
        continue;
      }

      // Legacy meter checkout (no cutId) — only if fabric has no cuts configured
      const hasCuts = Array.isArray(product.cuts) && product.cuts.length > 0;
      if (hasCuts) {
        throw new Error(
          `cutId is required when purchasing ${product.name}`,
        );
      }

      const legacyLine = await prepareLegacyMeterFabricLine(product, item);
      finalOrderItems.push(legacyLine);
      itemsPrice += legacyLine.lineTotal;
      continue;
    }

    let stock;
    if (isAddon) {
      stock = product.stock;
    } else {
      stock = product.availableFabricStock;
    }

    if (stock < quantity) {
      throw new Error(`${product.name} is out of stock`);
    }

    let finalPrice;
    if (isAddon) {
      finalPrice = product.price;
    } else {
      finalPrice = product.finalSellingPriceAED;
    }

    const sizeLabel = isAddon ? "N/A" : product.metersPerFabric;
    const kind = isAddon ? "addon" : "readyMade";

    finalOrderItems.push({
      productId: product._id,
      kind,
      fabricShopId,
      name: product.name,
      nameAr: product.nameAr || "",
      slug: fallbackSlug(product),
      image: isAddon ? product.thumbnailImage || "" : product.images?.[0] || "",
      size: sizeLabel,
      price: finalPrice,
      quantity,
    });

    itemsPrice += (finalPrice || 0) * quantity;
  }

  const settings = await PlatformSettings.getSettings();
  const parcelPlan = await planRetailOrderParcels({
    items: orderItems,
    perParcelFee: getPerParcelDeliveryFee(settings),
  });

  const shippingPrice = parcelPlan.deliveryFee;
  const vatRate =
    typeof settings.vatRate === "number" ? settings.vatRate : 0.05;
  const taxableSubtotal = Number((itemsPrice + shippingPrice).toFixed(2));
  const vatAmount = Number((taxableSubtotal * vatRate).toFixed(2));
  const totalPrice = Number((taxableSubtotal + vatAmount).toFixed(2));

  return {
    finalOrderItems,
    itemsPrice,
    shippingPrice,
    vatRate,
    vatAmount,
    totalPrice,
    parcelCount: parcelPlan.parcelCount,
    perParcelFee: parcelPlan.perParcelFee,
    deliveryBreakdown: parcelPlan.breakdown,
    parcelPlan,
  };
}

export async function deductRetailProductStock(orderItems) {
  for (const item of orderItems) {
    const requestedQty = Math.floor(Number(item.quantity) || 1);
    const isFabricLine = isRetailFabricLine(item);

    if (!isFabricLine) {
      let updated = await ReadyMadeProduct.findOneAndUpdate(
        { _id: item.productId, availableFabricStock: { $gte: requestedQty } },
        { $inc: { availableFabricStock: -requestedQty } },
        { new: true },
      );

      if (!updated) {
        updated = await AddOn.findOneAndUpdate(
          { _id: item.productId, stock: { $gte: requestedQty } },
          { $inc: { stock: -requestedQty } },
          { new: true },
        );
      }

      if (!updated) {
        throw new Error(`Insufficient stock for product: ${item.productId}`);
      }
      continue;
    }

    if (item.cutId && mongoose.Types.ObjectId.isValid(item.cutId)) {
      const cutObjectId = new mongoose.Types.ObjectId(String(item.cutId));
      const updated = await Fabric.findOneAndUpdate(
        {
          _id: item.productId,
          cuts: {
            $elemMatch: {
              cutId: cutObjectId,
              stock: { $gte: requestedQty },
            },
          },
        },
        { $inc: { "cuts.$.stock": -requestedQty } },
        { new: true },
      );

      if (!updated) {
        throw new Error(
          `Insufficient stock for fabric cut: ${item.productId}/${item.cutId}`,
        );
      }
      continue;
    }

    // Legacy meter deduction
    let qtyForFabric =
      typeof item.quantityInMeters === "number" && item.quantityInMeters > 0
        ? item.quantityInMeters
        : requestedQty;
    if (
      item.measurementUnit === "wara" &&
      !(typeof item.quantityInMeters === "number" && item.quantityInMeters > 0)
    ) {
      qtyForFabric = requestedQty * WARA_TO_METERS;
    }

    const updated = await Fabric.findOneAndUpdate(
      { _id: item.productId, stockInMeters: { $gte: qtyForFabric } },
      { $inc: { stockInMeters: -qtyForFabric } },
      { new: true },
    );

    if (!updated) {
      throw new Error(`Insufficient stock for product: ${item.productId}`);
    }
  }
}
