import express from "express";
import mongoose from "mongoose";
import AddOn from "../models/AddOn.js";
import FabricShop from "../models/FabricShop.js";
import Category from "../models/Category.js";
import Material from "../models/Material.js";
import Pattern from "../models/Pattern.js";
import Season from "../models/Season.js";
import Tag from "../models/Tag.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { withCustomerAddonPrice } from "../utils/motdCommission.js";

const addOnRoutes = express.Router();

/** Home carousel only needs a small page; keep DB/network payload bounded. */
const TRENDING_DEFAULT_LIMIT = 8;
const TRENDING_MAX_LIMIT = 20;
const CATALOG_DEFAULT_LIMIT = 12;
const CATALOG_MAX_LIMIT = 100;

function parseQueryList(value) {
  return String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

async function resolveCatalogValues(Model, rawValues) {
  const values = new Set(rawValues.map(String));
  const objectIds = rawValues.filter((id) =>
    mongoose.Types.ObjectId.isValid(String(id)),
  );
  if (objectIds.length > 0) {
    const docs = await Model.find({ _id: { $in: objectIds } })
      .select("name nameAr")
      .lean();
    for (const doc of docs) {
      if (doc.name) values.add(doc.name);
      if (doc.nameAr) values.add(doc.nameAr);
    }
  }
  return [...values];
}

async function aggregateFieldCounts(Model, baseQuery, field) {
  const rows = await Model.aggregate([
    { $match: baseQuery },
    { $group: { _id: "$" + field, count: { $sum: 1 } } },
  ]);
  const map = {};
  for (const row of rows) {
    if (row._id == null || row._id === "") continue;
    map[String(row._id)] = row.count;
  }
  return map;
}

function mergeCountMaps(...maps) {
  const result = {};
  for (const map of maps) {
    for (const [key, count] of Object.entries(map || {})) {
      result[key] = (result[key] || 0) + count;
    }
  }
  return result;
}

function mapCountsToOptionIds(valueCounts, options) {
  const byNormalized = {};
  for (const [key, count] of Object.entries(valueCounts || {})) {
    const normalized = String(key || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    if (!normalized) continue;
    byNormalized[normalized] =
      (byNormalized[normalized] || 0) + (Number(count) || 0);
  }

  const result = {};
  for (const opt of options) {
    const id = String(opt._id);
    let count = Number(valueCounts?.[id]) || 0;
    const nameKey = String(opt.name || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    const nameArKey = String(opt.nameAr || "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");
    if (nameKey) count += byNormalized[nameKey] || 0;
    if (nameArKey && nameArKey !== nameKey) {
      count += byNormalized[nameArKey] || 0;
    }
    result[id] = count;
  }
  return result;
}

async function aggregateColorCounts(Model, baseQuery, field = "colors") {
  const rows = await Model.aggregate([
    { $match: baseQuery },
    { $unwind: { path: "$" + field, preserveNullAndEmptyArrays: false } },
    {
      $group: {
        _id: {
          $toLower: { $trim: { input: { $ifNull: ["$" + field, ""] } } },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: "" } } },
  ]);
  const map = {};
  for (const row of rows) {
    map[String(row._id)] = row.count;
  }
  return map;
}

async function activeFabricShopCatalogFilter() {
  const activeShopIds = await FabricShop.find({ isActive: true }).distinct(
    "_id",
  );
  return {
    $or: [
      { fabricShopId: null },
      { fabricShopId: { $exists: false } },
      { fabricShopId: { $in: activeShopIds } },
    ],
  };
}

const toShopInfo = (shop) => {
  if (!shop || typeof shop !== "object" || !shop._id) return null;
  return {
    _id: shop._id,
    name: shop.name || "",
    nameAr: shop.nameAr || "",
    slug: shop.slug || "",
  };
};

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

// GET /api/addons — paginated catalog
addOnRoutes.get("/", async (req, res) => {
  try {
    const {
      categories,
      materials,
      designs,
      patterns,
      seasons,
      tags,
      colors,
      minPrice,
      maxPrice,
      inStockOnly,
      fabricShopId,
      sort = "newest",
      page = 1,
      limit = CATALOG_DEFAULT_LIMIT,
    } = req.query;

    const filter = {
      isActive: true,
      ...(await activeFabricShopCatalogFilter()),
    };

    if (fabricShopId) {
      filter.fabricShopId = fabricShopId;
    }

    const settings = await PlatformSettings.getSettings();
    const fabricCommission =
      Number(settings.motdCommissionFromFabricStore) || 0;
    const commissionFactor =
      1 + Math.min(100, Math.max(0, fabricCommission)) / 100;

    const parsedMin = Number(minPrice);
    const parsedMax = Number(maxPrice);
    if (Number.isFinite(parsedMin) || Number.isFinite(parsedMax)) {
      filter.price = {};
      if (Number.isFinite(parsedMin) && parsedMin > 0) {
        filter.price.$gte = Number((parsedMin / commissionFactor).toFixed(2));
      }
      if (Number.isFinite(parsedMax)) {
        filter.price.$lte = Number((parsedMax / commissionFactor).toFixed(2));
      }
      if (Object.keys(filter.price).length === 0) {
        delete filter.price;
      }
    }

    if (String(inStockOnly) === "true" || inStockOnly === true) {
      filter.stock = { $gt: 0 };
    }

    // Facet counts use catalog visibility + price (not other filter chips).
    // Shallow-clone so ObjectIds in $or/$in stay ObjectIds (JSON clone breaks facets).
    const facetBaseQuery = { ...filter };
    if (Array.isArray(filter.$and)) facetBaseQuery.$and = [...filter.$and];
    if (Array.isArray(filter.$or)) facetBaseQuery.$or = [...filter.$or];

    const pushBilingual = async (Model, raw, fields) => {
      const values = parseQueryList(raw);
      if (values.length === 0) return;
      const resolved = await resolveCatalogValues(Model, values);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: fields.flatMap((field) => [
          { [field]: { $in: resolved } },
          { [field + "Ar"]: { $in: resolved } },
        ]),
      });
    };

    await pushBilingual(Category, categories, ["category"]);
    await pushBilingual(Material, materials, ["material"]);
    await pushBilingual(
      Pattern,
      [designs, patterns].filter(Boolean).join(","),
      ["design", "pattern"],
    );
    await pushBilingual(Season, seasons, ["season"]);
    await pushBilingual(Tag, tags, ["tag"]);

    const colorValues = parseQueryList(colors);
    if (colorValues.length > 0) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: colorValues.map((color) => ({
          colors: { $elemMatch: { $regex: color, $options: "i" } },
        })),
      });
    }

    const limitNumber = Math.min(
      Math.max(Number(limit) || CATALOG_DEFAULT_LIMIT, 1),
      CATALOG_MAX_LIMIT,
    );
    const pageNumber = Math.max(Number(page) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortKey = String(sort || "newest");
    const sortSpec =
      sortKey === "price-low"
        ? { price: 1, createdAt: -1 }
        : sortKey === "price-high"
          ? { price: -1, createdAt: -1 }
          : { createdAt: -1 };

    const catalogDomainFilter = {
      isActive: true,
      $or: [
        { domain: "add-ons" },
        { domain: "general" },
        { domain: { $exists: false } },
      ],
    };

    const [
      products,
      total,
      categoryDocs,
      materialDocs,
      patternDocs,
      seasonDocs,
      tagDocs,
      categoryValueCounts,
      materialValueCounts,
      designValueCounts,
      patternValueCounts,
      seasonValueCounts,
      tagValueCounts,
      colorValueCounts,
    ] = await Promise.all([
      AddOn.find(filter)
        .populate("fabricShopId", "_id name nameAr slug")
        .sort(sortSpec)
        .skip(skip)
        .limit(limitNumber),
      AddOn.countDocuments(filter),
      Category.find(catalogDomainFilter).select("name nameAr").lean(),
      Material.find(catalogDomainFilter).select("name nameAr").lean(),
      Pattern.find(catalogDomainFilter).select("name nameAr").lean(),
      Season.find(catalogDomainFilter).select("name nameAr").lean(),
      Tag.find(catalogDomainFilter).select("name nameAr").lean(),
      aggregateFieldCounts(AddOn, facetBaseQuery, "category"),
      aggregateFieldCounts(AddOn, facetBaseQuery, "material"),
      aggregateFieldCounts(AddOn, facetBaseQuery, "design"),
      aggregateFieldCounts(AddOn, facetBaseQuery, "pattern"),
      aggregateFieldCounts(AddOn, facetBaseQuery, "season"),
      aggregateFieldCounts(AddOn, facetBaseQuery, "tag"),
      aggregateColorCounts(AddOn, facetBaseQuery, "colors"),
    ]);

    const designFacetCounts = mergeCountMaps(
      designValueCounts,
      patternValueCounts,
    );

    const facets = {
      categories: mapCountsToOptionIds(categoryValueCounts, categoryDocs),
      materials: mapCountsToOptionIds(materialValueCounts, materialDocs),
      designs: mapCountsToOptionIds(designFacetCounts, patternDocs),
      patterns: mapCountsToOptionIds(designFacetCounts, patternDocs),
      seasons: mapCountsToOptionIds(seasonValueCounts, seasonDocs),
      tags: mapCountsToOptionIds(tagValueCounts, tagDocs),
      colors: colorValueCounts,
    };

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      items: products.map((p) =>
        withCustomerAddonPrice(toListItem(p), fabricCommission),
      ),
      facets,
    });
  } catch (error) {
    console.error("GET /api/addons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch addons",
    });
  }
});

