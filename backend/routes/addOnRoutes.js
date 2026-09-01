import express from "express";
import AddOn from "../models/AddOn.js";

const addOnRoutes = express.Router();

// GET /api/addons - Fetch active add-ons
addOnRoutes.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 12, fabricShopId } = req.query;
    const filter = { isActive: true };

    if (fabricShopId) {
      filter.fabricShopId = fabricShopId;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await AddOn.find(filter)
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await AddOn.countDocuments(filter);

    const items = products.map((p) => ({
      _id: p._id,
      slug: p.slug,
      images: p.images,
      name: p.name,
      nameAr: p.nameAr,
      description: p.description,
      descriptionAr: p.descriptionAr,
      price: p.price,
      stock: p.stock,
      thumbnailImage: p.thumbnailImage,
      tag: p.tag,
      tagAr: p.tagAr,
      material: p.material,
      materialAr: p.materialAr,
      design: p.design,
      designAr: p.designAr,
      season: p.season,
      seasonAr: p.seasonAr,
      colors: p.colors,
      isActive: p.isActive,
      fabricShopId: p.fabricShopId ? String(p.fabricShopId) : null,
      ownerName: p.ownerName || "MOTD Admin",
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
    console.error("GET /api/addons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch addons",
    });
  }
});

// GET /api/addons/:slug - Fetch single addon by slug
addOnRoutes.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const addon = await AddOn.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    });

    if (!addon) {
      return res.status(404).json({
        success: false,
        message: "Addon not found",
      });
    }

    res.json({
      success: true,
      item: addon,
    });
  } catch (error) {
    console.error("GET /api/addons/:slug error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching addon",
    });
  }
});

export default addOnRoutes;
