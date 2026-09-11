import mongoose from "mongoose";
import TailorShop from "../models/TailorShop.js";
import FabricShop from "../models/FabricShop.js";
import { isAuth } from "../middleware/auth.js";
import {
  findOrCreateCustomer,
  isReviewCustomerRole,
  toObjectIdOrNull,
} from "../services/reviewTargets.js";

const FAVOURITE_SHOP_SELECT =
  "_id slug name nameAr description descriptionAr logo coverImage location city rating reviewCount";

const MAX_FAVOURITES_PER_TYPE = 50;

function denyUnlessCustomer(req, res) {
  if (!isReviewCustomerRole(req.user)) {
    res.status(403).json({
      success: false,
      message: "Only customers can manage favourites",
    });
    return true;
  }
  if (req.user?.isGuest) {
    res.status(403).json({
      success: false,
      message: "Sign in with a customer account to save favourites",
    });
    return true;
  }
  return false;
}

function normalizeType(raw) {
  const value = String(raw || "")
    .trim()
    .toLowerCase();
  if (value === "tailor" || value === "tailorshop") return "tailor";
  if (
    value === "fabric" ||
    value === "fabricshop" ||
    value === "brand" ||
    value === "store"
  ) {
    return "fabricShop";
  }
  return null;
}

function fieldForType(type) {
  return type === "tailor" ? "favouriteTailors" : "favouriteFabricShops";
}

function modelForType(type) {
  return type === "tailor" ? TailorShop : FabricShop;
}

function toFavouriteCard(shop) {
  if (!shop) return null;
  const obj = typeof shop.toObject === "function" ? shop.toObject() : shop;
  return {
    _id: String(obj._id),
    slug: obj.slug || "",
    name: obj.name || "",
    nameAr: obj.nameAr || "",
    description: obj.description || "",
    descriptionAr: obj.descriptionAr || "",
    logo: obj.logo || "",
    coverImage: obj.coverImage || "",
    location: obj.location || "",
    city: obj.city || "",
    rating: obj.rating ?? 0,
    reviewCount: obj.reviewCount ?? 0,
  };
}

export function registerCustomerFavouriteRoutes(customerRouter) {
  customerRouter.get("/favourites/ids", isAuth, async (req, res) => {
    try {
      if (denyUnlessCustomer(req, res)) return;

      const customer = await findOrCreateCustomer(req.user);
      res.json({
        success: true,
        tailorIds: (customer.favouriteTailors || []).map(String),
        fabricShopIds: (customer.favouriteFabricShops || []).map(String),
      });
    } catch (error) {
      console.error("GET /api/customer/favourites/ids error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to load favourite ids",
      });
    }
  });

  customerRouter.get("/favourites", isAuth, async (req, res) => {
    try {
      if (denyUnlessCustomer(req, res)) return;

      const customer = await findOrCreateCustomer(req.user);
      await customer.populate([
        { path: "favouriteTailors", select: FAVOURITE_SHOP_SELECT },
        { path: "favouriteFabricShops", select: FAVOURITE_SHOP_SELECT },
      ]);

      res.json({
        success: true,
        favouriteTailors: (customer.favouriteTailors || [])
          .map(toFavouriteCard)
          .filter(Boolean),
        favouriteFabricShops: (customer.favouriteFabricShops || [])
          .map(toFavouriteCard)
          .filter(Boolean),
      });
    } catch (error) {
      console.error("GET /api/customer/favourites error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to load favourites",
      });
    }
  });

  customerRouter.post("/favourites", isAuth, async (req, res) => {
    try {
      if (denyUnlessCustomer(req, res)) return;

      const type = normalizeType(req.body?.type);
      const shopId = toObjectIdOrNull(req.body?.id);
      if (!type || !shopId) {
        return res.status(400).json({
          success: false,
          message: "Valid type and id are required",
        });
      }

      const Model = modelForType(type);
      const shop = await Model.findById(shopId).select("_id").lean();
      if (!shop) {
        return res.status(404).json({
          success: false,
          message: "Shop not found",
        });
      }

      const customer = await findOrCreateCustomer(req.user);
      const field = fieldForType(type);
      const existing = (customer[field] || []).map(String);
      if (existing.includes(String(shopId))) {
        return res.json({
          success: true,
          favourited: true,
          alreadySaved: true,
        });
      }
      if (existing.length >= MAX_FAVOURITES_PER_TYPE) {
        return res.status(400).json({
          success: false,
          message: `You can save up to ${MAX_FAVOURITES_PER_TYPE} favourites`,
        });
      }

      customer[field].push(shopId);
      await customer.save();

      res.status(201).json({
        success: true,
        favourited: true,
      });
    } catch (error) {
      console.error("POST /api/customer/favourites error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to save favourite",
      });
    }
  });

  customerRouter.delete("/favourites/:type/:id", isAuth, async (req, res) => {
    try {
      if (denyUnlessCustomer(req, res)) return;

      const type = normalizeType(req.params.type);
      const shopId = toObjectIdOrNull(req.params.id);
      if (!type || !shopId) {
        return res.status(400).json({
          success: false,
          message: "Valid type and id are required",
        });
      }

      const customer = await findOrCreateCustomer(req.user);
      const field = fieldForType(type);
      const before = (customer[field] || []).length;
      customer[field] = (customer[field] || []).filter(
        (id) => String(id) !== String(shopId),
      );

      if (customer[field].length !== before) {
        await customer.save();
      }

      res.json({
        success: true,
        favourited: false,
      });
    } catch (error) {
      console.error("DELETE /api/customer/favourites error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to remove favourite",
      });
    }
  });
}
