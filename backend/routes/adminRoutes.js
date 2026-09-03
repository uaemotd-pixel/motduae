import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import Fabric from "../models/Fabric.js";
import User from "../models/User.js";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";
import Design from "../models/Design.js";
import CustomOrder, { CUSTOM_STATUSES } from "../models/CustomOrder.js";
import RetailOrder, { RETAIL_ORDER_STATUSES } from "../models/RetailOrder.js";
import PlatformSettings from "../models/PlatformSettings.js";
import {
  uploadReadyMadeImageMiddleware,
  processReadyMadeImage,
} from "../middleware/uploadReadyMadeImage.js";
import {
  uploadFabricImageMiddleware,
  processFabricImage,
} from "../middleware/uploadFabricImages.js";
import Customer from "../models/customer.js";
import { createAdminNotificationForNewUser } from "../services/adminNotificationService.js";
import { findEmailOccupant } from "../services/emailVerification/emailOccupancy.js";
import AddOn from "../models/AddOn.js";
import Category from "../models/Category.js";
import Material from "../models/Material.js";
import Pattern from "../models/Pattern.js";
import Season from "../models/Season.js";
import Tag from "../models/Tag.js";
import Cut from "../models/Cut.js";
import {
  getCutUsageCount,
  getCutUsageMap,
  isCutInUse,
} from "../services/cutUsageService.js";
import {
  CUT_UNITS,
  cutValueToMeters,
  metersToWar,
  normalizeCutUnit,
} from "../utils/fabricUnits.js";

import {
  assertActiveCutsExist,
  enrichFabricWithCuts,
  normalizeFabricCutsPayload,
  countLowStockFabricCutRows,
  LOW_FABRIC_CUT_STOCK_THRESHOLD,
} from "../utils/fabricCuts.js";
import PartnerPayout, {
  PARTNER_PAYOUT_KINDS,
} from "../models/PartnerPayout.js";
import PartnerPayoutCredit from "../models/PartnerPayoutCredit.js";
import PartnerPayoutRequest from "../models/PartnerPayoutRequest.js";
import {
  createNotification,
  ensurePartnerPayoutReleasedNotification,
  notifyCustomStatusChange,
  notifyRetailStatusChange,
  resolvePartnerOwnerUserId,
} from "../services/notificationService.js";
import {
  uploadSingleAddOnImageMiddleware,
  processAddOnImage,
} from "../middleware/uploadAddOnImages.js";

import {
  getAdminApplication,
} from "../services/partnerApplication/partnerApplicationService.js";
import { seedShopFromApplication } from "../services/partnerApplication/seedShopFromApplication.js";
import { mailAfterPartnerDecision } from "../services/partnerApplication/partnerApplicationMail.js";
import {
  PartnerApplicationError,
  assertPartnerDecisionAllowed,
  submittedPendingFilter,
  hideUnsubmittedPendingClause,
} from "../services/partnerApplication/policy.js";
import { partnerUserSearchOr } from "../services/partnerApplication/requestNumber.js";
import {
  normalizeEmirate,
  UAE_EMIRATES,
  isValidEmirate,
} from "../utils/uaeAddress.js";
import {
  createReadyCustomShipments,
} from "../services/shipmentService.js";
import {
  isEmptyShopPickupAddress,
  normalizeShopPickupAddress,
} from "../utils/shopPickupAddress.js";
import {
  applyCreatedAtFilter,
  getTimeframeWindow,
} from "../utils/dateRange.js";
import { splitMotdCommission } from "../services/pricingService.js";
import { hydrateRetailOrders } from "../services/retailOrderHydrate.js";
import { ensureUniqueSlug } from "../utils/uniqueSlug.js";

const adminRouter = express.Router();
const BCRYPT_ROUNDS = 10;
const DEFAULT_TAILOR_COMMISSION_PERCENT = 12;
const DEFAULT_FABRIC_COMMISSION_PERCENT = 15;

function resolveCommissionPercent(value, fallback) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
    ? value
    : fallback;
}

/** Admin-wide custom tailor gross = design + tailoring fees. */
function sumCustomTailorGross(order) {
  if (order.items && order.items.length > 0) {
    return order.items.reduce(
      (sum, item) =>
        sum +
        (Number(item.pricing?.designBase) || 0) +
        (Number(item.pricing?.tailoringFee) || 0),
      0,
    );
  }
  return (
    (Number(order.pricing?.designBase) || 0) +
    (Number(order.pricing?.tailoringFee) || 0)
  );
}

/** Admin-wide custom fabric gross = fabric cost lines. */
function sumCustomFabricGross(order) {
  if (order.items && order.items.length > 0) {
    return order.items.reduce(
      (sum, item) => sum + (Number(item.pricing?.fabricCost) || 0),
      0,
    );
  }
  return Number(order.pricing?.fabricCost) || 0;
}

/** Admin-wide retail fabric-store gross = line totals (ready-made / add-ons / fabric). */
function sumRetailFabricGross(order) {
  return (order.orderItems || []).reduce(
    (sum, item) =>
      sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0,
  );
}

/** Custom order shipping amount owed to the courier / shipping company. */
function sumDeliveryBreakdownFees(breakdown) {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return null;
  const sum = breakdown.reduce((total, line) => {
    if (line?.billable === false) return total;
    return total + (Number(line?.fee) || 0);
  }, 0);
  return Number(sum.toFixed(2));
}

function sumOrderShippingGross(order, { retail = false } = {}) {
  const breakdown = retail
    ? order?.deliveryBreakdown
    : order?.pricing?.deliveryBreakdown;
  const fromBreakdown = sumDeliveryBreakdownFees(breakdown);
  if (fromBreakdown != null) return fromBreakdown;

  const parcelCount = Number(
    retail ? order?.parcelCount : order?.pricing?.parcelCount,
  );
  const perParcel = Number(
    retail ? order?.perParcelFee : order?.pricing?.perParcelFee,
  );
  if (
    Number.isFinite(parcelCount) &&
    parcelCount > 0 &&
    Number.isFinite(perParcel) &&
    perParcel >= 0
  ) {
    return Number((parcelCount * perParcel).toFixed(2));
  }

  if (retail) {
    return Number(order?.shippingPrice) || 0;
  }
  return Number(order?.pricing?.deliveryFee) || 0;
}

/** Custom order shipping amount owed to the courier / shipping company. */
function sumCustomShippingGross(order) {
  return sumOrderShippingGross(order, { retail: false });
}

/** Retail order shipping amount owed to the courier / shipping company. */
function sumRetailShippingGross(order) {
  return sumOrderShippingGross(order, { retail: true });
}

function optionalObjectId(value) {
  if (value === undefined) return undefined;
  const str = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(str) && str.length === 24 ? str : null;
}

function parseReadyMadePickup(address) {
  return normalizeShopPickupAddress(address);
}

function partnerPublicFields(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

async function findFabricStorePartner(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }
  return User.findOne({ _id: id, role: "fabric_store" });
}

// Define admin routes here (e.g. C-02 to C-10)
adminRouter.get("/health", (req, res) => {
  res.send({ message: "Admin API is healthy" });
});

// POST /api/admin/uploads/ready-made
// Upload + compress image; stores file under backend/uploads and returns public path
adminRouter.post(
  "/uploads/ready-made",
  uploadReadyMadeImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).send({ message: "No image file provided" });
      return;
    }

    const url = await processReadyMadeImage(req.file);
    res.status(201).send({ success: true, url });
  }),
);

// POST /api/admin/uploads/addons
// Upload + compress add-on image; returns public path
adminRouter.post(
  "/uploads/addons",
  uploadSingleAddOnImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).send({ message: "No image file provided" });
      return;
    }

    const url = await processAddOnImage(req.file);
    res.status(201).send({ success: true, url });
  }),
);

// ==========================================
// C-02: Admin Ready-Made CRUD
// ==========================================

// GET /api/admin/ready-made
// Admin can view all ready-made products (including inactive/sold)
// Supports ?page=1&limit=10&search=...&status=available|sold
adminRouter.get(
  "/ready-made",
  expressAsyncHandler(async (req, res) => {
    const { search, status, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Search by name, fabricType, or tailorName
    if (search && typeof search === "string") {
      const regex = new RegExp(search.trim(), "i");
      filter.$and = [
        {
          $or: [
            { name: regex },
            { nameAr: regex },
            { fabricType: regex },
            { fabricTypeAr: regex },
            { tailorName: regex },
            { tailorNameAr: regex },
          ],
        },
      ];
    }

    // Status filter based on availableFabricStock
    if (status === "available") {
      filter.availableFabricStock = { $gt: 0 };
    } else if (status === "sold") {
      filter.availableFabricStock = 0;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [products, total] = await Promise.all([
      ReadyMadeProduct.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      ReadyMadeProduct.countDocuments(filter),
    ]);

    const available = await ReadyMadeProduct.countDocuments({
      ...filter,
      availableFabricStock: { $gt: 0 },
    });
    const sold = await ReadyMadeProduct.countDocuments({
      ...filter,
      availableFabricStock: 0,
    });

    res.send({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      stats: {
        total,
        available,
        sold,
      },
      items: products,
    });
  }),
);

// GET /api/admin/ready-made/:id
// Get details of a single ready-made item
adminRouter.get(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const product = await ReadyMadeProduct.findById(req.params.id);
    if (product) {
      res.send(product);
    } else {
      res.status(404).send({ message: "Ready-made product not found" });
    }
  }),
);

// GET /api/admin/designs
// Admin can view all tailor designs in the catalog (optionally filtered by tailorShopId)
adminRouter.get(
  "/designs",
  expressAsyncHandler(async (req, res) => {
    const filter = req.query.tailorShopId
      ? { tailorShopId: req.query.tailorShopId }
      : {};
    const designs = await Design.find(filter)
      .populate("tailorShopId", "name email")
      .sort({ createdAt: -1 });
    res.send(designs);
  }),
);

// POST /api/admin/ready-made
// Create a new listing (auto-set stock to 1)
adminRouter.post(
  "/ready-made",
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      nameAr,
      code,
      description,
      descriptionAr,
      tag,
      tagAr,
      colors,
      thumbnailImage,
      images,
      fabricShopId,
      fabricId,
      tailorShopId,
      designId,
      fabricType,
      fabricTypeAr,
      tailorName,
      tailorNameAr,
      metersPerFabric,
      fabricPriceAED,
      mukhawarPriceAED,
      finalSellingPriceAED,
      availableFabricStock,
      minAge,
      maxAge,
      isActive,
    } = req.body;

    // Generate a unique slug so the same display name can exist more than once
    const slug = await ensureUniqueSlug(
      ReadyMadeProduct,
      req.body.slug || name || nameAr,
      { fallback: "ready-made" },
    );

    const pickupAddress = parseReadyMadePickup(req.body.pickupAddress);
    if (!pickupAddress) {
      res.status(400).send({
        message:
          "Pickup address requires fullName, phone, line1, city, and emirate",
      });
      return;
    }

    const newProduct = new ReadyMadeProduct({
      name,
      nameAr,
      code,
      slug,
      description,
      descriptionAr,
      tag,
      tagAr,
      colors,
      thumbnailImage,
      images,
      fabricShopId: optionalObjectId(fabricShopId) ?? null,
      fabricId: optionalObjectId(fabricId) ?? null,
      tailorShopId: tailorShopId || undefined,
      designId: designId || undefined,
      fabricType: fabricType || "",
      fabricTypeAr: fabricTypeAr || "",
      tailorName: tailorName || "",
      tailorNameAr: tailorNameAr || "",
      metersPerFabric,
      fabricPriceAED,
      mukhawarPriceAED,
      finalSellingPriceAED,
      availableFabricStock,
      minAge: minAge !== undefined ? minAge : 0,
      maxAge: maxAge !== undefined ? maxAge : 0,
      isActive: isActive !== undefined ? isActive : true,
      ownerName: req.body.ownerName || "MOTD Admin",
      pickupAddress,
    });

    const createdProduct = await newProduct.save();

    res.status(201).send(createdProduct);
  }),
);

// PUT /api/admin/ready-made/:id
// Update an existing ready-made item
adminRouter.put(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const product = await ReadyMadeProduct.findById(req.params.id);
    if (!product) {
      res.status(404).send({ message: "Ready-made product not found" });
      return;
    }

    // --- Basic fields ---
    product.name = req.body.name ?? product.name;
    product.nameAr = req.body.nameAr ?? product.nameAr;
    if (req.body.slug && req.body.slug !== product.slug) {
      product.slug = await ensureUniqueSlug(ReadyMadeProduct, req.body.slug, {
        excludeId: product._id,
        fallback: "ready-made",
      });
    }
    product.code = req.body.code ?? product.code;
    product.description = req.body.description ?? product.description;
    product.descriptionAr = req.body.descriptionAr ?? product.descriptionAr;

    // --- Tags ---
    product.tag = req.body.tag ?? product.tag;
    product.tagAr = req.body.tagAr ?? product.tagAr;

    // --- Colors – array, assign directly ---
    if (req.body.colors !== undefined) {
      // Ensure it's always an array (frontend sends array)
      product.colors = Array.isArray(req.body.colors) ? req.body.colors : [];
    }

    // --- Images ---
    product.thumbnailImage = req.body.thumbnailImage ?? product.thumbnailImage;
    product.images = req.body.images ?? product.images;

    // --- Fabric & Tailor relation fields ---
    if (req.body.fabricShopId !== undefined) {
      product.fabricShopId = optionalObjectId(req.body.fabricShopId);
    }
    if (req.body.fabricId !== undefined) {
      product.fabricId = optionalObjectId(req.body.fabricId);
    }
    product.tailorShopId =
      req.body.tailorShopId !== undefined
        ? req.body.tailorShopId
        : product.tailorShopId;
    product.designId =
      req.body.designId !== undefined ? req.body.designId : product.designId;

    if (req.body.pickupAddress !== undefined) {
      const pickupAddress = parseReadyMadePickup(req.body.pickupAddress);
      if (!pickupAddress) {
        res.status(400).send({
          message:
            "Pickup address requires fullName, phone, line1, city, and emirate",
        });
        return;
      }
      product.pickupAddress = pickupAddress;
    }

    // Fallbacks
    product.fabricType = req.body.fabricType ?? product.fabricType;
    product.fabricTypeAr = req.body.fabricTypeAr ?? product.fabricTypeAr;
    product.tailorName = req.body.tailorName ?? product.tailorName;
    product.tailorNameAr = req.body.tailorNameAr ?? product.tailorNameAr;

    // --- Measurements & Pricing ---
    product.metersPerFabric =
      req.body.metersPerFabric ?? product.metersPerFabric;
    product.fabricPriceAED = req.body.fabricPriceAED ?? product.fabricPriceAED;
    product.mukhawarPriceAED =
      req.body.mukhawarPriceAED ?? product.mukhawarPriceAED;
    product.finalSellingPriceAED =
      req.body.finalSellingPriceAED ?? product.finalSellingPriceAED;
    product.availableFabricStock =
      req.body.availableFabricStock ?? product.availableFabricStock;
    product.ownerName = req.body.ownerName ?? product.ownerName;

    // --- Age range ---
    product.minAge = req.body.minAge ?? product.minAge;
    product.maxAge = req.body.maxAge ?? product.maxAge;

    // --- Active ---
    product.isActive = req.body.isActive ?? product.isActive;

    // --- (optional extras) ---
    product.size = req.body.size ?? product.size;
    product.style = req.body.style ?? product.style;
    product.city = req.body.city ?? product.city;
    product.returnReason = req.body.returnReason ?? product.returnReason;
    product.sourceCustomOrderId =
      req.body.sourceCustomOrderId ?? product.sourceCustomOrderId;
    product.condition = req.body.condition ?? product.condition;
    product.countInStock = req.body.countInStock ?? product.countInStock;

    const updatedProduct = await product.save();
    res.send(updatedProduct);
  }),
);

