// routes/filterRoutes.js
import express from "express";
import Category from "../models/Category.js";
import Material from "../models/Material.js";
import Pattern from "../models/Pattern.js";
import Season from "../models/Season.js";
import Tag from "../models/Tag.js";

const filterRoutes = express.Router();

// GET /api/filters/categories
filterRoutes.get("/categories", async (req, res) => {
  try {
    const categories = await Category.find({
      isActive: true,
    })
      .sort({ sortOrder: 1, name: 1 })
      .select("name nameAr isActive sortOrder");

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
    const materials = await Material.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name nameAr isActive");

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
    const patterns = await Pattern.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name nameAr isActive");

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
    const seasons = await Season.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name nameAr isActive");

    res.json(seasons);
  } catch (error) {
    console.error("GET /api/filters/seasons error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch seasons",
    });
  }
});

// GET /api/filters/tags
filterRoutes.get("/tags", async (req, res) => {
  try {
    const tags = await Tag.find({
      isActive: true,
    })
      .sort({ name: 1 })
      .select("name nameAr isActive");

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
