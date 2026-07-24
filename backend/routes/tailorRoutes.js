import express from "express";
import jwt from "jsonwebtoken";
import TailorShop from "../models/TailorShop.js";
import Design from "../models/Design.js";
import Customer from "../models/customer.js";
import User from "../models/User.js";
import Category from "../models/Category.js";
import { env } from "../config/env.js";

const tailorRoutes = express.Router();

async function getApprovedTailorOwnerIds() {
  const owners = await User.find({
    role: "tailor",
    approvalStatus: "approved",
  }).select("_id");

  return owners.map((owner) => owner._id);
}
function calculateAgeFromDob(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

async function getCustomerAgeFromAuthToken(req) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  const token = authorization.slice(7);
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const userId = decoded?._id;
    if (!userId) return null;

    const customer = await Customer.findOne({ userId }).select("dob");
    if (!customer?.dob) return null;

    return calculateAgeFromDob(customer.dob);
  } catch (error) {
    return null;
  }
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
    };

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [shops, total] = await Promise.all([
      TailorShop.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select("-__v"),
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
  owner?.role === "tailor" && owner?.approvalStatus === "approved";

async function findApprovedShopBySlug(slug) {
  const shop = await TailorShop.findOne({
    slug: slug.toLowerCase(),
    isActive: true,
  })
    .populate("ownerId", "_id name role approvalStatus")
    .select("-__v");

  if (!shop || !isApprovedTailorOwner(shop.ownerId)) {
    return null;
  }

  return shop;
}

const toDesignListItem = (design) => ({
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
  tailoringFee: design.tailoringFee,
  estimatedMeters: design.estimatedMeters,
  estimatedDays: design.estimatedDays,
});

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

// GET /api/tailors/designs/all — fetch all active designs with tailor shop info
tailorRoutes.get("/designs/all", async (req, res) => {
  try {
    const { category, limit = 20 } = req.query;
    const approvedOwnerIds = await getApprovedTailorOwnerIds();

    const approvedShops = await TailorShop.find({
      isActive: true,
      ownerId: { $in: approvedOwnerIds },
    }).select("_id slug name nameAr");

    const shopIds = approvedShops.map((s) => s._id);
    const shopMap = approvedShops.reduce((acc, shop) => {
      acc[shop._id.toString()] = shop;
      return acc;
    }, {});

    const query = {
      isActive: true,
      tailorShopId: { $in: shopIds },
    };

    if (category && category !== "all") {
      query.category = category;
    }

    const customerAge = await getCustomerAgeFromAuthToken(req);
    if (typeof customerAge === "number") {
      query.ageMin = { $lte: customerAge };
      query.ageMax = { $gte: customerAge };
    }

    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const designs = await Design.find(query)
      .sort({ createdAt: -1 })
      .limit(limitNumber)
      .select("-__v");

    const items = designs.map((design) => {
      const shop = shopMap[design.tailorShopId.toString()];
      return {
        ...toDesignListItem(design),
        tailorShopId: design.tailorShopId,
        tailorSlug: shop?.slug || "",
        tailorName: shop?.name || "",
        tailorNameAr: shop?.nameAr || "",
      };
    });

    res.json({
      success: true,
      total: items.length,
      items,
    });
  } catch (error) {
    console.error("GET /api/tailors/designs/all error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch all designs",
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
    })
      .populate("tailorShopId")
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

    res.json({
      success: true,
      item: {
        ...toDesignListItem(design),
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
    })
      .sort({ createdAt: -1 })
      .select("-__v");

    res.json({
      success: true,
      tailorSlug: shop.slug,
      tailorShopId: shop._id,
      total: designs.length,
      items: designs.map(toDesignListItem),
    });
  } catch (error) {
    console.error("GET /api/tailors/:slug/designs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tailor designs",
    });
  }
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

    res.json({
      success: true,
      item: toDetailItem(shop),
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
