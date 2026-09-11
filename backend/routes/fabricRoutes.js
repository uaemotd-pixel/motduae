import express from "express";
import Fabric from "../models/Fabric.js";
import Material from "../models/Material.js";
import { enrichFabricWithCuts } from "../utils/fabricCuts.js";

const fabricRoutes = express.Router();

const toListItem = (fabric) => ({
  _id: fabric._id,
  slug: fabric.slug,
  name: fabric.name,
  nameAr: fabric.nameAr,
  description: fabric.description,
  descriptionAr: fabric.descriptionAr,
  images: fabric.images,
  material: fabric.material,
  materialAr: fabric.materialAr,
  category: fabric.category || "",
  categoryAr: fabric.categoryAr || "",
  pattern: fabric.pattern || "",
  patternAr: fabric.patternAr || "",
  season: fabric.season || "",
  seasonAr: fabric.seasonAr || "",
  color: fabric.colors,
  city: fabric.city,
  tag: fabric.tag,
  tagAr: fabric.tagAr,
  tagColor: fabric.tagColor,
  cuts: fabric.cuts || [],
  pricePerMeter: fabric.pricePerMeter,
  listedByStore: fabric.fabricShopId
    ? {
        _id: fabric.fabricShopId._id,
        name: fabric.fabricShopId.name,
        nameAr: fabric.fabricShopId.nameAr || "",
        slug: fabric.fabricShopId.slug || "",
        role: "fabric_store",
      }
    : fabric.listedByStore
      ? {
          _id: fabric.listedByStore._id,
          name: fabric.listedByStore.name,
          nameAr: fabric.listedByStore.nameAr || "",
          slug: fabric.listedByStore.slug || "",
          role: fabric.listedByStore.role,
        }
      : null,
  stockInMeters: fabric.stockInMeters,
  fabricShopId: fabric.fabricShopId
    ? String(fabric.fabricShopId._id || fabric.fabricShopId)
    : fabric.listedByStore
      ? String(fabric.listedByStore._id || fabric.listedByStore)
      : null,
});

// GET /api/fabrics/materials — public list of active materials
fabricRoutes.get("/materials", async (req, res) => {
  try {
    const materials = await Material.find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .select("name nameAr sortOrder");

    // Merge legacy hardcoded materials that don't exist in DB yet
    const dbValues = new Set(materials.map((m) => m.name.toLowerCase()));
    const missing = FABRIC_MATERIALS.filter((m) => !dbValues.has(m));
    const legacyMaterials = missing.map((name) => ({
      name,
      nameAr: name,
      sortOrder: 999,
    }));

    res.json({
      success: true,
      data: [...materials, ...legacyMaterials],
    });
  } catch (error) {
    console.error("GET /api/fabrics/materials error:", error);
    // Fallback: return the hardcoded list as defaults
    res.json({
      success: true,
      data: FABRIC_MATERIALS.map((name) => ({
        name,
        nameAr: name,
        sortOrder: 999,
      })),
    });
  }
});

// GET /api/fabrics — active fabrics for homepage carousel and fabric selection
fabricRoutes.get("/", async (req, res) => {
  try {
    const { material, page = 1, limit = 20 } = req.query;
    const filter = {
      isActive: true,
      "cuts.0": { $exists: true },
      "cuts.stock": { $gt: 0 },
      $or: [
        { isVariantOf: null },
        { isVariantOf: { $exists: false } }
      ]
    };

    if (material) {
      const normalizedMaterial = material.trim().toLowerCase();
      filter.material = normalizedMaterial;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [fabrics, total] = await Promise.all([
      Fabric.find(filter)
        .populate("listedByStore", "_id name nameAr role slug")
        .populate("fabricShopId", "_id name nameAr slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select("-__v"),
      Fabric.countDocuments(filter),
    ]);

    const enriched = await Promise.all(
      fabrics.map((fabric) => enrichFabricWithCuts(fabric)),
    );

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      items: enriched.map(toListItem),
    });
  } catch (error) {
    console.error("GET /api/fabrics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fabrics",
    });
  }
});

const toDetailItem = (fabric) => ({
  _id: fabric._id,
  slug: fabric.slug,
  name: fabric.name,
  nameAr: fabric.nameAr,
  description: fabric.description,
  descriptionAr: fabric.descriptionAr,
  images: fabric.images,
  material: fabric.material,
  materialAr: fabric.materialAr,
  category: fabric.category || "",
  categoryAr: fabric.categoryAr || "",
  pattern: fabric.pattern || "",
  patternAr: fabric.patternAr || "",
  season: fabric.season || "",
  seasonAr: fabric.seasonAr || "",
  color: fabric.colors,
  city: fabric.city,
  tag: fabric.tag,
  tagAr: fabric.tagAr,
  tagColor: fabric.tagColor,
  cuts: fabric.cuts || [],
  pricePerMeter: fabric.pricePerMeter,
  stockInMeters: fabric.stockInMeters,
  storePickupAddress: fabric.storePickupAddress,
  listedByStore: fabric.fabricShopId
    ? {
        _id: fabric.fabricShopId._id,
        name: fabric.fabricShopId.name,
        nameAr: fabric.fabricShopId.nameAr || "",
        slug: fabric.fabricShopId.slug || "",
        role: "fabric_store",
      }
    : fabric.listedByStore
      ? {
          _id: fabric.listedByStore._id,
          name: fabric.listedByStore.name,
          nameAr: fabric.listedByStore.nameAr || "",
          slug: fabric.listedByStore.slug || "",
          role: fabric.listedByStore.role,
        }
      : null,
  fabricShopId: fabric.fabricShopId
    ? String(fabric.fabricShopId._id || fabric.fabricShopId)
    : fabric.listedByStore
      ? String(fabric.listedByStore._id || fabric.listedByStore)
      : null,
  createdAt: fabric.createdAt,
  updatedAt: fabric.updatedAt,
});

