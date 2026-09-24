import express from "express";
import expressAsyncHandler from "express-async-handler";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";
import ActivityLog from "../models/ActivityLog.js";
import { requireActivityLogSecret } from "../middleware/activityLogAuth.js";
import {
  categoryLabel,
  listCategoryOptions,
} from "../services/activityLogService.js";

const activityLogRouter = express.Router();

const activityLogLimiter = rateLimit({
  // Live viewer polls every few seconds — allow sustained internal monitoring.
  windowMs: 15 * 60 * 1000,
  max: 900,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  statusCode: 429,
  message: "Too many activity log requests",
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json({
      success: false,
      message: "Too many activity log requests, try again later",
    });
  },
});

activityLogRouter.use(activityLogLimiter);
activityLogRouter.use(requireActivityLogSecret);

function parseDate(value) {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildActivityFilter(query = {}) {
  const filter = {};

  if (query.category) {
    filter.category = String(query.category).trim();
  }
  if (query.actorRole) {
    filter.actorRole = String(query.actorRole).trim();
  }
  if (query.success === "true") filter.success = true;
  if (query.success === "false") filter.success = false;

  if (query.actorId && mongoose.Types.ObjectId.isValid(query.actorId)) {
    filter.actorId = query.actorId;
  }

  const from = parseDate(query.from);
  const to = parseDate(query.to);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) filter.createdAt.$lte = to;
  }

  const q = String(query.q || "").trim();
  if (q) {
    const rx = new RegExp(escapeRegex(q), "i");
    filter.$or = [
      { summary: rx },
      { actorEmail: rx },
      { actorName: rx },
      { action: rx },
      { path: rx },
      { resourceId: rx },
    ];
  }

  return filter;
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

activityLogRouter.get(
  "/meta",
  expressAsyncHandler(async (_req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.json({
      success: true,
      categories: listCategoryOptions(),
    });
  }),
);

activityLogRouter.get(
  "/export",
  expressAsyncHandler(async (req, res) => {
    const filter = buildActivityFilter(req.query);
    const limit = Math.min(5000, Math.max(1, Number(req.query.limit) || 2000));
    const items = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const header = [
      "createdAt",
      "actorName",
      "actorEmail",
      "actorRole",
      "action",
      "category",
      "summary",
      "method",
      "path",
      "resourceType",
      "resourceId",
      "success",
      "statusCode",
      "ip",
    ];

    const lines = [header.join(",")];
    for (const item of items) {
      lines.push(
        [
          item.createdAt ? new Date(item.createdAt).toISOString() : "",
          item.actorName,
          item.actorEmail,
          item.actorRole,
          item.action,
          item.category,
          item.summary,
          item.method,
          item.path,
          item.resourceType,
          item.resourceId,
          item.success,
          item.statusCode,
          item.ip,
        ]
          .map(csvEscape)
          .join(","),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    res.set("Cache-Control", "private, no-store");
    res.set("Content-Type", "text/csv; charset=utf-8");
    res.set(
      "Content-Disposition",
      `attachment; filename="motd-activity-${stamp}.csv"`,
    );
    res.send(lines.join("\n"));
  }),
);

activityLogRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 40));
    const skip = (page - 1) * limit;

    const filter = buildActivityFilter(req.query);

    const [total, items, todayCount, actorAgg] = await Promise.all([
      ActivityLog.countDocuments(filter),
      ActivityLog.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments({
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      }),
      ActivityLog.aggregate([
        {
          $match: {
            createdAt: {
              $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
            actorEmail: { $ne: "" },
          },
        },
        {
          $group: {
            _id: "$actorEmail",
            name: { $last: "$actorName" },
            role: { $last: "$actorRole" },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 12 },
      ]),
    ]);

    res.set("Cache-Control", "private, no-store");
    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      stats: {
        todayCount,
        matchedCount: total,
        topActors: actorAgg.map((row) => ({
          email: row._id,
          name: row.name || "",
          role: row.role || "admin",
          count: row.count,
        })),
      },
      items: items.map((item) => ({
        ...item,
        categoryLabel: categoryLabel(item.category),
      })),
    });
  }),
);

activityLogRouter.get(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }
    const item = await ActivityLog.findById(req.params.id).lean();
    if (!item) {
      res.status(404).json({ success: false, message: "Not found" });
      return;
    }
    res.set("Cache-Control", "private, no-store");
    res.json({
      success: true,
      item: {
        ...item,
        categoryLabel: categoryLabel(item.category),
      },
    });
  }),
);

activityLogRouter.delete(
  "/",
  expressAsyncHandler(async (req, res) => {
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const ids = rawIds
      .map((id) => String(id || "").trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (!ids.length) {
      res.status(400).json({
        success: false,
        message: "Provide at least one valid activity log id",
      });
      return;
    }

    const result = await ActivityLog.deleteMany({ _id: { $in: ids } });
    res.set("Cache-Control", "private, no-store");
    res.json({
      success: true,
      deletedCount: result.deletedCount || 0,
    });
  }),
);

activityLogRouter.delete(
  "/:id",
  expressAsyncHandler(async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ success: false, message: "Invalid id" });
      return;
    }
    const deleted = await ActivityLog.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      res.status(404).json({ success: false, message: "Not found" });
      return;
    }
    res.set("Cache-Control", "private, no-store");
    res.json({ success: true, deletedCount: 1, id: req.params.id });
  }),
);

export default activityLogRouter;
