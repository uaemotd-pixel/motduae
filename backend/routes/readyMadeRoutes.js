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

        // language switch
        const items = products.map((p) => ({
            _id: p._id,
            slug: p.slug,
            price: p.price,
            size: p.size,
            style: p.style,
            images: p.images,
            countInStock: p.countInStock,
            name: p.name,
            nameAr: p.nameAr,
            description: p.description,
            descriptionAr: p.descriptionAr,
        }));

        res.json({
            success: true,
            page: Number(page),
            limit: Number(limit),
            total,
            totalPages: Math.ceil(total / limit),
            items,
        });

    } catch (error) {
        console.error("GET /api/ready-made error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch ready-made products",
        });
    }
})

// GET ready-made by slug : fetch products by slug means by name, id or etc....
readyMadeRoutes.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await ReadyMadeProduct.findOne({
            slug: slug.toLowerCase(),
            isActive: true
        })

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }

        res.json({
            success: true,
            item: product
        })
    } catch (error) {
        console.error("GET /api/ready-made/:slug error:", error);
        res.status(500).json({
            success: false,
            message: "Server error while fetching product"
        });
    }
})

export default readyMadeRoutes;