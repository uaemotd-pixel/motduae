import express from "express";
import mongoose from "mongoose";
import TailorShop from "../models/TailorShop.js";
import Design from "../models/Design.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import Material from "../models/Material.js";
import Pattern from "../models/Pattern.js";
import Season from "../models/Season.js";
import Tag from "../models/Tag.js";
import PartnerApplication from "../models/PartnerApplication.js";
import { normalizeSocialLinks } from "../services/partnerApplication/policy.js";
import { publicShopSlugFilter } from "../utils/shopReady.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { withCustomerDesignPrice } from "../utils/motdCommission.js";
import { computePartnerExperience } from "../utils/partnerExperience.js";

/** Home carousel only needs a small page; keep DB/network payload bounded. */
const TRENDING_DEFAULT_LIMIT = 8;
const TRENDING_MAX_LIMIT = 20;
const DESIGNS_DEFAULT_LIMIT = 12;
const DESIGNS_MAX_LIMIT = 100;

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

/** Aggregate design counts keyed by raw field value (name or id string). */
async function aggregateDesignFieldCounts(baseQuery, field) {
  const rows = await Design.aggregate([
    { $match: baseQuery },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  const map = {};
  for (const row of rows) {
    if (row._id == null || row._id === "") continue;
    map[String(row._id)] = row.count;
  }
  return map;
}

/** Map raw value counts onto catalog option ObjectIds (match id / name / nameAr). */
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

const tailorRoutes = express.Router();

async function getApprovedTailorOwnerIds() {
  const owners = await User.find({
    role: "tailor",
    approvalStatus: "approved",
    isActive: { $ne: false },
  }).select("_id");

  return owners.map((owner) => owner._id);
}

const toListItem = (shop) => ({
  _id: shop._id,
  slug: shop.slug,
  name: shop.name,
  nameAr: shop.nameAr,
  description: shop.description,
  descriptionAr: shop.descriptionAr,
  logo: shop.logo,
  coverImage: shop.coverImage,
  location: shop.location,
  city: shop.city,
  phone: shop.phone,
  rating: shop.rating,
  reviewCount: shop.reviewCount,
  ownerId: shop.ownerId,
});

// GET /api/tailors — active shops whose owner is admin-approved
tailorRoutes.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const approvedOwnerIds = await getApprovedTailorOwnerIds();

    const filter = {
      isActive: true,
      ownerId: { $in: approvedOwnerIds },
      ...publicShopSlugFilter(),
    };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [shops, total] = await Promise.all([
      TailorShop.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select("-__v -payoutBank"),
      TailorShop.countDocuments(filter),
    ]);

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      items: shops.map(toListItem),
    });
  } catch (error) {
    console.error("GET /api/tailors error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tailor shops",
    });
  }
});

const isApprovedTailorOwner = (owner) =>
  owner?.role === "tailor" &&
  owner?.approvalStatus === "approved" &&
  owner?.isActive !== false;

async function findApprovedShopBySlug(slug) {
  const shop = await TailorShop.findOne({
    slug: slug.toLowerCase(),
    isActive: true,
  })
    .populate("ownerId", "_id name role approvalStatus isActive")
    .select("-__v -payoutBank");

  if (!shop || !isApprovedTailorOwner(shop.ownerId)) {
    return null;
  }

  return shop;
}

const toDesignListItem = (design) => {
  const minCutId = design.minCutId?._id || design.minCutId || null;
  const lengthInMeters =
    design.minCutSnapshot?.lengthInMeters ??
    (design.estimatedMeters || 0);

  const snapshot = design.minCutSnapshot?.name
    ? {
        name: design.minCutSnapshot.name,
        nameAr: design.minCutSnapshot.nameAr || "",
        lengthInMeters,
      }
    : design.minCutId &&
        typeof design.minCutId === "object" &&
        design.minCutId.name
      ? {
          name: design.minCutId.name,
          nameAr: design.minCutId.nameAr || "",
          lengthInMeters,
        }
      : null;

  return {
    _id: design._id,
    slug: design.slug,
    name: design.name,
    nameAr: design.nameAr,
    description: design.description,
    descriptionAr: design.descriptionAr,
    images: design.images,
    category: design.category,
    material: design.material,
    materialAr: design.materialAr,
    season: design.season,
    seasonAr: design.seasonAr,
    pattern: design.pattern,
    patternAr: design.patternAr,
    tag: design.tag,
    tagAr: design.tagAr,
    basePrice: design.basePrice,
    priceType: design.priceType,
    tailoringFee: design.tailoringFee,
    minCutId,
    minCutSnapshot: snapshot,
    minCut: snapshot,
    estimatedMeters: lengthInMeters,
    estimatedDaysMin: Number.isFinite(Number(design.estimatedDaysMin))
      ? Number(design.estimatedDaysMin)
      : design.estimatedDays,
    estimatedDays: design.estimatedDays,
    estimatedTimeUnit:
      design.estimatedTimeUnit === "weeks" ? "weeks" : "days",
    minAge: Number.isFinite(Number(design.minAge)) ? Number(design.minAge) : 0,
    maxAge: Number.isFinite(Number(design.maxAge)) ? Number(design.maxAge) : 0,
  };
};

