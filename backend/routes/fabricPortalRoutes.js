import express from "express";
import expressAsyncHandler from "express-async-handler";
import FabricShop from "../models/FabricShop.js";
import Fabric from "../models/Fabric.js";
import CustomOrder from "../models/CustomOrder.js";
import {
  uploadSingleImageMiddleware,
  processTailorShopImage,
  processTailorDesignImage,
} from "../middleware/uploadReadyMadeImage.js";

const fabricPortalRouter = express.Router();

const SHOP_FIELDS = [
  "name",
  "nameAr",
  "slug",
  "description",
  "descriptionAr",
  "logo",
  "coverImage",
  "location",
  "city",
  "phone",
];

const formatShop = (shop) => ({
  _id: shop._id,
  name: shop.name,
  nameAr: shop.nameAr,
  slug: shop.slug,
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
  isActive: shop.isActive,
  createdAt: shop.createdAt,
  updatedAt: shop.updatedAt,
});

const pickShopFields = (body) => {
  const data = {};
  for (const field of SHOP_FIELDS) {
    if (body[field] !== undefined) {
      data[field] = typeof body[field] === "string" ? body[field].trim() : body[field];
    }
  }
  if (data.slug) {
    data.slug = data.slug.toLowerCase();
  }
  return data;
};

const validateShopPayload = (data, { requireCore = false } = {}) => {
  if (requireCore) {
    if (!data.name || !data.nameAr || !data.slug || !data.phone) {
      return "name, nameAr, slug, and phone are required";
    }
  } else {
    if (data.phone !== undefined && !data.phone) {
      return "phone is required";
    }
  }

  if (data.phone !== undefined && data.phone !== "" && !/^\d{9}$/.test(data.phone)) {
    return "phone number must be exactly 9 digits";
  }

  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    return "slug must be lowercase letters, numbers, and hyphens only";
  }

  return null;
};

const findOwnShop = (ownerId) => FabricShop.findOne({ ownerId });

// GET /api/fabric/status
fabricPortalRouter.get(
  "/status",
  expressAsyncHandler(async (req, res) => {
    res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        approvalStatus: req.user.approvalStatus,
      },
    });
  })
);

// GET /api/fabric/shop — own shop profile
fabricPortalRouter.get(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }
    res.json({ success: true, item: formatShop(shop) });
  })
);

// POST /api/fabric/shop — create own shop
fabricPortalRouter.post(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const existingShop = await findOwnShop(req.user._id);
    if (existingShop) {
      res.status(409).json({ success: false, message: "Fabric shop already exists for this account" });
      return;
    }

    const data = pickShopFields(req.body);
    const validationError = validateShopPayload(data, { requireCore: true });
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }

    const slugTaken = await FabricShop.findOne({ slug: data.slug });
    if (slugTaken) {
      res.status(409).json({ success: false, message: "Shop slug is already in use" });
      return;
    }

    const shop = await FabricShop.create({
      ...data,
      ownerId: req.user._id,
    });

    res.status(201).json({ success: true, item: formatShop(shop) });
  })
);

// PUT /api/fabric/shop — update own shop
fabricPortalRouter.put(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const data = pickShopFields(req.body);
    const validationError = validateShopPayload(data, { requireCore: false });
    if (validationError) {
      res.status(400).json({ success: false, message: validationError });
      return;
    }

    if (data.slug && data.slug !== shop.slug) {
      const slugTaken = await FabricShop.findOne({ slug: data.slug });
      if (slugTaken) {
        res.status(409).json({ success: false, message: "Shop slug is already in use" });
        return;
      }
    }

    Object.assign(shop, data);
    const updatedShop = await shop.save();
    res.json({ success: true, item: formatShop(updatedShop) });
  })
);

// POST /api/fabric/uploads/shop-image?variant=logo|cover
fabricPortalRouter.post(
  "/uploads/shop-image",
  uploadSingleImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "No image file provided" });
      return;
    }
    const variant = req.query.variant === "logo" ? "logo" : "cover";
    const url = await processTailorShopImage(req.file, { variant });
    res.status(201).json({ success: true, url });
  })
);

// POST /api/fabric/uploads/fabric-image
fabricPortalRouter.post(
  "/uploads/fabric-image",
  uploadSingleImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "No image file provided" });
      return;
    }
    const url = await processTailorDesignImage(req.file);
    res.status(201).json({ success: true, url });
  })
);

// GET /api/fabric/fabrics — list own fabrics
fabricPortalRouter.get(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const fabrics = await Fabric.find({ listedByStore: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, items: fabrics });
  })
);

// GET /api/fabric/fabrics/:id — single fabric details
fabricPortalRouter.get(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findOne({ _id: req.params.id, listedByStore: req.user._id });
    if (!fabric) {
      res.status(404).json({ success: false, message: "Fabric not found" });
      return;
    }
    res.json({ success: true, item: fabric });
  })
);

