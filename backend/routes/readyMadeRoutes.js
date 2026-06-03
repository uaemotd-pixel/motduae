import express from "express";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";

const readyMadeRoutes = express.Router();

// GET API ready-made
readyMadeRoutes.get("/", async (req, res) => {
    try {
        const { size, page = 1, limit = 10 } = req.query;
        const filter = {
            isActive: true
        }

        // Optional size
        if (size) {
            filter.size = size.trim();
        }

        const skip = (Number(page) - 1) * Number(limit);

        const products = await ReadyMadeProduct.find(filter).skip(skip).limit(Number(limit)).sort({ createdAt: -1 });
        const total = await ReadyMadeProduct.countDocuments(filter);

        res.json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
            items: products,
        });

    } catch (error) {
        console.error("GET /api/ready-made error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ready-made products",
        });
    }
})

export default readyMadeRoutes;