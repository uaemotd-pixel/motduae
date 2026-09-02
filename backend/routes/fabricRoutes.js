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
  color: fabric.colors,
  city: fabric.city,
  tag: fabric.tag,
  tagColor: fabric.tagColor,
  cuts: fabric.cuts || [],
  pricePerMeter: fabric.pricePerMeter,
  listedByStore: fabric.fabricShopId
    ? {
        _id: fabric.fabricShopId._id,
        name: fabric.fabricShopId.name,
        role: "fabric_store",
      }
    : fabric.listedByStore
      ? {
          _id: fabric.listedByStore._id,
          name: fabric.listedByStore.name,
          role: fabric.listedByStore.role,
        }
      : null,
  stockInMeters: fabric.stockInMeters,
  fabricShopId: fabric.fabricShopId
    ? String(fabric.fabricShopId._id || fabric.fabricShopId)
    : fabric.listedByStore
      ? String(fabric.listedByStore._id || fabric.listedByStore)
      : null,
  minAge: fabric.minAge,
  maxAge: fabric.maxAge,
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
        .populate("listedByStore", "_id name role")
        .populate("fabricShopId", "_id name")
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
  color: fabric.colors,
  city: fabric.city,
  tag: fabric.tag,
  tagColor: fabric.tagColor,
  cuts: fabric.cuts || [],
  pricePerMeter: fabric.pricePerMeter,
  stockInMeters: fabric.stockInMeters,
  minAge: fabric.minAge,
  maxAge: fabric.maxAge,
  storePickupAddress: fabric.storePickupAddress,
  listedByStore: fabric.fabricShopId
    ? {
        _id: fabric.fabricShopId._id,
        name: fabric.fabricShopId.name,
        role: "fabric_store",
      }
    : fabric.listedByStore
      ? {
          _id: fabric.listedByStore._id,
          name: fabric.listedByStore.name,
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
      .populate("listedByStore", "_id name role")
      .populate("fabricShopId", "_id name")
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
    }).select("_id name nameAr slug images colors material minAge maxAge");

    const enrichedFabric = await enrichFabricWithCuts(fabric);
    const detailItem = toDetailItem(enrichedFabric);
    detailItem.variations = variants.map(v => ({
      _id: v._id,
      slug: v.slug,
      name: v.name,
      nameAr: v.nameAr,
      images: v.images,
      colors: v.colors,
      material: v.material,
      minAge: v.minAge,
      maxAge: v.maxAge,
    }));

    res.json({
      success: true,
      item: detailItem,
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
