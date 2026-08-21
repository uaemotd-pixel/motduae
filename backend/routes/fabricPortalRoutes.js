import express from "express";
import expressAsyncHandler from "express-async-handler";
import FabricShop from "../models/FabricShop.js";
import Fabric from "../models/Fabric.js";
import CustomOrder from "../models/CustomOrder.js";
import ReadyMadeProduct from "../models/ReadyMadeProduct.js";
import AddOn from "../models/AddOn.js";
import RetailOrder from "../models/RetailOrder.js";
import Material from "../models/Material.js";
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
import {
  emptyShopPickupAddress,
  isCompleteShopPickupAddress,
  normalizeShopPickupAddress,
} from "../utils/shopPickupAddress.js";
import { hasActiveFabricShipments } from "../services/shipmentService.js";
import { getTimeframeWindow } from "../utils/dateRange.js";

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
  pickupAddress: shop.pickupAddress
    ? {
        fullName: shop.pickupAddress.fullName || "",
        phone: shop.pickupAddress.phone || "",
        line1: shop.pickupAddress.line1 || "",
        line2: shop.pickupAddress.line2 || "",
        city: shop.pickupAddress.city || "",
        emirate: shop.pickupAddress.emirate || "",
      }
    : emptyShopPickupAddress(),
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
  if (body.pickupAddress !== undefined) {
    data.pickupAddress = body.pickupAddress;
  }
  return data;
};

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

// Backend - store full format
const validateShopPayload = (data, { requireCore = false } = {}) => {
  const normalizePhone = (phone) => {
    if (!phone) return "";
    const digits = String(phone).replace(/\D/g, "");
    if (digits.startsWith("971")) {
      return `+971${digits.slice(3, 12)}`;
    }
    return `+971${digits.slice(0, 9)}`;
  };

  if (requireCore) {
    if (!data.name || !data.nameAr || !data.slug || !data.phone) {
      return "name, nameAr, slug, and phone are required";
    }
  } else {
    if (data.phone !== undefined && !data.phone) {
      return "phone is required";
    }
  }

  if (data.phone !== undefined && data.phone !== "") {
    const normalized = normalizePhone(data.phone);
    // Validate after normalization - check if we have 9 digits after +971
    if (!/^\+971\d{9}$/.test(normalized)) {
      return "phone number must be exactly 9 digits";
    }
    // Store full +971 format
    data.phone = normalized;
  }

  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    return "slug must be lowercase letters, numbers, and hyphens only";
  }

  if (data.pickupAddress !== undefined) {
    const normalized = normalizeShopPickupAddress(data.pickupAddress);
    if (!normalized) {
      return "pickupAddress requires fullName, phone, line1, city, and emirate";
    }
    if (!/^\d{9}$/.test(normalized.phone)) {
      return "pickup phone number must be exactly 9 digits";
    }
    data.pickupAddress = normalized;
  }

  return null;
};

