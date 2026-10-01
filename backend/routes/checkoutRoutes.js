import express from "express";
import { prepareRetailOrder } from "../services/retailOrderService.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";

const router = express.Router();

function isAvailabilityError(message) {
  return /out of stock|insufficient stock|not available|not found|Product not found|sold out/i.test(
    String(message || ""),
  );
}

function normalizePreviewInput(it) {
  return {
    productId: it.productId,
    cutId: it.cutId,
    quantity: it.quantity,
    measurementUnit: it.measurementUnit,
  };
}

async function enrichPreparedItems(preparedItems, requestItems) {
  return Promise.all(
    preparedItems.map(async (it, index) => {
      let maxStock = 0;
      const pid = it.productId;
      const requestCutId = requestItems[index]?.cutId;

      if (!pid) {
        return {
          unitPrice: it.price || 0,
          name: it.name || "",
          image: it.image || "",
          maxStock,
          productId: null,
          cutId: null,
        };
      }

      if (it.kind === "fabric" && (it.cutId || requestCutId)) {
        const cutId = it.cutId || requestCutId;
        const fabric = await Fabric.findById(pid).select("cuts images").lean();
        if (fabric) {
          const cutEntry = (fabric.cuts || []).find(
            (entry) => String(entry.cutId) === String(cutId),
          );
          maxStock = cutEntry ? Math.floor(Number(cutEntry.stock) || 0) : 0;
        }

        return {
          unitPrice: it.price || 0,
          name: it.name || "",
          image: it.image || "",
          maxStock: Number(maxStock) || 0,
          productId: String(pid),
          cutId: cutId ? String(cutId) : null,
        };
      }

      let doc = await ReadyMadeProduct.findById(pid).select(
        "availableFabricStock images thumbnailImage stock stockInMeters",
      );
      if (!doc)
        doc = await AddOn.findById(pid).select("stock thumbnailImage images");
      if (!doc)
        doc = await Fabric.findById(pid).select(
          "stockInMeters images thumbnailImage cuts",
        );

      if (doc) {
        maxStock =
          doc.stock ?? doc.availableFabricStock ?? doc.stockInMeters ?? 0;
      }

      return {
        unitPrice: it.price || 0,
        name: it.name || "",
        image: it.image || "",
        maxStock: Number(maxStock) || 0,
        productId: String(pid),
        cutId: null,
      };
    }),
  );
}

// POST /preview
// Accepts { items: [{ productId, cutId?, size, quantity }] }
// Returns server-calculated prices for available lines, plus unavailableItems
// for sold-out / missing products so the cart can clean itself up.
router.post("/preview", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: "items required",
        code: "ITEMS_REQUIRED",
      });
    }

    const availableInputs = [];
    const unavailableItems = [];

    for (const it of items) {
      const normalized = normalizePreviewInput(it);
      try {
        // Validate each line so one sold-out product does not block the rest.
        await prepareRetailOrder([normalized]);
        availableInputs.push(it);
      } catch (err) {
        const message = err?.message || "Item unavailable";
        if (!isAvailabilityError(message)) {
          console.error("/api/checkout/preview error:", err);
          return res.status(500).json({
            error: message,
            code: "PREVIEW_FAILED",
          });
        }
        unavailableItems.push({
          productId: String(it.productId || ""),
          cutId: it.cutId ? String(it.cutId) : null,
          message,
        });
      }
    }

    if (availableInputs.length === 0) {
      return res.status(409).json({
        error:
          unavailableItems[0]?.message ||
          "All items in your cart are sold out",
        code: "ITEM_UNAVAILABLE",
        unavailableItems,
        items: [],
      });
    }

    const prepared = await prepareRetailOrder(
      availableInputs.map((it) => normalizePreviewInput(it)),
    );

    const enriched = await enrichPreparedItems(
      prepared.finalOrderItems,
      availableInputs,
    );

    const vatRate = prepared.vatRate ?? 0.05;
    return res.json({
      items: enriched,
      unavailableItems,
      subtotal: prepared.itemsPrice,
      shipping: prepared.shippingPrice,
      shippingPrice: prepared.shippingPrice,
      parcelCount: prepared.parcelCount ?? 0,
      perParcelFee: prepared.perParcelFee ?? null,
      deliveryBreakdown: prepared.deliveryBreakdown ?? [],
      vat: prepared.vatAmount,
      total: prepared.totalPrice,
      vatRate,
    });
  } catch (err) {
    console.error("/api/checkout/preview error:", err);
    const message = err?.message || "Server error";
    const availability = isAvailabilityError(message);
    return res.status(availability ? 409 : 500).json({
      error: message,
      code: availability ? "ITEM_UNAVAILABLE" : "PREVIEW_FAILED",
      unavailableItems: [],
      items: [],
    });
  }
});

export default router;
