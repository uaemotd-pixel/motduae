import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Design from "../models/Design.js";
import TailorShop from "../models/TailorShop.js";
import { respondIfShopNotReady } from "../utils/shopReady.js";
import {
  applyCreateDefaults,
  applyMinCutToDesignData,
  assignUniqueDesignSlug,
  cleanupAllDesignImages,
  cleanupRemovedDesignImages,
  formatDesign,
  pickDesignFields,
  validateDesignPayload,
} from "../utils/designPayload.js";

const tailorDesignRouter = express.Router();

const resolveOwnShop = async (req, res) => {
  const shop = await TailorShop.findOne({ ownerId: req.user._id });
  if (!shop) {
    res.status(404).json({
      success: false,
      message: "Tailor shop not found",
    });
    return null;
  }
  return shop;
};

const findOwnDesign = async (shopId, designId, res) => {
  if (!mongoose.Types.ObjectId.isValid(designId)) {
    res.status(404).json({
      success: false,
      message: "Design not found",
    });
    return null;
  }

  const design = await Design.findOne({
    _id: designId,
    tailorShopId: shopId,
  });

  if (!design) {
    res.status(404).json({
      success: false,
      message: "Design not found",
    });
    return null;
  }

  return design;
};

// GET /api/tailor/designs — list own shop designs
tailorDesignRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const designs = await Design.find({ tailorShopId: shop._id }).sort({
      createdAt: -1,
    });

    res.json({
      success: true,
      items: designs.map(formatDesign),
      total: designs.length,
    });
  }),
);

// POST /api/tailor/designs — create design for own shop
tailorDesignRouter.post(
  "/",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;
    if (respondIfShopNotReady(shop, res)) return;

    const data = pickDesignFields(req.body);
    await applyCreateDefaults(data);

    const validationError = validateDesignPayload(data, { requireCore: true });
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    const cutError = await applyMinCutToDesignData(data);
    if (cutError) {
      res.status(400).json({
        success: false,
        message: cutError,
      });
      return;
    }

    await assignUniqueDesignSlug(data, shop._id);

    const design = await Design.create({
      ...data,
      tailorShopId: shop._id,
    });

    res.status(201).json({
      success: true,
      item: formatDesign(design),
    });
  }),
);

// PUT /api/tailor/designs/:id — update own design
tailorDesignRouter.put(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const design = await findOwnDesign(shop._id, req.params.id, res);
    if (!design) return;

    const data = pickDesignFields(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: "No design fields provided to update",
      });
      return;
    }

    const validationError = validateDesignPayload(data);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    const nextMinAge =
      data.minAge !== undefined ? data.minAge : Number(design.minAge) || 0;
    const nextMaxAge =
      data.maxAge !== undefined ? data.maxAge : Number(design.maxAge) || 0;
    if (nextMaxAge < nextMinAge) {
      res.status(400).json({
        success: false,
        message: "Max age must be greater than or equal to min age",
      });
      return;
    }

    if (data.minCutId) {
      const cutError = await applyMinCutToDesignData(data);
      if (cutError) {
        res.status(400).json({
          success: false,
          message: cutError,
        });
        return;
      }
    }

    if (data.slug && data.slug !== design.slug) {
      await assignUniqueDesignSlug(data, shop._id, { excludeId: design._id });
    }

    const previousImages = [...(design.images || [])];

    Object.assign(design, data);
    const updatedDesign = await design.save();

    await cleanupRemovedDesignImages(
      previousImages,
      updatedDesign.images || [],
    );

    res.json({
      success: true,
      item: formatDesign(updatedDesign),
    });
  }),
);

// DELETE /api/tailor/designs/:id — delete own design
tailorDesignRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    const shop = await resolveOwnShop(req, res);
    if (!shop) return;

    const design = await findOwnDesign(shop._id, req.params.id, res);
    if (!design) return;

    await cleanupAllDesignImages(design.images || []);
    await design.deleteOne();

    res.json({
      success: true,
      message: "Design deleted successfully",
    });
  }),
);

export default tailorDesignRouter;