const requirePickupAddress = (address) => {
  if (!isCompleteShopPickupAddress(address)) {
    return "pickupAddress with fullName, phone, line1, city, and emirate is required before the shop can fulfill orders";
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

    const pickupError = requirePickupAddress(data.pickupAddress);
    if (pickupError) {
      res.status(400).json({ success: false, message: pickupError });
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

    const nextPickupAddress =
      data.pickupAddress !== undefined ? data.pickupAddress : shop.pickupAddress;
    const pickupError = requirePickupAddress(nextPickupAddress);
    if (pickupError) {
      res.status(400).json({ success: false, message: pickupError });
      return;
    }

    Object.assign(shop, data);
    if (data.pickupAddress) {
      shop.pickupAddress = data.pickupAddress;
    }
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

// GET /api/fabric/materials?domain=fabrics
// Fabric stores can read active materials for a given domain
fabricPortalRouter.get(
  "/materials",
  expressAsyncHandler(async (req, res) => {
    const { domain } = req.query;
    const filter = { isActive: true };
    if (domain) filter.domain = domain;
    const materials = await Material.find(filter)
      .sort({ name: 1 })
      .select("name nameAr");
    res.send(materials);
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

    const fabrics = await Fabric.find({
      listedByStore: req.user._id,
      $or: [{ isVariantOf: null }, { isVariantOf: { $exists: false } }],
    }).sort({
      createdAt: -1,
    });

    const fabricsWithVariants = await Promise.all(
      fabrics.map(async (fabric) => {
        const variants = await Fabric.find({ isVariantOf: fabric._id });
        const obj = fabric.toObject();
        obj.variants = variants;
        return obj;
      }),
    );
    res.json({ success: true, items: fabricsWithVariants });
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
    const variants = await Fabric.find({ isVariantOf: fabric._id });
    const item = fabric.toObject();
    item.variants = variants;
    res.json({ success: true, item });
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
      minAge,
      maxAge,
      storePickupAddress,
      isActive,
    } = req.body;

    const normalizedMinAge = parseFabricAge(minAge);
    const normalizedMaxAge = parseFabricAge(maxAge);

    if (hasInvalidFabricAgeRange(normalizedMinAge, normalizedMaxAge)) {
      res.status(400).json({
        success: false,
        message: "Max age must be greater than or equal to min age",
      });
      return;
    }

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

    const shopPickup = shop.pickupAddress || {};
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
      minAge: normalizedMinAge,
      maxAge: normalizedMaxAge,
      listedByStore: req.user._id,
      fabricShopId: shop._id,
      storePickupAddress: {
        emirate:
          storePickupAddress?.emirate ||
          shopPickup.emirate ||
          shop.city ||
          "Dubai",
        city:
          storePickupAddress?.city || shopPickup.city || shop.city || "Dubai",
        street:
          storePickupAddress?.street ||
          shopPickup.line1 ||
          shop.location ||
          "",
        building:
          storePickupAddress?.building || shopPickup.line2 || "",
        phone:
          storePickupAddress?.phone || shopPickup.phone || shop.phone || "",
      },
      isActive: isActive !== undefined ? isActive : true,
    });

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
          description: variant.description || fabric.description,
          descriptionAr: variant.descriptionAr || fabric.descriptionAr,
          images: variant.images,
          material: variant.material,
          materialAr: variant.materialAr || fabric.materialAr,
          colors: variant.colors || [],
          tag: variant.tag || "",
          tagAr: variant.tagAr || "",
          pricePerMeter: Number(variant.pricePerMeter),
          stockInMeters: Number(variant.stockInMeters || 0),
          minAge: fabric.minAge,
          maxAge: fabric.maxAge,
          listedByStore: fabric.listedByStore,
          fabricShopId: fabric.fabricShopId,
          storePickupAddress: fabric.storePickupAddress,
          isVariantOf: fabric._id,
          isActive: variant.isActive !== undefined ? variant.isActive : true,
        });
      }
    }

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
      minAge,
      maxAge,
      storePickupAddress,
      isActive,
    } = req.body;

    const nextMinAge = parseFabricAge(minAge, fabric.minAge);
    const nextMaxAge = parseFabricAge(maxAge, fabric.maxAge);

    if (hasInvalidFabricAgeRange(nextMinAge, nextMaxAge)) {
      res.status(400).json({
        success: false,
        message: "Max age must be greater than or equal to min age",
      });
      return;
    }

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
    fabric.minAge = nextMinAge;
    fabric.maxAge = nextMaxAge;
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
            existing.fabricShopId = updatedFabric.fabricShopId;
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
            fabricShopId: updatedFabric.fabricShopId,
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
    const shop = await findOwnShop(req.user._id);
    const storeAddonIds = shop
      ? await AddOn.find({
          $or: [{ fabricShopId: shop._id }, { ownerName: shop.name }],
        }).select("_id")
      : [];
    const storeAddonIdValues = storeAddonIds.map((a) => a._id);

    const primaryMatchOrdersQuery = {
      $or: [
        { fabricStoreId: req.user._id },
        { "items.fabricStoreId": req.user._id },
        { "addons.addonId": { $in: storeAddonIdValues } },
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

// GET /api/fabric/orders/retail — get all retail orders containing products owned by this fabric store
fabricPortalRouter.get(
  "/orders/retail",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    // Find all ready-made products owned by this fabric store
    const storeProducts = await ReadyMadeProduct.find({
      $or: [{ fabricShopId: shop._id }, { ownerName: shop.name }],
    }).select("_id");
    const storeProductIds = storeProducts.map((p) => p._id);

    const orders = await RetailOrder.find({
      "orderItems.productId": { $in: storeProductIds },
    })
      .populate("userId", "name email phone")
      .populate("orderItems.productId", "thumbnailImage images")
      .sort({ createdAt: -1 });

    res.json(orders);
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

    // Manual fabric_delivered remains as override if Shipa inbound tracking lags.
    // When Shipa parcels exist and later deliver, webhook remains source of truth for those AWBs.
    const shipaLagOverride = hasActiveFabricShipments(order);
    const historyNote = shipaLagOverride
      ? [
          typeof note === "string" ? note.trim() : "",
          "Manual fabric delivered override (Shipa inbound parcels still in progress)",
        ]
          .filter(Boolean)
          .join(" — ")
      : typeof note === "string"
        ? note
        : "";

    order.status = status;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({
      status,
      note: historyNote,
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
  }),
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
  }),
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
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const products = await ReadyMadeProduct.find({
      $or: [
        { fabricShopId: shop._id, ownerName: { $ne: "MOTD Admin" } },
        { ownerName: shop.name },
      ],
    }).sort({ createdAt: -1 });
    res.json(products);
  }),
);

