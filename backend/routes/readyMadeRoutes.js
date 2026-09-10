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

        const products = await ReadyMadeProduct.find(filter)
            .populate("fabricShopId", "_id name nameAr slug")
            .skip(skip)
            .limit(Number(limit))
            .sort({ createdAt: -1 });
        const total = await ReadyMadeProduct.countDocuments(filter);

        // language switch
        const items = products.map((p) => {
            const shop =
                p.fabricShopId &&
                typeof p.fabricShopId === "object" &&
                p.fabricShopId._id
                    ? {
                          _id: p.fabricShopId._id,
                          name: p.fabricShopId.name || "",
                          nameAr: p.fabricShopId.nameAr || "",
                          slug: p.fabricShopId.slug || "",
                      }
                    : null;

            return {
                _id: p._id,
                slug: p.slug,
                images: p.images,
                colors: p.colors,
                name: p.name,
                nameAr: p.nameAr,
                description: p.description,
                descriptionAr: p.descriptionAr,
                finalSellingPriceAED: p.finalSellingPriceAED,
                tag: p.tag,
                tagAr: p.tagAr,
                category: p.category || "",
                categoryAr: p.categoryAr || "",
                material: p.material || "",
                materialAr: p.materialAr || "",
                pattern: p.pattern || "",
                patternAr: p.patternAr || "",
                season: p.season || "",
                seasonAr: p.seasonAr || "",
                fabricType: p.fabricType || "",
                fabricTypeAr: p.fabricTypeAr || "",
                availableFabricStock: p.availableFabricStock,
                metersPerFabric: p.metersPerFabric,
                fabricShopId: shop?._id
                    ? String(shop._id)
                    : p.fabricShopId
                      ? String(p.fabricShopId)
                      : null,
                fabricShop: shop,
                ownerName: p.ownerName || "",
            };
        });

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
        .populate("fabricId", "slug name nameAr")
        .populate("designId", "slug name nameAr");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }

        const relatedLimit = 8;
        const candidates = await ReadyMadeProduct.find({
            isActive: true,
            _id: { $ne: product._id },
        })
            .populate("fabricShopId", "_id name nameAr slug")
            .select(
                "slug images colors name nameAr finalSellingPriceAED tag tagAr availableFabricStock fabricType fabricTypeAr fabricShopId ownerName createdAt",
            )
            .sort({ createdAt: -1 })
            .limit(48)
            .lean();

        const productColors = new Set(
            (product.colors || []).map((c) => String(c).trim().toLowerCase()).filter(Boolean),
        );
        const productPrice = Number(product.finalSellingPriceAED) || 0;
        const productFabricShopId = product.fabricShopId
            ? String(product.fabricShopId._id || product.fabricShopId)
            : "";

        const scored = candidates
            .map((item) => {
                let score = 0;
                if (
                    product.fabricType &&
                    item.fabricType &&
                    String(item.fabricType).toLowerCase() ===
                        String(product.fabricType).toLowerCase()
                ) {
                    score += 4;
                }
                if (
                    product.tag &&
                    item.tag &&
                    String(item.tag).toLowerCase() === String(product.tag).toLowerCase()
                ) {
                    score += 3;
                }
                const itemShopId = item.fabricShopId
                    ? String(item.fabricShopId._id || item.fabricShopId)
                    : "";
                if (productFabricShopId && itemShopId) {
                    if (itemShopId === productFabricShopId) score += 2;
                }
                const sharedColor = (item.colors || []).some((c) =>
                    productColors.has(String(c).trim().toLowerCase()),
                );
                if (sharedColor) score += 2;

                const priceDiff = Math.abs(
                    (Number(item.finalSellingPriceAED) || 0) - productPrice,
                );
                if (priceDiff <= 150) score += 2;
                else if (priceDiff <= 400) score += 1;

                return { item, score };
            })
            .sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return (
                    new Date(b.item.createdAt).getTime() -
                    new Date(a.item.createdAt).getTime()
                );
            });

        const related = scored.slice(0, relatedLimit).map(({ item }) => {
            const shop =
                item.fabricShopId &&
                typeof item.fabricShopId === "object" &&
                item.fabricShopId._id
                    ? {
                          _id: item.fabricShopId._id,
                          name: item.fabricShopId.name || "",
                          nameAr: item.fabricShopId.nameAr || "",
                          slug: item.fabricShopId.slug || "",
                      }
                    : null;

            return {
                _id: item._id,
                slug: item.slug,
                images: item.images,
                colors: item.colors,
                name: item.name,
                nameAr: item.nameAr,
                finalSellingPriceAED: item.finalSellingPriceAED,
                tag: item.tag,
                tagAr: item.tagAr,
                category: item.category || "",
                categoryAr: item.categoryAr || "",
                material: item.material || "",
                materialAr: item.materialAr || "",
                pattern: item.pattern || "",
                patternAr: item.patternAr || "",
                season: item.season || "",
                seasonAr: item.seasonAr || "",
                availableFabricStock: item.availableFabricStock,
                fabricType: item.fabricType,
                fabricTypeAr: item.fabricTypeAr,
                fabricShopId: shop?._id
                    ? String(shop._id)
                    : item.fabricShopId
                      ? String(item.fabricShopId)
                      : null,
                fabricShop: shop,
                ownerName: item.ownerName || "",
            };
        });

        res.json({
            success: true,
            item: product,
            related,
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