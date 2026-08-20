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
import {
  uploadSingleAddOnImageMiddleware,
  processAddOnImage,
} from "../middleware/uploadAddOnImages.js";

import {
  notifyCustomStatusChange,
  notifyRetailStatusChange,
} from "../services/notificationService.js";
import {
  normalizeEmirate,
  UAE_EMIRATES,
  isValidEmirate,
} from "../utils/uaeAddress.js";
import {
  createReadyCustomShipments,
  getPackReadiness,
  packOrder,
} from "../services/shipmentService.js";
import {
  isEmptyShopPickupAddress,
  normalizeShopPickupAddress,
} from "../utils/shopPickupAddress.js";

const adminRouter = express.Router();
const BCRYPT_ROUNDS = 10;

function optionalObjectId(value) {
  if (value === undefined) return undefined;
  const str = String(value || "").trim();
  return mongoose.Types.ObjectId.isValid(str) && str.length === 24 ? str : null;
}

function parseReadyMadePickup(address) {
  return normalizeShopPickupAddress(address);
}

function attachPackReadiness(order, kind) {
  const packReadiness = getPackReadiness(order, kind);
  const payload =
    order && typeof order.toObject === "function" ? order.toObject() : order;
  return { ...payload, packReadiness };
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

    const filter = {
      $or: [{ ownerName: "MOTD Admin" }, { ownerName: { $exists: false } }],
    };

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

    // Generate slug if not provided
    let slug = req.body.slug?.trim();
    if (!slug) {
      const base = name || nameAr || "ready-made";
      slug = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

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
    product.slug = req.body.slug ?? product.slug;
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
    const search = req.query.search | "";
    const type = req.query.type || "all";

    // Build filter for users with fabric_store role
    const filter = { role: "fabric_store" };

    // Type filter
    if (type === "approved") {
      filter.approvalStatus = "approved";
    } else if (type === "pending") {
      filter.approvalStatus = "pending";
    } else if (type === "rejected") {
      filter.approvalStatus = "rejected";
    }

    // Search filter
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
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
    }));

    res.send({
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
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
      User.countDocuments({ role: "fabric_store", approvalStatus: "pending" }),
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

    const slug = shopName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    const existingShop = await FabricShop.findOne({ slug });
    if (existingShop) {
      res.status(400).send({
        message: "A store with this name already exists (slug taken)",
      });
      return;
    }

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

// GET /api/admin/fabrics
// Admin can view all fabrics in the catalog (including inactive)
adminRouter.get(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const filter = {
      $or: [{ isVariantOf: null }, { isVariantOf: { $exists: false } }],
    };

    if (req.query.listedByStore) {
      filter.listedByStore = req.query.listedByStore;
    }

    if (search) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { material: { $regex: search, $options: "i" } },
            { city: { $regex: search, $regex: search, $options: "i" } },
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
        const obj = fabric.toObject();
        obj.variants = variants;
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
      totalPages: Math.ceil(total / limit),
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
    const item = fabric.toObject();
    item.variants = variants;
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
      pricePerMeter,
      stockInMeters,
      minAge,
      maxAge,
      listedByStore,
      storePickupAddress,
      isActive,
    } = req.body;

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

    const newFabric = new Fabric({
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      material,
      materialAr: materialAr || "",
      colors: colors || [],
      tag,
      tagAr: tagAr || "",
      pricePerMeter,
      stockInMeters: stockInMeters || 0,
      minAge: normalizedMinAge,
      maxAge: normalizedMaxAge,
      listedByStore,
      storePickupAddress,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdFabric = await newFabric.save();

    const generateUniqueSlug = async (name) => {
      let base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!base) base = "fabric";
      let slugVal = base;
      let counter = 1;
      while (await Fabric.findOne({ slug: slugVal })) {
        slugVal = `${base}-${counter}`;
        counter++;
      }
      return slugVal;
    };

    if (Array.isArray(req.body.variants)) {
      for (const variant of req.body.variants) {
        if (!variant.name || !variant.nameAr || !variant.material) continue;
        let vSlug = variant.slug ? variant.slug.toLowerCase().trim() : "";
        if (!vSlug) {
          vSlug = await generateUniqueSlug(variant.name);
        } else {
          let originalSlug = vSlug;
          let counter = 1;
          while (await Fabric.findOne({ slug: vSlug })) {
            vSlug = `${originalSlug}-${counter}`;
            counter++;
          }
        }

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
          pricePerMeter: Number(variant.pricePerMeter),
          stockInMeters: Number(variant.stockInMeters || 0),
          minAge: createdFabric.minAge,
          maxAge: createdFabric.maxAge,
          listedByStore: createdFabric.listedByStore,
          storePickupAddress: createdFabric.storePickupAddress,
          isVariantOf: createdFabric._id,
          isActive: variant.isActive !== undefined ? variant.isActive : true,
        });
      }
    }

    res.status(201).send(createdFabric);
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
    fabric.slug = req.body.slug ?? fabric.slug;
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
    fabric.pricePerMeter = req.body.pricePerMeter ?? fabric.pricePerMeter;
    fabric.stockInMeters = req.body.stockInMeters ?? fabric.stockInMeters;
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

    const generateUniqueSlug = async (name) => {
      let base = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      if (!base) base = "fabric";
      let slugVal = base;
      let counter = 1;
      while (await Fabric.findOne({ slug: slugVal })) {
        slugVal = `${base}-${counter}`;
        counter++;
      }
      return slugVal;
    };

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
            if (variant.pricePerMeter !== undefined)
              existing.pricePerMeter = Number(variant.pricePerMeter);
            if (variant.stockInMeters !== undefined)
              existing.stockInMeters = Number(variant.stockInMeters);
            existing.minAge = updatedFabric.minAge;
            existing.maxAge = updatedFabric.maxAge;
            if (variant.isActive !== undefined)
              existing.isActive = variant.isActive;

            existing.listedByStore = updatedFabric.listedByStore;
            existing.storePickupAddress = updatedFabric.storePickupAddress;

            await existing.save();
          }
        } else {
          if (!variant.name || !variant.nameAr || !variant.material) continue;
          let vSlug = variant.slug ? variant.slug.toLowerCase().trim() : "";
          if (!vSlug) {
            vSlug = await generateUniqueSlug(variant.name);
          } else {
            let originalSlug = vSlug;
            let counter = 1;
            while (await Fabric.findOne({ slug: vSlug })) {
              vSlug = `${originalSlug}-${counter}`;
              counter++;
            }
          }

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
            pricePerMeter: Number(variant.pricePerMeter),
            stockInMeters: Number(variant.stockInMeters || 0),
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

    res.send(updatedFabric);
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
    const pendingTailors = await User.find({
      role: "tailor",
      approvalStatus: "pending",
    })
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

// PATCH /api/admin/tailors/:id/approve
// Set approvalStatus: approved
adminRouter.patch(
  "/tailors/:id/approve",
  expressAsyncHandler(async (req, res) => {
    const tailor = await User.findById(req.params.id);

    if (tailor && tailor.role === "tailor") {
      tailor.approvalStatus = "approved";
      tailor.rejectionNote = "";
      const updatedTailor = await tailor.save();
      res.send({
        message: "Tailor approved successfully",
        user: {
          _id: updatedTailor._id,
          name: updatedTailor.name,
          email: updatedTailor.email,
          approvalStatus: updatedTailor.approvalStatus,
          rejectionNote: updatedTailor.rejectionNote,
        },
      });
    } else {
      res
        .status(404)
        .send({ message: "Pending tailor not found or invalid role" });
    }
  }),
);

// PATCH /api/admin/tailors/:id/reject
// Set approvalStatus: rejected
adminRouter.patch(
  "/tailors/:id/reject",
  expressAsyncHandler(async (req, res) => {
    const tailor = await User.findById(req.params.id);

    if (tailor && tailor.role === "tailor") {
      const rawNote = req.body?.note ?? req.body?.rejectionNote;
      const rejectionNote = typeof rawNote === "string" ? rawNote.trim() : "";

      tailor.approvalStatus = "rejected";
      tailor.rejectionNote = rejectionNote;
      const updatedTailor = await tailor.save();
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
    const pendingStores = await User.find({
      role: "fabric_store",
      approvalStatus: "pending",
    })
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

adminRouter.patch(
  "/fabric-stores/:id/approve",
  expressAsyncHandler(async (req, res) => {
    const store = await User.findById(req.params.id);

    if (store && store.role === "fabric_store") {
      store.approvalStatus = "approved";
      store.rejectionNote = "";
      const updatedStore = await store.save();
      res.send({
        message: "Fabric store approved successfully",
        user: {
          _id: updatedStore._id,
          name: updatedStore.name,
          email: updatedStore.email,
          approvalStatus: updatedStore.approvalStatus,
          rejectionNote: updatedStore.rejectionNote,
        },
      });
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
      const rawNote = req.body?.note ?? req.body?.rejectionNote;
      const rejectionNote = typeof rawNote === "string" ? rawNote.trim() : "";

      store.approvalStatus = "rejected";
      store.rejectionNote = rejectionNote;
      const updatedStore = await store.save();
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
  select: "name email approvalStatus",
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
      User.find({ approvalStatus: "pending", role: "tailor" }),
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

function parseQueryDate(value, label) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { error: `Invalid ${label} date` };
  }
  return { date };
}

// GET /api/admin/orders/retail
// List retail orders with optional filters: status, from, to, customer (userId or name/email)
adminRouter.get(
  "/orders/retail",
  expressAsyncHandler(async (req, res) => {
    const { status, from, to, customer, page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    if (status) {
      if (!RETAIL_ORDER_STATUSES.includes(status)) {
        res.status(400).send({
          message: `Invalid status. Allowed values: ${RETAIL_ORDER_STATUSES.join(", ")}`,
        });
        return;
      }
      filter.status = status;
    }

    if (from || to) {
      filter.createdAt = {};

      if (from) {
        const parsed = parseQueryDate(from, "from");
        if (parsed.error) {
          res.status(400).send({ message: parsed.error });
          return;
        }
        filter.createdAt.$gte = parsed.date;
      }

      if (to) {
        const parsed = parseQueryDate(to, "to");
        if (parsed.error) {
          res.status(400).send({ message: parsed.error });
          return;
        }
        filter.createdAt.$lte = parsed.date;
      }
    }

    if (customer) {
      const customerQuery = String(customer).trim();

      if (mongoose.Types.ObjectId.isValid(customerQuery)) {
        filter.userId = customerQuery;
      } else {
        const matchingUsers = await User.find({
          $or: [
            { name: { $regex: customerQuery, $options: "i" } },
            { email: { $regex: customerQuery, $options: "i" } },
          ],
        }).select("_id");

        const userIds = matchingUsers.map((user) => user._id);

        if (userIds.length === 0) {
          res.send({
            items: [],
            total: 0,
            page: pageNum,
            totalPages: 0,
          });
          return;
        }

        filter.userId = { $in: userIds };
      }
    }

    const adminProducts = await ReadyMadeProduct.find({
      $or: [{ ownerName: "MOTD Admin" }, { ownerName: { $exists: false } }],
    }).select("_id");
    const adminProductIds = adminProducts.map((p) => p._id);
    filter["orderItems.productId"] = { $in: adminProductIds };

    const [orders, total] = await Promise.all([
      RetailOrder.find(filter)
        .populate("userId", "name email phone")
        .populate("orderItems.productId", "thumbnailImage images")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      RetailOrder.countDocuments(filter),
    ]);

    res.send({
      items: orders.map((order) => attachPackReadiness(order, "retail")),
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
      .populate("tailorShopId", "name nameAr location city logo coverImage")
      .populate(
        "items.tailorShopId",
        "name nameAr location city logo coverImage",
      )
      .populate("designId", "images")
      .populate("items.designId", "images")
      .populate("fabricId", "images")
      .populate("items.fabricId", "images")
      .sort({ createdAt: -1 });

    res.send(orders.map((order) => attachPackReadiness(order, "custom")));
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

// POST /api/admin/orders/:kind/:id/pack
// Create billed MOTD → customer last miles once every *_to_motd inbound is delivered.
adminRouter.post(
  "/orders/:kind/:id/pack",
  expressAsyncHandler(async (req, res) => {
    const kind = String(req.params.kind || "")
      .trim()
      .toLowerCase();
    if (kind !== "custom" && kind !== "retail") {
      res.status(400).send({
        message: "kind must be custom or retail",
      });
      return;
    }

    const Model = kind === "custom" ? CustomOrder : RetailOrder;
    const order = await Model.findById(req.params.id);
    if (!order) {
      res.status(404).send({
        message:
          kind === "custom"
            ? "Custom tailoring order not found"
            : "Retail order not found",
      });
      return;
    }

    try {
      const result = await packOrder(order, { changedBy: req.user?._id });
      const createdCount = Array.isArray(result.created)
        ? result.created.length
        : 0;
      res.send({
        message:
          createdCount > 0
            ? "Order packed at MOTD"
            : result.packReadiness?.alreadyPacked
              ? "Order packed"
              : "Order packed at MOTD",
        order: attachPackReadiness(result.order, kind),
        created: result.created,
        skipped: result.skipped,
        errors: result.errors,
        packedAt: result.packedAt,
        packReadiness: result.packReadiness,
      });
    } catch (error) {
      const status = error.statusCode || 500;
      res.status(status).send({
        message: error.message || "Failed to pack order",
        packReadiness: error.packReadiness || undefined,
        errors: error.details?.errors,
      });
    }
  }),
);

// ==========================================
// C-08: Admin dashboard stats
// ==========================================

function getTimeframeWindow(timeframe) {
  const now = new Date();

  // Normalize now to avoid edge-case partial-day issues:
  // We'll use UTC boundaries for consistency.
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  let start;
  let prevStart;
  let prevEnd;

  if (timeframe === "week") {
    // last 7 days
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);

    prevEnd = new Date(start);
    prevEnd.setUTCHours(23, 59, 59, 999);

    prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - 6);
  } else if (timeframe === "year") {
    // last 12 months
    start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - 11);

    prevEnd = new Date(start);
    prevEnd.setUTCHours(23, 59, 59, 999);

    prevStart = new Date(prevEnd);
    prevStart.setUTCMonth(prevStart.getUTCMonth() - 11);
  } else {
    // month (default) -> last 1 month
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);

    prevEnd = new Date(start);
    prevEnd.setUTCHours(23, 59, 59, 999);

    prevStart = new Date(prevEnd);
    prevStart.setUTCDate(prevStart.getUTCDate() - 29);
  }

  return { start, end, prevStart, prevEnd };
}

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

    const { start, end, prevStart, prevEnd } = getTimeframeWindow(timeframe);

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

    const LOW_FABRIC_STOCK = 10;
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
      User.countDocuments({ role: "tailor", approvalStatus: "pending" }),
      User.countDocuments({
        role: "fabric_store",
        approvalStatus: "pending",
      }),
      TailorShop.countDocuments({ isActive: true }),
      FabricShop.countDocuments({ isActive: true }),
      Fabric.countDocuments({
        stockInMeters: { $lte: LOW_FABRIC_STOCK },
        isActive: true,
      }),
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

    const topFabrics = (topFabricsAgg || []).map((row, i) => ({
      id: String(row._id || i),
      name: row._id || "Unknown",
      value: row.revenue || 0,
      meta: `${row.count || 0} orders`,
    }));

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
        platformFee: 0,

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
      platformFee,
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
      platformFee !== undefined &&
      (typeof platformFee !== "number" || platformFee < 0)
    ) {
      res.status(400).send({
        message:
          "Platform fee must be a valid number greater than or equal to 0",
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
    if (platformFee !== undefined) settings.platformFee = platformFee;
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

    const filter = {
      $or: [{ ownerName: "MOTD Admin" }, { ownerName: { $exists: false } }],
    };

    if (search) {
      filter.$and = [
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { nameAr: { $regex: search, $options: "i" } },
            { _id: { $regex: search, $options: "i" } },
          ],
        },
      ];
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

// POST /api/admin/addons
adminRouter.post(
  "/addons",
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      price,
      stock,
      thumbnailImage,
      images,
      tag,
      tagAr,
      isActive,
    } = req.body;

    const generatedSlug = slug
      ? slug.toLowerCase().replace(/\s+/g, "-")
      : name
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, "");

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
      images,
      tag,
      tagAr,
      isActive: isActive !== undefined ? isActive : true,
      ownerName: req.body.ownerName || "MOTD Admin",
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
      slug,
      description,
      descriptionAr,
      price,
      stock,
      thumbnailImage,
      images,
      tag,
      tagAr,
      isActive,
    } = req.body;

    addon.name = name ?? addon.name;
    addon.nameAr = nameAr ?? addon.nameAr;
    if (slug) {
      addon.slug = slug.toLowerCase().replace(/\s+/g, "-");
    }
    addon.description = description ?? addon.description;
    addon.descriptionAr = descriptionAr ?? addon.descriptionAr;
    addon.price = price ?? addon.price;
    addon.stock = stock ?? addon.stock;
    addon.thumbnailImage = thumbnailImage ?? addon.thumbnailImage;
    addon.images = images ?? addon.images;
    addon.tag = tag ?? addon.tag;
    addon.tagAr = tagAr ?? addon.tagAr;
    addon.isActive = isActive !== undefined ? isActive : addon.isActive;
    addon.ownerName = req.body.ownerName ?? addon.ownerName;

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

// GET /api/admin/categories?domain=designs
// List categories filtered by domain
adminRouter.get(
  "/categories",
  expressAsyncHandler(async (req, res) => {
    const { domain } = req.query;
    const filter = domain ? { domain } : {};
    const categories = await Category.find(filter).sort({
      name: 1,
    });
    res.send(categories);
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

// GET /api/admin/materials?domain=fabrics
// List materials filtered by domain
adminRouter.get(
  "/materials",
  expressAsyncHandler(async (req, res) => {
    const { domain } = req.query;
    const filter = domain ? { domain } : {};
    const materials = await Material.find(filter).sort({ name: 1 });
    res.send(materials);
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

// GET /api/admin/patterns
// List patterns
adminRouter.get(
  "/patterns",
  expressAsyncHandler(async (req, res) => {
    const { domain } = req.query;
    const filter = domain ? { domain } : {};
    const patterns = await Pattern.find(filter).sort({ name: 1 });
    res.send(patterns);
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

// GET /api/admin/seasons
// List seasons
adminRouter.get(
  "/seasons",
  expressAsyncHandler(async (req, res) => {
    const { domain } = req.query;
    const filter = domain ? { domain } : {};
    const seasons = await Season.find(filter).sort({ name: 1 });
    res.send(seasons);
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

// GET /api/admin/tags
// List tags
adminRouter.get(
  "/tags",
  expressAsyncHandler(async (req, res) => {
    const { domain } = req.query;
    const filter = domain ? { domain } : {};
    const tags = await Tag.find(filter).sort({ name: 1 });
    res.send(tags);
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

export default adminRouter;