// GET /api/fabric/ready-made/:id
fabricPortalRouter.get(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const product = await ReadyMadeProduct.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
    if (!product) {
      res
        .status(404)
        .json({ success: false, message: "Ready-made product not found" });
      return;
    }
    res.json(product);
  }),
);

// POST /api/fabric/ready-made
fabricPortalRouter.post(
  "/ready-made",
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
      ownerName: req.body.ownerName || shop.name,
      pickupAddress:
        normalizeShopPickupAddress(req.body.pickupAddress) ||
        normalizeShopPickupAddress(shop.pickupAddress),
    });

    if (!newProduct.pickupAddress?.line1) {
      res.status(400).json({
        success: false,
        message:
          "Pickup address requires fullName, phone, line1, city, and emirate",
      });
      return;
    }

    const createdProduct = await newProduct.save();
    res.status(201).json(createdProduct);
  }),
);

// PUT /api/fabric/ready-made/:id
fabricPortalRouter.put(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const product = await ReadyMadeProduct.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
    if (!product) {
      res
        .status(404)
        .json({ success: false, message: "Ready-made product not found" });
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
    product.tailorShopId =
      req.body.tailorShopId !== undefined
        ? req.body.tailorShopId
        : product.tailorShopId;
    product.designId =
      req.body.designId !== undefined ? req.body.designId : product.designId;

    product.fabricType = req.body.fabricType ?? product.fabricType;
    product.fabricTypeAr = req.body.fabricTypeAr ?? product.fabricTypeAr;
    product.tailorName = req.body.tailorName ?? product.tailorName;
    product.tailorNameAr = req.body.tailorNameAr ?? product.tailorNameAr;

    if (req.body.pickupAddress !== undefined) {
      const normalized = normalizeShopPickupAddress(req.body.pickupAddress);
      if (!normalized) {
        res.status(400).json({
          success: false,
          message:
            "Pickup address requires fullName, phone, line1, city, and emirate",
        });
        return;
      }
      product.pickupAddress = normalized;
    }

    product.metersPerFabric =
      req.body.metersPerFabric ?? product.metersPerFabric;
    product.fabricPriceAED = req.body.fabricPriceAED ?? product.fabricPriceAED;
    product.mukhawarPriceAED =
      req.body.mukhawarPriceAED ?? product.mukhawarPriceAED;
    product.finalSellingPriceAED =
      req.body.finalSellingPriceAED ?? product.finalSellingPriceAED;
    product.availableFabricStock =
      req.body.availableFabricStock ?? product.availableFabricStock;
    product.isActive = req.body.isActive ?? product.isActive;
    product.ownerName = req.body.ownerName ?? product.ownerName;

    product.size = req.body.size ?? product.size;
    product.style = req.body.style ?? product.style;
    product.city = req.body.city ?? product.city;
    product.returnReason = req.body.returnReason ?? product.returnReason;
    product.condition = req.body.condition ?? product.condition;
    product.countInStock = req.body.countInStock ?? product.countInStock;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  }),
);