// DELETE /api/admin/ready-made/:id
// Delete (or let frontend soft-delete by toggling isActive via PUT)
adminRouter.delete(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const product = await ReadyMadeProduct.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.send({ message: "Ready-made product deleted" });
    } else {
      res.status(404).send({ message: "Ready-made product not found" });
    }
  }),
);

// ==========================================
// C-03: Admin Fabrics CRUD
// ==========================================

// POST /api/admin/uploads/fabrics
// Upload + compress image; stores file under backend/uploads and returns public path
adminRouter.post(
  "/uploads/fabrics",
  uploadFabricImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).send({ message: "No image file provided" });
      return;
    }
    const imageUrl = await processFabricImage(req.file);
    res.send({ url: imageUrl });
  }),
);

// ==========================================
// C-20: Admin fabric store partners
// GET    /api/admin/partners/fabric-stores
// POST   /api/admin/create-partners
// PUT    /api/admin/edit-partners/:id
// DELETE /api/admin/delete-partner/:id
// PATCH  /api/admin/partners/fabric-stores/:id/toggle-active
// ==========================================

// GET /api/admin/partners/fabric-stores
// Active partners for fabric form picker; pass ?includeInactive=1 for admin list
adminRouter.get(
  "/partners",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const type = req.query.type || "all";

    // Build filter for users with fabric_store role
    const filter = { role: "fabric_store" };
    const and = [];

    // Type filter
    if (type === "approved") {
      filter.approvalStatus = "approved";
    } else if (type === "pending") {
      filter.approvalStatus = "pending";
      filter.applicationSubmittedAt = { $exists: true, $ne: null };
    } else if (type === "rejected") {
      filter.approvalStatus = "rejected";
    } else {
      and.push(hideUnsubmittedPendingClause());
    }

    // Search filter
    if (search) {
      const searchOr = partnerUserSearchOr(search);
      if (searchOr) {
        and.push(searchOr);
      }
    }

    if (and.length) {
      filter.$and = and;
    }

    // Get total count for pagination
    const total = await User.countDocuments(filter);

    // Get paginated users
    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Map users to response format
    const items = users.map((user) => ({
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      type: user.approvalStatus || "pending",
      shopName: user.shopName || null,
      isActive: user.isActive || false,
      phone: user.phone || "",
      logo: user.profilePic || null,
      requestNumber: user.requestNumber || "",
    }));

    res.send({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 0,
    });
  }),
);

// Stats endpoint
adminRouter.get(
  "/partners/stats",
  expressAsyncHandler(async (req, res) => {
    const [total, approved, pending, rejected] = await Promise.all([
      User.countDocuments({ role: "fabric_store" }),
      User.countDocuments({ role: "fabric_store", approvalStatus: "approved" }),
      User.countDocuments(submittedPendingFilter("fabric_store")),
      User.countDocuments({ role: "fabric_store", approvalStatus: "rejected" }),
    ]);

    res.send({
      total,
      approved,
      pending,
      rejected,
    });
  }),
);

// POST /api/admin/create-partners
adminRouter.post(
  "/create-partners",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, shopName } = req.body;

    if (!name?.trim() || !email?.trim() || !password || !shopName?.trim()) {
      res.status(400).send({
        message: "Name, email, password, and store name are required",
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const occupant = await findEmailOccupant(User, normalizedEmail);
    if (occupant) {
      res.status(400).send({ message: "User already exists" });
      return;
    }

    const slug = await ensureUniqueSlug(FabricShop, shopName, {
      fallback: "shop",
    });

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: bcrypt.hashSync(password, BCRYPT_ROUNDS),
      role: "fabric_store",
      approvalStatus: "approved",
      isActive: true,
    });
    await user.save();

    const shop = new FabricShop({
      name: shopName.trim(),
      nameAr: shopName.trim(),
      slug,
      ownerId: user._id,
      isActive: true,
      phone: "500000000",
    });
    await shop.save();

    // Create admin notification for new fabric store partner creation
    await createAdminNotificationForNewUser({
      type: `user_${user.role}_registered`,
      title: "User registration",
      message: `${user.name} is registered as fabric store.`,
      createdBy: user._id,
      tailorUserId: null,
    });

    res.status(201).send({
      message: "Partner created",
      user: partnerPublicFields(user),
      shop,
    });
  }),
);

// PUT /api/admin/edit-partners/:id
adminRouter.put(
  "/edit-partners/:id",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const user = await findFabricStorePartner(req.params.id);
    if (!user) {
      res.status(404).send({ message: "Fabric store partner not found" });
      return;
    }

    if (name?.trim()) {
      user.name = name.trim();
    }
    if (email?.trim()) {
      user.email = email.toLowerCase().trim();
    }
    if (password) {
      user.password = bcrypt.hashSync(password, BCRYPT_ROUNDS);
    }

    await user.save();
    res.send({
      message: "Partner updated",
      user: partnerPublicFields(user),
    });
  }),
);

// DELETE /api/admin/delete-partner/:id
adminRouter.delete(
  "/delete-partner/:id",
  expressAsyncHandler(async (req, res) => {
    const user = await findFabricStorePartner(req.params.id);
    if (!user) {
      res.status(404).send({ message: "Fabric store partner not found" });
      return;
    }

    await user.deleteOne();
    res.send({ message: "Partner deleted" });
  }),
);

async function toggleFabricStorePartnerActive(req, res) {
  const user = await findFabricStorePartner(req.params.id);
  if (!user) {
    res.status(404).send({ message: "Fabric store partner not found" });
    return;
  }

  user.isActive = !user.isActive;
  const updated = await user.save();

  // Sync associated FabricShop document isActive status
  await FabricShop.findOneAndUpdate(
    { ownerId: user._id },
    { isActive: user.isActive },
  );

  res.send({
    success: true,
    message: `Partner successfully ${updated.isActive ? "activated" : "deactivated"}`,
    user: partnerPublicFields(updated),
  });
}

// PATCH /api/admin/partners/fabric-stores/:id/toggle-active
adminRouter.patch(
  "/partners/fabric-stores/:id/toggle-active",
  expressAsyncHandler(toggleFabricStorePartnerActive),
);

// PATCH /api/admin/partners/fabric-stores/:id/deactivate
// Backward-compatible alias — toggles isActive
adminRouter.patch(
  "/partners/fabric-stores/:id/deactivate",
  expressAsyncHandler(toggleFabricStorePartnerActive),
);

async function assertFabricStorePartner(listedByStore) {
  if (!listedByStore || !mongoose.Types.ObjectId.isValid(listedByStore)) {
    return { ok: false, message: "Invalid fabric store partner ID" };
  }

  const store = await User.findOne({
    _id: listedByStore,
    role: "fabric_store",
    isActive: true,
  }).select("_id");

  if (!store) {
    return { ok: false, message: "Fabric store partner not found" };
  }

  return { ok: true };
}

function parseFabricAge(value, fallback = 0) {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  const age = Number(value);
  return Number.isFinite(age) && age >= 0 ? age : fallback;
}

function hasInvalidFabricAgeRange(minAge, maxAge) {
  return Number.isFinite(minAge) && Number.isFinite(maxAge) && maxAge < minAge;
}

async function prepareFabricCutsInput(cutsInput) {
  const normalized = normalizeFabricCutsPayload(cutsInput);
  if (!normalized.ok) {
    return normalized;
  }

  const activeCheck = await assertActiveCutsExist(normalized.cuts);
  if (!activeCheck.ok) {
    return activeCheck;
  }

  return { ok: true, cuts: normalized.cuts };
}

// GET /api/admin/fabrics
// Admin can view all fabrics in the catalog (including inactive)
// Supports ?page=1&limit=10&search=...&status=available|sold
adminRouter.get(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";
    const status = req.query.status || "";

    const filter = {
      $or: [{ isVariantOf: null }, { isVariantOf: { $exists: false } }],
    };

    if (req.query.listedByStore) {
      filter.listedByStore = req.query.listedByStore;
    }

    if (status === "available") {
      filter.isActive = true;
    } else if (status === "sold") {
      filter.isActive = false;
    }

    if (search) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { material: { $regex: search, $options: "i" } },
            { city: { $regex: search, $options: "i" } },
          ],
        },
      ];
    }

    const [fabrics, total] = await Promise.all([
      Fabric.find(filter)
        .populate("listedByStore", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Fabric.countDocuments(filter),
    ]);

    const fabricsWithVariants = await Promise.all(
      fabrics.map(async (fabric) => {
        const variants = await Fabric.find({
          isVariantOf: fabric._id,
        }).populate("listedByStore", "name email");
        const obj = await enrichFabricWithCuts(fabric);
        obj.variants = await Promise.all(
          variants.map((variant) => enrichFabricWithCuts(variant)),
        );
        if (obj.storePickupAddress?.emirate) {
          obj.storePickupAddress.emirate = normalizeEmirate(
            obj.storePickupAddress.emirate,
          );
        }
        return obj;
      }),
    );

    res.send({
      items: fabricsWithVariants,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 0,
    });
  }),
);

// GET api/admin/fabrics/:id
// Admin can edit the details of a selected fabric
adminRouter.get(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findById(req.params.id);
    if (!fabric) {
      return res.status(404).send({ message: "Fabric not found" });
    }
    const variants = await Fabric.find({ isVariantOf: fabric._id });
    const item = await enrichFabricWithCuts(fabric);
    item.variants = await Promise.all(
      variants.map((variant) => enrichFabricWithCuts(variant)),
    );
    // Add emirateAr to response
    if (item.storePickupAddress?.emirate) {
      const found = UAE_EMIRATES.find(
        (e) => e.value === item.storePickupAddress.emirate,
      );
      item.storePickupAddress.emirateAr = found?.ar || "";
      item.storePickupAddress.emirateEn = found?.en || "";
    }
    res.send(item);
  }),
);

// POST /api/admin/fabrics
// Create a new fabric catalog entry
adminRouter.post(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      material,
      materialAr,
      colors,
      tag,
      tagAr,
      cuts,
      minAge,
      maxAge,
      listedByStore,
      storePickupAddress,
      isActive,
    } = req.body;

    const cutsResult = await prepareFabricCutsInput(cuts);
    if (!cutsResult.ok) {
      return res.status(400).send({ message: cutsResult.message });
    }

    const normalizedMinAge = parseFabricAge(minAge);
    const normalizedMaxAge = parseFabricAge(maxAge);

    if (hasInvalidFabricAgeRange(normalizedMinAge, normalizedMaxAge)) {
      return res.status(400).send({
        message: "Max age must be greater than or equal to min age",
      });
    }

    const partnerCheck = await assertFabricStorePartner(listedByStore);
    if (!partnerCheck.ok) {
      res.status(400).send({ message: partnerCheck.message });
      return;
    }

    // validate Emirate
    if (storePickupAddress?.emirate) {
      const normalizedEmirate = normalizeEmirate(storePickupAddress.emirate);
      if (!normalizedEmirate || !isValidEmirate(normalizedEmirate)) {
        res.status(400).send({ message: "Invalid UAE emirate" });
        return;
      }
      storePickupAddress.emirate = normalizedEmirate;
    }

    const uniqueSlug = await ensureUniqueSlug(Fabric, slug || name, {
      fallback: "fabric",
    });

    const newFabric = new Fabric({
      name,
      nameAr,
      slug: uniqueSlug,
      description,
      descriptionAr,
      images,
      material,
      materialAr: materialAr || "",
      colors: colors || [],
      tag,
      tagAr: tagAr || "",
      cuts: cutsResult.cuts,
      minAge: normalizedMinAge,
      maxAge: normalizedMaxAge,
      listedByStore,
      storePickupAddress,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdFabric = await newFabric.save();

    if (Array.isArray(req.body.variants)) {
      for (const variant of req.body.variants) {
        if (!variant.name || !variant.nameAr || !variant.material) continue;

        const variantCutsResult = await prepareFabricCutsInput(variant.cuts);
        if (!variantCutsResult.ok) {
          return res.status(400).send({
            message: `Variant "${variant.name}": ${variantCutsResult.message}`,
          });
        }

        const vSlug = await ensureUniqueSlug(
          Fabric,
          variant.slug || variant.name,
          { fallback: "fabric" },
        );

        await Fabric.create({
          name: variant.name,
          nameAr: variant.nameAr,
          slug: vSlug,
          description: variant.description || createdFabric.description,
          descriptionAr: variant.descriptionAr || createdFabric.descriptionAr,
          images: variant.images,
          material: variant.material,
          materialAr: variant.materialAr || createdFabric.materialAr,
          colors: variant.colors || [],
          tag: variant.tag || "",
          tagAr: variant.tagAr || "",
          cuts: variantCutsResult.cuts,
          minAge: createdFabric.minAge,
          maxAge: createdFabric.maxAge,
          listedByStore: createdFabric.listedByStore,
          storePickupAddress: createdFabric.storePickupAddress,
          isVariantOf: createdFabric._id,
          isActive: variant.isActive !== undefined ? variant.isActive : true,
        });
      }
    }

    res.status(201).send(await enrichFabricWithCuts(createdFabric));
  }),
);