// POST /api/fabric/fabrics — create a fabric
fabricPortalRouter.post(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

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
      storePickupAddress,
      isActive,
    } = req.body;

    if (!name || !nameAr || !slug || !material || pricePerMeter === undefined || pricePerMeter === null) {
      res.status(400).json({ success: false, message: "name, nameAr, slug, material, and pricePerMeter are required" });
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      res.status(400).json({ success: false, message: "At least one image is required" });
      return;
    }

    const slugTaken = await Fabric.findOne({ slug: slug.toLowerCase() });
    if (slugTaken) {
      res.status(409).json({ success: false, message: "Fabric slug is already in use" });
      return;
    }

    const fabric = await Fabric.create({
      name,
      nameAr,
      slug: slug.toLowerCase(),
      description: description || "",
      descriptionAr: descriptionAr || "",
      images,
      material,
      materialAr: materialAr || "",
      colors: colors || [],
      tag: tag || "",
      tagAr: tagAr || "",
      pricePerMeter: Number(pricePerMeter),
      stockInMeters: Number(stockInMeters || 0),
      listedByStore: req.user._id,
      fabricShopId: shop._id,
      storePickupAddress: {
        emirate: storePickupAddress?.emirate || shop.city || "Dubai",
        city: storePickupAddress?.city || shop.city || "Dubai",
        street: storePickupAddress?.street || shop.location || "",
        building: storePickupAddress?.building || "",
        phone: storePickupAddress?.phone || shop.phone || "",
      },
      isActive: isActive !== undefined ? isActive : true,
    });

    res.status(201).json({ success: true, item: fabric });
  })
);

// PUT /api/fabric/fabrics/:id — update a fabric
fabricPortalRouter.put(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const fabric = await Fabric.findOne({ _id: req.params.id, listedByStore: req.user._id });
    if (!fabric) {
      res.status(404).json({ success: false, message: "Fabric not found" });
      return;
    }

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
      storePickupAddress,
      isActive,
    } = req.body;

    if (slug && slug.toLowerCase() !== fabric.slug) {
      const slugTaken = await Fabric.findOne({ slug: slug.toLowerCase() });
      if (slugTaken) {
        res.status(409).json({ success: false, message: "Fabric slug is already in use" });
        return;
      }
      fabric.slug = slug.toLowerCase();
    }

    if (name) fabric.name = name;
    if (nameAr) fabric.nameAr = nameAr;
    if (description !== undefined) fabric.description = description;
    if (descriptionAr !== undefined) fabric.descriptionAr = descriptionAr;
    if (images) fabric.images = images;
    if (material) fabric.material = material;
    if (materialAr !== undefined) fabric.materialAr = materialAr;
    if (colors) fabric.colors = colors;
    if (tag !== undefined) fabric.tag = tag;
    if (tagAr !== undefined) fabric.tagAr = tagAr;
    if (pricePerMeter !== undefined) fabric.pricePerMeter = Number(pricePerMeter);
    if (stockInMeters !== undefined) fabric.stockInMeters = Number(stockInMeters);
    if (isActive !== undefined) fabric.isActive = isActive;

    if (storePickupAddress) {
      fabric.storePickupAddress = {
        emirate: storePickupAddress.emirate || fabric.storePickupAddress.emirate,
        city: storePickupAddress.city || fabric.storePickupAddress.city,
        street: storePickupAddress.street !== undefined ? storePickupAddress.street : fabric.storePickupAddress.street,
        building: storePickupAddress.building !== undefined ? storePickupAddress.building : fabric.storePickupAddress.building,
        phone: storePickupAddress.phone !== undefined ? storePickupAddress.phone : fabric.storePickupAddress.phone,
      };
    }

    const updatedFabric = await fabric.save();
    res.json({ success: true, item: updatedFabric });
  })
);

// DELETE /api/fabric/fabrics/:id — delete a fabric
fabricPortalRouter.delete(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const result = await Fabric.deleteOne({ _id: req.params.id, listedByStore: req.user._id });
    if (result.deletedCount === 0) {
      res.status(404).json({ success: false, message: "Fabric not found or not owned by you" });
      return;
    }
    res.json({ success: true, message: "Fabric deleted successfully" });
  })
);

// GET /api/fabric/orders — get all custom orders containing fabric from this store
fabricPortalRouter.get(
  "/orders",
  expressAsyncHandler(async (req, res) => {
    const orders = await CustomOrder.find({
      fabricStoreId: req.user._id,
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      items: orders,
    });
  })
);

// PATCH /api/fabric/orders/:id/status — update order status by the fabric store
fabricPortalRouter.patch(
  "/orders/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { status, note } = req.body;

    const order = await CustomOrder.findOne({
      _id: req.params.id,
      fabricStoreId: req.user._id,
    });
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    if (status) {
      order.status = status;
      order.statusHistory.push({
        status,
        note: typeof note === 'string' ? note.trim() : '',
        changedAt: new Date(),
        changedBy: req.user._id,
      });
      await order.save();
    }

    res.json({
      success: true,
      order,
    });
  })
);

export default fabricPortalRouter;