// GET /api/fabrics/:slug — single fabric with store attribution and pickup address
fabricRoutes.get("/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const fabric = await Fabric.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    })
      .populate("listedByStore", "_id name nameAr role slug")
      .populate("fabricShopId", "_id name nameAr slug")
      .select("-__v");

    if (!fabric) {
      return res.status(404).json({
        success: false,
        message: "Fabric not found",
      });
    }

    const parentId = fabric.isVariantOf || fabric._id;
    const variants = await Fabric.find({
      $or: [
        { _id: parentId },
        { isVariantOf: parentId }
      ],
      isActive: true,
    }).select("_id name nameAr slug images colors material");

    const enrichedFabric = await enrichFabricWithCuts(fabric);
    if (!enrichedFabric.cuts?.length) {
      return res.status(404).json({
        success: false,
        message: "Fabric not found",
      });
    }
    const detailItem = toDetailItem(enrichedFabric);
    detailItem.variations = variants.map((v) => ({
      _id: v._id,
      slug: v.slug,
      name: v.name,
      nameAr: v.nameAr,
      images: v.images,
      colors: v.colors,
      material: v.material,
    }));

    const variantIds = new Set(variants.map((v) => String(v._id)));
    variantIds.add(String(fabric._id));
    variantIds.add(String(parentId));

    const relatedLimit = 8;
    const shopId =
      fabric.fabricShopId?._id ||
      fabric.fabricShopId ||
      fabric.listedByStore?._id ||
      fabric.listedByStore ||
      null;

    const relatedFilter = {
      isActive: true,
      "cuts.0": { $exists: true },
      "cuts.stock": { $gt: 0 },
      _id: { $nin: [...variantIds] },
      $or: [{ isVariantOf: null }, { isVariantOf: { $exists: false } }],
    };

    const candidates = await Fabric.find(relatedFilter)
      .populate("listedByStore", "_id name nameAr role slug")
      .populate("fabricShopId", "_id name nameAr slug")
      .sort({ createdAt: -1 })
      .limit(48)
      .select("-__v");

    const fabricColors = new Set(
      (fabric.colors || [])
        .map((c) => String(c).trim().toLowerCase())
        .filter(Boolean),
    );
    const fabricMaterial = String(fabric.material || "")
      .trim()
      .toLowerCase();
    const fabricCategory = String(fabric.category || "")
      .trim()
      .toLowerCase();
    const fabricPattern = String(fabric.pattern || "")
      .trim()
      .toLowerCase();
    const fabricTag = String(fabric.tag || "")
      .trim()
      .toLowerCase();
    const fabricShopKey = shopId ? String(shopId) : "";

    const enrichedCandidates = await Promise.all(
      candidates.map((item) => enrichFabricWithCuts(item)),
    );

    const scored = enrichedCandidates
      .map((item) => {
        let score = 0;
        if (
          fabricMaterial &&
          String(item.material || "")
            .trim()
            .toLowerCase() === fabricMaterial
        ) {
          score += 4;
        }
        if (
          fabricCategory &&
          String(item.category || "")
            .trim()
            .toLowerCase() === fabricCategory
        ) {
          score += 3;
        }
        if (
          fabricPattern &&
          String(item.pattern || "")
            .trim()
            .toLowerCase() === fabricPattern
        ) {
          score += 3;
        }
        if (
          fabricTag &&
          String(item.tag || "")
            .trim()
            .toLowerCase() === fabricTag
        ) {
          score += 2;
        }
        const itemShop = item.fabricShopId
          ? String(item.fabricShopId._id || item.fabricShopId)
          : item.listedByStore
            ? String(item.listedByStore._id || item.listedByStore)
            : "";
        if (fabricShopKey && itemShop && fabricShopKey === itemShop) {
          score += 2;
        }
        const sharedColor = (item.colors || []).some((c) =>
          fabricColors.has(String(c).trim().toLowerCase()),
        );
        if (sharedColor) score += 2;
        if (String(item.city || "").toLowerCase() === String(fabric.city || "").toLowerCase() && fabric.city) {
          score += 1;
        }
        return { item, score };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (
          new Date(b.item.createdAt).getTime() -
          new Date(a.item.createdAt).getTime()
        );
      });

    const related = scored
      .slice(0, relatedLimit)
      .map(({ item }) => toListItem(item));

    res.json({
      success: true,
      item: detailItem,
      related,
    });
  } catch (error) {
    console.error("GET /api/fabrics/:slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fabric",
    });
  }
});

export default fabricRoutes;
