import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import Fabric from "../models/Fabric.js";
import User from "../models/User.js";
import TailorShop from "../models/TailorShop.js";
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

const adminRouter = express.Router();

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

// ==========================================
// C-02: Admin Ready-Made CRUD
// ==========================================

// GET /api/admin/ready-made
// Admin can view all ready-made products (including inactive/sold)
adminRouter.get(
  "/ready-made",
  expressAsyncHandler(async (req, res) => {
    const products = await ReadyMadeProduct.find({}).sort({ createdAt: -1 });
    res.send(products);
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
      slug,
      description,
      descriptionAr,
      images,
      price,
      size,
      style,
      city,
      tag,
      tagColor,
      returnReason,
      sourceCustomOrderId,
      condition,
      isActive,
    } = req.body;

    const newProduct = new ReadyMadeProduct({
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      price,
      size,
      style,
      city,
      tag,
      tagColor,
      returnReason: returnReason || "size_issue",
      sourceCustomOrderId,
      condition,
      countInStock: 1, // Fixed based on MVP rules
      isActive: isActive !== undefined ? isActive : true,
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

    if (product) {
      product.name = req.body.name || product.name;
      product.nameAr = req.body.nameAr || product.nameAr;
      product.slug = req.body.slug || product.slug;
      product.description =
        req.body.description !== undefined
          ? req.body.description
          : product.description;
      product.descriptionAr =
        req.body.descriptionAr !== undefined
          ? req.body.descriptionAr
          : product.descriptionAr;
      product.images = req.body.images || product.images;
      product.price =
        req.body.price !== undefined ? req.body.price : product.price;
      product.size = req.body.size || product.size;
      product.style = req.body.style || product.style;
      product.city = req.body.city !== undefined ? req.body.city : product.city;
      product.tag = req.body.tag !== undefined ? req.body.tag : product.tag;
      product.tagColor =
        req.body.tagColor !== undefined ? req.body.tagColor : product.tagColor;
      product.returnReason = req.body.returnReason || product.returnReason;
      product.sourceCustomOrderId =
        req.body.sourceCustomOrderId || product.sourceCustomOrderId;
      product.condition = req.body.condition || product.condition;
      product.isActive =
        req.body.isActive !== undefined ? req.body.isActive : product.isActive;
      // We might allow updating countInStock manually in the future, but MVP implies it stays 1 or goes 0.
      if (req.body.countInStock !== undefined) {
        product.countInStock = req.body.countInStock;
      }

      const updatedProduct = await product.save();
      res.send(updatedProduct);
    } else {
      res.status(404).send({ message: "Ready-made product not found" });
    }
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

// GET /api/admin/partners/fabric-stores
// Approved fabric store partners for admin fabric form picker
adminRouter.get(
  "/partners/fabric-stores",
  expressAsyncHandler(async (_req, res) => {
    const stores = await User.find({ role: "fabric_store" }).sort({ name: 1 });

    res.send(stores);
  }),
);

// POST /api/admin/users
adminRouter.post(
  "/create-partners",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password, role, approvalStatus } = req.body;
    // validate required fields
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).send({ message: "User already exists" });
      return;
    }
    const user = new User({
      name,
      email,
      password, // should be hashed; use pre-save hook or hash here
      role: role || "fabric_store",
      approvalStatus: approvalStatus || "approved",
    });
    await user.save();
    res.status(201).send({
      message: "User created",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  }),
);

// PUT /api/admin/users/:id
adminRouter.put(
  "/edit-partners/:id",
  expressAsyncHandler(async (req, res) => {
    const { name, email, password } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = password; // handle hashing
    await user.save();
    res.send({ message: "User updated", user });
  }),
);

// DELETE /api/admin/users/:id
adminRouter.delete(
  "/delete-partner/:id",
  expressAsyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      res.status(404).send({ message: "User not found" });
      return;
    }
    await user.deleteOne();
    res.send({ message: "User deleted" });
  })
);