// GET /api/tailors/categories/designs — public endpoint to fetch design categories (no auth required)
tailorRoutes.get("/categories/designs", async (req, res) => {
  try {
    const categories = await Category.find({
      domain: "designs",
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name nameAr isActive");
    res.json(categories);
  } catch (error) {
    console.error("GET /api/tailors/categories/designs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});

// GET /api/tailors/designs/all — paginated active designs with tailor shop info
tailorRoutes.get("/designs/all", async (req, res) => {
  try {
    const {
      category,
      categories,
      materials,
      patterns,
      seasons,
      tags,
      minPrice,
      maxPrice,
      sort = "newest",
      page = 1,
      limit = DESIGNS_DEFAULT_LIMIT,
    } = req.query;

    const approvedOwnerIds = await getApprovedTailorOwnerIds();

    const approvedShops = await TailorShop.find({
      isActive: true,
      ownerId: { $in: approvedOwnerIds },
      ...publicShopSlugFilter(),
    }).select("_id slug name nameAr");

    const shopIds = approvedShops.map((s) => s._id);
    const shopMap = approvedShops.reduce((acc, shop) => {
      acc[shop._id.toString()] = shop;
      return acc;
    }, {});

    const query = {
      isActive: true,
      minCutId: { $exists: true, $ne: null },
      tailorShopId: { $in: shopIds },
    };

    // Price is applied to both listing + facet base so counts stay consistent
    const settings = await PlatformSettings.getSettings();
    const tailorCommission = Number(settings.motdCommissionFromTailor) || 0;
    const commissionFactor =
      1 + Math.min(100, Math.max(0, tailorCommission)) / 100;

    const parsedMin = Number(minPrice);
    const parsedMax = Number(maxPrice);
    if (Number.isFinite(parsedMin) || Number.isFinite(parsedMax)) {
      query.basePrice = {};
      if (Number.isFinite(parsedMin) && parsedMin > 0) {
        query.basePrice.$gte = Number(
          (parsedMin / commissionFactor).toFixed(2),
        );
      }
      if (Number.isFinite(parsedMax)) {
        query.basePrice.$lte = Number(
          (parsedMax / commissionFactor).toFixed(2),
        );
      }
      if (Object.keys(query.basePrice).length === 0) {
        delete query.basePrice;
      }
    }

    // Facet counts use catalog visibility + price (not other filter chips)
    const facetBaseQuery = { ...query };

    const categoryValues = [
      ...parseQueryList(categories),
      ...(category && category !== "all" ? [String(category)] : []),
    ];
    if (categoryValues.length > 0) {
      const resolved = await resolveCatalogValues(Category, categoryValues);
      query.category = resolved.length === 1 ? resolved[0] : { $in: resolved };
    }

    const materialValues = parseQueryList(materials);
    if (materialValues.length > 0) {
      const resolved = await resolveCatalogValues(Material, materialValues);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { material: { $in: resolved } },
          { materialAr: { $in: resolved } },
        ],
      });
    }

    const patternValues = parseQueryList(patterns);
    if (patternValues.length > 0) {
      const resolved = await resolveCatalogValues(Pattern, patternValues);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { pattern: { $in: resolved } },
          { patternAr: { $in: resolved } },
        ],
      });
    }

    const seasonValues = parseQueryList(seasons);
    if (seasonValues.length > 0) {
      const resolved = await resolveCatalogValues(Season, seasonValues);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [
          { season: { $in: resolved } },
          { seasonAr: { $in: resolved } },
        ],
      });
    }

    const tagValues = parseQueryList(tags);
    if (tagValues.length > 0) {
      const resolved = await resolveCatalogValues(Tag, tagValues);
      query.$and = query.$and || [];
      query.$and.push({
        $or: [{ tag: { $in: resolved } }, { tagAr: { $in: resolved } }],
      });
    }

    const limitNumber = Math.min(
      Math.max(Number(limit) || DESIGNS_DEFAULT_LIMIT, 1),
      DESIGNS_MAX_LIMIT,
    );
    const pageNumber = Math.max(Number(page) || 1, 1);
    const skip = (pageNumber - 1) * limitNumber;

    const sortKey = String(sort || "newest");
    const sortSpec =
      sortKey === "price-low"
        ? { basePrice: 1, createdAt: -1 }
        : sortKey === "price-high"
          ? { basePrice: -1, createdAt: -1 }
          : { createdAt: -1 };

    const [
      designs,
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
    ] = await Promise.all([
      Design.find(query)
        .sort(sortSpec)
        .skip(skip)
        .limit(limitNumber)
        .select("-__v"),
      Design.countDocuments(query),
      Category.find({ domain: "designs", isActive: true })
        .select("name nameAr")
        .lean(),
      Material.find({
        isActive: true,
        $or: [{ domain: "designs" }, { domain: "general" }, { domain: { $exists: false } }],
      })
        .select("name nameAr")
        .lean(),
      Pattern.find({
        isActive: true,
        $or: [{ domain: "designs" }, { domain: "general" }, { domain: { $exists: false } }],
      })
        .select("name nameAr")
        .lean(),
      Season.find({
        isActive: true,
        $or: [{ domain: "designs" }, { domain: "general" }, { domain: { $exists: false } }],
      })
        .select("name nameAr")
        .lean(),
      Tag.find({
        isActive: true,
        $or: [{ domain: "designs" }, { domain: "general" }, { domain: { $exists: false } }],
      })
        .select("name nameAr")
        .lean(),
      aggregateDesignFieldCounts(facetBaseQuery, "category"),
      aggregateDesignFieldCounts(facetBaseQuery, "material"),
      aggregateDesignFieldCounts(facetBaseQuery, "pattern"),
      aggregateDesignFieldCounts(facetBaseQuery, "season"),
      aggregateDesignFieldCounts(facetBaseQuery, "tag"),
    ]);

    const facets = {
      categories: mapCountsToOptionIds(categoryValueCounts, categoryDocs),
      materials: mapCountsToOptionIds(materialValueCounts, materialDocs),
      patterns: mapCountsToOptionIds(patternValueCounts, patternDocs),
      seasons: mapCountsToOptionIds(seasonValueCounts, seasonDocs),
      tags: mapCountsToOptionIds(tagValueCounts, tagDocs),
    };

    const items = designs.map((design) => {
      const shop = shopMap[design.tailorShopId.toString()];
      return {
        ...withCustomerDesignPrice(toDesignListItem(design), tailorCommission),
        tailorShopId: design.tailorShopId,
        tailorSlug: shop?.slug || "",
        tailorName: shop?.name || "",
        tailorNameAr: shop?.nameAr || "",
      };
    });

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      items,
      facets,
    });
  } catch (error) {
    console.error("GET /api/tailors/designs/all error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all designs",
    });
  }
});

