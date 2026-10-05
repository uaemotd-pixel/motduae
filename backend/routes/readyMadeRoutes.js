import express from "express";
import mongoose from "mongoose";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import FabricShop from "../models/FabricShop.js";
import Category from "../models/Category.js";
import Material from "../models/Material.js";
import Pattern from "../models/Pattern.js";
import Season from "../models/Season.js";
import Tag from "../models/Tag.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { withCustomerReadyMadePrice } from "../utils/motdCommission.js";

const readyMadeRoutes = express.Router();

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

function toReadyMadeListItem(p, fabricCommission) {
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

  return withCustomerReadyMadePrice(
    {
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
      minAge: Number.isFinite(Number(p.minAge)) ? Number(p.minAge) : 0,
      maxAge: Number.isFinite(Number(p.maxAge)) ? Number(p.maxAge) : 0,
      fabricShopId: shop?._id
        ? String(shop._id)
        : p.fabricShopId
          ? String(p.fabricShopId)
          : null,
      fabricShop: shop,
      ownerName: p.ownerName || "",
    },
    fabricCommission,
  );
}

// GET /api/ready-made — paginated catalog
readyMadeRoutes.get("/", async (req, res) => {
  try {
    const {
      size,
      categories,
      materials,
      patterns,
      seasons,
      tags,
      colors,
      minPrice,
      maxPrice,
      minAge,
      maxAge,
      inStockOnly,
      sort = "newest",
      page = 1,
      limit = CATALOG_DEFAULT_LIMIT,
    } = req.query;

    const filter = {
      isActive: true,
      ...(await activeFabricShopCatalogFilter()),
    };

    if (size) {
      filter.size = String(size).trim();
    }

    const settings = await PlatformSettings.getSettings();
    const fabricCommission =
      Number(settings.motdCommissionFromFabricStore) || 0;
    const commissionFactor =
      1 + Math.min(100, Math.max(0, fabricCommission)) / 100;

    const parsedMin = Number(minPrice);
    const parsedMax = Number(maxPrice);
    if (Number.isFinite(parsedMin) || Number.isFinite(parsedMax)) {
      filter.finalSellingPriceAED = {};
      if (Number.isFinite(parsedMin) && parsedMin > 0) {
        filter.finalSellingPriceAED.$gte = Number(
          (parsedMin / commissionFactor).toFixed(2),
        );
      }
      if (Number.isFinite(parsedMax)) {
        filter.finalSellingPriceAED.$lte = Number(
          (parsedMax / commissionFactor).toFixed(2),
        );
      }
      if (Object.keys(filter.finalSellingPriceAED).length === 0) {
        delete filter.finalSellingPriceAED;
      }
    }

    const parsedMinAge = Number(minAge);
    const parsedMaxAge = Number(maxAge);
    if (
      (Number.isFinite(parsedMinAge) && parsedMinAge > 0) ||
      (Number.isFinite(parsedMaxAge) && parsedMaxAge < 150)
    ) {
      filter.$and = filter.$and || [];
      if (Number.isFinite(parsedMaxAge)) {
        filter.$and.push({ minAge: { $lte: parsedMaxAge } });
      }
      if (Number.isFinite(parsedMinAge)) {
        filter.$and.push({ maxAge: { $gte: parsedMinAge } });
      }
    }

    if (String(inStockOnly) === "true" || inStockOnly === true) {
      filter.availableFabricStock = { $gt: 0 };
    }

    // Facet counts use catalog visibility + price (not other filter chips).
    // Shallow-clone so ObjectIds in $or/$in stay ObjectIds (JSON clone breaks facets).
    const facetBaseQuery = { ...filter };
    if (Array.isArray(filter.$and)) facetBaseQuery.$and = [...filter.$and];
    if (Array.isArray(filter.$or)) facetBaseQuery.$or = [...filter.$or];

    const pushBilingual = async (Model, raw, enField, arField) => {
      const values = parseQueryList(raw);
      if (values.length === 0) return;
      const resolved = await resolveCatalogValues(Model, values);
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { [enField]: { $in: resolved } },
          { [arField]: { $in: resolved } },
        ],
      });
    };

    await pushBilingual(Category, categories, "category", "categoryAr");
    await pushBilingual(Material, materials, "material", "materialAr");
    await pushBilingual(Pattern, patterns, "pattern", "patternAr");
    await pushBilingual(Season, seasons, "season", "seasonAr");
    await pushBilingual(Tag, tags, "tag", "tagAr");

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
        ? { finalSellingPriceAED: 1, createdAt: -1 }
        : sortKey === "price-high"
          ? { finalSellingPriceAED: -1, createdAt: -1 }
          : { createdAt: -1 };

    const catalogDomainFilter = {
      isActive: true,
      $or: [
        { domain: "ready-made" },
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
      patternValueCounts,
      seasonValueCounts,
      tagValueCounts,
      colorValueCounts,
    ] = await Promise.all([
      ReadyMadeProduct.find(filter)
        .populate("fabricShopId", "_id name nameAr slug")
        .sort(sortSpec)
        .skip(skip)
        .limit(limitNumber),
      ReadyMadeProduct.countDocuments(filter),
      Category.find(catalogDomainFilter).select("name nameAr").lean(),
      Material.find(catalogDomainFilter).select("name nameAr").lean(),
      Pattern.find(catalogDomainFilter).select("name nameAr").lean(),
      Season.find(catalogDomainFilter).select("name nameAr").lean(),
      Tag.find(catalogDomainFilter).select("name nameAr").lean(),
      aggregateFieldCounts(ReadyMadeProduct, facetBaseQuery, "category"),
      aggregateFieldCounts(ReadyMadeProduct, facetBaseQuery, "material"),
      aggregateFieldCounts(ReadyMadeProduct, facetBaseQuery, "pattern"),
      aggregateFieldCounts(ReadyMadeProduct, facetBaseQuery, "season"),
      aggregateFieldCounts(ReadyMadeProduct, facetBaseQuery, "tag"),
      aggregateColorCounts(ReadyMadeProduct, facetBaseQuery, "colors"),
    ]);

    const facets = {
      categories: mapCountsToOptionIds(categoryValueCounts, categoryDocs),
      materials: mapCountsToOptionIds(materialValueCounts, materialDocs),
      patterns: mapCountsToOptionIds(patternValueCounts, patternDocs),
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
      items: products.map((p) => toReadyMadeListItem(p, fabricCommission)),
      facets,
    });
  } catch (error) {
    console.error("GET /api/ready-made error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ready-made products",
    });
  }
});

