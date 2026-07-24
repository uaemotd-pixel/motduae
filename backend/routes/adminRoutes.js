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

const adminRouter = express.Router();
const BCRYPT_ROUNDS = 10;

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
adminRouter.get(
  "/ready-made",
  expressAsyncHandler(async (req, res) => {
    const products = await ReadyMadeProduct.find({
      $or: [{ ownerName: "MOTD Admin" }, { ownerName: { $exists: false } }],
    }).sort({ createdAt: -1 });
    res.send(products);
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
      fabricShopId,
      fabricId,
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
      isActive: isActive !== undefined ? isActive : true,
      ownerName: req.body.ownerName || "MOTD Admin",
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
    product.fabricShopId = req.body.fabricShopId ?? product.fabricShopId;
    product.fabricId = req.body.fabricId ?? product.fabricId;
    product.tailorShopId =
      req.body.tailorShopId !== undefined
        ? req.body.tailorShopId
        : product.tailorShopId;
    product.designId =
      req.body.designId !== undefined ? req.body.designId : product.designId;

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
  "/partners/fabric-stores",
  expressAsyncHandler(async (req, res) => {
    const filter = { role: "fabric_store" };
    if (req.query.includeInactive !== "1") {
      filter.isActive = true;
    }

    const stores = await User.find(filter)
      .select("-password")
      .sort({ name: 1 });

    res.send(stores);
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
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
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

// GET /api/admin/fabrics
// Admin can view all fabrics in the catalog (including inactive)
adminRouter.get(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const filter = req.query.listedByStore
      ? { listedByStore: req.query.listedByStore }
      : {};
    const fabrics = await Fabric.find(filter)
      .populate("listedByStore", "name email")
      .sort({ createdAt: -1 });
    res.send(fabrics);
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
    res.send(fabric);
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
      listedByStore,
      storePickupAddress,
      isActive,
    } = req.body;

    const partnerCheck = await assertFabricStorePartner(listedByStore);
    if (!partnerCheck.ok) {
      res.status(400).send({ message: partnerCheck.message });
      return;
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
      listedByStore,
      storePickupAddress,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdFabric = await newFabric.save();
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
    const shops = await TailorShop.find({})
      .populate(tailorShopOwnerPopulate)
      .sort({ createdAt: -1 });

    const items = shops.filter((shop) => shop.ownerId !== null);

    res.send({
      success: true,
      total: items.length,
      items,
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
    const { status, from, to, customer } = req.query;
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
          res.send([]);
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

    const orders = await RetailOrder.find(filter)
      .populate("userId", "name email phone")
      .populate("orderItems.productId", "thumbnailImage images")
      .sort({ createdAt: -1 });

    res.send(orders);
  }),
);

// PATCH /api/admin/orders/:id/status
// C-18: use this path (not /orders/retail/:id/status). Any valid status is allowed (no strict pipeline step).
adminRouter.patch(
  "/orders/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { status } = req.body;

    const validStatuses = RETAIL_ORDER_STATUSES;
    if (status && !validStatuses.includes(status)) {
      res.status(400).send({ message: "Invalid status value provided" });
      return;
    }

    const order = await RetailOrder.findById(req.params.id);

    if (order) {
      order.status = status || order.status;
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

    res.send(orders);
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
        order.status = status;

        const historyBlock = {
          status,
          note: typeof note === "string" ? note.trim() : "",
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
      monthlyData,
      recentOrders,
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
        defaultDeliveryFee: 45,
        defaultTailoringFee: 150,
        platformFee: 0,

        currency: "AED",
      });
    }

    res.send(settings);
  }),
);

// PUT /api/admin/settings
// Updates allowed configuration fields on the single platform registry document with sanity filters
adminRouter.put(
  "/settings",
  expressAsyncHandler(async (req, res) => {
    const {
      defaultDeliveryFee,
      defaultTailoringFee,
      platformFee,
      vatRate,
      currency,
      returnDeductionPercent,
      returnAllowedDays,
    } = req.body;

    // 1. Structural Number Validations
    if (
      defaultDeliveryFee !== undefined &&
      (typeof defaultDeliveryFee !== "number" || defaultDeliveryFee < 0)
    ) {
      res.status(400).send({
        message:
          "Delivery fee must be a valid number greater than or equal to 0",
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

    // 2. Fetch the current singleton record
    let settings = await PlatformSettings.findOne({});
    if (!settings) {
      res.status(404).send({
        message: "Platform settings base blueprint document not found",
      });
      return;
    }

    // 3. Re-assign changed attributes smoothly
    if (defaultDeliveryFee !== undefined)
      settings.defaultDeliveryFee = defaultDeliveryFee;
    if (defaultTailoringFee !== undefined)
      settings.defaultTailoringFee = defaultTailoringFee;
    if (platformFee !== undefined) settings.platformFee = platformFee;
    if (vatRate !== undefined) settings.vatRate = vatRate;
    if (returnDeductionPercent !== undefined)
      settings.returnDeductionPercent = returnDeductionPercent;
    if (returnAllowedDays !== undefined)
      settings.returnAllowedDays = returnAllowedDays;
    if (currency !== undefined) settings.currency = currency; // Fixed AED standard in MVP layout

    const updatedSettings = await settings.save();
    res.send({
      message:
        "Global platform configuration variables locked and synchronized successfully",
      settings: updatedSettings,
    });
  }),
);

// GET /api/admin/customers
// Fetch all users with role "customer", with optional search and status filter
adminRouter.get(
  "/customers",
  expressAsyncHandler(async (req, res) => {
    const { search, status, page = 1, limit = 20 } = req.query;

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
    const addons = await AddOn.find({
      $or: [{ ownerName: "MOTD Admin" }, { ownerName: { $exists: false } }],
    }).sort({ createdAt: -1 });
    res.send(addons);
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
