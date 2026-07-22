import express from "express";
import expressAsyncHandler from "express-async-handler";
import FabricShop from "../models/FabricShop.js";
import Fabric from "../models/Fabric.js";
import CustomOrder from "../models/CustomOrder.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import {
  uploadSingleImageMiddleware,
  processTailorShopImage,
  processTailorDesignImage,
  uploadReadyMadeImageMiddleware,
  processReadyMadeImage,
} from "../middleware/uploadReadyMadeImage.js";
import {
  uploadSingleAddOnImageMiddleware,
  processAddOnImage,
} from "../middleware/uploadAddOnImages.js";

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
      data[field] =
        typeof body[field] === "string" ? body[field].trim() : body[field];
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

  if (
    data.phone !== undefined &&
    data.phone !== "" &&
    !/^\d{9}$/.test(data.phone)
  ) {
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
  }),
);

// GET /api/fabric/shop — own shop profile
fabricPortalRouter.get(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }
    res.json({ success: true, item: formatShop(shop) });
  }),
);

// POST /api/fabric/shop — create own shop
fabricPortalRouter.post(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const existingShop = await findOwnShop(req.user._id);
    if (existingShop) {
      res.status(409).json({
        success: false,
        message: "Fabric shop already exists for this account",
      });
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
      res
        .status(409)
        .json({ success: false, message: "Shop slug is already in use" });
      return;
    }

    const shop = await FabricShop.create({
      ...data,
      ownerId: req.user._id,
    });

    res.status(201).json({ success: true, item: formatShop(shop) });
  }),
);

// PUT /api/fabric/shop — update own shop
fabricPortalRouter.put(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
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
        res
          .status(409)
          .json({ success: false, message: "Shop slug is already in use" });
        return;
      }
    }

    Object.assign(shop, data);
    const updatedShop = await shop.save();
    res.json({ success: true, item: formatShop(updatedShop) });
  }),
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
  }),
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
  }),
);

// GET /api/fabric/fabrics — list own fabrics
fabricPortalRouter.get(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const fabrics = await Fabric.find({ listedByStore: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ success: true, items: fabrics });
  }),
);

// GET /api/fabric/fabrics/:id — single fabric details
fabricPortalRouter.get(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findOne({
      _id: req.params.id,
      listedByStore: req.user._id,
    });
    if (!fabric) {
      res.status(404).json({ success: false, message: "Fabric not found" });
      return;
    }
    res.json({ success: true, item: fabric });
  }),
);

// POST /api/fabric/fabrics — create a fabric
fabricPortalRouter.post(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
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

    if (
      !name ||
      !nameAr ||
      !slug ||
      !material ||
      pricePerMeter === undefined ||
      pricePerMeter === null
    ) {
      res.status(400).json({
        success: false,
        message: "name, nameAr, slug, material, and pricePerMeter are required",
      });
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "At least one image is required" });
      return;
    }

    const slugTaken = await Fabric.findOne({ slug: slug.toLowerCase() });
    if (slugTaken) {
      res
        .status(409)
        .json({ success: false, message: "Fabric slug is already in use" });
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
  }),
);

// PUT /api/fabric/fabrics/:id — update a fabric
fabricPortalRouter.put(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const fabric = await Fabric.findOne({
      _id: req.params.id,
      listedByStore: req.user._id,
    });
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
        res
          .status(409)
          .json({ success: false, message: "Fabric slug is already in use" });
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
    if (pricePerMeter !== undefined)
      fabric.pricePerMeter = Number(pricePerMeter);
    if (stockInMeters !== undefined)
      fabric.stockInMeters = Number(stockInMeters);
    if (isActive !== undefined) fabric.isActive = isActive;

    if (storePickupAddress) {
      fabric.storePickupAddress = {
        emirate:
          storePickupAddress.emirate || fabric.storePickupAddress.emirate,
        city: storePickupAddress.city || fabric.storePickupAddress.city,
        street:
          storePickupAddress.street !== undefined
            ? storePickupAddress.street
            : fabric.storePickupAddress.street,
        building:
          storePickupAddress.building !== undefined
            ? storePickupAddress.building
            : fabric.storePickupAddress.building,
        phone:
          storePickupAddress.phone !== undefined
            ? storePickupAddress.phone
            : fabric.storePickupAddress.phone,
      };
    }

    const updatedFabric = await fabric.save();
    res.json({ success: true, item: updatedFabric });
  }),
);

// DELETE /api/fabric/fabrics/:id — delete a fabric
fabricPortalRouter.delete(
  "/fabrics/:id",
  expressAsyncHandler(async (req, res) => {
    const result = await Fabric.deleteOne({
      _id: req.params.id,
      listedByStore: req.user._id,
    });
    if (result.deletedCount === 0) {
      res.status(404).json({
        success: false,
        message: "Fabric not found or not owned by you",
      });
      return;
    }
    res.json({ success: true, message: "Fabric deleted successfully" });
  }),
);