// GET /api/tailors/designs/trending — lean home-carousel payload (small limit)
tailorRoutes.get("/designs/trending", async (req, res) => {
  try {
    const { category, limit = TRENDING_DEFAULT_LIMIT } = req.query;
    const approvedOwnerIds = await getApprovedTailorOwnerIds();

    const approvedShopIds = await TailorShop.find({
      isActive: true,
      ownerId: { $in: approvedOwnerIds },
      ...publicShopSlugFilter(),
    }).distinct("_id");

    const query = {
      isActive: true,
      minCutId: { $exists: true, $ne: null },
      tailorShopId: { $in: approvedShopIds },
    };

    if (category && category !== "all") {
      // Designs may store category as ObjectId string or display name
      const categoryValues = [String(category)];
      if (mongoose.Types.ObjectId.isValid(String(category))) {
        const catDoc = await Category.findById(category).select("name").lean();
        if (catDoc?.name) categoryValues.push(catDoc.name);
      }
      query.category =
        categoryValues.length > 1 ? { $in: categoryValues } : categoryValues[0];
    }

    const limitNumber = Math.min(
      Math.max(Number(limit) || TRENDING_DEFAULT_LIMIT, 1),
      TRENDING_MAX_LIMIT,
    );

    const designs = await Design.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .select(
        "slug name nameAr description descriptionAr images category basePrice priceType tailorShopId",
      )
      .lean();

    const uniqueShopIds = [
      ...new Set(designs.map((d) => String(d.tailorShopId))),
    ];
    const shops = await TailorShop.find({ _id: { $in: uniqueShopIds } })
      .select("slug name nameAr")
      .lean();
    const shopMap = shops.reduce((acc, shop) => {
      acc[shop._id.toString()] = shop;
      return acc;
    }, {});

    const settings = await PlatformSettings.getSettings();
    const tailorCommission = Number(settings.motdCommissionFromTailor) || 0;

    const items = designs.map((design) => {
      const shop = shopMap[String(design.tailorShopId)];
      return withCustomerDesignPrice(
        {
          _id: design._id,
          slug: design.slug,
          name: design.name,
          nameAr: design.nameAr,
          description: design.description,
          descriptionAr: design.descriptionAr,
          images: design.images,
          category: design.category,
          basePrice: design.basePrice,
          priceType: design.priceType,
          tailorSlug: shop?.slug || "",
          tailorName: shop?.name || "",
          tailorNameAr: shop?.nameAr || "",
        },
        tailorCommission,
      );
    });

    res.json({
      success: true,
      total: items.length,
      limit: limitNumber,
      items,
    });
  } catch (error) {
    console.error("GET /api/tailors/designs/trending error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch trending designs",
    });
  }
});