async function assertFabricStorePartner(listedByStore) {
  if (!listedByStore || !mongoose.Types.ObjectId.isValid(listedByStore)) {
    return { ok: false, message: "Invalid fabric store partner ID" };
  }

  const store = await User.findOne({
    _id: listedByStore,
    role: "fabric_store",
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
    const fabrics = await Fabric.find({})
      .populate("listedByStore", "name email")
      .sort({ createdAt: -1 });
    res.send(fabrics);
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
      color,
      city,
      tag,
      tagColor,
      pricePerMeter,
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
      color,
      city,
      tag,
      tagColor,
      pricePerMeter,
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

    if (fabric) {
      if (req.body.listedByStore) {
        const partnerCheck = await assertFabricStorePartner(
          req.body.listedByStore,
        );
        if (!partnerCheck.ok) {
          res.status(400).send({ message: partnerCheck.message });
          return;
        }
        fabric.listedByStore = req.body.listedByStore;
      }

      fabric.name = req.body.name || fabric.name;
      fabric.nameAr = req.body.nameAr || fabric.nameAr;
      fabric.slug = req.body.slug || fabric.slug;
      fabric.description =
        req.body.description !== undefined
          ? req.body.description
          : fabric.description;
      fabric.descriptionAr =
        req.body.descriptionAr !== undefined
          ? req.body.descriptionAr
          : fabric.descriptionAr;
      fabric.images = req.body.images || fabric.images;
      fabric.material = req.body.material || fabric.material;
      fabric.color =
        req.body.color !== undefined ? req.body.color : fabric.color;
      fabric.city = req.body.city !== undefined ? req.body.city : fabric.city;
      fabric.tag = req.body.tag !== undefined ? req.body.tag : fabric.tag;
      fabric.tagColor =
        req.body.tagColor !== undefined ? req.body.tagColor : fabric.tagColor;
      fabric.pricePerMeter =
        req.body.pricePerMeter !== undefined
          ? req.body.pricePerMeter
          : fabric.pricePerMeter;

      if (req.body.storePickupAddress) {
        fabric.storePickupAddress = req.body.storePickupAddress;
      }

      fabric.isActive =
        req.body.isActive !== undefined ? req.body.isActive : fabric.isActive;

      const updatedFabric = await fabric.save();
      res.send(updatedFabric);
    } else {
      res.status(404).send({ message: "Fabric not found" });
    }
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

    const orders = await RetailOrder.find(filter)
      .populate("userId", "name email")
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
      .populate("userId", "name email")
      .populate("tailorShopId", "name location city")
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

// GET /api/admin/dashboard
// Split retail/custom orderCount + revenue. Empty DB returns zeros. No combined total (C-12 sums client-side).
adminRouter.get(
  "/dashboard",
  expressAsyncHandler(async (req, res) => {
    // 1. Aggregate Retail Orders (Count and Sum of totalPrice)
    const retailStats = await RetailOrder.aggregate([
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          revenue: { $sum: "$totalPrice" },
        },
      },
    ]);

    // 2. Aggregate Custom Orders (Count and Sum of pricing.total)
    const customStats = await CustomOrder.aggregate([
      {
        $group: {
          _id: null,
          orderCount: { $sum: 1 },
          revenue: { $sum: "$pricing.total" },
        },
      },
    ]);

    // Extract values safely, defaulting to 0 if no orders exist yet
    const retailResult = retailStats[0] || { orderCount: 0, revenue: 0 };
    const customResult = customStats[0] || { orderCount: 0, revenue: 0 };

    // Formulate response layout matching team architecture specifications
    const dashboardSummary = {
      retail: {
        orderCount: retailResult.orderCount,
        revenue: retailResult.revenue,
      },
      custom: {
        orderCount: customResult.orderCount,
        revenue: customResult.revenue,
      },
      currency: "AED", // Project base pricing currency standard
    };

    res.send(dashboardSummary);
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
        defaultDeliveryFee: 35,
        defaultTailoringFee: 150,
        platformFee: 0,
        vatRate: 0.05,
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
    if (currency !== undefined) settings.currency = currency; // Fixed AED standard in MVP layout

    const updatedSettings = await settings.save();
    res.send({
      message:
        "Global platform configuration variables locked and synchronized successfully",
      settings: updatedSettings,
    });
  }),
);

export default adminRouter;
