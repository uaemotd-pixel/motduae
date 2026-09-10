import express from "express";
import AddOn from "../models/AddOn.js";

const addOnRoutes = express.Router();

const toShopInfo = (shop) => {
  if (!shop || typeof shop !== "object" || !shop._id) return null;
  return {
    _id: shop._id,
    name: shop.name || "",
    nameAr: shop.nameAr || "",
    slug: shop.slug || "",
  };
};

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
      .populate("fabricShopId", "_id name nameAr slug")
      .skip(skip)
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await AddOn.countDocuments(filter);

    const items = products.map((p) => {
      const fabricShop = toShopInfo(p.fabricShopId);
      return {
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
        category: p.category || "",
        categoryAr: p.categoryAr || "",
        material: p.material,
        materialAr: p.materialAr,
        design: p.design,
        designAr: p.designAr,
        pattern: p.pattern || p.design || "",
        patternAr: p.patternAr || p.designAr || "",
        season: p.season,
        seasonAr: p.seasonAr,
        colors: p.colors,
        isActive: p.isActive,
        fabricShopId: fabricShop?._id
          ? String(fabricShop._id)
          : p.fabricShopId
            ? String(p.fabricShopId._id || p.fabricShopId)
            : null,
        fabricShop,
        ownerName: p.ownerName || "MOTD Admin",
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
    console.error("GET /api/addons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch addons",
    });
  }
});

const toListItem = (p) => {
  const fabricShop = toShopInfo(p.fabricShopId);
  return {
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
    category: p.category || "",
    categoryAr: p.categoryAr || "",
    material: p.material,
    materialAr: p.materialAr,
    design: p.design,
    designAr: p.designAr,
    pattern: p.pattern || p.design || "",
    patternAr: p.patternAr || p.designAr || "",
    season: p.season,
    seasonAr: p.seasonAr,
    colors: p.colors,
    isActive: p.isActive,
    fabricShopId: fabricShop?._id
      ? String(fabricShop._id)
      : p.fabricShopId
        ? String(p.fabricShopId._id || p.fabricShopId)
        : null,
    fabricShop,
    ownerName: p.ownerName || "MOTD Admin",
  };
};

// GET /api/addons/:slug - Fetch single addon by slug (+ related)
addOnRoutes.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const addon = await AddOn.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    })
      .populate("fabricShopId", "_id name nameAr slug isActive")
      .select("-__v");

    if (!addon) {
      return res.status(404).json({
        success: false,
        message: "Addon not found",
      });
    }

    const shop = addon.fabricShopId;
    const fabricShop =
      shop && typeof shop === "object" && shop.isActive !== false
        ? toShopInfo(shop)
        : null;

    const relatedLimit = 8;
    const shopKey = fabricShop?._id
      ? String(fabricShop._id)
      : addon.fabricShopId
        ? String(addon.fabricShopId._id || addon.fabricShopId)
        : "";
    const material = String(addon.material || "")
      .trim()
      .toLowerCase();
    const design = String(addon.design || "")
      .trim()
      .toLowerCase();
    const season = String(addon.season || "")
      .trim()
      .toLowerCase();
    const tag = String(addon.tag || "")
      .trim()
      .toLowerCase();
    const colorSet = new Set(
      (addon.colors || [])
        .map((c) => String(c).trim().toLowerCase())
        .filter(Boolean),
    );

    const candidates = await AddOn.find({
      isActive: true,
      _id: { $ne: addon._id },
    })
      .populate("fabricShopId", "_id name nameAr slug")
      .sort({ createdAt: -1 })
      .limit(48)
      .select("-__v");

    const scored = candidates
      .map((item) => {
        let score = 0;
        if (
          material &&
          String(item.material || "")
            .trim()
            .toLowerCase() === material
        ) {
          score += 4;
        }
        if (
          design &&
          String(item.design || "")
            .trim()
            .toLowerCase() === design
        ) {
          score += 3;
        }
        if (
          season &&
          String(item.season || "")
            .trim()
            .toLowerCase() === season
        ) {
          score += 2;
        }
        if (
          tag &&
          String(item.tag || "")
            .trim()
            .toLowerCase() === tag
        ) {
          score += 2;
        }
        const itemShopId = item.fabricShopId
          ? String(item.fabricShopId._id || item.fabricShopId)
          : "";
        if (shopKey && itemShopId && shopKey === itemShopId) {
          score += 2;
        }
        const sharedColor = (item.colors || []).some((c) =>
          colorSet.has(String(c).trim().toLowerCase()),
        );
        if (sharedColor) score += 2;
        if (Number(item.stock) > 0) score += 1;
        return { item, score };
      })
      .sort((a, b) => b.score - a.score || 0);

    const related = scored.slice(0, relatedLimit).map(({ item }) => toListItem(item));

    const item = {
      ...addon.toObject(),
      fabricShopId: shopKey || null,
      fabricShop,
    };

    res.json({
      success: true,
      item,
      related,
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