// GET /api/tailors/designs/:slug — fetch detailed design info by slug
tailorRoutes.get("/designs/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const design = await Design.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
      minCutId: { $exists: true, $ne: null },
    })
      .populate({ path: "tailorShopId", select: "-payoutBank" })
      .select("-__v");

    if (!design) {
      return res.status(404).json({
        success: false,
        message: "Design not found",
      });
    }

    const shop = design.tailorShopId;
    if (!shop || !shop.isActive) {
      return res.status(404).json({
        success: false,
        message: "Design shop is not active",
      });
    }

    const owner = await User.findById(shop.ownerId);
    if (
      !owner ||
      owner.role !== "tailor" ||
      owner.approvalStatus !== "approved"
    ) {
      return res.status(404).json({
        success: false,
        message: "Design shop owner is not approved",
      });
    }

    const relatedLimit = 8;
    const shopId = shop._id ? String(shop._id) : "";
    const category = String(design.category || "")
      .trim()
      .toLowerCase();
    const material = String(design.material || "")
      .trim()
      .toLowerCase();
    const season = String(design.season || "")
      .trim()
      .toLowerCase();
    const pattern = String(design.pattern || "")
      .trim()
      .toLowerCase();
    const tag = String(design.tag || "")
      .trim()
      .toLowerCase();

    const approvedOwnerIds = await getApprovedTailorOwnerIds();
    const approvedShops = await TailorShop.find({
      isActive: true,
      ownerId: { $in: approvedOwnerIds },
      ...publicShopSlugFilter(),
    }).select("_id slug name nameAr");

    const approvedShopIds = approvedShops.map((s) => s._id);
    const shopMap = approvedShops.reduce((acc, s) => {
      acc[String(s._id)] = s;
      return acc;
    }, {});

    const candidates = await Design.find({
      isActive: true,
      minCutId: { $exists: true, $ne: null },
      tailorShopId: { $in: approvedShopIds },
      _id: { $ne: design._id },
    })
      .sort({ createdAt: -1 })
      .limit(48)
      .select("-__v");

    const scored = candidates
      .map((item) => {
        let score = 0;
        if (
          category &&
          String(item.category || "")
            .trim()
            .toLowerCase() === category
        ) {
          score += 4;
        }
        if (
          material &&
          String(item.material || "")
            .trim()
            .toLowerCase() === material
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
          pattern &&
          String(item.pattern || "")
            .trim()
            .toLowerCase() === pattern
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
        if (shopId && item.tailorShopId && shopId === String(item.tailorShopId)) {
          score += 3;
        }
        return { item, score };
      })
      .sort((a, b) => b.score - a.score || 0);

    const settings = await PlatformSettings.getSettings();
    const tailorCommission = Number(settings.motdCommissionFromTailor) || 0;

    const related = scored.slice(0, relatedLimit).map(({ item }) => {
      const relatedShop = shopMap[String(item.tailorShopId)];
      return {
        ...withCustomerDesignPrice(toDesignListItem(item), tailorCommission),
        tailorShopId: item.tailorShopId,
        tailorSlug: relatedShop?.slug || "",
        tailorName: relatedShop?.name || "",
        tailorNameAr: relatedShop?.nameAr || "",
      };
    });

    res.json({
      success: true,
      item: {
        ...withCustomerDesignPrice(toDesignListItem(design), tailorCommission),
        tailorShop: {
          _id: shop._id,
          slug: shop.slug,
          name: shop.name,
          nameAr: shop.nameAr,
          logo: shop.logo,
          coverImage: shop.coverImage,
          location: shop.location,
          city: shop.city,
          phone: shop.phone,
          rating: shop.rating,
          reviewCount: shop.reviewCount,
        },
      },
      related,
    });
  } catch (error) {
    console.error("GET /api/tailors/designs/:slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch design details",
    });
  }
});