// PUT /api/admin/fabrics/:id
// Update an existing fabric
adminRouter.put(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findById(req.params.id);

    if (!fabric) {
      return res.status(404).send({ message: "Fabric not found" });
    }

    // Update pickup address with validation
    if (req.body.storePickupAddress) {
      const addr = req.body.storePickupAddress;
      if (addr.emirate) {
        const normalizedEmirate = normalizeEmirate(addr.emirate);
        if (!normalizedEmirate || !isValidEmirate(normalizedEmirate)) {
          return res.status(400).send({ message: "Invalid UAE emirate" });
        }
        fabric.storePickupAddress.emirate = normalizedEmirate;
      }
      if (addr.city) fabric.storePickupAddress.city = addr.city;
      if (addr.street !== undefined)
        fabric.storePickupAddress.street = addr.street;
      if (addr.building !== undefined)
        fabric.storePickupAddress.building = addr.building;
      if (addr.phone !== undefined)
        fabric.storePickupAddress.phone = addr.phone;
    }

    // Handle listedByStore (ObjectId or "MOTD")
    if (req.body.listedByStore) {
      const partnerCheck = await assertFabricStorePartner(
        req.body.listedByStore,
      );
      if (!partnerCheck.ok) {
        return res.status(400).send({ message: partnerCheck.message });
      }
      fabric.listedByStore = req.body.listedByStore;
    }

    // Update all fields
    fabric.name = req.body.name ?? fabric.name;
    fabric.nameAr = req.body.nameAr ?? fabric.nameAr;
    if (req.body.slug && req.body.slug !== fabric.slug) {
      fabric.slug = await ensureUniqueSlug(Fabric, req.body.slug, {
        excludeId: fabric._id,
        fallback: "fabric",
      });
    }
    fabric.description = req.body.description ?? fabric.description;
    fabric.descriptionAr = req.body.descriptionAr ?? fabric.descriptionAr;
    fabric.images = req.body.images ?? fabric.images;
    fabric.material = req.body.material ?? fabric.material;
    fabric.materialAr = req.body.materialAr ?? fabric.materialAr;
    fabric.colors = Array.isArray(req.body.colors)
      ? req.body.colors
      : fabric.colors;
    fabric.tag = req.body.tag ?? fabric.tag;
    fabric.tagAr = req.body.tagAr ?? fabric.tagAr;

    if (req.body.cuts !== undefined) {
      const cutsResult = await prepareFabricCutsInput(req.body.cuts);
      if (!cutsResult.ok) {
        return res.status(400).send({ message: cutsResult.message });
      }
      fabric.cuts = cutsResult.cuts;
    }

    const nextMinAge = parseFabricAge(req.body.minAge, fabric.minAge);
    const nextMaxAge = parseFabricAge(req.body.maxAge, fabric.maxAge);

    if (hasInvalidFabricAgeRange(nextMinAge, nextMaxAge)) {
      return res.status(400).send({
        message: "Max age must be greater than or equal to min age",
      });
    }

    fabric.minAge = nextMinAge;
    fabric.maxAge = nextMaxAge;

    // Update pickup address fields individually (✅ ensures changes are detected)
    if (req.body.storePickupAddress) {
      const addr = req.body.storePickupAddress;
      fabric.storePickupAddress.emirate =
        addr.emirate ?? fabric.storePickupAddress.emirate;
      fabric.storePickupAddress.city =
        addr.city ?? fabric.storePickupAddress.city;
      fabric.storePickupAddress.street =
        addr.street ?? fabric.storePickupAddress.street;
      fabric.storePickupAddress.building =
        addr.building ?? fabric.storePickupAddress.building;
      fabric.storePickupAddress.phone =
        addr.phone ?? fabric.storePickupAddress.phone;
    }

    fabric.isActive = req.body.isActive ?? fabric.isActive;

    // Backward-compatible old fields (optional)
    fabric.color = req.body.color ?? fabric.color;
    fabric.city = req.body.city ?? fabric.city;
    fabric.tagColor = req.body.tagColor ?? fabric.tagColor;

    const updatedFabric = await fabric.save();

    if (Array.isArray(req.body.variants)) {
      const incomingIds = [];
      for (const variant of req.body.variants) {
        if (variant._id) {
          incomingIds.push(variant._id.toString());
          const existing = await Fabric.findOne({
            _id: variant._id,
            isVariantOf: updatedFabric._id,
          });
          if (existing) {
            if (variant.name) existing.name = variant.name;
            if (variant.nameAr) existing.nameAr = variant.nameAr;
            if (variant.description !== undefined)
              existing.description = variant.description;
            if (variant.descriptionAr !== undefined)
              existing.descriptionAr = variant.descriptionAr;
            if (variant.images) existing.images = variant.images;
            if (variant.material) existing.material = variant.material;
            if (variant.materialAr !== undefined)
              existing.materialAr = variant.materialAr;
            if (variant.colors) existing.colors = variant.colors;
            if (variant.tag !== undefined) existing.tag = variant.tag;
            if (variant.tagAr !== undefined) existing.tagAr = variant.tagAr;
            if (variant.cuts !== undefined) {
              const variantCutsResult = await prepareFabricCutsInput(
                variant.cuts,
              );
              if (!variantCutsResult.ok) {
                return res.status(400).send({
                  message: `Variant "${variant.name || existing.name}": ${variantCutsResult.message}`,
                });
              }
              existing.cuts = variantCutsResult.cuts;
            }
            existing.minAge = updatedFabric.minAge;
            existing.maxAge = updatedFabric.maxAge;
            if (variant.isActive !== undefined)
              existing.isActive = variant.isActive;

            existing.listedByStore = updatedFabric.listedByStore;
            existing.storePickupAddress = updatedFabric.storePickupAddress;
            if (variant.slug && variant.slug !== existing.slug) {
              existing.slug = await ensureUniqueSlug(Fabric, variant.slug, {
                excludeId: existing._id,
                fallback: "fabric",
              });
            }

            await existing.save();
          }
        } else {
          if (!variant.name || !variant.nameAr || !variant.material) continue;

          const variantCutsResult = await prepareFabricCutsInput(variant.cuts);
          if (!variantCutsResult.ok) {
            return res.status(400).send({
              message: `Variant "${variant.name}": ${variantCutsResult.message}`,
            });
          }

          const vSlug = await ensureUniqueSlug(
            Fabric,
            variant.slug || variant.name,
            { fallback: "fabric" },
          );

          const newV = await Fabric.create({
            name: variant.name,
            nameAr: variant.nameAr,
            slug: vSlug,
            description: variant.description || updatedFabric.description,
            descriptionAr: variant.descriptionAr || updatedFabric.descriptionAr,
            images: variant.images,
            material: variant.material,
            materialAr: variant.materialAr || updatedFabric.materialAr,
            colors: variant.colors || [],
            tag: variant.tag || "",
            tagAr: variant.tagAr || "",
            cuts: variantCutsResult.cuts,
            minAge: updatedFabric.minAge,
            maxAge: updatedFabric.maxAge,
            listedByStore: updatedFabric.listedByStore,
            storePickupAddress: updatedFabric.storePickupAddress,
            isVariantOf: updatedFabric._id,
            isActive: variant.isActive !== undefined ? variant.isActive : true,
          });
          incomingIds.push(newV._id.toString());
        }
      }

      await Fabric.deleteMany({
        isVariantOf: updatedFabric._id,
        _id: { $nin: incomingIds },
      });
    }

    res.send(await enrichFabricWithCuts(updatedFabric));
  }),
);

// DELETE /api/admin/fabrics/:id
// Delete (or let frontend soft-delete by toggling isActive via PUT)
adminRouter.delete(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findById(req.params.id);
    if (fabric) {
      await fabric.deleteOne();
      res.send({ message: "Fabric deleted" });
    } else {
      res.status(404).send({ message: "Fabric not found" });
    }
  }),
);

adminRouter.get(
  "/tailors/pending",
  expressAsyncHandler(async (req, res) => {
    const pendingTailors = await User.find(submittedPendingFilter("tailor"))
      .select("-password")
      .sort({ createdAt: -1 });

    res.send(pendingTailors);
  }),
);