// GET /api/addons/trending — lean home-carousel payload (small limit)
addOnRoutes.get("/trending", async (req, res) => {
  try {
    const { limit = TRENDING_DEFAULT_LIMIT } = req.query;
    const limitNumber = Math.min(
      Math.max(Number(limit) || TRENDING_DEFAULT_LIMIT, 1),
      TRENDING_MAX_LIMIT,
    );

    const filter = {
      isActive: true,
      ...(await activeFabricShopCatalogFilter()),
    };

    const products = await AddOn.find(filter)
      .populate("fabricShopId", "_id name nameAr slug")
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .select(
        "slug name nameAr description descriptionAr price stock thumbnailImage images tag tagAr fabricShopId ownerName",
      );

    const settings = await PlatformSettings.getSettings();
    const fabricCommission =
      Number(settings.motdCommissionFromFabricStore) || 0;

    const items = products.map((p) => {
      const fabricShop = toShopInfo(p.fabricShopId);
      return withCustomerAddonPrice(
        {
          _id: p._id,
          slug: p.slug,
          name: p.name,
          nameAr: p.nameAr,
          description: p.description,
          descriptionAr: p.descriptionAr,
          price: p.price,
          stock: p.stock,
          thumbnailImage: p.thumbnailImage,
          images: p.images,
          tag: p.tag,
          tagAr: p.tagAr,
          fabricShopId: fabricShop?._id
            ? String(fabricShop._id)
            : p.fabricShopId
              ? String(p.fabricShopId._id || p.fabricShopId)
              : null,
          fabricShop,
          ownerName: p.ownerName || "MOTD Admin",
        },
        fabricCommission,
      );
    });

    res.json({
      success: true,
      total: items.length,
      limit: limitNumber,
      items,
    });
  } catch (error) {
    console.error("GET /api/addons/trending error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending addons",
    });
  }
});

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
    if (shop && typeof shop === "object" && shop.isActive === false) {
      return res.status(404).json({
        success: false,
        message: "Addon not found",
      });
    }

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
      ...(await activeFabricShopCatalogFilter()),
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

    const settings = await PlatformSettings.getSettings();
    const fabricCommission =
      Number(settings.motdCommissionFromFabricStore) || 0;

    const related = scored
      .slice(0, relatedLimit)
      .map(({ item }) => withCustomerAddonPrice(toListItem(item), fabricCommission));

    const item = withCustomerAddonPrice(
      {
        ...addon.toObject(),
        fabricShopId: shopKey || null,
        fabricShop,
      },
      fabricCommission,
    );

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