// GET /api/tailors/:slug/designs — active designs for an approved tailor shop
tailorRoutes.get("/:slug/designs", async (req, res) => {
  try {
    const { slug } = req.params;
    const shop = await findApprovedShopBySlug(slug);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Tailor shop not found",
      });
    }

    const designs = await Design.find({
      tailorShopId: shop._id,
      isActive: true,
      minCutId: { $exists: true, $ne: null },
    })
      .sort({ createdAt: -1 })
      .select("-__v");

    const settings = await PlatformSettings.getSettings();
    const tailorCommission = Number(settings.motdCommissionFromTailor) || 0;

    res.json({
      success: true,
      tailorSlug: shop.slug,
      tailorShopId: shop._id,
      total: designs.length,
      items: designs.map((design) =>
        withCustomerDesignPrice(toDesignListItem(design), tailorCommission),
      ),
    });
  } catch (error) {
    console.error("GET /api/tailors/:slug/designs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tailor designs",
    });
  }
});

const toDetailItem = (shop, extras = {}) => {
  const allowCustomerCalls = Boolean(shop.allowCustomerCalls);
  const allowCustomerSocial = Boolean(shop.allowCustomerSocial);
  const website = extras.website || shop.website || "";
  const social = Array.isArray(extras.social)
    ? extras.social
    : Array.isArray(shop.social)
      ? shop.social
      : [];

  return {
    _id: shop._id,
    slug: shop.slug,
    name: shop.name,
    nameAr: shop.nameAr,
    description: shop.description,
    descriptionAr: shop.descriptionAr,
    logo: shop.logo,
    coverImage: shop.coverImage,
    location: shop.location,
    city: shop.city,
    phone: allowCustomerCalls ? shop.phone : "",
    website: allowCustomerSocial ? website : "",
    social: allowCustomerSocial ? social : [],
    allowCustomerCalls,
    allowCustomerSocial,
    experience: extras.experience ?? null,
    rating: shop.rating,
    reviewCount: shop.reviewCount,
    owner: shop.ownerId
      ? {
          _id: shop.ownerId._id,
          name: shop.ownerId.name,
          role: shop.ownerId.role,
        }
      : null,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
  };
};

// GET /api/tailors/:slug — shop profile; 404 if inactive or owner not approved
tailorRoutes.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const shop = await findApprovedShopBySlug(slug);

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Tailor shop not found",
      });
    }

    const ownerId = shop.ownerId?._id || shop.ownerId;
    let website = shop.website || "";
    let social = Array.isArray(shop.social) ? shop.social : [];
    let experience = null;

    if (ownerId) {
      const application = await PartnerApplication.findOne({ ownerId })
        .select(
          "website social yearsOperating experienceYears experienceMonths experienceBaselineMonths experienceAnchorAt submittedAt createdAt",
        )
        .lean();
      if (application) {
        if (!website) website = application.website || "";
        if (!social.length) {
          social = normalizeSocialLinks(application.social);
        }
        experience = computePartnerExperience(application);
      }
    }

    social = normalizeSocialLinks(social);

    res.json({
      success: true,
      item: toDetailItem(shop, { website, social, experience }),
    });
  } catch (error) {
    console.error("GET /api/tailors/:slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tailor shop",
    });
  }
});

export default tailorRoutes;

