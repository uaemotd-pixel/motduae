import express from "express";
import Fabric, { FABRIC_MATERIALS } from "../models/Fabric.js";
import Material from "../models/Material.js";

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
    const filter = { isActive: true };

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

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      items: fabrics.map(toListItem),
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
  pricePerMeter: fabric.pricePerMeter,
  stockInMeters: fabric.stockInMeters,
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

    res.json({
      success: true,
      item: toDetailItem(fabric),
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
