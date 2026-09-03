import express from "express";
import { prepareRetailOrder } from "../services/retailOrderService.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";

const router = express.Router();

// POST /preview
// Accepts { items: [{ productId, cutId?, size, quantity }] }
// Returns server-calculated prices and totals
router.post("/preview", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items required" });
    }

    const prepared = await prepareRetailOrder(
      items.map((it) => ({
        productId: it.productId,
        cutId: it.cutId,
        quantity: it.quantity,
        measurementUnit: it.measurementUnit,
      })),
    );

    const enriched = await Promise.all(
      prepared.finalOrderItems.map(async (it, index) => {
        let maxStock = 0;
        const pid = it.productId;
        const requestCutId = items[index]?.cutId;

        if (!pid) {
          return {
            unitPrice: it.price || 0,
            name: it.name || "",
            image: it.image || "",
            maxStock,
          };
        }

        if (it.kind === "fabric" && (it.cutId || requestCutId)) {
          const cutId = it.cutId || requestCutId;
          const fabric = await Fabric.findById(pid).select("cuts images").lean();
          if (fabric) {
            const cutEntry = (fabric.cuts || []).find(
              (entry) =>
                String(entry.cutId) === String(cutId),
            );
            maxStock = cutEntry ? Math.floor(Number(cutEntry.stock) || 0) : 0;
          }

          return {
            unitPrice: it.price || 0,
            name: it.name || "",
            image: it.image || "",
            maxStock: Number(maxStock) || 0,
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
        };
      }),
    );

    const vatRate = prepared.vatRate ?? 0.05;
    return res.json({
      items: enriched,
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
    return res.status(500).json({ error: err.message || "Server error" });
  }
});

export default router;