// GET /api/fabric/orders — get all custom orders containing fabric from this store
fabricPortalRouter.get(
  "/orders",
  expressAsyncHandler(async (req, res) => {
    // Primary match (new schema)
    // - top-level: fabricStoreId
    // - items array: items[].fabricStoreId
    const primaryMatchOrdersQuery = {
      $or: [
        { fabricStoreId: req.user._id },
        { "items.fabricStoreId": req.user._id },
      ],
    };

    // Fallback match for legacy/older orders where fabricStoreId might be null,
    // but the fabricId belongs to fabrics listed by this store.
    const storeFabricIds = await Fabric.find({
      listedByStore: req.user._id,
    }).select("_id");

    const storeFabricIdValues = storeFabricIds.map((f) => f._id);

    const legacyMatchQuery = storeFabricIdValues.length
      ? {
          $or: [
            { fabricId: { $in: storeFabricIdValues } },
            { "items.fabricId": { $in: storeFabricIdValues } },
          ],
        }
      : null;

    const finalQuery = legacyMatchQuery
      ? {
          $or: [primaryMatchOrdersQuery, legacyMatchQuery],
        }
      : primaryMatchOrdersQuery;

    const orders = await CustomOrder.find(finalQuery)
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      items: orders,
      fabricShopId: req.user._id,
    });
  }),
);

// PATCH /api/fabric/orders/:id/status — fabric store updates the fabric handoff milestone
// This must update both `status` and `statusHistory` so timelines update everywhere.
fabricPortalRouter.patch(
  "/orders/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, note = "" } = req.body || {};

    if (!id) {
      res.status(400).json({ success: false, message: "Order id is required" });
      return;
    }

    // The fabric store should advance confirmed orders to fabric delivery.
    const allowedFabricStatuses = ["fabric_delivered"];

    if (
      !status ||
      typeof status !== "string" ||
      !allowedFabricStatuses.includes(status)
    ) {
      res.status(400).json({
        success: false,
        message: `status must be one of: ${allowedFabricStatuses.join(", ")}`,
      });
      return;
    }

    const order = await CustomOrder.findById(id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    // Authorize: order must belong to this fabric store
    const isBelongsToThisStore =
      order.fabricStoreId?.toString() === req.user._id.toString() ||
      order.items?.some(
        (it) => it?.fabricStoreId?.toString() === req.user._id.toString(),
      );

    if (!isBelongsToThisStore) {
      res.status(403).json({
        success: false,
        message: "You are not allowed to update this order",
      });
      return;
    }

    if (order.status !== "confirmed") {
      res.status(400).json({
        success: false,
        message: "Only confirmed orders can be marked as fabric delivered",
      });
      return;
    }

    // Update status + append to statusHistory (timeline source of truth)
    order.status = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status,
      note: typeof note === "string" ? note : "",
      changedAt: new Date(),
      changedBy: req.user._id,
    });

    await order.save();

    res.json({ success: true, order });
  }),
);

// ==========================================
// Fabric Portal Image Uploads
// ==========================================

// POST /api/fabric/uploads/ready-made
fabricPortalRouter.post(
  "/uploads/ready-made",
  uploadReadyMadeImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).send({ message: "No image file provided" });
      return;
    }
    const url = await processReadyMadeImage(req.file);
    res.status(201).send({ success: true, url });
  })
);

// POST /api/fabric/uploads/addons
fabricPortalRouter.post(
  "/uploads/addons",
  uploadSingleAddOnImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).send({ message: "No image file provided" });
      return;
    }
    const url = await processAddOnImage(req.file);
    res.status(201).send({ success: true, url });
  })
);

// ==========================================
// Fabric Portal Ready-Made CRUD
// ==========================================

// GET /api/fabric/ready-made
fabricPortalRouter.get(
  "/ready-made",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const products = await ReadyMadeProduct.find({ fabricShopId: shop._id }).sort({ createdAt: -1 });
    res.json(products);
  })
);

// GET /api/fabric/ready-made/:id
fabricPortalRouter.get(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const product = await ReadyMadeProduct.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (!product) {
      res.status(404).json({ success: false, message: "Ready-made product not found" });
      return;
    }
    res.json(product);
  })
);

// POST /api/fabric/ready-made
fabricPortalRouter.post(
  "/ready-made",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

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
      colors: Array.isArray(colors) ? colors : [],
      thumbnailImage,
      images: Array.isArray(images) ? images : [],
      fabricShopId: shop._id,
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
    });

    const createdProduct = await newProduct.save();
    res.status(201).json(createdProduct);
  })
);

