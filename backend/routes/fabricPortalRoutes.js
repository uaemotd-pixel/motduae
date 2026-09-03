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
import PlatformSettings from "../models/PlatformSettings.js";
import { splitMotdCommission } from "../services/pricingService.js";
import PartnerPayout from "../models/PartnerPayout.js";
import PartnerPayoutCredit from "../models/PartnerPayoutCredit.js";
import { hydrateRetailOrders } from "../services/retailOrderHydrate.js";
import { ensureUniqueSlug } from "../utils/uniqueSlug.js";
import PartnerPayoutRequest from "../models/PartnerPayoutRequest.js";
import {
  createNotification,
  ensurePartnerPayoutReleasedNotification,
} from "../services/notificationService.js";
import { computeFabricUnpaidBreakdown } from "../services/fabricPayoutRequestService.js";
import {
  isShopProfileComplete,
  isValidShopSlug,
  respondIfShopNotReady,
} from "../utils/shopReady.js";
import {
  enrichFabricWithCuts,
  prepareFabricCutsInput,
  countLowStockCutRowsFromFabrics,
  LOW_FABRIC_CUT_STOCK_THRESHOLD,
} from "../utils/fabricCuts.js";

const fabricPortalRouter = express.Router();

const DEFAULT_FABRIC_COMMISSION_PERCENT = 15;

const resolveFabricCommissionPercent = (settings) => {
  if (
    typeof settings?.motdCommissionFromFabricStore === "number" &&
    Number.isFinite(settings.motdCommissionFromFabricStore)
  ) {
    return Math.min(100, Math.max(0, settings.motdCommissionFromFabricStore));
  }
  return DEFAULT_FABRIC_COMMISSION_PERCENT;
};

function normalizePartnerLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Paid totals for this fabric store from admin PartnerPayout releases. */
async function getFabricSettlement(shop, ownerUserId) {
  const ownerIdStr = String(ownerUserId);
  const partnerIds = [ownerIdStr];
  const keys = [`fabric:${ownerIdStr}`];

  if (shop) {
    const shopId = String(shop._id);
    partnerIds.push(shopId);
    keys.push(`fabric:${shopId}`);
    const nameNorm = normalizePartnerLabel(shop.name);
    if (nameNorm) keys.push(`fabric:name:${nameNorm}`);
  }

  const match = {
    partnerKind: "fabric",
    $or: [{ partnerId: { $in: partnerIds } }, { partnerKey: { $in: keys } }],
  };

  const [payouts, credits] = await Promise.all([
    PartnerPayout.find(match).select("amount orders deletedAt").lean(),
    PartnerPayoutCredit.find({
      ...match,
      "orders.0": { $exists: true },
    })
      .select("amount orders")
      .lean(),
  ]);

  let paidTotal = 0;
  const paidByOrderId = new Map();

  for (const payout of payouts) {
    paidTotal += Number(payout.amount) || 0;
    for (const order of payout.orders || []) {
      const orderId = String(order.orderId || "");
      if (!orderId) continue;
      paidByOrderId.set(
        orderId,
        Number(
          (
            (paidByOrderId.get(orderId) || 0) + (Number(order.amount) || 0)
          ).toFixed(2),
        ),
      );
    }
  }

  for (const credit of credits) {
    paidTotal += Number(credit.amount) || 0;
    for (const order of credit.orders || []) {
      const orderId = String(order.orderId || "");
      if (!orderId) continue;
      paidByOrderId.set(
        orderId,
        Number(
          (
            (paidByOrderId.get(orderId) || 0) + (Number(order.amount) || 0)
          ).toFixed(2),
        ),
      );
    }
  }

  return {
    paidTotal: Number(paidTotal.toFixed(2)),
    paidByOrderId,
  };
}

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
  slug: shop.slug || "",
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
  profileComplete: isShopProfileComplete(shop),
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

    data.slug = await ensureUniqueSlug(FabricShop, data.slug || data.name, {
      fallback: "shop",
    });

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

    if (!isValidShopSlug(data.slug !== undefined ? data.slug : shop.slug)) {
      res.status(400).json({ success: false, message: "slug is required" });
      return;
    }

    if (data.slug && data.slug !== shop.slug) {
      data.slug = await ensureUniqueSlug(FabricShop, data.slug, {
        excludeId: shop._id,
        fallback: "shop",
      });
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
        const enrichedFabric = await enrichFabricWithCuts(fabric);
        const enrichedVariants = await Promise.all(
          variants.map((variant) => enrichFabricWithCuts(variant)),
        );
        enrichedFabric.variants = enrichedVariants;
        return enrichedFabric;
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
    const enrichedFabric = await enrichFabricWithCuts(fabric);
    const enrichedVariants = await Promise.all(
      variants.map((variant) => enrichFabricWithCuts(variant)),
    );
    const item = enrichedFabric;
    item.variants = enrichedVariants;
    res.json({ success: true, item });
  }),
);

