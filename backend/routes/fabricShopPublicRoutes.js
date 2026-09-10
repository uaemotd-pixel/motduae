import express from "express";
import FabricShop from "../models/FabricShop.js";
import Fabric from "../models/Fabric.js";
import User from "../models/User.js";
import { enrichFabricWithCuts } from "../utils/fabricCuts.js";
import { publicShopSlugFilter } from "../utils/shopReady.js";

const fabricShopPublicRoutes = express.Router();

async function getApprovedFabricOwnerIds() {
  const owners = await User.find({
    role: "fabric_store",
    approvalStatus: "approved",
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

const toDetailItem = (shop) => ({
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
  owner: shop.ownerId
    ? {
        _id: shop.ownerId._id,
        name: shop.ownerId.name,
        role: shop.ownerId.role,
      }
    : null,
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt,
});

const toFabricListItem = (fabric) => ({
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
  fabricShopId: fabric.fabricShopId
    ? String(fabric.fabricShopId._id || fabric.fabricShopId)
    : null,
  minAge: fabric.minAge,
  maxAge: fabric.maxAge,
});

const isApprovedFabricOwner = (owner) =>
  owner?.role === "fabric_store" && owner?.approvalStatus === "approved";

async function findApprovedShopBySlug(slug) {
  const shop = await FabricShop.findOne({
    slug: String(slug || "").toLowerCase(),
    isActive: true,
  })
    .populate("ownerId", "_id name role approvalStatus")
    .select("-__v");

  if (!shop || !isApprovedFabricOwner(shop.ownerId)) {
    return null;
  }

  return shop;
}

// GET /api/fabric-shops — active shops whose owner is admin-approved
fabricShopPublicRoutes.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const approvedOwnerIds = await getApprovedFabricOwnerIds();

    const filter = {
      isActive: true,
      ownerId: { $in: approvedOwnerIds },
      ...publicShopSlugFilter(),
    };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [shops, total] = await Promise.all([
      FabricShop.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select("-__v"),
      FabricShop.countDocuments(filter),
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
    console.error("GET /api/fabric-shops error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fabric shops",
    });
  }
});

// GET /api/fabric-shops/:slug/fabrics — active fabrics for an approved shop
fabricShopPublicRoutes.get("/:slug/fabrics", async (req, res) => {
  try {
    const shop = await findApprovedShopBySlug(req.params.slug);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Fabric shop not found",
      });
    }

    const fabrics = await Fabric.find({
      isActive: true,
      fabricShopId: shop._id,
      "cuts.0": { $exists: true },
      $or: [{ isVariantOf: null }, { isVariantOf: { $exists: false } }],
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select("-__v");

    const enriched = await Promise.all(
      fabrics.map((fabric) => enrichFabricWithCuts(fabric)),
    );

    res.json({
      success: true,
      items: enriched.map(toFabricListItem),
    });
  } catch (error) {
    console.error("GET /api/fabric-shops/:slug/fabrics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shop fabrics",
    });
  }
});

// GET /api/fabric-shops/:slug — shop profile
fabricShopPublicRoutes.get("/:slug", async (req, res) => {
  try {
    const shop = await findApprovedShopBySlug(req.params.slug);
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Fabric shop not found",
      });
    }

    res.json({
      success: true,
      item: toDetailItem(shop),
    });
  } catch (error) {
    console.error("GET /api/fabric-shops/:slug error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch fabric shop",
    });
  }
});

export default fabricShopPublicRoutes;
