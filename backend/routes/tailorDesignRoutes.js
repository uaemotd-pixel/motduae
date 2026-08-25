import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Design from "../models/Design.js";
import TailorShop from "../models/TailorShop.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { deleteTailorDesignUpload } from "../utils/uploads.js";
import { ensureUniqueSlug } from "../utils/uniqueSlug.js";

const tailorDesignRouter = express.Router();

const DESIGN_FIELDS = [
  "name",
  "nameAr",
  "slug",
  "description",
  "descriptionAr",
  "images",
  "category",
  "basePrice",
  "priceType",
  "tailoringFee",
  "estimatedMeters",
  "estimatedDays",
  "isActive",
];

const formatDesign = (design) => ({
  _id: design._id,
  tailorShopId: design.tailorShopId,
  slug: design.slug,
  name: design.name,
  nameAr: design.nameAr,
  description: design.description,
  descriptionAr: design.descriptionAr,
  images: design.images,
  category: design.category,
  basePrice: design.basePrice,
  priceType: design.priceType,
  tailoringFee: design.tailoringFee,
  estimatedMeters: design.estimatedMeters,
  estimatedDays: design.estimatedDays,
  isActive: design.isActive,
  createdAt: design.createdAt,
  updatedAt: design.updatedAt,
});

const resolveOwnShop = async (req, res) => {
  const shop = await TailorShop.findOne({ ownerId: req.user._id });
  if (!shop) {
    res.status(404).json({
      success: false,
      message: "Tailor shop not found",
    });
    return null;
  }
  return shop;
};

const slugifyDesignName = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

const pickDesignFields = (body) => {
  const data = {};

  for (const field of DESIGN_FIELDS) {
    if (body[field] === undefined) continue;

    if (field === "images") {
      data.images = Array.isArray(body.images)
        ? body.images.map((image) => String(image).trim()).filter(Boolean)
        : body.images;
      continue;
    }

    if (field === "category") {
      data.category = String(body.category).trim();
      continue;
    }

    if (
      [
        "basePrice",
        "tailoringFee",
        "estimatedMeters",
        "estimatedDays",
      ].includes(field)
    ) {
      data[field] = Number(body[field]);
      continue;
    }

    if (typeof body[field] === "string") {
      data[field] = body[field].trim();
      continue;
    }

    data[field] = body[field];
  }

  // Slug is always derived from the English name (spaces → dashes)
  if (data.name !== undefined) {
    data.slug = slugifyDesignName(data.name);
  } else if (data.slug) {
    data.slug = data.slug.toLowerCase();
  }

  return data;
};

const validateDesignPayload = (data, { requireCore = false } = {}) => {
  if (requireCore) {
    const required = [
      "name",
      "nameAr",
      "slug",
      "category",
      "basePrice",
      "tailoringFee",
      "estimatedMeters",
    ];

    for (const field of required) {
      if (
        data[field] === undefined ||
        data[field] === null ||
        data[field] === ""
      ) {
        return `${field} is required`;
      }
    }

    if (!Array.isArray(data.images) || data.images.length === 0) {
      return "At least one image is required";
    }
  }

  if (data.name !== undefined && !slugifyDesignName(data.name)) {
    return "name must include at least one letter or number for the URL";
  }

  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    return "slug must be lowercase letters, numbers, and hyphens only";
  }

  if (data.images !== undefined) {
    if (!Array.isArray(data.images) || data.images.length === 0) {
      return "At least one image is required";
    }
  }

  for (const field of ["basePrice", "tailoringFee"]) {
    if (data[field] !== undefined) {
      if (!Number.isFinite(data[field]) || data[field] < 0) {
        return `${field} must be a non-negative number`;
      }
    }
  }

  if (data.priceType !== undefined) {
    if (!["fixed", "per_meter"].includes(data.priceType)) {
      return "priceType must be either fixed or per_meter";
    }
  }

  if (data.estimatedMeters !== undefined) {
    if (!Number.isFinite(data.estimatedMeters) || data.estimatedMeters <= 0) {
      return "estimatedMeters must be greater than 0";
    }
  }

  if (data.estimatedDays !== undefined) {
    if (!Number.isFinite(data.estimatedDays) || data.estimatedDays < 1) {
      return "estimatedDays must be at least 1";
    }
  }

  return null;
};

const findOwnDesign = async (shopId, designId, res) => {
  if (!mongoose.Types.ObjectId.isValid(designId)) {
    res.status(404).json({
      success: false,
      message: "Design not found",
    });
    return null;
  }

  const design = await Design.findOne({
    _id: designId,
    tailorShopId: shopId,
  });

  if (!design) {
    res.status(404).json({
      success: false,
      message: "Design not found",
    });
    return null;
  }

  return design;
};

const cleanupRemovedDesignImages = async (
  previousImages = [],
  nextImages = [],
) => {
  const nextSet = new Set(nextImages);
  for (const image of previousImages) {
    if (!nextSet.has(image)) {
      await deleteTailorDesignUpload(image);
    }
  }
};

const cleanupAllDesignImages = async (images = []) => {
  for (const image of images) {
    await deleteTailorDesignUpload(image);
  }
};

// GET /api/tailor/designs — list own shop designs
tailorDesignRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const designs = await Design.find({ tailorShopId: shop._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      items: designs.map(formatDesign),
      total: designs.length,
    });
  }),
);

// POST /api/tailor/designs — create design for own shop
tailorDesignRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const data = pickDesignFields(req.body);

    if (
      data.tailoringFee === undefined ||
      data.tailoringFee === null ||
      Number.isNaN(data.tailoringFee)
    ) {
      const settings = await PlatformSettings.getSettings();
      data.tailoringFee = Number(settings.defaultTailoringFee || 0);
    }

    const validationError = validateDesignPayload(data, { requireCore: true });
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    data.slug = await ensureUniqueSlug(Design, data.slug || data.name, {
      extraFilter: { tailorShopId: shop._id },
      fallback: "design",
    });

    const design = await Design.create({
      ...data,
      tailorShopId: shop._id,
    });

    res.status(201).json({
      success: true,
      item: formatDesign(design),
    });
  }),
);

// PUT /api/tailor/designs/:id — update own design
tailorDesignRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const design = await findOwnDesign(shop._id, req.params.id, res);
    if (!design) return;

    const data = pickDesignFields(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: "No design fields provided to update",
      });
      return;
    }

    const validationError = validateDesignPayload(data);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    if (data.slug && data.slug !== design.slug) {
      data.slug = await ensureUniqueSlug(Design, data.slug, {
        excludeId: design._id,
        extraFilter: { tailorShopId: shop._id },
        fallback: "design",
      });
    }

    const previousImages = [...(design.images || [])];

    Object.assign(design, data);
    const updatedDesign = await design.save();

    await cleanupRemovedDesignImages(
      previousImages,
      updatedDesign.images || [],
    );

    res.json({
      success: true,
      item: formatDesign(updatedDesign),
    });
  }),
);

// DELETE /api/tailor/designs/:id — delete own design
tailorDesignRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const design = await findOwnDesign(shop._id, req.params.id, res);
    if (!design) return;

    await cleanupAllDesignImages(design.images || []);
    await design.deleteOne();

    res.json({
      success: true,
      message: "Design deleted successfully",
    });
  }),
);

export default tailorDesignRouter;
