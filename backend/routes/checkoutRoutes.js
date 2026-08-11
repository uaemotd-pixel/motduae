import express from "express";
import mongoose from "mongoose";
import { prepareRetailOrder } from "../services/retailOrderService.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import Fabric from "../models/Fabric.js";

const router = express.Router();

// POST /preview
// Accepts { items: [{ productId, size, quantity }] }
// Returns server-calculated prices and totals
router.post("/preview", async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "items required" });
    }

    // Prepare order using server-side pricing logic
    const prepared = await prepareRetailOrder(
      items.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        measurementUnit: it.measurementUnit,
      })),
    );

    // Enrich each finalOrderItems with maxStock from DB
    const enriched = await Promise.all(
      prepared.finalOrderItems.map(async (it) => {
        let maxStock = 0;
        const pid = it.productId;
        if (!pid)
          return {
            unitPrice: it.price || 0,
            name: it.name || "",
            image: it.image || "",
            maxStock,
          };

        let doc = await ReadyMadeProduct.findById(pid).select(
          "availableFabricStock images thumbnailImage stock stockInMeters",
        );
        if (!doc)
          doc = await AddOn.findById(pid).select("stock thumbnailImage images");
        if (!doc)
          doc = await Fabric.findById(pid).select(
            "stockInMeters images thumbnailImage",
          );

        if (doc) {
          // choose best stock field available
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
