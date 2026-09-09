// routes/filterRoutes.js
import express from "express";
import Category from "../models/Category.js";
import Material from "../models/Material.js";
import Pattern from "../models/Pattern.js";
import Season from "../models/Season.js";
import Tag from "../models/Tag.js";
import Cut from "../models/Cut.js";
import { cutValueToMeters, metersToWar } from "../utils/fabricUnits.js";

const filterRoutes = express.Router();

// GET /api/filters/categories
filterRoutes.get("/categories", async (req, res) => {
  try {
    const filter = { isActive: true };
    const domain = String(req.query.domain || "").trim();
    if (domain) {
      filter.domain = { $in: [domain, "general"] };
    }

    const categories = await Category.find(filter)
      .sort({ sortOrder: 1, name: 1 })
      .select("name nameAr domain isActive sortOrder");

    res.json(categories);
  } catch (error) {
    console.error("GET /api/filters/categories error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch categories",
    });
  }
});

// GET /api/filters/materials
filterRoutes.get("/materials", async (req, res) => {
  try {
    const filter = { isActive: true };
    const domain = String(req.query.domain || "").trim();
    if (domain) {
      filter.domain = { $in: [domain, "general"] };
    }

    const materials = await Material.find(filter)
      .sort({ name: 1 })
      .select("name nameAr domain isActive");

    res.json(materials);
  } catch (error) {
    console.error("GET /api/filters/materials error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch materials",
    });
  }
});

// GET /api/filters/patterns
filterRoutes.get("/patterns", async (req, res) => {
  try {
    const filter = { isActive: true };
    const domain = String(req.query.domain || "").trim();
    if (domain) {
      filter.domain = { $in: [domain, "general"] };
    }

    const patterns = await Pattern.find(filter)
      .sort({ name: 1 })
      .select("name nameAr domain isActive");

    res.json(patterns);
  } catch (error) {
    console.error("GET /api/filters/patterns error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch patterns",
    });
  }
});

// GET /api/filters/seasons
filterRoutes.get("/seasons", async (req, res) => {
  try {
    const filter = { isActive: true };
    const domain = String(req.query.domain || "").trim();
    if (domain) {
      filter.domain = { $in: [domain, "general"] };
    }

    const seasons = await Season.find(filter)
      .sort({ name: 1 })
      .select("name nameAr domain isActive");

    res.json(seasons);
  } catch (error) {
    console.error("GET /api/filters/seasons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch seasons",
    });
  }
});

// GET /api/filters/cuts
filterRoutes.get("/cuts", async (req, res) => {
  try {
    const cuts = await Cut.find({ isActive: true })
      .sort({ value: 1, name: 1 })
      .select("name nameAr value unit isActive");

    res.json(
      cuts.map((cut) => {
        const plain = cut.toObject();
        const metersEquivalent = cutValueToMeters(plain.value, plain.unit);
        return {
          ...plain,
          metersEquivalent,
          warEquivalent: metersToWar(metersEquivalent),
        };
      }),
    );
  } catch (error) {
    console.error("GET /api/filters/cuts error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cuts",
    });
  }
});

// GET /api/filters/tags
filterRoutes.get("/tags", async (req, res) => {
  try {
    const filter = { isActive: true };
    const domain = String(req.query.domain || "").trim();
    if (domain) {
      filter.domain = { $in: [domain, "general"] };
    }

    const tags = await Tag.find(filter)
      .sort({ name: 1 })
      .select("name nameAr domain isActive");

    res.json(tags);
  } catch (error) {
    console.error("GET /api/filters/tags error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tags",
    });
  }
});

// GET /api/filters/all - fetch all filters in one request
filterRoutes.get("/all", async (req, res) => {
  try {
    const [categories, materials, patterns, seasons, tags] = await Promise.all([
      Category.find({ isActive: true })
        .sort({ sortOrder: 1, name: 1 })
        .select("name nameAr isActive sortOrder"),
      Material.find({ isActive: true })
        .sort({ name: 1 })
        .select("name nameAr isActive"),
      Pattern.find({ isActive: true })
        .sort({ name: 1 })
        .select("name nameAr isActive"),
      Season.find({ isActive: true })
        .sort({ name: 1 })
        .select("name nameAr isActive"),
      Tag.find({ isActive: true })
        .sort({ name: 1 })
        .select("name nameAr isActive"),
    ]);

    res.json({
      success: true,
      data: {
        categories,
        materials,
        patterns,
        seasons,
        tags,
      },
    });
  } catch (error) {
    console.error("GET /api/filters/all error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch filters",
    });
  }
});

export default filterRoutes;