// PUT /api/fabric/ready-made/:id
fabricPortalRouter.put(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const product = await ReadyMadeProduct.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (!product) {
      res.status(404).json({ success: false, message: "Ready-made product not found" });
      return;
    }

    product.name = req.body.name ?? product.name;
    product.nameAr = req.body.nameAr ?? product.nameAr;
    product.slug = req.body.slug ?? product.slug;
    product.code = req.body.code ?? product.code;
    product.description = req.body.description ?? product.description;
    product.descriptionAr = req.body.descriptionAr ?? product.descriptionAr;
    product.tag = req.body.tag ?? product.tag;
    product.tagAr = req.body.tagAr ?? product.tagAr;

    if (req.body.colors !== undefined) {
      product.colors = Array.isArray(req.body.colors) ? req.body.colors : [];
    }

    product.thumbnailImage = req.body.thumbnailImage ?? product.thumbnailImage;
    product.images = req.body.images ?? product.images;
    product.fabricId = req.body.fabricId ?? product.fabricId;
    product.tailorShopId = req.body.tailorShopId !== undefined ? req.body.tailorShopId : product.tailorShopId;
    product.designId = req.body.designId !== undefined ? req.body.designId : product.designId;

    product.fabricType = req.body.fabricType ?? product.fabricType;
    product.fabricTypeAr = req.body.fabricTypeAr ?? product.fabricTypeAr;
    product.tailorName = req.body.tailorName ?? product.tailorName;
    product.tailorNameAr = req.body.tailorNameAr ?? product.tailorNameAr;

    product.metersPerFabric = req.body.metersPerFabric ?? product.metersPerFabric;
    product.fabricPriceAED = req.body.fabricPriceAED ?? product.fabricPriceAED;
    product.mukhawarPriceAED = req.body.mukhawarPriceAED ?? product.mukhawarPriceAED;
    product.finalSellingPriceAED = req.body.finalSellingPriceAED ?? product.finalSellingPriceAED;
    product.availableFabricStock = req.body.availableFabricStock ?? product.availableFabricStock;
    product.isActive = req.body.isActive ?? product.isActive;

    product.size = req.body.size ?? product.size;
    product.style = req.body.style ?? product.style;
    product.city = req.body.city ?? product.city;
    product.returnReason = req.body.returnReason ?? product.returnReason;
    product.condition = req.body.condition ?? product.condition;
    product.countInStock = req.body.countInStock ?? product.countInStock;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  })
);

// DELETE /api/fabric/ready-made/:id
fabricPortalRouter.delete(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const product = await ReadyMadeProduct.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (product) {
      await product.deleteOne();
      res.json({ message: "Ready-made product deleted" });
    } else {
      res.status(404).json({ message: "Ready-made product not found" });
    }
  })
);

// ==========================================
// Fabric Portal Add-Ons CRUD
// ==========================================

// GET /api/fabric/addons
fabricPortalRouter.get(
  "/addons",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const addons = await AddOn.find({ fabricShopId: shop._id }).sort({ createdAt: -1 });
    res.json(addons);
  })
);

// GET /api/fabric/addons/:id
fabricPortalRouter.get(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const addon = await AddOn.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (!addon) {
      res.status(404).json({ success: false, message: "Addon not found" });
      return;
    }
    res.json(addon);
  })
);

// POST /api/fabric/addons
fabricPortalRouter.post(
  "/addons",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const {
      name,
      nameAr,
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

    let slug = req.body.slug?.trim();
    if (!slug) {
      const base = name || nameAr || "addon";
      slug = base
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    const addon = new AddOn({
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      price,
      stock,
      thumbnailImage,
      images: Array.isArray(images) ? images : [],
      tag,
      tagAr,
      isActive: isActive !== undefined ? isActive : true,
      fabricShopId: shop._id,
    });

    const savedAddon = await addon.save();
    res.status(201).json(savedAddon);
  })
);

// PUT /api/fabric/addons/:id
fabricPortalRouter.put(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const addon = await AddOn.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (!addon) {
      res.status(404).json({ success: false, message: "Addon not found" });
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
    addon.slug = slug ?? addon.slug;
    addon.description = description ?? addon.description;
    addon.descriptionAr = descriptionAr ?? addon.descriptionAr;
    addon.price = price ?? addon.price;
    addon.stock = stock ?? addon.stock;
    addon.thumbnailImage = thumbnailImage ?? addon.thumbnailImage;
    addon.images = images ?? addon.images;
    addon.tag = tag ?? addon.tag;
    addon.tagAr = tagAr ?? addon.tagAr;
    addon.isActive = isActive !== undefined ? isActive : addon.isActive;

    const updatedAddon = await addon.save();
    res.json(updatedAddon);
  })
);

// DELETE /api/fabric/addons/:id
fabricPortalRouter.delete(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const addon = await AddOn.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (addon) {
      await addon.deleteOne();
      res.json({ message: "Addon deleted successfully" });
    } else {
      res.status(404).json({ message: "Addon not found" });
    }
  })
);

// PATCH /api/fabric/addons/:id/toggle-active
fabricPortalRouter.patch(
  "/addons/:id/toggle-active",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const addon = await AddOn.findOne({ _id: req.params.id, fabricShopId: shop._id });
    if (!addon) {
      res.status(404).json({ success: false, message: "Addon not found" });
      return;
    }

    addon.isActive = !addon.isActive;
    await addon.save();
    res.json({
      success: true,
      message: `Addon ${addon.isActive ? "activated" : "deactivated"} successfully`,
      isActive: addon.isActive,
    });
  })
);

export default fabricPortalRouter;