// GET /api/ready-made/trending — lean home-carousel payload (small limit)
readyMadeRoutes.get("/trending", async (req, res) => {
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

    const products = await ReadyMadeProduct.find(filter)
      .populate("fabricShopId", "_id name nameAr slug")
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .select(
        "slug images colors name nameAr description descriptionAr finalSellingPriceAED tag tagAr fabricType fabricTypeAr metersPerFabric availableFabricStock fabricShopId ownerName",
      );

    const settings = await PlatformSettings.getSettings();
    const fabricCommission =
      Number(settings.motdCommissionFromFabricStore) || 0;

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

      return withCustomerReadyMadePrice(
        {
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
    console.error("GET /api/ready-made/trending error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending ready-made products",
    });
  }
});

// GET ready-made by slug : fetch products by slug means by name, id or etc....
readyMadeRoutes.get("/:slug", async (req, res) => {
    try {
        const { slug } = req.params;

        const product = await ReadyMadeProduct.findOne({
            slug: slug.toLowerCase(),
            isActive: true
        })
        .populate("fabricId", "slug name nameAr")
        .populate("designId", "slug name nameAr")
        .populate("fabricShopId", "_id name nameAr slug isActive");

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            })
        }

        const linkedShop = product.fabricShopId;
        if (
            linkedShop &&
            typeof linkedShop === "object" &&
            linkedShop.isActive === false
        ) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const relatedLimit = 8;
        const candidates = await ReadyMadeProduct.find({
            isActive: true,
            _id: { $ne: product._id },
            ...(await activeFabricShopCatalogFilter()),
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

        const settings = await PlatformSettings.getSettings();
        const fabricCommission =
            Number(settings.motdCommissionFromFabricStore) || 0;

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

            return withCustomerReadyMadePrice(
                {
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
                },
                fabricCommission,
            );
        });

        res.json({
            success: true,
            item: withCustomerReadyMadePrice(product, fabricCommission),
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