// POST /api/fabric/fabrics — create a fabric
fabricPortalRouter.post(
  "/fabrics",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (respondIfShopNotReady(shop, res)) return;

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
      storePickupAddress,
      isActive,
    } = req.body;

    const cutsResult = await prepareFabricCutsInput(cuts);
    if (!cutsResult.ok) {
      res.status(400).json({ success: false, message: cutsResult.message });
      return;
    }

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
      !material
    ) {
      res.status(400).json({
        success: false,
        message: "name, nameAr, and material are required",
      });
      return;
    }

    if (!Array.isArray(images) || images.length === 0) {
      res
        .status(400)
        .json({ success: false, message: "At least one image is required" });
      return;
    }

    const uniqueSlug = await ensureUniqueSlug(Fabric, slug || name, {
      fallback: "fabric",
    });

    const shopPickup = shop.pickupAddress || {};
    const fabric = await Fabric.create({
      name,
      nameAr,
      slug: uniqueSlug,
      description: description || "",
      descriptionAr: descriptionAr || "",
      images,
      material,
      materialAr: materialAr || "",
      colors: colors || [],
      tag: tag || "",
      tagAr: tagAr || "",
      cuts: cutsResult.cuts,
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

    if (Array.isArray(req.body.variants)) {
      for (const variant of req.body.variants) {
        if (!variant.name || !variant.nameAr || !variant.material) continue;
        const vSlug = await ensureUniqueSlug(
          Fabric,
          variant.slug || variant.name,
          { fallback: "fabric" },
        );

        const variantCutsResult = await prepareFabricCutsInput(variant.cuts);
        if (!variantCutsResult.ok) {
          res.status(400).json({
            success: false,
            message: `Variant "${variant.name}": ${variantCutsResult.message}`,
          });
          return;
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
          cuts: variantCutsResult.cuts,
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

    res.status(201).json({
      success: true,
      item: await enrichFabricWithCuts(fabric),
    });
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
      cuts,
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
      fabric.slug = await ensureUniqueSlug(Fabric, slug, {
        excludeId: fabric._id,
        fallback: "fabric",
      });
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
    if (cuts !== undefined) {
      const cutsResult = await prepareFabricCutsInput(cuts);
      if (!cutsResult.ok) {
        res.status(400).json({ success: false, message: cutsResult.message });
        return;
      }
      fabric.cuts = cutsResult.cuts;
    }
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
            if (variant.slug && variant.slug.toLowerCase() !== existing.slug) {
              existing.slug = await ensureUniqueSlug(Fabric, variant.slug, {
                excludeId: existing._id,
                fallback: "fabric",
              });
            }
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
                res.status(400).json({
                  success: false,
                  message: `Variant "${variant.name || existing.name}": ${variantCutsResult.message}`,
                });
                return;
              }
              existing.cuts = variantCutsResult.cuts;
            }
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
          const vSlug = await ensureUniqueSlug(
            Fabric,
            variant.slug || variant.name,
            { fallback: "fabric" },
          );

          const variantCutsResult = await prepareFabricCutsInput(variant.cuts);
          if (!variantCutsResult.ok) {
            res.status(400).json({
              success: false,
              message: `Variant "${variant.name}": ${variantCutsResult.message}`,
            });
            return;
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
            cuts: variantCutsResult.cuts,
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

    const enrichedItem = await enrichFabricWithCuts(updatedFabric);
    const variants = await Fabric.find({ isVariantOf: updatedFabric._id });
    enrichedItem.variants = await Promise.all(
      variants.map((variant) => enrichFabricWithCuts(variant)),
    );

    res.json({ success: true, item: enrichedItem });
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

// GET /api/fabric/orders/retail — retail orders for this store:
// ready-made, add-ons, and fabric-by-meter (productId = Fabric._id, size = "Per Meter")
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

    const [storeProducts, storeFabrics, storeAddons] = await Promise.all([
      ReadyMadeProduct.find({
        $or: [{ fabricShopId: shop._id }, { ownerName: shop.name }],
      }).select("_id"),
      Fabric.find({
        $or: [{ listedByStore: req.user._id }, { fabricShopId: shop._id }],
      }).select("_id"),
      AddOn.find({
        $or: [{ fabricShopId: shop._id }, { ownerName: shop.name }],
      }).select("_id"),
    ]);

    const storeItemIds = [
      ...storeProducts.map((p) => p._id),
      ...storeFabrics.map((f) => f._id),
      ...storeAddons.map((a) => a._id),
    ];

    if (storeItemIds.length === 0) {
      res.json([]);
      return;
    }

    const orders = await RetailOrder.find({
      "orderItems.productId": { $in: storeItemIds },
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    const hydrated = await hydrateRetailOrders(orders);
    res.json(hydrated);
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
    if (respondIfShopNotReady(shop, res)) return;

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

    const slug = await ensureUniqueSlug(
      ReadyMadeProduct,
      req.body.slug || name || nameAr,
      { fallback: "ready-made" },
    );

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
    if (req.body.slug && req.body.slug !== product.slug) {
      product.slug = await ensureUniqueSlug(ReadyMadeProduct, req.body.slug, {
        excludeId: product._id,
        fallback: "ready-made",
      });
    }
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
function normalizeAddOnImages(images) {
  const cleaned = Array.isArray(images)
    ? images.map((img) => String(img || "").trim()).filter(Boolean)
    : [];
  return {
    images: cleaned,
    thumbnailImage: cleaned[0] || "",
  };
}

fabricPortalRouter.post(
  "/addons",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (respondIfShopNotReady(shop, res)) return;

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
      res.status(400).json({
        success: false,
        message: "At least one image is required",
      });
      return;
    }

    const slug = await ensureUniqueSlug(AddOn, name || nameAr, {
      fallback: "addon",
    });

    const addon = new AddOn({
      name,
      nameAr,
      slug,
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
        res.status(400).json({
          success: false,
          message: "At least one image is required",
        });
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
    const settings = await PlatformSettings.findOne({}).lean();
    const commissionPercent = resolveFabricCommissionPercent(settings);

    const ownerUserId = req.user._id;
    const ownerUserIdStr = ownerUserId.toString();
    const shopIdStr = shop?._id?.toString?.() || "";

    const [storeFabricIds, storeProducts, storeAddonIds] = await Promise.all([
      Fabric.find({
        $or: [
          { listedByStore: ownerUserId },
          ...(shop ? [{ fabricShopId: shop._id }] : []),
        ],
      }).select("_id cuts isActive name isVariantOf"),
      shop
        ? ReadyMadeProduct.find({
            $or: [
              { fabricShopId: shop._id, ownerName: { $ne: "MOTD Admin" } },
              { ownerName: shop.name },
            ],
          }).select("_id isActive availableFabricStock")
        : Promise.resolve([]),
      shop
        ? AddOn.find({
            $or: [
              { fabricShopId: shop._id, ownerName: { $ne: "MOTD Admin" } },
              { ownerName: shop.name },
            ],
          }).select("_id isActive stock")
        : Promise.resolve([]),
    ]);

    const storeFabricIdValues = storeFabricIds.map((f) => f._id);
    const storeFabricIdSet = new Set(
      storeFabricIdValues.map((id) => id.toString()),
    );
    const storeProductIdSet = new Set(
      storeProducts.map((p) => p._id.toString()),
    );
    const storeAddonIdValues = storeAddonIds.map((a) => a._id);
    const storeAddonIdSet = new Set(
      storeAddonIdValues.map((id) => id.toString()),
    );
    const storeRetailItemIds = [
      ...storeFabricIdValues,
      ...storeProducts.map((p) => p._id),
      ...storeAddonIdValues,
    ];

    const primaryMatch = {
      $or: [
        { fabricStoreId: ownerUserId },
        { "items.fabricStoreId": ownerUserId },
        ...(shopIdStr
          ? [{ fabricStoreId: shop._id }, { "items.fabricStoreId": shop._id }]
          : []),
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

    const isStoreOwnedItem = (item) => {
      const sid =
        item.fabricStoreId?._id?.toString?.() ||
        item.fabricStoreId?.toString?.() ||
        "";
      if (sid && (sid === ownerUserIdStr || (shopIdStr && sid === shopIdStr))) {
        return true;
      }
      const fabricId =
        item.fabricId?._id?.toString?.() || item.fabricId?.toString?.() || "";
      return Boolean(fabricId && storeFabricIdSet.has(fabricId));
    };

    const sumCustomFabricFee = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter(isStoreOwnedItem)
          .reduce((sum, item) => sum + (item.pricing?.fabricCost || 0), 0);
      }
      const rootSid =
        order.fabricStoreId?._id?.toString?.() ||
        order.fabricStoreId?.toString?.() ||
        "";
      const rootFabricId =
        order.fabricId?._id?.toString?.() || order.fabricId?.toString?.() || "";
      if (
        rootSid === ownerUserIdStr ||
        (shopIdStr && rootSid === shopIdStr) ||
        (rootFabricId && storeFabricIdSet.has(rootFabricId))
      ) {
        return order.pricing?.fabricCost || 0;
      }
      return 0;
    };

    const sumCustomPieces = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items.filter(isStoreOwnedItem).length;
      }
      return sumCustomFabricFee(order) > 0 ? 1 : 0;
    };

    // Retail lines belonging to this store: fabric-by-meter, ready-made, and add-ons.
    const isStoreRetailItem = (item) => {
      const pid =
        item.productId?._id?.toString?.() ||
        item.productId?.toString?.() ||
        "";
      if (!pid) return false;
      if (
        (item.kind === "fabric" ||
          item.cutId ||
          item.size === "Per Meter") &&
        storeFabricIdSet.has(pid)
      )
        return true;
      if (storeProductIdSet.has(pid) || storeAddonIdSet.has(pid)) return true;
      return false;
    };

    const sumRetailFabricFee = (order) =>
      (order.orderItems || [])
        .filter(isStoreRetailItem)
        .reduce(
          (sum, item) =>
            sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
          0,
        );

    const sumRetailPieces = (order) =>
      (order.orderItems || [])
        .filter((item) => {
          const pid =
            item.productId?._id?.toString?.() ||
            item.productId?.toString?.() ||
            "";
          return (
            (item.kind === "fabric" ||
              item.cutId ||
              item.size === "Per Meter") &&
            pid &&
            storeFabricIdSet.has(pid)
          );
        })
        .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    const [customInWindow, retailInWindow, recentCustom, recentRetail, settlement] =
      await Promise.all([
        CustomOrder.find({
          ...orderMatch,
          createdAt: { $gte: start, $lte: end },
        })
          .populate("userId", "name email")
          .sort({ createdAt: -1 })
          .lean(),
        storeRetailItemIds.length
          ? RetailOrder.find({
              "orderItems.productId": { $in: storeRetailItemIds },
              createdAt: { $gte: start, $lte: end },
            })
              .populate("userId", "name email")
              .sort({ createdAt: -1 })
              .lean()
          : Promise.resolve([]),
        CustomOrder.find(orderMatch)
          .populate("userId", "name email")
          .sort({ createdAt: -1 })
          .limit(12)
          .lean(),
        storeRetailItemIds.length
          ? RetailOrder.find({
              "orderItems.productId": { $in: storeRetailItemIds },
            })
              .populate("userId", "name email")
              .sort({ createdAt: -1 })
              .limit(12)
              .lean()
          : Promise.resolve([]),
        getFabricSettlement(shop, ownerUserId),
      ]);

    let fabricRevenue = 0;
    let piecesSold = 0;
    const statusMap = new Map();
    const fabricRevenueMap = new Map();

    for (const order of customInWindow) {
      const breakdown = splitMotdCommission(
        sumCustomFabricFee(order),
        commissionPercent,
      );
      fabricRevenue += breakdown.net;
      piecesSold += sumCustomPieces(order);
      const st = order.status || "unknown";
      statusMap.set(st, (statusMap.get(st) || 0) + 1);

      if (order.items && order.items.length > 0) {
        for (const item of order.items) {
          if (!isStoreOwnedItem(item)) continue;
          const name = item.fabricSnapshot?.name || "Unknown fabric";
          const itemSplit = splitMotdCommission(
            item.pricing?.fabricCost || 0,
            commissionPercent,
          );
          const prev = fabricRevenueMap.get(name) || { value: 0, count: 0 };
          fabricRevenueMap.set(name, {
            value: prev.value + itemSplit.net,
            count: prev.count + 1,
          });
        }
      } else if (order.fabricSnapshot?.name && sumCustomFabricFee(order) > 0) {
        const name = order.fabricSnapshot.name;
        const itemSplit = splitMotdCommission(
          order.pricing?.fabricCost || 0,
          commissionPercent,
        );
        const prev = fabricRevenueMap.get(name) || { value: 0, count: 0 };
        fabricRevenueMap.set(name, {
          value: prev.value + itemSplit.net,
          count: prev.count + 1,
        });
      }
    }

    for (const order of retailInWindow) {
      const gross = sumRetailFabricFee(order);
      if (gross <= 0) continue;
      const breakdown = splitMotdCommission(gross, commissionPercent);
      fabricRevenue += breakdown.net;
      piecesSold += sumRetailPieces(order);
      const st = order.status || "unknown";
      statusMap.set(st, (statusMap.get(st) || 0) + 1);

      for (const item of order.orderItems || []) {
        if (!isStoreRetailItem(item)) continue;
        const name = item.name || "Unknown item";
        const itemGross =
          (Number(item.price) || 0) * (Number(item.quantity) || 0);
        const itemSplit = splitMotdCommission(itemGross, commissionPercent);
        const prev = fabricRevenueMap.get(name) || { value: 0, count: 0 };
        fabricRevenueMap.set(name, {
          value: prev.value + itemSplit.net,
          count: prev.count + 1,
        });
      }
    }

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

    const [monthlyCustom, monthlyRetail] = await Promise.all([
      CustomOrder.find({
        ...orderMatch,
        createdAt: { $gte: rangeStart, $lte: end },
      }).lean(),
      storeRetailItemIds.length
        ? RetailOrder.find({
            "orderItems.productId": { $in: storeRetailItemIds },
            createdAt: { $gte: rangeStart, $lte: end },
          }).lean()
        : Promise.resolve([]),
    ]);

    const monthlyMap = new Map();
    for (const order of monthlyCustom) {
      const d = new Date(order.createdAt);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      monthlyMap.set(
        key,
        (monthlyMap.get(key) || 0) +
          splitMotdCommission(sumCustomFabricFee(order), commissionPercent).net,
      );
    }
    for (const order of monthlyRetail) {
      const d = new Date(order.createdAt);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      const gross = sumRetailFabricFee(order);
      if (gross <= 0) continue;
      monthlyMap.set(
        key,
        (monthlyMap.get(key) || 0) +
          splitMotdCommission(gross, commissionPercent).net,
      );
    }

    const monthlyData = monthStarts.map((d) => ({
      month: d.toLocaleString("en-US", { month: "short" }),
      revenue:
        monthlyMap.get(`${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`) || 0,
    }));

    const LOW_STOCK = LOW_FABRIC_CUT_STOCK_THRESHOLD;
    // Match catalog pages: parent fabrics only (variants are not separate listings),
    // plus ready-made and add-ons.
    const isParentFabric = (f) => !f.isVariantOf;
    const activeFabricSkus = storeFabricIds.filter(
      (f) => f.isActive !== false && isParentFabric(f),
    ).length;
    const activeReadyMadeSkus = storeProducts.filter(
      (p) => p.isActive !== false,
    ).length;
    const activeAddonSkus = storeAddonIds.filter(
      (a) => a.isActive !== false,
    ).length;
    const activeSkus =
      activeFabricSkus + activeReadyMadeSkus + activeAddonSkus;
    const lowStock =
      countLowStockCutRowsFromFabrics(
        storeFabricIds.filter(
          (f) => isParentFabric(f) && f.isActive !== false,
        ),
        LOW_STOCK,
      ) +
      storeProducts.filter(
        (p) =>
          (p.availableFabricStock || 0) <= LOW_STOCK && p.isActive !== false,
      ).length +
      storeAddonIds.filter(
        (a) => (a.stock || 0) <= LOW_STOCK && a.isActive !== false,
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

    const mapRecentOrder = (order, net, type) => {
      const orderId = order._id.toString();
      const paidForOrder = Number(settlement.paidByOrderId.get(orderId)) || 0;
      const pendingForOrder = Math.max(
        0,
        Number((net - paidForOrder).toFixed(2)),
      );
      const paymentStatus =
        net <= 0
          ? order.status
          : pendingForOrder <= 0
            ? "paid"
            : paidForOrder > 0
              ? "partially_paid"
              : "pending_payment";
      return {
        id: orderId,
        amount: net,
        status: paymentStatus,
        date: order.createdAt ? new Date(order.createdAt).toISOString() : "",
        type,
      };
    };

    const recentOrders = [
      ...recentCustom.map((o) => {
        const net = splitMotdCommission(
          sumCustomFabricFee(o),
          commissionPercent,
        ).net;
        return mapRecentOrder(o, net, "custom");
      }),
      ...recentRetail.map((o) => {
        const net = splitMotdCommission(
          sumRetailFabricFee(o),
          commissionPercent,
        ).net;
        return mapRecentOrder(o, net, "retail");
      }),
    ]
      .filter((o) => o.amount > 0)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    const mapPricingOrder = (order, net, kind) => {
      const orderId = order._id.toString();
      const paidForOrder = Number(settlement.paidByOrderId.get(orderId)) || 0;
      const pendingForOrder = Math.max(
        0,
        Number((net - paidForOrder).toFixed(2)),
      );
      const paymentStatus =
        net <= 0
          ? "pending"
          : pendingForOrder <= 0
            ? "paid"
            : paidForOrder > 0
              ? "partially_paid"
              : "pending_payment";
      return {
        _id: order._id,
        userId: order.userId,
        createdAt: order.createdAt,
        status: order.status,
        kind,
        payoutNet: net,
        payoutPaid: paidForOrder,
        payoutPending: pendingForOrder,
        paymentStatus,
      };
    };

    const pricingOrders = [
      ...recentCustom.map((o) =>
        mapPricingOrder(
          o,
          splitMotdCommission(sumCustomFabricFee(o), commissionPercent).net,
          "custom",
        ),
      ),
      ...recentRetail.map((o) =>
        mapPricingOrder(
          o,
          splitMotdCommission(sumRetailFabricFee(o), commissionPercent).net,
          "retail",
        ),
      ),
    ]
      .filter((o) => o.payoutNet > 0)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 20);

    const orderCount =
      customInWindow.length +
      retailInWindow.filter((o) => sumRetailFabricFee(o) > 0).length;

    // Attribute admin releases only via per-order settlement rows.
    // Do NOT fall back to shop-level paidTotal — that wrongly marks the
    // current timeframe as paid from historical/unattributed releases.
    let paidInWindow = 0;
    for (const order of customInWindow) {
      const orderId = String(order._id);
      const net = splitMotdCommission(
        sumCustomFabricFee(order),
        commissionPercent,
      ).net;
      if (net <= 0) continue;
      const paidForOrder = Number(settlement.paidByOrderId.get(orderId)) || 0;
      paidInWindow += Math.min(paidForOrder, net);
    }
    for (const order of retailInWindow) {
      const gross = sumRetailFabricFee(order);
      if (gross <= 0) continue;
      const orderId = String(order._id);
      const net = splitMotdCommission(gross, commissionPercent).net;
      if (net <= 0) continue;
      const paidForOrder = Number(settlement.paidByOrderId.get(orderId)) || 0;
      paidInWindow += Math.min(paidForOrder, net);
    }
    paidInWindow = Number(paidInWindow.toFixed(2));
    const pendingInWindow = Math.max(
      0,
      Number((fabricRevenue - paidInWindow).toFixed(2)),
    );
    const payoutStatus =
      fabricRevenue <= 0
        ? null
        : pendingInWindow > 0
          ? "pending"
          : "approved";
    const kpiPayoutValue =
      pendingInWindow > 0 ? pendingInWindow : paidInWindow;

    res.json({
      success: true,
      currency: "AED",
      fabricShopId: shop?._id?.toString?.() || ownerUserIdStr,
      // Intentionally omit commissionPercent / MOTD earnings from fabric clients.
      generatedAt: new Date().toISOString(),
      kpis: {
        fabricRevenue: Number(kpiPayoutValue.toFixed(2)),
        orderCount,
        piecesSold,
        activeSkus,
        lowStock,
        paid: paidInWindow,
        pending: pendingInWindow,
        netDue: Number(fabricRevenue.toFixed(2)),
      },
      monthlyData,
      statusBreakdown,
      payout: {
        netDue: Number(fabricRevenue.toFixed(2)),
        paid: paidInWindow,
        pending: pendingInWindow,
        status: payoutStatus,
      },
      topFabrics,
      recentOrders,
      pricingOrders,
    });
  }),
);

// ==========================================
// GET /api/fabric/payout-requests
// List this store's payout requests + unpaid summary
// ==========================================
fabricPortalRouter.get(
  "/payout-requests",
  expressAsyncHandler(async (req, res) => {
    const breakdown = await computeFabricUnpaidBreakdown(req.user._id);

    // Heal stale pending requests after a manual admin release (no request approve).
    if (breakdown.pendingRequest && breakdown.amount <= 0) {
      const staleRequests = await PartnerPayoutRequest.find({
        partnerKind: "fabric",
        status: "pending",
        $or: [
          { partnerKey: breakdown.identity.partnerKey },
          { requestedBy: req.user._id },
        ],
      });

      for (const requestDoc of staleRequests) {
        requestDoc.status = "approved";
        requestDoc.reviewedAt = new Date();
        requestDoc.adminNote = "Fulfilled by payment release";
        await requestDoc.save();

        await ensurePartnerPayoutReleasedNotification({
          partnerKind: "fabric",
          amount: requestDoc.amount,
          partnerKey: requestDoc.partnerKey,
          partnerId: requestDoc.partnerId,
          recipientUserId: requestDoc.requestedBy || req.user._id,
          requestId: requestDoc._id,
          payoutId: requestDoc.payoutId,
          approvedRequest: true,
        });
      }

      breakdown.pendingRequest = null;
    }

    const items = await PartnerPayoutRequest.find({
      partnerKind: "fabric",
      $or: [
        { requestedBy: req.user._id },
        { partnerKey: breakdown.identity.partnerKey },
      ],
    })
      .sort({ requestedAt: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      currency: "AED",
      unpaidAmount: breakdown.amount,
      unpaidOrderCount: breakdown.orders.length,
      pendingRequest: breakdown.pendingRequest,
      identity: breakdown.identity,
      items,
    });
  }),
);

// ==========================================
// POST /api/fabric/payout-requests
// Fabric store requests payout for all unpaid orders
// ==========================================
fabricPortalRouter.post(
  "/payout-requests",
  expressAsyncHandler(async (req, res) => {
    const note =
      typeof req.body?.note === "string" ? req.body.note.trim().slice(0, 500) : "";

    const breakdown = await computeFabricUnpaidBreakdown(req.user._id);

    if (breakdown.pendingRequest) {
      res.status(409).send({
        message:
          "You already have a pending payout request. Wait for MOTD to review it.",
        pendingRequest: breakdown.pendingRequest,
      });
      return;
    }

    if (breakdown.amount <= 0 || breakdown.orders.length === 0) {
      res.status(400).send({
        message: "No unpaid payout balance available to request.",
      });
      return;
    }

    const { identity } = breakdown;
    const requestDoc = await PartnerPayoutRequest.create({
      partnerKey: identity.partnerKey,
      partnerKind: "fabric",
      partnerId: identity.partnerId,
      partnerName: identity.partnerName,
      payeeName: identity.payeeName,
      amount: breakdown.amount,
      currency: "AED",
      orders: breakdown.orders.map((o) => ({
        orderId: o.orderId,
        orderType: o.orderType,
        amount: o.amount,
      })),
      status: "pending",
      note,
      requestedBy: req.user._id,
      requestedAt: new Date(),
    });

    const amountLabel = new Intl.NumberFormat("en-AE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(breakdown.amount);

    await createNotification({
      type: "fabric_payout_requested",
      title: `Payout request — ${identity.partnerName}`,
      message: `${identity.partnerName} requested AED ${amountLabel} for ${breakdown.orders.length} order${
        breakdown.orders.length === 1 ? "" : "s"
      }. Review it in Payments.`,
      audience: "admin",
      createdBy: req.user._id,
      dedupeKey: `admin:fabric_payout_requested:${requestDoc._id}`,
    });

    res.status(201).json({
      success: true,
      request: requestDoc,
    });
  }),
);

// ==========================================
// DELETE /api/fabric/payout-requests/:id
// Remove own reviewed request from history
// ==========================================
fabricPortalRouter.delete(
  "/payout-requests/:id",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const requestDoc = await PartnerPayoutRequest.findById(id);
    if (!requestDoc) {
      res.status(404).send({ message: "Payout request not found" });
      return;
    }

    if (requestDoc.partnerKind !== "fabric") {
      res.status(403).send({ message: "Not allowed to delete this request" });
      return;
    }

    const breakdown = await computeFabricUnpaidBreakdown(req.user._id);
    const isOwn =
      requestDoc.partnerKey === breakdown.identity.partnerKey ||
      String(requestDoc.requestedBy) === String(req.user._id);

    if (!isOwn) {
      res.status(403).send({ message: "Not allowed to delete this request" });
      return;
    }

    if (requestDoc.status === "pending") {
      res.status(400).send({
        message:
          "Pending requests cannot be deleted. Wait for MOTD to review them.",
      });
      return;
    }

    await requestDoc.deleteOne();
    res.send({ success: true, message: "Request deleted", id: String(id) });
  }),
);

export default fabricPortalRouter;