// DELETE /api/fabric/ready-made/:id
fabricPortalRouter.delete(
  "/ready-made/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const product = await ReadyMadeProduct.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
    if (product) {
      await product.deleteOne();
      res.json({ message: "Ready-made product deleted" });
    } else {
      res.status(404).json({ message: "Ready-made product not found" });
    }
  }),
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
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const addons = await AddOn.find({
      $or: [
        { fabricShopId: shop._id, ownerName: { $ne: "MOTD Admin" } },
        { ownerName: shop.name },
      ],
    }).sort({ createdAt: -1 });
    res.json(addons);
  }),
);

// GET /api/fabric/addons/:id
fabricPortalRouter.get(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }
    const addon = await AddOn.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
    if (!addon) {
      res.status(404).json({ success: false, message: "Addon not found" });
      return;
    }
    res.json(addon);
  }),
);

// POST /api/fabric/addons
fabricPortalRouter.post(
  "/addons",
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
      ownerName: req.body.ownerName || shop.name,
      pickupAddress:
        normalizeShopPickupAddress(req.body.pickupAddress) ||
        normalizeShopPickupAddress(shop.pickupAddress),
    });

    if (!addon.pickupAddress?.line1) {
      res.status(400).json({
        success: false,
        message:
          "Pickup address requires fullName, phone, line1, city, and emirate",
      });
      return;
    }

    const savedAddon = await addon.save();
    res.status(201).json(savedAddon);
  }),
);

// PUT /api/fabric/addons/:id
fabricPortalRouter.put(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const addon = await AddOn.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
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
    addon.ownerName = req.body.ownerName ?? addon.ownerName;

    if (req.body.pickupAddress !== undefined) {
      const normalized = normalizeShopPickupAddress(req.body.pickupAddress);
      if (!normalized) {
        res.status(400).json({
          success: false,
          message:
            "Pickup address requires fullName, phone, line1, city, and emirate",
        });
        return;
      }
      addon.pickupAddress = normalized;
    }

    const updatedAddon = await addon.save();
    res.json(updatedAddon);
  }),
);

// DELETE /api/fabric/addons/:id
fabricPortalRouter.delete(
  "/addons/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const addon = await AddOn.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
    if (addon) {
      await addon.deleteOne();
      res.json({ message: "Addon deleted successfully" });
    } else {
      res.status(404).json({ message: "Addon not found" });
    }
  }),
);

// PATCH /api/fabric/addons/:id/toggle-active
fabricPortalRouter.patch(
  "/addons/:id/toggle-active",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res
        .status(404)
        .json({ success: false, message: "Fabric shop not found" });
      return;
    }

    const addon = await AddOn.findOne({
      _id: req.params.id,
      fabricShopId: shop._id,
    });
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
  }),
);