// GET /api/admin/tailors/approved-users
// Returns all users with role="tailor" and approvalStatus="approved"
adminRouter.get(
  "/tailors/approved-users",
  expressAsyncHandler(async (req, res) => {
    const approvedUsers = await User.find({
      role: "tailor",
      approvalStatus: "approved",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.send({
      success: true,
      items: approvedUsers,
    });
  }),
);

adminRouter.get(
  "/tailors/:id/application",
  expressAsyncHandler(async (req, res) => {
    try {
      const payload = await getAdminApplication(req.params.id, "tailor");
      res.send(payload);
    } catch (error) {
      if (error instanceof PartnerApplicationError) {
        res.status(error.status).send({
          code: error.code,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  }),
);

// PATCH /api/admin/tailors/:id/approve
// Set approvalStatus: approved — pending or rejected only
adminRouter.patch(
  "/tailors/:id/approve",
  expressAsyncHandler(async (req, res) => {
    const tailor = await User.findById(req.params.id);

    if (tailor && tailor.role === "tailor") {
      try {
        assertPartnerDecisionAllowed(tailor);
        const rawNote = req.body?.approvalNote ?? req.body?.note;
        const approvalNote = typeof rawNote === "string" ? rawNote.trim() : "";
        await seedShopFromApplication(tailor);
        tailor.approvalStatus = "approved";
        tailor.rejectionNote = "";
        tailor.approvalNote = approvalNote;
        const updatedTailor = await tailor.save();
        await mailAfterPartnerDecision(updatedTailor, "approved");
        res.send({
          message: "Tailor approved successfully",
          user: {
            _id: updatedTailor._id,
            name: updatedTailor.name,
            email: updatedTailor.email,
            approvalStatus: updatedTailor.approvalStatus,
            rejectionNote: updatedTailor.rejectionNote,
            approvalNote: updatedTailor.approvalNote,
          },
        });
      } catch (error) {
        if (error instanceof PartnerApplicationError) {
          res.status(error.status).send({
            code: error.code,
            message: error.message,
          });
          return;
        }
        throw error;
      }
    } else {
      res
        .status(404)
        .send({ message: "Pending tailor not found or invalid role" });
    }
  }),
);

// PATCH /api/admin/tailors/:id/reject
// Set approvalStatus: rejected — pending or rejected only (never after approve)
adminRouter.patch(
  "/tailors/:id/reject",
  expressAsyncHandler(async (req, res) => {
    const tailor = await User.findById(req.params.id);

    if (tailor && tailor.role === "tailor") {
      try {
        assertPartnerDecisionAllowed(tailor);
        const rawNote = req.body?.note ?? req.body?.rejectionNote;
        const rejectionNote = typeof rawNote === "string" ? rawNote.trim() : "";
        if (!rejectionNote) {
          res.status(400).send({
            code: "REJECTION_NOTE_REQUIRED",
            message: "A rejection note is required",
          });
          return;
        }

        tailor.approvalStatus = "rejected";
        tailor.rejectionNote = rejectionNote;
        tailor.approvalNote = "";
        const updatedTailor = await tailor.save();
        await mailAfterPartnerDecision(updatedTailor, "rejected", {
          rejectionNote,
          rejectedAtMs: Date.now(),
        });
        res.send({
          message: "Tailor rejected",
          user: {
            _id: updatedTailor._id,
            name: updatedTailor.name,
            email: updatedTailor.email,
            approvalStatus: updatedTailor.approvalStatus,
            rejectionNote: updatedTailor.rejectionNote,
          },
        });
      } catch (error) {
        if (error instanceof PartnerApplicationError) {
          res.status(error.status).send({
            code: error.code,
            message: error.message,
          });
          return;
        }
        throw error;
      }
    } else {
      res
        .status(404)
        .send({ message: "Pending tailor not found or invalid role" });
    }
  }),
);

// GET /api/admin/tailors/rejected-tailors
// Returns all users with role="tailor" and approvalStatus="approved"
adminRouter.get(
  "/tailors/rejected-tailors",
  expressAsyncHandler(async (req, res) => {
    const rejectedTailors = await User.find({
      role: "tailor",
      approvalStatus: "rejected",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.send({
      success: true,
      items: rejectedTailors,
    });
  }),
);

adminRouter.get(
  "/fabric-stores/pending",
  expressAsyncHandler(async (req, res) => {
    const pendingStores = await User.find(
      submittedPendingFilter("fabric_store"),
    )
      .select("-password")
      .sort({ createdAt: -1 });

    res.send(pendingStores);
  }),
);

adminRouter.get(
  "/fabric-stores/approved-users",
  expressAsyncHandler(async (req, res) => {
    const approvedUsers = await User.find({
      role: "fabric_store",
      approvalStatus: "approved",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.send({
      success: true,
      items: approvedUsers,
    });
  }),
);

adminRouter.get(
  "/fabric-stores/:id/application",
  expressAsyncHandler(async (req, res) => {
    try {
      const payload = await getAdminApplication(req.params.id, "fabric_store");
      res.send(payload);
    } catch (error) {
      if (error instanceof PartnerApplicationError) {
        res.status(error.status).send({
          code: error.code,
          message: error.message,
        });
        return;
      }
      throw error;
    }
  }),
);

adminRouter.patch(
  "/fabric-stores/:id/approve",
  expressAsyncHandler(async (req, res) => {
    const store = await User.findById(req.params.id);

    if (store && store.role === "fabric_store") {
      try {
        assertPartnerDecisionAllowed(store);
        const rawNote = req.body?.approvalNote ?? req.body?.note;
        const approvalNote = typeof rawNote === "string" ? rawNote.trim() : "";
        await seedShopFromApplication(store);
        store.approvalStatus = "approved";
        store.rejectionNote = "";
        store.approvalNote = approvalNote;
        const updatedStore = await store.save();
        await mailAfterPartnerDecision(updatedStore, "approved");
        res.send({
          message: "Fabric store approved successfully",
          user: {
            _id: updatedStore._id,
            name: updatedStore.name,
            email: updatedStore.email,
            approvalStatus: updatedStore.approvalStatus,
            rejectionNote: updatedStore.rejectionNote,
            approvalNote: updatedStore.approvalNote,
          },
        });
      } catch (error) {
        if (error instanceof PartnerApplicationError) {
          res.status(error.status).send({
            code: error.code,
            message: error.message,
          });
          return;
        }
        throw error;
      }
    } else {
      res
        .status(404)
        .send({ message: "Pending fabric store not found or invalid role" });
    }
  }),
);

adminRouter.patch(
  "/fabric-stores/:id/reject",
  expressAsyncHandler(async (req, res) => {
    const store = await User.findById(req.params.id);

    if (store && store.role === "fabric_store") {
      try {
        assertPartnerDecisionAllowed(store);
        const rawNote = req.body?.note ?? req.body?.rejectionNote;
        const rejectionNote = typeof rawNote === "string" ? rawNote.trim() : "";
        if (!rejectionNote) {
          res.status(400).send({
            code: "REJECTION_NOTE_REQUIRED",
            message: "A rejection note is required",
          });
          return;
        }

        store.approvalStatus = "rejected";
        store.rejectionNote = rejectionNote;
        store.approvalNote = "";
        const updatedStore = await store.save();
        await mailAfterPartnerDecision(updatedStore, "rejected", {
          rejectionNote,
          rejectedAtMs: Date.now(),
        });
        res.send({
          message: "Fabric store rejected",
          user: {
            _id: updatedStore._id,
            name: updatedStore.name,
            email: updatedStore.email,
            approvalStatus: updatedStore.approvalStatus,
            rejectionNote: updatedStore.rejectionNote,
          },
        });
      } catch (error) {
        if (error instanceof PartnerApplicationError) {
          res.status(error.status).send({
            code: error.code,
            message: error.message,
          });
          return;
        }
        throw error;
      }
    } else {
      res
        .status(404)
        .send({ message: "Pending fabric store not found or invalid role" });
    }
  }),
);

adminRouter.get(
  "/fabric-stores/rejected-stores",
  expressAsyncHandler(async (req, res) => {
    const rejectedStores = await User.find({
      role: "fabric_store",
      approvalStatus: "rejected",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    res.send({
      success: true,
      items: rejectedStores,
    });
  }),
);

// ==========================================
// C-05: Admin tailor oversight
// ==========================================

const tailorShopOwnerPopulate = {
  path: "ownerId",
  select: "name email approvalStatus requestNumber",
  match: { approvalStatus: "approved" },
};

async function toggleTailorShopActive(req, res) {
  const shop = await TailorShop.findById(req.params.shopId);

  if (!shop) {
    res.status(404).send({ success: false, message: "Tailor shop not found" });
    return;
  }

  shop.isActive = !shop.isActive;
  const updatedShop = await shop.save();
  await updatedShop.populate(tailorShopOwnerPopulate);

  // Sync owner User document isActive status
  if (shop.ownerId) {
    await User.findByIdAndUpdate(shop.ownerId, { isActive: shop.isActive });
  }

  res.send({
    success: true,
    message: `Tailor shop successfully ${updatedShop.isActive ? "activated" : "deactivated"}`,
    shop: updatedShop,
  });
}

// GET /api/admin/tailors
// Approved tailor shops with populated owner (shop-centric list for C-17 UI)
adminRouter.get(
  "/tailors",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    // Build search filter for shops
    let shopFilter = {};
    if (search) {
      shopFilter = {
        $or: [
          { name: { $regex: search, $options: "i" } },
          { "ownerId.name": { $regex: search, $options: "i" } },
          { "ownerId.email": { $regex: search, $options: "i" } },
        ],
      };
    }

    // Get shops with pagination
    const [shops, totalShops] = await Promise.all([
      TailorShop.find(shopFilter)
        .populate(tailorShopOwnerPopulate)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      TailorShop.countDocuments(shopFilter),
    ]);

    // Filter out shops with null ownerId
    const items = shops.filter((shop) => shop.ownerId !== null);

    res.send({
      success: true,
      total: totalShops,
      page,
      totalPages: Math.ceil(totalShops / limit),
      items,
    });
  }),
);

// Stats endpoint
adminRouter.get(
  "/tailors/stats",
  expressAsyncHandler(async (req, res) => {
    // Get all tailors data for stats
    const [allShops, pendingUsers, rejectedUsers] = await Promise.all([
      TailorShop.find({}).populate(tailorShopOwnerPopulate),
      User.find(submittedPendingFilter("tailor")),
      User.find({ approvalStatus: "rejected", role: "tailor" }),
    ]);

    const approvedShops = allShops.filter((shop) => shop.ownerId !== null);
    const shopOwnerIds = new Set(
      approvedShops.map((shop) => shop.ownerId?._id.toString()).filter(Boolean),
    );

    // Get approved users without shops
    const approvedUsers = await User.find({
      approvalStatus: "approved",
      role: "tailor",
    });
    const approvedWithoutShop = approvedUsers.filter(
      (user) => !shopOwnerIds.has(user._id.toString()),
    );

    const total =
      approvedShops.length +
      approvedWithoutShop.length +
      pendingUsers.length +
      rejectedUsers.length;

    res.send({
      total,
      approved: approvedShops.length + approvedWithoutShop.length,
      pending: pendingUsers.length,
      rejected: rejectedUsers.length,
    });
  }),
);

// PATCH /api/admin/tailors/:shopId/toggle-active
// Toggle shop visibility for moderation (activate / deactivate)
adminRouter.patch(
  "/tailors/:shopId/toggle-active",
  expressAsyncHandler(toggleTailorShopActive),
);

// PATCH /api/admin/tailors/:shopId/deactivate
// Backward-compatible alias — also toggles isActive
adminRouter.patch(
  "/tailors/:shopId/deactivate",
  expressAsyncHandler(toggleTailorShopActive),
);

const fabricShopOwnerPopulate = {
  path: "ownerId",
  select: "name email approvalStatus",
  match: { approvalStatus: "approved" },
};

async function toggleFabricShopActive(req, res) {
  const shop = await FabricShop.findById(req.params.shopId);

  if (!shop) {
    res.status(404).send({ success: false, message: "Fabric shop not found" });
    return;
  }

  shop.isActive = !shop.isActive;
  const updatedShop = await shop.save();
  await updatedShop.populate(fabricShopOwnerPopulate);

  // Sync owner User document isActive status
  if (shop.ownerId) {
    await User.findByIdAndUpdate(shop.ownerId, { isActive: shop.isActive });
  }

  res.send({
    success: true,
    message: `Fabric shop successfully ${updatedShop.isActive ? "activated" : "deactivated"}`,
    shop: updatedShop,
  });
}

adminRouter.get(
  "/fabric-shops",
  expressAsyncHandler(async (req, res) => {
    const shops = await FabricShop.find({})
      .populate(fabricShopOwnerPopulate)
      .sort({ createdAt: -1 });

    const items = shops.filter((shop) => shop.ownerId !== null);

    res.send({
      success: true,
      total: items.length,
      items,
    });
  }),
);

adminRouter.patch(
  "/fabric-shops/:shopId/toggle-active",
  expressAsyncHandler(toggleFabricShopActive),
);

adminRouter.patch(
  "/fabric-shops/:shopId/deactivate",
  expressAsyncHandler(toggleFabricShopActive),
);

// ==========================================
// C-06: Admin retail orders
// ==========================================

// GET /api/admin/orders/retail
// List all retail orders (ready-made, add-ons, and fabric-by-meter) with optional
// filters: status, from, to, customer, or orderId (direct lookup).
adminRouter.get(
  "/orders/retail",
  expressAsyncHandler(async (req, res) => {
    const { status, from, to, customer, page, limit, orderId } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (orderId && mongoose.Types.ObjectId.isValid(String(orderId))) {
      filter._id = String(orderId);
    }

    if (!filter._id && status) {
      if (!RETAIL_ORDER_STATUSES.includes(status)) {
        res.status(400).send({
          message: `Invalid status. Allowed values: ${RETAIL_ORDER_STATUSES.join(", ")}`,
        });
        return;
      }
      filter.status = status;
    }

    if (!filter._id && (from || to)) {
      const parsed = applyCreatedAtFilter(from, to);
      if (parsed.error) {
        res.status(400).send({ message: parsed.error });
        return;
      }
      if (parsed.createdAt) {
        filter.createdAt = parsed.createdAt;
      }
    }

    if (!filter._id && customer) {
      const customerQuery = String(customer).trim();

      if (mongoose.Types.ObjectId.isValid(customerQuery)) {
        filter.userId = customerQuery;
      } else {
        const escaped = customerQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const textMatcher = { $regex: escaped, $options: "i" };

        const matchingUsers = await User.find({
          $or: [{ name: textMatcher }, { email: textMatcher }],
        }).select("_id");

        const userIds = matchingUsers.map((user) => user._id);
        const customerOr = [
          { "shippingAddress.fullName": textMatcher },
          { contactEmail: textMatcher },
        ];
        if (userIds.length > 0) {
          customerOr.unshift({ userId: { $in: userIds } });
        }

        filter.$or = customerOr;
      }
    }

    // Admin sees all retail orders: fabric-store and platform ready-made,
    // add-ons, and fabric-by-meter. Do not scope to MOTD Admin–owned IDs only —
    // that hid fabric-shop ready-made / add-on checkouts.
    const [orders, total] = await Promise.all([
      RetailOrder.find(filter)
        .populate("userId", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      RetailOrder.countDocuments(filter),
    ]);

    const hydrated = await hydrateRetailOrders(orders);

    res.send({
      items: hydrated,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  }),
);

// PATCH /api/admin/orders/:id/status
// C-18: use this path (not /orders/retail/:id/status). Any valid status is allowed (no strict pipeline step).
// Appends statusHistory[] so admin/customer timelines stay in sync.
adminRouter.patch(
  "/orders/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { status, note } = req.body;

    const validStatuses = RETAIL_ORDER_STATUSES;
    if (status && !validStatuses.includes(status)) {
      res.status(400).send({ message: "Invalid status value provided" });
      return;
    }

    const order = await RetailOrder.findById(req.params.id);

    if (order) {
      if (status) {
        const previousStatus = order.status;
        order.status = status;

        const historyBlock = {
          status,
          note:
            typeof note === "string" && note.trim()
              ? note.trim()
              : previousStatus && previousStatus !== status
                ? `Status changed from ${previousStatus} to ${status}`
                : "",
          changedAt: new Date(),
          changedBy: req.user?._id,
        };

        if (!order.statusHistory) {
          order.statusHistory = [];
        }
        order.statusHistory.push(historyBlock);
      }

      const updatedOrder = await order.save();

      if (status) {
        await notifyRetailStatusChange(updatedOrder, status, req.user?._id);
      }

      res.send({
        message: `Order status successfully updated to ${updatedOrder.status}`,
        order: updatedOrder,
      });
    } else {
      res.status(404).send({ message: "Retail order not found" });
    }
  }),
);

// ==========================================
// C-07: Admin custom orders
// ==========================================

// GET /api/admin/orders/custom
adminRouter.get(
  "/orders/custom",
  expressAsyncHandler(async (req, res) => {
    const orders = await CustomOrder.find({})
      .populate("userId", "name email phone")
      .populate({
        path: "tailorShopId",
        select: "name nameAr location city phone pickupAddress ownerId",
        populate: { path: "ownerId", select: "name email phone" },
      })
      .populate({
        path: "items.tailorShopId",
        select: "name nameAr location city phone pickupAddress ownerId",
        populate: { path: "ownerId", select: "name email phone" },
      })
      .populate("fabricStoreId", "name email phone")
      .populate("items.fabricStoreId", "name email phone")
      .populate("designId", "images")
      .populate("items.designId", "images")
      .populate("fabricId", "images")
      .populate("items.fabricId", "images")
      .sort({ createdAt: -1 })
      .lean();

    const fabricOwnerIds = new Set();
    for (const order of orders) {
      const rootId =
        order.fabricStoreId?._id?.toString?.() ||
        order.fabricStoreId?.toString?.() ||
        "";
      if (rootId) fabricOwnerIds.add(rootId);
      for (const item of order.items || []) {
        const itemId =
          item.fabricStoreId?._id?.toString?.() ||
          item.fabricStoreId?.toString?.() ||
          "";
        if (itemId) fabricOwnerIds.add(itemId);
      }
    }

    const fabricShops =
      fabricOwnerIds.size > 0
        ? await FabricShop.find({
          ownerId: { $in: [...fabricOwnerIds] },
        })
          .select("name nameAr ownerId phone city location pickupAddress")
          .lean()
        : [];
    const fabricShopByOwner = new Map(
      fabricShops.map((shop) => [String(shop.ownerId), shop]),
    );

    const withFabricShopNames = orders.map((order) => {
      const attachShopName = (storeRef) => {
        if (!storeRef || typeof storeRef !== "object") return storeRef;
        const ownerId = storeRef._id?.toString?.() || String(storeRef._id || "");
        const shop = fabricShopByOwner.get(ownerId);
        if (!shop) return storeRef;
        return {
          ...storeRef,
          name: shop.name || storeRef.name,
          nameAr: shop.nameAr || storeRef.nameAr || "",
          shopName: shop.name,
          shopId: shop._id,
          phone: shop.phone || storeRef.phone || "",
          city: shop.city || "",
          location: shop.location || "",
          pickupAddress: shop.pickupAddress || null,
          ownerName: storeRef.name || "",
          ownerEmail: storeRef.email || "",
          ownerPhone: storeRef.phone || "",
        };
      };

      return {
        ...order,
        fabricStoreId: attachShopName(order.fabricStoreId),
        items: (order.items || []).map((item) => ({
          ...item,
          fabricStoreId: attachShopName(item.fabricStoreId),
        })),
      };
    });

    res.send(withFabricShopNames);
  }),
);

// PATCH /api/admin/orders/custom/:id/status
// Set any valid CUSTOM_STATUSES value (no strict one-step pipeline). Appends statusHistory[].
adminRouter.patch(
  "/orders/custom/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { status, note } = req.body;

    if (status && !CUSTOM_STATUSES.includes(status)) {
      res.status(400).send({
        message: `Invalid custom logistics status value. Allowed values: ${CUSTOM_STATUSES.join(", ")}`,
      });
      return;
    }

    const order = await CustomOrder.findById(req.params.id);

    if (order) {
      if (status) {
        const previousStatus = order.status;
        order.status = status;

        if (status === "delivered") {
          order.returnItems = [];
        }

        const historyBlock = {
          status,
          note:
            typeof note === "string" && note.trim()
              ? note.trim()
              : previousStatus && previousStatus !== status
                ? `Status changed from ${previousStatus} to ${status}`
                : "",
          changedAt: new Date(),
          changedBy: req.user?._id,
        };

        if (!order.statusHistory) {
          order.statusHistory = [];
        }
        order.statusHistory.push(historyBlock);
      }

      let updatedOrder = await order.save();

      if (status === "ready") {
        const shipmentResult = await createReadyCustomShipments(
          updatedOrder,
          null,
          { changedBy: req.user?._id },
        );
        updatedOrder = shipmentResult?.order || updatedOrder;
      }

      if (status) {
        await notifyCustomStatusChange(updatedOrder, status, req.user?._id);
      }

      res.send({
        message: `Custom order logistics shifted to: ${updatedOrder.status}`,
        order: updatedOrder,
      });
    } else {
      res.status(404).send({ message: "Custom tailoring order not found" });
    }
  }),
);

// ==========================================
// C-08: Admin dashboard stats
// ==========================================

function safeGrowthPercent(current, previous) {
  const prev = typeof previous === "number" ? previous : 0;
  const curr = typeof current === "number" ? current : 0;

  if (prev <= 0) {
    // recommended behavior from confirmation: if previous is 0, growth = 0
    return 0;
  }
  return ((curr - prev) / prev) * 100;
}

// GET /api/admin/dashboard
// Split retail/custom orderCount + revenue with growth + charts + recent activity.
adminRouter.get(
  "/dashboard",
  expressAsyncHandler(async (req, res) => {
    const timeframeRaw = req.query.timeframe;
    const timeframe =
      timeframeRaw === "week" ||
        timeframeRaw === "month" ||
        timeframeRaw === "year"
        ? timeframeRaw
        : "month";

    const { start, end, prevStart, prevEnd } = getTimeframeWindow(timeframe, {
      includePrevious: true,
    });

    const revenueExprRetail = "$totalPrice";
    const revenueExprCustom = "$pricing.total";

    // Current window aggregates
    const [retailNow, customNow] = await Promise.all([
      RetailOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            revenue: { $sum: revenueExprRetail },
          },
        },
      ]),
      CustomOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            revenue: { $sum: revenueExprCustom },
          },
        },
      ]),
    ]);

    const retailNowResult = retailNow[0] || { orderCount: 0, revenue: 0 };
    const customNowResult = customNow[0] || { orderCount: 0, revenue: 0 };

    // Previous window aggregates (for growth)
    const [retailPrev, customPrev] = await Promise.all([
      RetailOrder.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lte: prevEnd } } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            revenue: { $sum: revenueExprRetail },
          },
        },
      ]),
      CustomOrder.aggregate([
        { $match: { createdAt: { $gte: prevStart, $lte: prevEnd } } },
        {
          $group: {
            _id: null,
            orderCount: { $sum: 1 },
            revenue: { $sum: revenueExprCustom },
          },
        },
      ]),
    ]);

    const retailPrevResult = retailPrev[0] || { orderCount: 0, revenue: 0 };
    const customPrevResult = customPrev[0] || { orderCount: 0, revenue: 0 };

    const retailGrowth = safeGrowthPercent(
      retailNowResult.revenue,
      retailPrevResult.revenue,
    );
    const customGrowth = safeGrowthPercent(
      customNowResult.revenue,
      customPrevResult.revenue,
    );

    // Monthly data for charts: keep month-based grouping (frontend assumes a month chart)
    const monthEnd = new Date();
    const monthStarts = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(monthEnd);
      d.setUTCMonth(d.getUTCMonth() - i);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      monthStarts.push(d);
    }

    function monthLabel(d) {
      return d.toLocaleString("en-US", { month: "short" });
    }

    // Build month aggregation maps
    const monthKey = (d) => `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;

    const startRange = monthStarts[0];
    const endRange = new Date(monthEnd);
    endRange.setUTCHours(23, 59, 59, 999);

    const [retailMonthlyAgg, customMonthlyAgg] = await Promise.all([
      RetailOrder.aggregate([
        { $match: { createdAt: { $gte: startRange, $lte: endRange } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            orderCount: { $sum: 1 },
            revenue: { $sum: "$totalPrice" },
          },
        },
      ]),
      CustomOrder.aggregate([
        { $match: { createdAt: { $gte: startRange, $lte: endRange } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            orderCount: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
          },
        },
      ]),
    ]);

    const retailMonthlyMap = new Map();
    for (const row of retailMonthlyAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      retailMonthlyMap.set(key, row.revenue || 0);
    }

    const customMonthlyMap = new Map();
    for (const row of customMonthlyAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      customMonthlyMap.set(key, row.revenue || 0);
    }

    const monthlyData = monthStarts.map((d) => {
      const key = monthKey(d);
      return {
        month: monthLabel(d),
        retail: retailMonthlyMap.get(key) || 0,
        custom: customMonthlyMap.get(key) || 0,
      };
    });

    // Recent activity: latest 5 combined (most recent createdAt)
    const [recentRetail, recentCustom] = await Promise.all([
      RetailOrder.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("_id createdAt status totalPrice userId"),
      CustomOrder.find({})
        .sort({ createdAt: -1 })
        .limit(5)
        .select("_id createdAt status pricing")
        .lean(),
    ]);

    const normalizedRetail = (recentRetail || []).map((o) => ({
      id: o._id.toString(),
      type: "retail",
      amount: o.totalPrice || 0,
      status: o.status,
      date: o.createdAt ? o.createdAt.toISOString() : "",
    }));

    const normalizedCustom = (recentCustom || []).map((o) => ({
      id: o._id.toString(),
      type: "custom",
      amount: o.pricing?.total || 0,
      status: o.status,
      date: o.createdAt ? o.createdAt.toISOString() : "",
    }));

    const recentOrders = [...normalizedRetail, ...normalizedCustom]
      .sort((a, b) => {
        const at = a.date ? new Date(a.date).getTime() : 0;
        const bt = b.date ? new Date(b.date).getTime() : 0;
        return bt - at;
      })
      .slice(0, 5);

    // Monthly order counts (for volume chart)
    const retailMonthlyOrderMap = new Map();
    for (const row of retailMonthlyAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      retailMonthlyOrderMap.set(key, row.orderCount || 0);
    }
    const customMonthlyOrderMap = new Map();
    for (const row of customMonthlyAgg) {
      const key = `${row._id.year}-${row._id.month}`;
      customMonthlyOrderMap.set(key, row.orderCount || 0);
    }
    const monthlyOrders = monthStarts.map((d) => {
      const key = monthKey(d);
      return {
        month: monthLabel(d),
        retail: retailMonthlyOrderMap.get(key) || 0,
        custom: customMonthlyOrderMap.get(key) || 0,
      };
    });

    const totalOrders = retailNowResult.orderCount + customNowResult.orderCount;
    const totalRevenue = retailNowResult.revenue + customNowResult.revenue;
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    const LOW_FABRIC_CUT_STOCK = LOW_FABRIC_CUT_STOCK_THRESHOLD;
    const LOW_READY_STOCK = 5;
    const LOW_ADDON_STOCK = 5;
    const monthStartCustomers = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const [
      retailStatusAgg,
      customStatusAgg,
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      pendingTailors,
      pendingFabricStores,
      activeTailorShops,
      activeFabricShops,
      lowFabricCount,
      lowReadyMadeCount,
      lowAddonCount,
      topFabricsAgg,
      topProductsAgg,
      topTailorsAgg,
      retailTopFabricsAgg,
    ] = await Promise.all([
      RetailOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      CustomOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      User.countDocuments({ role: "customer" }),
      User.countDocuments({ role: "customer", isActive: true }),
      User.countDocuments({
        role: "customer",
        createdAt: { $gte: monthStartCustomers },
      }),
      User.countDocuments(submittedPendingFilter("tailor")),
      User.countDocuments(submittedPendingFilter("fabric_store")),
      TailorShop.countDocuments({ isActive: true }),
      FabricShop.countDocuments({ isActive: true }),
      countLowStockFabricCutRows({}, LOW_FABRIC_CUT_STOCK),
      ReadyMadeProduct.countDocuments({
        availableFabricStock: { $lte: LOW_READY_STOCK },
        isActive: true,
      }),
      AddOn.countDocuments({
        stock: { $lte: LOW_ADDON_STOCK },
        isActive: true,
      }),
      CustomOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: { path: "$items", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              $ifNull: [
                "$items.fabricSnapshot.name",
                { $ifNull: ["$fabricSnapshot.name", "Unknown"] },
              ],
            },
            revenue: {
              $sum: {
                $ifNull: [
                  "$items.pricing.fabricCost",
                  { $ifNull: ["$pricing.fabricCost", 0] },
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      RetailOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$orderItems" },
        {
          $match: {
            "orderItems.size": { $ne: "Per Meter" },
            "orderItems.kind": { $ne: "fabric" },
          },
        },
        {
          $group: {
            _id: {
              id: "$orderItems.productId",
              name: "$orderItems.name",
            },
            revenue: {
              $sum: {
                $multiply: ["$orderItems.price", "$orderItems.quantity"],
              },
            },
            quantity: { $sum: "$orderItems.quantity" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
      ]),
      CustomOrder.aggregate([
        {
          $match: {
            createdAt: { $gte: start, $lte: end },
            tailorShopId: { $ne: null },
          },
        },
        {
          $group: {
            _id: "$tailorShopId",
            revenue: { $sum: { $ifNull: ["$pricing.total", 0] } },
            count: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "tailorshops",
            localField: "_id",
            foreignField: "_id",
            as: "shop",
          },
        },
        {
          $project: {
            revenue: 1,
            count: 1,
            name: {
              $ifNull: [{ $arrayElemAt: ["$shop.name", 0] }, "Unknown tailor"],
            },
          },
        },
      ]),
      RetailOrder.aggregate([
        { $match: { createdAt: { $gte: start, $lte: end } } },
        { $unwind: "$orderItems" },
        {
          $match: {
            $or: [
              { "orderItems.kind": "fabric" },
              { "orderItems.size": "Per Meter" },
            ],
          },
        },
        {
          $group: {
            _id: "$orderItems.name",
            revenue: {
              $sum: {
                $multiply: [
                  "$orderItems.price",
                  {
                    $ifNull: [
                      "$orderItems.quantityInMeters",
                      "$orderItems.quantity",
                    ],
                  },
                ],
              },
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const statusMap = new Map();
    for (const row of retailStatusAgg) {
      const key = row._id || "unknown";
      statusMap.set(key, (statusMap.get(key) || 0) + (row.count || 0));
    }
    for (const row of customStatusAgg) {
      const key = row._id || "unknown";
      statusMap.set(key, (statusMap.get(key) || 0) + (row.count || 0));
    }
    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const fabricRevenueByName = new Map();
    for (const row of topFabricsAgg || []) {
      const name = row._id || "Unknown";
      const prev = fabricRevenueByName.get(name) || { revenue: 0, count: 0 };
      fabricRevenueByName.set(name, {
        revenue: prev.revenue + (row.revenue || 0),
        count: prev.count + (row.count || 0),
      });
    }
    for (const row of retailTopFabricsAgg || []) {
      const name = row._id || "Unknown";
      const prev = fabricRevenueByName.get(name) || { revenue: 0, count: 0 };
      fabricRevenueByName.set(name, {
        revenue: prev.revenue + (row.revenue || 0),
        count: prev.count + (row.count || 0),
      });
    }
    const topFabrics = Array.from(fabricRevenueByName.entries())
      .map(([name, row], i) => ({
        id: name || String(i),
        name,
        value: row.revenue || 0,
        meta: `${row.count || 0} orders`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topProducts = (topProductsAgg || []).map((row, i) => ({
      id: row._id?.id ? String(row._id.id) : String(i),
      name: row._id?.name || "Unknown",
      value: row.revenue || 0,
      meta: `${row.quantity || 0} sold`,
    }));

    const topTailors = (topTailorsAgg || []).map((row) => ({
      id: row._id ? String(row._id) : row.name,
      name: row.name || "Unknown tailor",
      value: row.revenue || 0,
      meta: `${row.count || 0} orders`,
    }));

    // Partner shares admin must send (net after MOTD commission), scoped to timeframe.
    const [platformSettings, customShareOrders, retailShareOrders] =
      await Promise.all([
        PlatformSettings.findOne({}).lean(),
        CustomOrder.find({ createdAt: { $gte: start, $lte: end } })
          .select("items pricing isPaid status")
          .lean(),
        RetailOrder.find({ createdAt: { $gte: start, $lte: end } })
          .select(
            "orderItems shippingPrice parcelCount perParcelFee deliveryBreakdown isPaid status",
          )
          .lean(),
      ]);

    const tailorCommissionPercent = resolveCommissionPercent(
      platformSettings?.motdCommissionFromTailor,
      DEFAULT_TAILOR_COMMISSION_PERCENT,
    );
    const fabricCommissionPercent = resolveCommissionPercent(
      platformSettings?.motdCommissionFromFabricStore,
      DEFAULT_FABRIC_COMMISSION_PERCENT,
    );

    let tailorGrossTotal = 0;
    let fabricGrossCustomTotal = 0;
    let shippingCustomTotal = 0;
    for (const order of customShareOrders) {
      if (order.isPaid === false) continue;
      if (
        order.status === "cancelled" ||
        order.status === "return_requested" ||
        order.status === "return_approved" ||
        order.status === "refund_processed"
      ) {
        continue;
      }
      tailorGrossTotal += sumCustomTailorGross(order);
      fabricGrossCustomTotal += sumCustomFabricGross(order);
      shippingCustomTotal += sumCustomShippingGross(order);
    }

    let fabricGrossRetailTotal = 0;
    let shippingRetailTotal = 0;
    for (const order of retailShareOrders) {
      if (order.isPaid === false) continue;
      if (order.status === "cancelled") continue;
      fabricGrossRetailTotal += sumRetailFabricGross(order);
      shippingRetailTotal += sumRetailShippingGross(order);
    }

    const tailorShare = splitMotdCommission(
      tailorGrossTotal,
      tailorCommissionPercent,
    );
    const fabricStoreShare = splitMotdCommission(
      fabricGrossCustomTotal + fabricGrossRetailTotal,
      fabricCommissionPercent,
    );
    const shippingTotal = Number(
      (shippingCustomTotal + shippingRetailTotal).toFixed(2),
    );
    const motdKeeps = Number(
      (tailorShare.commission + fabricStoreShare.commission).toFixed(2),
    );

    res.send({
      retail: {
        orderCount: retailNowResult.orderCount,
        revenue: retailNowResult.revenue,
        growth: retailGrowth,
      },
      custom: {
        orderCount: customNowResult.orderCount,
        revenue: customNowResult.revenue,
        growth: customGrowth,
      },
      currency: "AED",
      aov,
      monthlyData,
      monthlyOrders,
      recentOrders,
      statusBreakdown,
      customers: {
        total: totalCustomers,
        active: activeCustomers,
        newThisMonth: newCustomersThisMonth,
      },
      partners: {
        pendingTailors,
        pendingFabricStores,
        pendingTotal: pendingTailors + pendingFabricStores,
        activeTailorShops,
        activeFabricShops,
      },
      inventory: {
        lowFabrics: lowFabricCount,
        lowReadyMade: lowReadyMadeCount,
        lowAddons: lowAddonCount,
        lowTotal: lowFabricCount + lowReadyMadeCount + lowAddonCount,
      },
      topFabrics,
      topProducts,
      topTailors,
      partnerShares: {
        tailor: {
          gross: tailorShare.gross,
          commission: tailorShare.commission,
          net: tailorShare.net,
          percent: tailorShare.percent,
        },
        fabricStore: {
          gross: fabricStoreShare.gross,
          commission: fabricStoreShare.commission,
          net: fabricStoreShare.net,
          percent: fabricStoreShare.percent,
          customGross: Number(fabricGrossCustomTotal.toFixed(2)),
          retailGross: Number(fabricGrossRetailTotal.toFixed(2)),
        },
        shipping: {
          gross: shippingTotal,
          net: shippingTotal,
          customGross: Number(shippingCustomTotal.toFixed(2)),
          retailGross: Number(shippingRetailTotal.toFixed(2)),
        },
        motdKeeps,
        motdEarnings: motdKeeps,
      },
    });
  }),
);

adminRouter.get(
  "/settings",
  expressAsyncHandler(async (req, res) => {
    // If the model has a custom static method like getSettings(), we use it, otherwise fallback to findOne
    let settings = await PlatformSettings.findOne({});

    // Safety check: If for some reason seed wasn't run, initialize a default configuration block
    if (!settings) {
      settings = await PlatformSettings.create({
        defaultDeliveryFee: 30,
        defaultTailoringFee: 150,
        motdCommissionFromTailor: 12,
        motdCommissionFromFabricStore: 15,

        currency: "AED",
      });
    }

    const payload = settings.toObject({ aliases: true });
    res.send({
      ...payload,
      perParcelDeliveryFee:
        payload.perParcelDeliveryFee ?? payload.defaultDeliveryFee ?? 30,
      defaultDeliveryFee:
        payload.defaultDeliveryFee ?? payload.perParcelDeliveryFee ?? 30,
    });
  }),
);

// PUT /api/admin/settings
// Updates allowed configuration fields on the single platform registry document with sanity filters
adminRouter.put(
  "/settings",
  expressAsyncHandler(async (req, res) => {
    const {
      defaultDeliveryFee,
      perParcelDeliveryFee,
      defaultTailoringFee,
      motdCommissionFromTailor,
      motdCommissionFromFabricStore,
      vatRate,
      currency,
      returnDeductionPercent,
      returnAllowedDays,
      fulfillmentAddress,
    } = req.body;

    const resolvedDeliveryFee =
      perParcelDeliveryFee !== undefined
        ? perParcelDeliveryFee
        : defaultDeliveryFee;

    // 1. Structural Number Validations
    if (
      resolvedDeliveryFee !== undefined &&
      (typeof resolvedDeliveryFee !== "number" || resolvedDeliveryFee < 0)
    ) {
      res.status(400).send({
        message:
          "Per-parcel delivery fee must be a valid number greater than or equal to 0",
      });
      return;
    }
    if (
      defaultTailoringFee !== undefined &&
      (typeof defaultTailoringFee !== "number" || defaultTailoringFee < 0)
    ) {
      res.status(400).send({
        message:
          "Tailoring fee must be a valid number greater than or equal to 0",
      });
      return;
    }
    if (
      motdCommissionFromTailor !== undefined &&
      (typeof motdCommissionFromTailor !== "number" ||
        motdCommissionFromTailor < 0 ||
        motdCommissionFromTailor > 100)
    ) {
      res.status(400).send({
        message:
          "MOTD commission from tailor must be a valid percentage between 0 and 100",
      });
      return;
    }
    if (
      motdCommissionFromFabricStore !== undefined &&
      (typeof motdCommissionFromFabricStore !== "number" ||
        motdCommissionFromFabricStore < 0 ||
        motdCommissionFromFabricStore > 100)
    ) {
      res.status(400).send({
        message:
          "MOTD commission from fabric store must be a valid percentage between 0 and 100",
      });
      return;
    }
    if (
      vatRate !== undefined &&
      (typeof vatRate !== "number" || vatRate < 0 || vatRate > 1)
    ) {
      res.status(400).send({
        message:
          "VAT rate must be a valid decimal fractional boundary between 0 and 1",
      });
      return;
    }

    if (
      returnDeductionPercent !== undefined &&
      (typeof returnDeductionPercent !== "number" ||
        returnDeductionPercent < 0 ||
        returnDeductionPercent > 100)
    ) {
      res.status(400).send({
        message:
          "Return deduction percent must be a valid number between 0 and 100",
      });
      return;
    }

    if (
      returnAllowedDays !== undefined &&
      (typeof returnAllowedDays !== "number" || returnAllowedDays < 0)
    ) {
      res.status(400).send({
        message:
          "Return allowed days must be a valid number greater than or equal to 0",
      });
      return;
    }

    let normalizedFulfillmentAddress;
    if (fulfillmentAddress !== undefined) {
      if (isEmptyShopPickupAddress(fulfillmentAddress)) {
        normalizedFulfillmentAddress = {
          fullName: "",
          phone: "",
          line1: "",
          line2: "",
          city: "",
          emirate: "",
        };
      } else {
        normalizedFulfillmentAddress =
          normalizeShopPickupAddress(fulfillmentAddress);
        if (!normalizedFulfillmentAddress) {
          res.status(400).send({
            message:
              "fulfillmentAddress requires fullName, phone, line1, city, and emirate",
          });
          return;
        }
      }
    }

    // 2. Fetch the current singleton record
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      res.status(404).send({
        message: "Platform settings base blueprint document not found",
      });
      return;
    }

    // 3. Re-assign changed attributes smoothly
    if (resolvedDeliveryFee !== undefined) {
      settings.defaultDeliveryFee = resolvedDeliveryFee;
    }
    if (defaultTailoringFee !== undefined)
      settings.defaultTailoringFee = defaultTailoringFee;
    if (motdCommissionFromTailor !== undefined)
      settings.motdCommissionFromTailor = motdCommissionFromTailor;
    if (motdCommissionFromFabricStore !== undefined)
      settings.motdCommissionFromFabricStore = motdCommissionFromFabricStore;
    if (vatRate !== undefined) settings.vatRate = vatRate;
    if (returnDeductionPercent !== undefined)
      settings.returnDeductionPercent = returnDeductionPercent;
    if (returnAllowedDays !== undefined)
      settings.returnAllowedDays = returnAllowedDays;
    if (currency !== undefined) settings.currency = currency; // Fixed AED standard in MVP layout
    if (normalizedFulfillmentAddress !== undefined) {
      settings.fulfillmentAddress = normalizedFulfillmentAddress;
    }

    const updatedSettings = await settings.save();
    const settingsPayload = updatedSettings.toObject({ aliases: true });
    res.send({
      message:
        "Global platform configuration variables locked and synchronized successfully",
      settings: {
        ...settingsPayload,
        perParcelDeliveryFee:
          settingsPayload.perParcelDeliveryFee ??
          settingsPayload.defaultDeliveryFee ??
          30,
        defaultDeliveryFee:
          settingsPayload.defaultDeliveryFee ??
          settingsPayload.perParcelDeliveryFee ??
          30,
      },
    });
  }),
);

// GET /api/admin/customers
// Fetch all users with role "customer", with optional search and status filter
adminRouter.get(
  "/customers",
  expressAsyncHandler(async (req, res) => {
    const { search, status, page = 1, limit = 10 } = req.query;

    const filter = { role: "customer" };

    // Status filter (isActive)
    if (status === "active") filter.isActive = true;
    else if (status === "inactive") filter.isActive = false;

    // Search by name or email
    if (search && typeof search === "string") {
      const regex = new RegExp(search, "i");
      filter.$or = [{ name: regex }, { email: regex }];
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [customers, total] = await Promise.all([
      User.find(filter)
        .select("-password") // exclude password
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber),
      User.countDocuments(filter),
    ]);

    // Enrich customers with profile data from Customer model (profilePic, gender)
    const userIds = customers.map((c) => c._id);
    const customerProfiles = await Customer.find({ userId: { $in: userIds } })
      .select("profilePic gender userId")
      .lean();

    const profileMap = new Map();
    for (const profile of customerProfiles) {
      profileMap.set(profile.userId.toString(), profile);
    }

    const enrichedCustomers = customers.map((user) => {
      const userObj = user.toObject();
      const profile = profileMap.get(user._id.toString());
      if (profile) {
        userObj.profilePic = profile.profilePic || null;
        userObj.gender = profile.gender || null;
      } else {
        userObj.profilePic = null;
        userObj.gender = null;
      }
      return userObj;
    });

    // Summary stats
    const totalActive = await User.countDocuments({
      role: "customer",
      isActive: true,
    });
    const totalInactive = await User.countDocuments({
      role: "customer",
      isActive: false,
    });
    const newThisMonth = await User.countDocuments({
      role: "customer",
      createdAt: {
        $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    });

    res.send({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      stats: {
        totalCustomers: total,
        active: totalActive,
        inactive: totalInactive,
        newThisMonth,
      },
      items: enrichedCustomers,
    });
  }),
);

// DELETE /api/admin/customers/:id
adminRouter.delete(
  "/customers/:id",
  expressAsyncHandler(async (req, res) => {
    const id = req.params.id;

    // Try to find as User._id first
    let user = await User.findById(id);
    let customer = await Customer.findOne({ userId: id });

    // If not found, try as Customer._id
    if (!user && !customer) {
      customer = await Customer.findById(id);
      if (customer) {
        user = await User.findById(customer.userId);
      }
    }

    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    if (user.role !== "customer") {
      return res.status(400).send({ message: "User is not a customer" });
    }

    // Find customer by userId if not already found
    if (!customer) {
      customer = await Customer.findOne({ userId: user._id });
    }

    if (customer) {
      await customer.deleteOne();
    }
    await user.deleteOne();
    res.send({ message: "Customer deleted successfully" });
  }),
);

// PATCH /api/admin/customers/:id/toggle-active
adminRouter.patch(
  "/customers/:id/toggle-active",
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).send({ message: "Customer not found" });
    }
    if (user.role !== "customer") {
      return res.status(400).send({ message: "User is not a customer" });
    }
    user.isActive = !user.isActive;
    await user.save();
    res.send({
      message: `Customer ${user.isActive ? "activated" : "deactivated"} successfully`,
      isActive: user.isActive,
    });
  }),
);

// ==========================================
// C-12: Admin Add-Ons CRUD
// ==========================================

// GET /api/admin/addons
adminRouter.get(
  "/addons",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {};

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [{ name: regex }, { nameAr: regex }, { slug: regex }];
    }

    const [addons, total] = await Promise.all([
      AddOn.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      AddOn.countDocuments(filter),
    ]);

    res.send({
      items: addons,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }),
);

// GET /api/admin/addons/:id
adminRouter.get(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const addon = await AddOn.findById(req.params.id);
    if (addon) {
      res.send(addon);
    } else {
      res.status(404).send({ message: "Addon not found" });
    }
  }),
);

function normalizeAddOnImages(images) {
  const cleaned = Array.isArray(images)
    ? images.map((img) => String(img || "").trim()).filter(Boolean)
    : [];
  return {
    images: cleaned,
    thumbnailImage: cleaned[0] || "",
  };
}

// POST /api/admin/addons
adminRouter.post(
  "/addons",
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      nameAr,
      description,
      descriptionAr,
      price,
      stock,
      images,
      tag,
      tagAr,
      material,
      materialAr,
      design,
      designAr,
      season,
      seasonAr,
      colors,
      isActive,
    } = req.body;

    const { images: normalizedImages, thumbnailImage } =
      normalizeAddOnImages(images);

    if (!thumbnailImage) {
      res.status(400).send({ message: "At least one image is required" });
      return;
    }

    const generatedSlug = await ensureUniqueSlug(AddOn, name || nameAr, {
      fallback: "addon",
    });

    const pickupAddress = parseReadyMadePickup(req.body.pickupAddress);
    if (!pickupAddress) {
      res.status(400).send({
        message:
          "Pickup address requires fullName, phone, line1, city, and emirate",
      });
      return;
    }

    const addon = new AddOn({
      name,
      nameAr,
      slug: generatedSlug,
      description,
      descriptionAr,
      price,
      stock,
      thumbnailImage,
      images: normalizedImages,
      tag,
      tagAr,
      material,
      materialAr,
      design,
      designAr,
      season,
      seasonAr,
      colors: Array.isArray(colors) ? colors : [],
      isActive: isActive !== undefined ? isActive : true,
      // Platform listings are owned by MOTD, not the signed-in admin's display name.
      ownerName: "MOTD Admin",
      pickupAddress,
    });

    const savedAddon = await addon.save();
    res.status(201).send(savedAddon);
  }),
);

// PUT /api/admin/addons/:id
adminRouter.put(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const addon = await AddOn.findById(req.params.id);
    if (!addon) {
      res.status(404).send({ message: "Addon not found" });
      return;
    }

    const {
      name,
      nameAr,
      description,
      descriptionAr,
      price,
      stock,
      images,
      tag,
      tagAr,
      material,
      materialAr,
      design,
      designAr,
      season,
      seasonAr,
      colors,
      isActive,
    } = req.body;

    addon.name = name ?? addon.name;
    addon.nameAr = nameAr ?? addon.nameAr;
    addon.description = description ?? addon.description;
    addon.descriptionAr = descriptionAr ?? addon.descriptionAr;
    addon.price = price ?? addon.price;
    addon.stock = stock ?? addon.stock;
    if (images !== undefined) {
      const { images: normalizedImages, thumbnailImage } =
        normalizeAddOnImages(images);
      if (!thumbnailImage) {
        res.status(400).send({ message: "At least one image is required" });
        return;
      }
      addon.images = normalizedImages;
      addon.thumbnailImage = thumbnailImage;
    }
    addon.tag = tag ?? addon.tag;
    addon.tagAr = tagAr ?? addon.tagAr;
    addon.material = material ?? addon.material;
    addon.materialAr = materialAr ?? addon.materialAr;
    addon.design = design ?? addon.design;
    addon.designAr = designAr ?? addon.designAr;
    addon.season = season ?? addon.season;
    addon.seasonAr = seasonAr ?? addon.seasonAr;
    if (colors !== undefined) {
      addon.colors = Array.isArray(colors) ? colors : [];
    }
    addon.isActive = isActive !== undefined ? isActive : addon.isActive;
    if (!addon.fabricShopId) {
      addon.ownerName = "MOTD Admin";
    }

    if (req.body.pickupAddress !== undefined) {
      const pickupAddress = parseReadyMadePickup(req.body.pickupAddress);
      if (!pickupAddress) {
        res.status(400).send({
          message:
            "Pickup address requires fullName, phone, line1, city, and emirate",
        });
        return;
      }
      addon.pickupAddress = pickupAddress;
    }

    const updatedAddon = await addon.save();
    res.send(updatedAddon);
  }),
);

// DELETE /api/admin/addons/:id
adminRouter.delete(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const addon = await AddOn.findById(req.params.id);
    if (addon) {
      await addon.deleteOne();
      res.send({ message: "Addon deleted successfully" });
    } else {
      res.status(404).send({ message: "Addon not found" });
    }
  }),
);

// PATCH /api/admin/addons/:id/toggle-active
adminRouter.patch(
  "/addons/:id/toggle-active",
  expressAsyncHandler(async (req, res) => {
    const addon = await AddOn.findById(req.params.id);
    if (!addon) {
      res.status(404).send({ message: "Addon not found" });
      return;
    }
    addon.isActive = !addon.isActive;
    await addon.save();
    res.send({
      message: `Addon ${addon.isActive ? "activated" : "deactivated"} successfully`,
      isActive: addon.isActive,
    });
  }),
);

// ==========================================
// C-21: Admin Categories CRUD
// ==========================================

// GET /api/admin/categories?domain=designs&page=1&limit=10&search=...
// List categories filtered by domain (paginated)
adminRouter.get(
  "/categories",
  expressAsyncHandler(async (req, res) => {
    const { domain, search } = req.query;
    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(req.query.limit) || 10, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = {};
    if (domain) {
      filter.domain = domain;
    }

    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { nameAr: regex },
        { description: regex },
        { descriptionAr: regex },
      ];
    }

    const [categories, total] = await Promise.all([
      Category.find(filter).sort({ name: 1 }).skip(skip).limit(limitNumber),
      Category.countDocuments(filter),
    ]);

    res.send({
      items: categories,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 0,
    });
  }),
);

// GET /api/admin/categories/:id
// Get a single category by ID
adminRouter.get(
  "/categories/:id",
  expressAsyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).send({ message: "Category not found" });
      return;
    }
    res.send(category);
  }),
);

// POST /api/admin/categories
// Create a new category
adminRouter.post(
  "/categories",
  expressAsyncHandler(async (req, res) => {
    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (!name?.trim()) {
      res.status(400).send({ message: "Category name (English) is required" });
      return;
    }

    const validDomains = [
      "designs",
      "fabrics",
      "ready-made",
      "add-ons",
      "general",
    ];
    if (!domain || !validDomains.includes(domain)) {
      res.status(400).send({
        message: `Domain must be one of: ${validDomains.join(", ")}`,
      });
      return;
    }

    const category = new Category({
      name: name.trim(),
      nameAr: nameAr?.trim() || "",
      domain,
      description: description?.trim() || "",
      descriptionAr: descriptionAr?.trim() || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await category.save();
    res.status(201).send(saved);
  }),
);

// PUT /api/admin/categories/:id
// Update an existing category
adminRouter.put(
  "/categories/:id",
  expressAsyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).send({ message: "Category not found" });
      return;
    }

    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (name !== undefined) category.name = name.trim();
    if (nameAr !== undefined) category.nameAr = nameAr.trim();
    if (domain !== undefined) {
      const validDomains = [
        "designs",
        "fabrics",
        "ready-made",
        "add-ons",
        "general",
      ];
      if (!validDomains.includes(domain)) {
        res.status(400).send({
          message: `Domain must be one of: ${validDomains.join(", ")}`,
        });
        return;
      }
      category.domain = domain;
    }
    if (description !== undefined) category.description = description.trim();
    if (descriptionAr !== undefined)
      category.descriptionAr = descriptionAr.trim();
    if (isActive !== undefined) category.isActive = isActive;

    const updated = await category.save();
    res.send(updated);
  }),
);

// DELETE /api/admin/categories/:id
// Delete a category
adminRouter.delete(
  "/categories/:id",
  expressAsyncHandler(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
      res.status(404).send({ message: "Category not found" });
      return;
    }
    await category.deleteOne();
    res.send({ message: "Category deleted successfully" });
  }),
);

// ==========================================
// C-22: Admin Materials CRUD
// Separate from categories — materials are
// fabric types / materials (cotton, silk, etc.)
// ==========================================

// GET /api/admin/materials?domain=fabrics&page=1&limit=10&search=...
// List materials filtered by domain (paginated when page/limit provided)
adminRouter.get(
  "/materials",
  expressAsyncHandler(async (req, res) => {
    const { domain, search } = req.query;
    const filter = {};
    if (domain) filter.domain = domain;
    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { nameAr: regex },
        { description: regex },
        { descriptionAr: regex },
      ];
    }

    const wantsPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    if (!wantsPagination) {
      const materials = await Material.find(filter).sort({ name: 1 });
      res.send(materials);
      return;
    }

    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Material.find(filter).sort({ name: 1 }).skip(skip).limit(limitNumber),
      Material.countDocuments(filter),
    ]);

    res.send({
      items,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 0,
    });
  }),
);

// GET /api/admin/materials/:id
// Get a single material by ID
adminRouter.get(
  "/materials/:id",
  expressAsyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material) {
      res.status(404).send({ message: "Material not found" });
      return;
    }
    res.send(material);
  }),
);

// POST /api/admin/materials
// Create a new material
adminRouter.post(
  "/materials",
  expressAsyncHandler(async (req, res) => {
    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (!name?.trim()) {
      res.status(400).send({ message: "Material name (English) is required" });
      return;
    }

    const validDomains = [
      "designs",
      "fabrics",
      "ready-made",
      "add-ons",
      "general",
    ];
    if (!domain || !validDomains.includes(domain)) {
      res.status(400).send({
        message: `Domain must be one of: ${validDomains.join(", ")}`,
      });
      return;
    }

    const material = new Material({
      name: name.trim(),
      nameAr: nameAr?.trim() || "",
      domain,
      description: description?.trim() || "",
      descriptionAr: descriptionAr?.trim() || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await material.save();
    res.status(201).send(saved);
  }),
);

// PUT /api/admin/materials/:id
// Update an existing material
adminRouter.put(
  "/materials/:id",
  expressAsyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material) {
      res.status(404).send({ message: "Material not found" });
      return;
    }

    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (name !== undefined) material.name = name.trim();
    if (nameAr !== undefined) material.nameAr = nameAr.trim();
    if (domain !== undefined) {
      const validDomains = [
        "designs",
        "fabrics",
        "ready-made",
        "add-ons",
        "general",
      ];
      if (!validDomains.includes(domain)) {
        res.status(400).send({
          message: `Domain must be one of: ${validDomains.join(", ")}`,
        });
        return;
      }
      material.domain = domain;
    }
    if (description !== undefined) material.description = description.trim();
    if (descriptionAr !== undefined)
      material.descriptionAr = descriptionAr.trim();
    if (isActive !== undefined) material.isActive = isActive;

    const updated = await material.save();
    res.send(updated);
  }),
);

// DELETE /api/admin/materials/:id
// Delete a material
adminRouter.delete(
  "/materials/:id",
  expressAsyncHandler(async (req, res) => {
    const material = await Material.findById(req.params.id);
    if (!material) {
      res.status(404).send({ message: "Material not found" });
      return;
    }
    await material.deleteOne();
    res.send({ message: "Material deleted successfully" });
  }),
);

// ==========================================
// C-23: Admin Patterns CRUD
// Separate from categories — patterns are
// design patterns / styles (floral, geometric, etc.)
// ==========================================

// GET /api/admin/patterns?domain=...&page=1&limit=10&search=...
// List patterns (paginated when page/limit provided)
adminRouter.get(
  "/patterns",
  expressAsyncHandler(async (req, res) => {
    const { domain, search } = req.query;
    const filter = {};
    if (domain) filter.domain = domain;
    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { nameAr: regex },
        { description: regex },
        { descriptionAr: regex },
      ];
    }

    const wantsPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    if (!wantsPagination) {
      const patterns = await Pattern.find(filter).sort({ name: 1 });
      res.send(patterns);
      return;
    }

    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Pattern.find(filter).sort({ name: 1 }).skip(skip).limit(limitNumber),
      Pattern.countDocuments(filter),
    ]);

    res.send({
      items,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 0,
    });
  }),
);

// GET /api/admin/patterns/:id
// Get a single pattern by ID
adminRouter.get(
  "/patterns/:id",
  expressAsyncHandler(async (req, res) => {
    const pattern = await Pattern.findById(req.params.id);
    if (!pattern) {
      res.status(404).send({ message: "Pattern not found" });
      return;
    }
    res.send(pattern);
  }),
);

// POST /api/admin/patterns
// Create a new pattern
adminRouter.post(
  "/patterns",
  expressAsyncHandler(async (req, res) => {
    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (!name?.trim()) {
      res.status(400).send({ message: "Pattern name (English) is required" });
      return;
    }

    const validDomains = [
      "designs",
      "fabrics",
      "ready-made",
      "add-ons",
      "general",
    ];
    if (!domain || !validDomains.includes(domain)) {
      res.status(400).send({
        message: `Domain must be one of: ${validDomains.join(", ")}`,
      });
      return;
    }

    const pattern = new Pattern({
      name: name.trim(),
      nameAr: nameAr?.trim() || "",
      domain,
      description: description?.trim() || "",
      descriptionAr: descriptionAr?.trim() || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await pattern.save();
    res.status(201).send(saved);
  }),
);

// PUT /api/admin/patterns/:id
// Update an existing pattern
adminRouter.put(
  "/patterns/:id",
  expressAsyncHandler(async (req, res) => {
    const pattern = await Pattern.findById(req.params.id);
    if (!pattern) {
      res.status(404).send({ message: "Pattern not found" });
      return;
    }

    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (name !== undefined) pattern.name = name.trim();
    if (nameAr !== undefined) pattern.nameAr = nameAr.trim();
    if (domain !== undefined) {
      const validDomains = [
        "designs",
        "fabrics",
        "ready-made",
        "add-ons",
        "general",
      ];
      if (!validDomains.includes(domain)) {
        res.status(400).send({
          message: `Domain must be one of: ${validDomains.join(", ")}`,
        });
        return;
      }
      pattern.domain = domain;
    }
    if (description !== undefined) pattern.description = description.trim();
    if (descriptionAr !== undefined)
      pattern.descriptionAr = descriptionAr.trim();
    if (isActive !== undefined) pattern.isActive = isActive;

    const updated = await pattern.save();
    res.send(updated);
  }),
);

// DELETE /api/admin/patterns/:id
// Delete a pattern
adminRouter.delete(
  "/patterns/:id",
  expressAsyncHandler(async (req, res) => {
    const pattern = await Pattern.findById(req.params.id);
    if (!pattern) {
      res.status(404).send({ message: "Pattern not found" });
      return;
    }
    await pattern.deleteOne();
    res.send({ message: "Pattern deleted successfully" });
  }),
);

// ==========================================
// C-24: Admin Seasons CRUD
// Separate from categories — seasons are
// seasonal collections (Spring, Summer, Ramadan, etc.)
// ==========================================

// GET /api/admin/seasons?domain=...&page=1&limit=10&search=...
// List seasons (paginated when page/limit provided)
adminRouter.get(
  "/seasons",
  expressAsyncHandler(async (req, res) => {
    const { domain, search } = req.query;
    const filter = {};
    if (domain) filter.domain = domain;
    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { nameAr: regex },
        { description: regex },
        { descriptionAr: regex },
      ];
    }

    const wantsPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    if (!wantsPagination) {
      const seasons = await Season.find(filter).sort({ name: 1 });
      res.send(seasons);
      return;
    }

    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Season.find(filter).sort({ name: 1 }).skip(skip).limit(limitNumber),
      Season.countDocuments(filter),
    ]);

    res.send({
      items,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 0,
    });
  }),
);

// GET /api/admin/seasons/:id
// Get a single season by ID
adminRouter.get(
  "/seasons/:id",
  expressAsyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id);
    if (!season) {
      res.status(404).send({ message: "Season not found" });
      return;
    }
    res.send(season);
  }),
);

// POST /api/admin/seasons
// Create a new season
adminRouter.post(
  "/seasons",
  expressAsyncHandler(async (req, res) => {
    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (!name?.trim()) {
      res.status(400).send({ message: "Season name (English) is required" });
      return;
    }

    const validDomains = [
      "designs",
      "fabrics",
      "ready-made",
      "add-ons",
      "general",
    ];
    if (!domain || !validDomains.includes(domain)) {
      res.status(400).send({
        message: `Domain must be one of: ${validDomains.join(", ")}`,
      });
      return;
    }

    const season = new Season({
      name: name.trim(),
      nameAr: nameAr?.trim() || "",
      domain,
      description: description?.trim() || "",
      descriptionAr: descriptionAr?.trim() || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await season.save();
    res.status(201).send(saved);
  }),
);

// PUT /api/admin/seasons/:id
// Update an existing season
adminRouter.put(
  "/seasons/:id",
  expressAsyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id);
    if (!season) {
      res.status(404).send({ message: "Season not found" });
      return;
    }

    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (name !== undefined) season.name = name.trim();
    if (nameAr !== undefined) season.nameAr = nameAr.trim();
    if (domain !== undefined) {
      const validDomains = [
        "designs",
        "fabrics",
        "ready-made",
        "add-ons",
        "general",
      ];
      if (!validDomains.includes(domain)) {
        res.status(400).send({
          message: `Domain must be one of: ${validDomains.join(", ")}`,
        });
        return;
      }
      season.domain = domain;
    }
    if (description !== undefined) season.description = description.trim();
    if (descriptionAr !== undefined)
      season.descriptionAr = descriptionAr.trim();
    if (isActive !== undefined) season.isActive = isActive;

    const updated = await season.save();
    res.send(updated);
  }),
);

// DELETE /api/admin/seasons/:id
// Delete a season
adminRouter.delete(
  "/seasons/:id",
  expressAsyncHandler(async (req, res) => {
    const season = await Season.findById(req.params.id);
    if (!season) {
      res.status(404).send({ message: "Season not found" });
      return;
    }
    await season.deleteOne();
    res.send({ message: "Season deleted successfully" });
  }),
);

// ==========================================
// C-25: Admin Tags CRUD
// Separate from categories — tags are
// labels used to tag products across domains
// ==========================================

// GET /api/admin/tags?domain=...&page=1&limit=10&search=...
// List tags (paginated when page/limit provided; array otherwise for dropdowns)
adminRouter.get(
  "/tags",
  expressAsyncHandler(async (req, res) => {
    const { domain, search } = req.query;
    const filter = {};
    if (domain) filter.domain = domain;
    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [
        { name: regex },
        { nameAr: regex },
        { description: regex },
        { descriptionAr: regex },
      ];
    }

    const wantsPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    if (!wantsPagination) {
      const tags = await Tag.find(filter).sort({ name: 1 });
      res.send(tags);
      return;
    }

    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Tag.find(filter).sort({ name: 1 }).skip(skip).limit(limitNumber),
      Tag.countDocuments(filter),
    ]);

    res.send({
      items,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 0,
    });
  }),
);

// GET /api/admin/tags/:id
// Get a single tag by ID
adminRouter.get(
  "/tags/:id",
  expressAsyncHandler(async (req, res) => {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      res.status(404).send({ message: "Tag not found" });
      return;
    }
    res.send(tag);
  }),
);

// POST /api/admin/tags
// Create a new tag
adminRouter.post(
  "/tags",
  expressAsyncHandler(async (req, res) => {
    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (!name?.trim()) {
      res.status(400).send({ message: "Tag name (English) is required" });
      return;
    }

    const validDomains = [
      "designs",
      "fabrics",
      "ready-made",
      "add-ons",
      "general",
    ];
    if (!domain || !validDomains.includes(domain)) {
      res.status(400).send({
        message: `Domain must be one of: ${validDomains.join(", ")}`,
      });
      return;
    }

    const tag = new Tag({
      name: name.trim(),
      nameAr: nameAr?.trim() || "",
      domain,
      description: description?.trim() || "",
      descriptionAr: descriptionAr?.trim() || "",
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await tag.save();
    res.status(201).send(saved);
  }),
);

// PUT /api/admin/tags/:id
// Update an existing tag
adminRouter.put(
  "/tags/:id",
  expressAsyncHandler(async (req, res) => {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      res.status(404).send({ message: "Tag not found" });
      return;
    }

    const { name, nameAr, domain, description, descriptionAr, isActive } =
      req.body;

    if (name !== undefined) tag.name = name.trim();
    if (nameAr !== undefined) tag.nameAr = nameAr.trim();
    if (domain !== undefined) {
      const validDomains = [
        "designs",
        "fabrics",
        "ready-made",
        "add-ons",
        "general",
      ];
      if (!validDomains.includes(domain)) {
        res.status(400).send({
          message: `Domain must be one of: ${validDomains.join(", ")}`,
        });
        return;
      }
      tag.domain = domain;
    }
    if (description !== undefined) tag.description = description.trim();
    if (descriptionAr !== undefined) tag.descriptionAr = descriptionAr.trim();
    if (isActive !== undefined) tag.isActive = isActive;

    const updated = await tag.save();
    res.send(updated);
  }),
);

// DELETE /api/admin/tags/:id
// Delete a tag
adminRouter.delete(
  "/tags/:id",
  expressAsyncHandler(async (req, res) => {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      res.status(404).send({ message: "Tag not found" });
      return;
    }
    await tag.deleteOne();
    res.send({ message: "Tag deleted successfully" });
  }),
);

// ==========================================
// Admin Cuts CRUD — predefined fabric cut lengths
// ==========================================

async function getNextCutNames() {
  const count = await Cut.countDocuments();
  if (count === 0) {
    return { name: "cut", nameAr: "قطعة" };
  }
  return { name: `cut ${count}`, nameAr: `قطعة ${count}` };
}

function enrichCutDoc(cut, usageCount = 0) {
  const plain = cut.toObject ? cut.toObject() : cut;
  const metersEquivalent = cutValueToMeters(plain.value, plain.unit);
  const warEquivalent = metersToWar(metersEquivalent);

  return {
    ...plain,
    metersEquivalent,
    warEquivalent,
    usageCount,
    isInUse: usageCount > 0,
  };
}

// GET /api/admin/cuts?page=1&limit=10&search=...
adminRouter.get(
  "/cuts",
  expressAsyncHandler(async (req, res) => {
    const { search } = req.query;
    const filter = {};

    if (search && typeof search === "string" && search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { nameAr: regex }];
    }

    const wantsPagination =
      req.query.page !== undefined || req.query.limit !== undefined;

    if (!wantsPagination) {
      const cuts = await Cut.find(filter).sort({ createdAt: 1 });
      const usageMap = await getCutUsageMap(cuts.map((cut) => String(cut._id)));
      res.send(
        cuts.map((cut) =>
          enrichCutDoc(cut, usageMap[String(cut._id)] || 0),
        ),
      );
      return;
    }

    const pageNumber = Math.max(Number(req.query.page) || 1, 1);
    const limitNumber = Math.min(
      Math.max(Number(req.query.limit) || 10, 1),
      100,
    );
    const skip = (pageNumber - 1) * limitNumber;

    const [items, total] = await Promise.all([
      Cut.find(filter).sort({ createdAt: 1 }).skip(skip).limit(limitNumber),
      Cut.countDocuments(filter),
    ]);

    const usageMap = await getCutUsageMap(items.map((cut) => String(cut._id)));

    res.send({
      items: items.map((cut) =>
        enrichCutDoc(cut, usageMap[String(cut._id)] || 0),
      ),
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber) || 0,
    });
  }),
);

// GET /api/admin/cuts/:id
adminRouter.get(
  "/cuts/:id",
  expressAsyncHandler(async (req, res) => {
    const cut = await Cut.findById(req.params.id);
    if (!cut) {
      res.status(404).send({ message: "Cut not found" });
      return;
    }
    const usageCount = await getCutUsageCount(cut._id);
    res.send(enrichCutDoc(cut, usageCount));
  }),
);

// POST /api/admin/cuts
adminRouter.post(
  "/cuts",
  expressAsyncHandler(async (req, res) => {
    const { name, nameAr, value, unit, isActive } = req.body;

    const normalizedUnit = normalizeCutUnit(unit);
    if (!normalizedUnit || !CUT_UNITS.includes(normalizedUnit)) {
      res.status(400).send({
        message: `Unit must be one of: ${CUT_UNITS.join(", ")}`,
      });
      return;
    }

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      res.status(400).send({ message: "Cut length must be greater than 0" });
      return;
    }

    const autoNames = await getNextCutNames();
    const cutName = name?.trim() || autoNames.name;
    const cutNameAr = nameAr?.trim() || autoNames.nameAr;

    const cut = new Cut({
      name: cutName,
      nameAr: cutNameAr,
      value: numericValue,
      unit: normalizedUnit,
      isActive: isActive !== undefined ? isActive : true,
    });

    const saved = await cut.save();
    res.status(201).send(enrichCutDoc(saved, 0));
  }),
);

// PUT /api/admin/cuts/:id
adminRouter.put(
  "/cuts/:id",
  expressAsyncHandler(async (req, res) => {
    const cut = await Cut.findById(req.params.id);
    if (!cut) {
      res.status(404).send({ message: "Cut not found" });
      return;
    }

    if (await isCutInUse(cut._id)) {
      res.status(409).send({
        message:
          "This cut is in use by orders and cannot be edited. Deactivate it instead or create a new cut.",
      });
      return;
    }

    const { value, unit, isActive, name, nameAr } = req.body;

    if (name !== undefined || nameAr !== undefined) {
      res.status(400).send({
        message: "Cut names are auto-assigned and cannot be changed",
      });
      return;
    }

    if (unit !== undefined) {
      const normalizedUnit = normalizeCutUnit(unit);
      if (!normalizedUnit || !CUT_UNITS.includes(normalizedUnit)) {
        res.status(400).send({
          message: `Unit must be one of: ${CUT_UNITS.join(", ")}`,
        });
        return;
      }
      cut.unit = normalizedUnit;
    }

    if (value !== undefined) {
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        res.status(400).send({ message: "Cut length must be greater than 0" });
        return;
      }
      cut.value = numericValue;
    }

    if (isActive !== undefined) cut.isActive = isActive;

    const updated = await cut.save();
    const usageCount = await getCutUsageCount(updated._id);
    res.send(enrichCutDoc(updated, usageCount));
  }),
);

// DELETE /api/admin/cuts/:id
adminRouter.delete(
  "/cuts/:id",
  expressAsyncHandler(async (req, res) => {
    const cut = await Cut.findById(req.params.id);
    if (!cut) {
      res.status(404).send({ message: "Cut not found" });
      return;
    }

    if (await isCutInUse(cut._id)) {
      res.status(409).send({
        message:
          "This cut is in use by orders and cannot be deleted. Deactivate it instead.",
      });
      return;
    }

    await cut.deleteOne();
    res.send({ message: "Cut deleted successfully" });
  }),
);

// ==========================================
// Partner payouts (collective payment releases)
// ==========================================

// GET /api/admin/partner-payouts
// Returns release history + paid totals grouped by partnerKey.
adminRouter.get(
  "/partner-payouts",
  expressAsyncHandler(async (req, res) => {
    const { partnerKey, partnerKind, limit } = req.query;
    const filter = {};
    if (partnerKey && typeof partnerKey === "string") {
      filter.partnerKey = partnerKey.trim();
    }
    if (
      partnerKind &&
      typeof partnerKind === "string" &&
      PARTNER_PAYOUT_KINDS.includes(partnerKind)
    ) {
      filter.partnerKind = partnerKind;
    }

    const limitNum = Math.min(Math.max(Number(limit) || 200, 1), 500);
    // Exclude legacy soft-deleted rows from history (if any remain).
    const historyFilter = {
      ...filter,
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    };

    // Legacy credits without order lines blanket-covered future payouts.
    // Drop them so new orders are not auto-marked approved.
    await PartnerPayoutCredit.deleteMany({
      $or: [{ orders: { $exists: false } }, { orders: { $size: 0 } }],
    });

    const creditFilter = {
      ...filter,
      "orders.0": { $exists: true },
    };

    const [items, payouts, credits] = await Promise.all([
      PartnerPayout.find(historyFilter)
        .populate("releasedBy", "name email")
        .sort({ releasedAt: -1 })
        .limit(limitNum)
        .lean(),
      PartnerPayout.find(filter).select("partnerKey partnerKind partnerName amount orders releasedAt").lean(),
      PartnerPayoutCredit.find(creditFilter)
        .select("partnerKey partnerKind partnerName amount orders")
        .lean(),
    ]);

    const paidByPartnerKey = {};

    const ensurePartner = (doc) => {
      const key = String(doc.partnerKey || "");
      if (!key) return null;
      if (!paidByPartnerKey[key]) {
        paidByPartnerKey[key] = {
          paid: 0,
          releaseCount: 0,
          lastReleasedAt: undefined,
          partnerKind: doc.partnerKind,
          partnerName: doc.partnerName || "",
          byOrderId: {},
        };
      }
      return paidByPartnerKey[key];
    };

    const addOrderAmounts = (bucket, orders) => {
      for (const order of orders || []) {
        const orderId = String(order.orderId || "");
        if (!orderId) continue;
        const amount = Number(order.amount) || 0;
        if (amount <= 0) continue;
        bucket.byOrderId[orderId] = Number(
          ((bucket.byOrderId[orderId] || 0) + amount).toFixed(2),
        );
      }
    };

    for (const payout of payouts) {
      const bucket = ensurePartner(payout);
      if (!bucket) continue;
      bucket.releaseCount += 1;
      if (
        payout.releasedAt &&
        (!bucket.lastReleasedAt ||
          new Date(payout.releasedAt) > new Date(bucket.lastReleasedAt))
      ) {
        bucket.lastReleasedAt = payout.releasedAt;
      }
      if (Array.isArray(payout.orders) && payout.orders.length > 0) {
        addOrderAmounts(bucket, payout.orders);
      } else {
        // Fallback when a release has no order lines.
        bucket.paid = Number(
          (bucket.paid + (Number(payout.amount) || 0)).toFixed(2),
        );
      }
    }

    for (const credit of credits) {
      const bucket = ensurePartner(credit);
      if (!bucket) continue;
      addOrderAmounts(bucket, credit.orders);
      if (!bucket.partnerName && credit.partnerName) {
        bucket.partnerName = credit.partnerName;
      }
    }

    for (const bucket of Object.values(paidByPartnerKey)) {
      const fromOrders = Object.values(bucket.byOrderId).reduce(
        (sum, amount) => sum + (Number(amount) || 0),
        0,
      );
      bucket.paid = Number((fromOrders + (Number(bucket.paid) || 0)).toFixed(2));
    }

    res.send({
      items,
      paidByPartnerKey,
    });
  }),
);

// POST /api/admin/partner-payouts
// Record a collective payment release to a partner.
adminRouter.post(
  "/partner-payouts",
  expressAsyncHandler(async (req, res) => {
    const {
      partnerKey,
      partnerKind,
      partnerId,
      partnerName,
      payeeName,
      amount,
      currency,
      orders,
      note,
    } = req.body || {};

    if (!partnerKey || typeof partnerKey !== "string") {
      res.status(400).send({ message: "partnerKey is required" });
      return;
    }
    if (!PARTNER_PAYOUT_KINDS.includes(partnerKind)) {
      res.status(400).send({
        message: `partnerKind must be one of: ${PARTNER_PAYOUT_KINDS.join(", ")}`,
      });
      return;
    }
    if (!partnerName || typeof partnerName !== "string") {
      res.status(400).send({ message: "partnerName is required" });
      return;
    }

    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      res.status(400).send({ message: "amount must be a positive number" });
      return;
    }

    const orderDocs = Array.isArray(orders)
      ? orders
        .map((o) => ({
          orderId: o?.orderId,
          orderType:
            o?.orderType === "retail" || o?.channel === "retail"
              ? "retail"
              : "custom",
          amount: Number(o?.amount) || 0,
        }))
        .filter(
          (o) =>
            o.orderId &&
            mongoose.Types.ObjectId.isValid(String(o.orderId)) &&
            o.amount >= 0,
        )
      : [];

    const payout = await PartnerPayout.create({
      partnerKey: partnerKey.trim(),
      partnerKind,
      partnerId: partnerId ? String(partnerId).trim() : "",
      partnerName: partnerName.trim(),
      payeeName: payeeName ? String(payeeName).trim() : "",
      amount: Number(amountNum.toFixed(2)),
      currency: currency ? String(currency).trim() : "AED",
      orders: orderDocs,
      note: note ? String(note).trim() : "",
      releasedBy: req.user._id,
      releasedAt: new Date(),
    });

    // Manual "Release payment" fulfills any open partner request for this payee.
    // Match by partnerKey/partnerId, then fall back to the shop owner's user id.
    let pendingRequests = await PartnerPayoutRequest.find({
      partnerKind,
      status: "pending",
      $or: [
        { partnerKey: payout.partnerKey },
        ...(payout.partnerId
          ? [{ partnerId: String(payout.partnerId) }]
          : []),
      ],
    });

    if (pendingRequests.length === 0) {
      const ownerUserId = await resolvePartnerOwnerUserId(
        partnerKind,
        payout.partnerKey,
        payout.partnerId,
      );
      if (ownerUserId) {
        pendingRequests = await PartnerPayoutRequest.find({
          partnerKind,
          status: "pending",
          requestedBy: ownerUserId,
        });
      }
    }

    let recipientUserId = null;

    for (const requestDoc of pendingRequests) {
      requestDoc.status = "approved";
      requestDoc.reviewedBy = req.user._id;
      requestDoc.reviewedAt = new Date();
      requestDoc.payoutId = payout._id;
      requestDoc.adminNote =
        requestDoc.adminNote || "Fulfilled by payment release";
      await requestDoc.save();

      if (requestDoc.requestedBy && !recipientUserId) {
        recipientUserId = requestDoc.requestedBy;
      }
    }

    if (!recipientUserId) {
      recipientUserId = await resolvePartnerOwnerUserId(
        partnerKind,
        payout.partnerKey,
        payout.partnerId,
      );
    }

    if (recipientUserId) {
      const fulfilledRequest = pendingRequests[0] || null;
      await ensurePartnerPayoutReleasedNotification({
        partnerKind,
        amount: amountNum,
        partnerKey: payout.partnerKey,
        partnerId: payout.partnerId,
        recipientUserId,
        requestId: fulfilledRequest?._id,
        payoutId: payout._id,
        createdBy: req.user._id,
        approvedRequest: Boolean(fulfilledRequest),
      });
    }

    const populated = await PartnerPayout.findById(payout._id)
      .populate("releasedBy", "name email")
      .lean();

    res.status(201).send({
      ...populated,
      fulfilledRequestCount: pendingRequests.length,
    });
  }),
);

// DELETE /api/admin/partner-payouts/:id
// Hard-delete the transaction from MongoDB.
// A settlement credit keeps the amount paid so it does not return as unpaid.
adminRouter.delete(
  "/partner-payouts/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).send({ message: "Invalid payout id" });
      return;
    }

    const payout = await PartnerPayout.findById(id);
    if (!payout) {
      res.status(404).send({ message: "Transaction not found" });
      return;
    }

    await PartnerPayoutCredit.create({
      partnerKey: payout.partnerKey,
      partnerKind: payout.partnerKind,
      partnerId: payout.partnerId || "",
      partnerName: payout.partnerName || "",
      amount: Number(Number(payout.amount).toFixed(2)),
      currency: payout.currency || "AED",
      // Keep per-order attribution so future orders are not auto-settled.
      orders: (payout.orders || []).map((order) => ({
        orderId: order.orderId,
        orderType: order.orderType,
        amount: Number(order.amount) || 0,
      })),
      sourcePayoutId: payout._id,
      deletedBy: req.user?._id || null,
    });

    await payout.deleteOne();
    res.send({ message: "Transaction deleted", id: String(id) });
  }),
);

// ==========================================
// Partner payout REQUESTS (fabric-initiated)
// ==========================================

// GET /api/admin/payout-requests
adminRouter.get(
  "/payout-requests",
  expressAsyncHandler(async (req, res) => {
    const { status, partnerKind, limit } = req.query;
    const filter = {};
    if (
      status &&
      typeof status === "string" &&
      ["pending", "approved", "rejected", "cancelled"].includes(status)
    ) {
      filter.status = status;
    }
    if (
      partnerKind &&
      typeof partnerKind === "string" &&
      PARTNER_PAYOUT_KINDS.includes(partnerKind)
    ) {
      filter.partnerKind = partnerKind;
    }

    // Heal pending requests already fulfilled by a manual "Release payment".
    const stalePending = await PartnerPayoutRequest.find({
      status: "pending",
      ...(filter.partnerKind ? { partnerKind: filter.partnerKind } : {}),
    }).limit(200);

    for (const requestDoc of stalePending) {
      const match = {
        partnerKind: requestDoc.partnerKind,
        $or: [
          { partnerKey: requestDoc.partnerKey },
          ...(requestDoc.partnerId
            ? [{ partnerId: String(requestDoc.partnerId) }]
            : []),
        ],
        releasedAt: { $gte: requestDoc.requestedAt || requestDoc.createdAt },
      };
      const laterRelease = await PartnerPayout.findOne(match)
        .sort({ releasedAt: -1 })
        .select("_id releasedAt")
        .lean();
      if (!laterRelease) continue;
      requestDoc.status = "approved";
      requestDoc.payoutId = laterRelease._id;
      requestDoc.reviewedAt = laterRelease.releasedAt || new Date();
      requestDoc.adminNote =
        requestDoc.adminNote || "Fulfilled by payment release";
      await requestDoc.save();

      await ensurePartnerPayoutReleasedNotification({
        partnerKind: requestDoc.partnerKind,
        amount: requestDoc.amount,
        partnerKey: requestDoc.partnerKey,
        partnerId: requestDoc.partnerId,
        recipientUserId: requestDoc.requestedBy,
        requestId: requestDoc._id,
        payoutId: laterRelease._id,
        createdBy: req.user?._id || null,
        approvedRequest: true,
      });
    }

    const limitNum = Math.min(Math.max(Number(limit) || 100, 1), 300);
    const items = await PartnerPayoutRequest.find(filter)
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .sort({
        status: 1,
        requestedAt: -1,
      })
      .limit(limitNum)
      .lean();

    const pendingCount = await PartnerPayoutRequest.countDocuments({
      status: "pending",
      ...(filter.partnerKind ? { partnerKind: filter.partnerKind } : {}),
    });

    res.send({ items, pendingCount });
  }),
);

// POST /api/admin/payout-requests/:id/approve
adminRouter.post(
  "/payout-requests/:id/approve",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).send({ message: "Invalid request id" });
      return;
    }

    const requestDoc = await PartnerPayoutRequest.findById(id);
    if (!requestDoc) {
      res.status(404).send({ message: "Payout request not found" });
      return;
    }
    if (requestDoc.status !== "pending") {
      res.status(400).send({
        message: `Request is already ${requestDoc.status}`,
      });
      return;
    }

    const amountNum = Number(requestDoc.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      res.status(400).send({ message: "Request has an invalid amount" });
      return;
    }

    const orderDocs = (requestDoc.orders || [])
      .map((o) => ({
        orderId: o.orderId,
        orderType: o.orderType === "retail" ? "retail" : "custom",
        amount: Number(o.amount) || 0,
      }))
      .filter((o) => o.orderId && o.amount >= 0);

    const payout = await PartnerPayout.create({
      partnerKey: requestDoc.partnerKey,
      partnerKind: requestDoc.partnerKind,
      partnerId: requestDoc.partnerId || "",
      partnerName: requestDoc.partnerName,
      payeeName: requestDoc.payeeName || "",
      amount: Number(amountNum.toFixed(2)),
      currency: requestDoc.currency || "AED",
      orders: orderDocs,
      note: requestDoc.note
        ? `Approved request: ${requestDoc.note}`
        : `Approved ${requestDoc.partnerKind} payout request`,
      releasedBy: req.user._id,
      releasedAt: new Date(),
    });

    requestDoc.status = "approved";
    requestDoc.reviewedBy = req.user._id;
    requestDoc.reviewedAt = new Date();
    requestDoc.payoutId = payout._id;
    requestDoc.adminNote =
      typeof req.body?.adminNote === "string"
        ? req.body.adminNote.trim().slice(0, 500)
        : "";
    await requestDoc.save();

    const recipientUserId =
      requestDoc.requestedBy ||
      (await resolvePartnerOwnerUserId(
        requestDoc.partnerKind,
        requestDoc.partnerKey,
        requestDoc.partnerId,
      ));

    if (recipientUserId) {
      await ensurePartnerPayoutReleasedNotification({
        partnerKind: requestDoc.partnerKind,
        amount: amountNum,
        partnerKey: requestDoc.partnerKey,
        partnerId: requestDoc.partnerId,
        recipientUserId,
        requestId: requestDoc._id,
        payoutId: payout._id,
        createdBy: req.user._id,
        approvedRequest: true,
      });
    }

    const populated = await PartnerPayoutRequest.findById(requestDoc._id)
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    res.send({
      success: true,
      request: populated,
      payoutId: payout._id,
    });
  }),
);

// POST /api/admin/payout-requests/:id/reject
adminRouter.post(
  "/payout-requests/:id/reject",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).send({ message: "Invalid request id" });
      return;
    }

    const requestDoc = await PartnerPayoutRequest.findById(id);
    if (!requestDoc) {
      res.status(404).send({ message: "Payout request not found" });
      return;
    }
    if (requestDoc.status !== "pending") {
      res.status(400).send({
        message: `Request is already ${requestDoc.status}`,
      });
      return;
    }

    const adminNote =
      typeof req.body?.adminNote === "string"
        ? req.body.adminNote.trim().slice(0, 500)
        : "";

    requestDoc.status = "rejected";
    requestDoc.reviewedBy = req.user._id;
    requestDoc.reviewedAt = new Date();
    requestDoc.adminNote = adminNote;
    await requestDoc.save();

    if (requestDoc.requestedBy) {
      const kind = requestDoc.partnerKind === "tailor" ? "tailor" : "fabric";
      await createNotification({
        type: `${kind}_payout_rejected`,
        title: "Payout request declined",
        message: adminNote
          ? `MOTD declined your payout request: ${adminNote}`
          : "MOTD declined your payout request.",
        audience: "customer",
        recipientUserId: requestDoc.requestedBy,
        createdBy: req.user._id,
        dedupeKey: `${kind}:payout_rejected:${requestDoc._id}`,
      }).catch(() => null);
    }

    const populated = await PartnerPayoutRequest.findById(requestDoc._id)
      .populate("requestedBy", "name email")
      .populate("reviewedBy", "name email")
      .lean();

    res.send({ success: true, request: populated });
  }),
);

// DELETE /api/admin/payout-requests/:id
// Remove a reviewed (approved/rejected/cancelled) request from history.
adminRouter.delete(
  "/payout-requests/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(String(id))) {
      res.status(400).send({ message: "Invalid request id" });
      return;
    }

    const requestDoc = await PartnerPayoutRequest.findById(id);
    if (!requestDoc) {
      res.status(404).send({ message: "Payout request not found" });
      return;
    }

    if (requestDoc.status === "pending") {
      res.status(400).send({
        message:
          "Pending requests cannot be deleted. Approve or reject them first.",
      });
      return;
    }

    await requestDoc.deleteOne();
    res.send({ message: "Request deleted", id: String(id) });
  }),
);

export default adminRouter;
