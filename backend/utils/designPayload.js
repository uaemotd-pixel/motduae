import mongoose from "mongoose";
import Design from "../models/Design.js";
import Cut from "../models/Cut.js";
import PlatformSettings from "../models/PlatformSettings.js";
import { deleteTailorDesignUpload } from "./uploads.js";
import { ensureUniqueSlug } from "./uniqueSlug.js";
import { cutValueToMeters } from "./fabricUnits.js";

export const DESIGN_FIELDS = [
  "name",
  "nameAr",
  "slug",
  "description",
  "descriptionAr",
  "images",
  "category",
  "categoryAr",
  "material",
  "materialAr",
  "season",
  "seasonAr",
  "pattern",
  "patternAr",
  "tag",
  "tagAr",
  "basePrice",
  "priceType",
  "tailoringFee",
  "minCutId",
  "estimatedMeters",
  "estimatedDays",
  "minAge",
  "maxAge",
  "isActive",
];

export const formatDesign = (design) => ({
  _id: design._id,
  tailorShopId: design.tailorShopId,
  slug: design.slug,
  name: design.name,
  nameAr: design.nameAr,
  description: design.description,
  descriptionAr: design.descriptionAr,
  images: design.images,
  category: design.category,
  categoryAr: design.categoryAr || "",
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
  minCutId: design.minCutId?._id || design.minCutId || null,
  minCutSnapshot: design.minCutSnapshot || null,
  minCut: design.minCutSnapshot || null,
  estimatedMeters:
    design.minCutSnapshot?.lengthInMeters ?? (design.estimatedMeters || 0),
  estimatedDays: design.estimatedDays,
  minAge: Number.isFinite(Number(design.minAge)) ? Number(design.minAge) : 0,
  maxAge: Number.isFinite(Number(design.maxAge)) ? Number(design.maxAge) : 0,
  isActive: design.isActive,
  createdAt: design.createdAt,
  updatedAt: design.updatedAt,
});

export const slugifyDesignName = (name) =>
  String(name || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const pickDesignFields = (body) => {
  const data = {};

  for (const field of DESIGN_FIELDS) {
    if (body[field] === undefined) continue;

    if (field === "images") {
      data.images = Array.isArray(body.images)
        ? body.images.map((image) => String(image).trim()).filter(Boolean)
        : body.images;
      continue;
    }

    if (field === "minCutId") {
      data.minCutId = String(body.minCutId || "").trim();
      continue;
    }

    if (field === "category") {
      data.category = String(body.category).trim();
      continue;
    }

    if (field === "categoryAr") {
      data.categoryAr = String(body.categoryAr ?? "").trim();
      continue;
    }

    if (
      [
        "material",
        "materialAr",
        "season",
        "seasonAr",
        "pattern",
        "patternAr",
        "tag",
        "tagAr",
      ].includes(field)
    ) {
      data[field] = String(body[field] ?? "").trim();
      continue;
    }

    if (
      [
        "basePrice",
        "tailoringFee",
        "estimatedMeters",
        "estimatedDays",
        "minAge",
        "maxAge",
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

  if (data.name !== undefined) {
    data.slug = slugifyDesignName(data.name);
  } else if (data.slug) {
    data.slug = data.slug.toLowerCase();
  }

  return data;
};

export const validateDesignPayload = (data, { requireCore = false } = {}) => {
  if (requireCore) {
    const required = [
      "name",
      "nameAr",
      "slug",
      "category",
      "basePrice",
      "tailoringFee",
      "minCutId",
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

  if (data.minCutId !== undefined) {
    if (!data.minCutId || !mongoose.Types.ObjectId.isValid(data.minCutId)) {
      return "Valid minCutId is required";
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

  if (data.estimatedDays !== undefined) {
    if (!Number.isFinite(data.estimatedDays) || data.estimatedDays < 1) {
      return "estimatedDays must be at least 1";
    }
  }

  for (const field of ["minAge", "maxAge"]) {
    if (data[field] !== undefined) {
      if (
        !Number.isFinite(data[field]) ||
        data[field] < 0 ||
        data[field] > 150 ||
        !Number.isInteger(data[field])
      ) {
        return `${field} must be a whole number between 0 and 150`;
      }
    }
  }

  if (
    data.minAge !== undefined &&
    data.maxAge !== undefined &&
    data.maxAge < data.minAge
  ) {
    return "Max age must be greater than or equal to min age";
  }

  return null;
};

export const applyMinCutToDesignData = async (data) => {
  if (!data.minCutId) return null;

  const cut = await Cut.findOne({ _id: data.minCutId, isActive: true });
  if (!cut) {
    return "Selected cut not found or is inactive";
  }

  const lengthInMeters = cutValueToMeters(cut.value, cut.unit);
  data.minCutId = cut._id;
  data.minCutSnapshot = {
    name: cut.name,
    nameAr: cut.nameAr || "",
    lengthInMeters,
  };
  data.estimatedMeters = lengthInMeters;
  return null;
};

export const applyCreateDefaults = async (data) => {
  if (
    data.tailoringFee === undefined ||
    data.tailoringFee === null ||
    Number.isNaN(data.tailoringFee)
  ) {
    const settings = await PlatformSettings.getSettings();
    data.tailoringFee = Number(settings.defaultTailoringFee || 0);
  }

  if (data.minAge === undefined || Number.isNaN(data.minAge)) {
    data.minAge = 0;
  }
  if (data.maxAge === undefined || Number.isNaN(data.maxAge)) {
    data.maxAge = 0;
  }
};

export const assignUniqueDesignSlug = async (
  data,
  shopId,
  { excludeId } = {},
) => {
  data.slug = await ensureUniqueSlug(Design, data.slug || data.name, {
    excludeId,
    extraFilter: { tailorShopId: shopId },
    fallback: "design",
  });
};

export const cleanupRemovedDesignImages = async (
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

export const cleanupAllDesignImages = async (images = []) => {
  for (const image of images) {
    await deleteTailorDesignUpload(image);
  }
};