// ==========================================
// GET /api/fabric/dashboard
// ==========================================
fabricPortalRouter.get(
  "/dashboard",
  expressAsyncHandler(async (req, res) => {
    const timeframeRaw = req.query.timeframe;
    const timeframe =
      timeframeRaw === "week" ||
      timeframeRaw === "month" ||
      timeframeRaw === "year"
        ? timeframeRaw
        : "month";
    const { start, end } = getTimeframeWindow(timeframe);

    const shop = await findOwnShop(req.user._id);
    const storeFabricIds = await Fabric.find({
      listedByStore: req.user._id,
    }).select("_id stockInMeters isActive name");
    const storeFabricIdValues = storeFabricIds.map((f) => f._id);

    const storeAddonIds = shop
      ? await AddOn.find({
          $or: [{ fabricShopId: shop._id }, { ownerName: shop.name }],
        }).select("_id")
      : [];
    const storeAddonIdValues = storeAddonIds.map((a) => a._id);

    const primaryMatch = {
      $or: [
        { fabricStoreId: req.user._id },
        { "items.fabricStoreId": req.user._id },
        ...(storeAddonIdValues.length
          ? [{ "addons.addonId": { $in: storeAddonIdValues } }]
          : []),
      ],
    };
    const legacyMatch = storeFabricIdValues.length
      ? {
          $or: [
            { fabricId: { $in: storeFabricIdValues } },
            { "items.fabricId": { $in: storeFabricIdValues } },
          ],
        }
      : null;
    const orderMatch = legacyMatch
      ? { $or: [primaryMatch, legacyMatch] }
      : primaryMatch;

    const ownerUserId = req.user._id;
    const shopIdStr = shop?._id?.toString?.() || "";

    const ordersInWindow = await CustomOrder.find({
      ...orderMatch,
      createdAt: { $gte: start, $lte: end },
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const allScopedOrders = await CustomOrder.find(orderMatch)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    const sumFabricFee = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter((item) => {
            const sid =
              item.fabricStoreId?._id?.toString?.() ||
              item.fabricStoreId?.toString?.() ||
              "";
            return (
              sid === ownerUserId.toString() || (shopIdStr && sid === shopIdStr)
            );
          })
          .reduce((sum, item) => sum + (item.pricing?.fabricCost || 0), 0);
      }
      return order.pricing?.fabricCost || 0;
    };

    const sumMeters = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter((item) => {
            const sid =
              item.fabricStoreId?._id?.toString?.() ||
              item.fabricStoreId?.toString?.() ||
              "";
            return (
              sid === ownerUserId.toString() || (shopIdStr && sid === shopIdStr)
            );
          })
          .reduce(
            (sum, item) =>
              sum + (item.pricing?.fabricMeters || item.fabricMeters || 0),
            0,
          );
      }
      return order.pricing?.fabricMeters || order.fabricMeters || 0;
    };

    let fabricRevenue = 0;
    let metersSold = 0;
    const statusMap = new Map();
    const fabricRevenueMap = new Map();

    for (const order of ordersInWindow) {
      const fee = sumFabricFee(order);
      fabricRevenue += fee;
      metersSold += sumMeters(order);
      const st = order.status || "unknown";
      statusMap.set(st, (statusMap.get(st) || 0) + 1);

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          const sid =
            item.fabricStoreId?._id?.toString?.() ||
            item.fabricStoreId?.toString?.() ||
            "";
          if (
            sid !== ownerUserId.toString() &&
            !(shopIdStr && sid === shopIdStr)
          ) {
            continue;
          }
          const name = item.fabricSnapshot?.name || "Unknown fabric";
          const cost = item.pricing?.fabricCost || 0;
          const prev = fabricRevenueMap.get(name) || { value: 0, count: 0 };
          fabricRevenueMap.set(name, {
            value: prev.value + cost,
            count: prev.count + 1,
          });
        }
      } else if (order.fabricSnapshot?.name) {
        const name = order.fabricSnapshot.name;
        const cost = order.pricing?.fabricCost || 0;
        const prev = fabricRevenueMap.get(name) || { value: 0, count: 0 };
        fabricRevenueMap.set(name, {
          value: prev.value + cost,
          count: prev.count + 1,
        });
      }
    }

    // Monthly fabric revenue (last 6 months)
    const monthEnd = new Date();
    const monthStarts = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(monthEnd);
      d.setUTCMonth(d.getUTCMonth() - i);
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      monthStarts.push(d);
    }
    const rangeStart = monthStarts[0];
    const monthlyOrders = await CustomOrder.find({
      ...orderMatch,
      createdAt: { $gte: rangeStart, $lte: end },
    }).lean();

    const monthlyMap = new Map();
    for (const order of monthlyOrders) {
      const d = new Date(order.createdAt);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + sumFabricFee(order));
    }

    const monthlyData = monthStarts.map((d) => ({
      month: d.toLocaleString("en-US", { month: "short" }),
      revenue:
        monthlyMap.get(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`) || 0,
    }));

    const LOW_STOCK = 10;
    const activeSkus = storeFabricIds.filter(
      (f) => f.isActive !== false,
    ).length;
    const lowStock = storeFabricIds.filter(
      (f) => (f.stockInMeters || 0) <= LOW_STOCK && f.isActive !== false,
    ).length;

    const topFabrics = Array.from(fabricRevenueMap.entries())
      .map(([name, data], i) => ({
        id: String(i),
        name,
        value: data.value,
        meta: `${data.count} orders`,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const recentOrders = allScopedOrders.map((o) => ({
      id: o._id.toString(),
      amount: sumFabricFee(o),
      status: o.status,
      date: o.createdAt ? new Date(o.createdAt).toISOString() : "",
      type: "custom",
    }));

    res.json({
      success: true,
      currency: "AED",
      fabricShopId: ownerUserId,
      kpis: {
        fabricRevenue,
        orderCount: ordersInWindow.length,
        metersSold,
        activeSkus,
        lowStock,
      },
      monthlyData,
      statusBreakdown,
      topFabrics,
      recentOrders,
      pricingOrders: allScopedOrders,
    });
  }),
);

export default fabricPortalRouter;
