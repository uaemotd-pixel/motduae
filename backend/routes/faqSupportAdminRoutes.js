import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import FaqSupportRequest from "../models/FaqSupportRequest.js";

const faqSupportAdminRouter = express.Router();

const STATUSES = ["new", "contacted", "closed"];
const CATEGORIES = ["general", "damage_claim", "tailor_issue"];

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeQuery(doc) {
  let category = "general";
  if (doc.category === "damage_claim") category = "damage_claim";
  else if (doc.category === "tailor_issue") category = "tailor_issue";

  return {
    id: String(doc._id),
    referenceNumber: doc.referenceNumber || "",
    name: doc.name || "",
    email: doc.email || "",
    concern: doc.concern || "",
    category,
    publicOrderId: doc.publicOrderId || "",
    orderType:
      doc.orderType === "retail"
        ? "retail"
        : doc.orderType === "custom"
          ? "custom"
          : "",
    damageKind: doc.damageKind || "",
    partnerIssueKind: doc.partnerIssueKind || "",
    source: doc.source || "faq_chatbot",
    tailorShopId: doc.tailorShopId ? String(doc.tailorShopId) : "",
    locale: doc.locale === "ar" ? "ar" : "en",
    status: STATUSES.includes(doc.status) ? doc.status : "new",
    createdAt: doc.createdAt,
  };
}

faqSupportAdminRouter.get(
  "/",
  expressAsyncHandler(async (req, res) => {
    const statusRaw = String(req.query.status || "all").toLowerCase();
    const status = STATUSES.includes(statusRaw) ? statusRaw : "all";
    const categoryRaw = String(req.query.category || "all").toLowerCase();
    const category = CATEGORIES.includes(categoryRaw) ? categoryRaw : "all";
    const search =
      typeof req.query.search === "string" ? req.query.search.trim() : "";
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const searchFilter = search
      ? {
          $or: [
            "name",
            "email",
            "referenceNumber",
            "publicOrderId",
            "concern",
            "partnerIssueKind",
            "damageKind",
          ].map((field) => ({
            [field]: new RegExp(escapeRegex(search), "i"),
          })),
        }
      : {};

    const categoryFilter =
      category === "all" ? {} : { category };

    const baseFilter = { ...searchFilter, ...categoryFilter };
    const listFilter =
      status === "all" ? baseFilter : { ...baseFilter, status };

    const [statusGrouped, categoryGrouped, total, docs] = await Promise.all([
      FaqSupportRequest.aggregate([
        { $match: baseFilter },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      FaqSupportRequest.aggregate([
        { $match: searchFilter },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      FaqSupportRequest.countDocuments(listFilter),
      FaqSupportRequest.find(listFilter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const counts = { new: 0, contacted: 0, closed: 0, all: 0 };
    for (const row of statusGrouped) {
      if (row._id in counts) counts[row._id] = row.count;
      counts.all += row.count;
    }

    const categoryCounts = {
      all: 0,
      general: 0,
      damage_claim: 0,
      tailor_issue: 0,
    };
    for (const row of categoryGrouped) {
      const key = CATEGORIES.includes(row._id) ? row._id : "general";
      categoryCounts[key] += row.count;
      categoryCounts.all += row.count;
    }

    res.json({
      success: true,
      items: docs.map(serializeQuery),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 0,
      counts,
      categoryCounts,
    });
  }),
);

faqSupportAdminRouter.patch(
  "/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { id } = req.params;
    const nextStatus = String(req.body?.status || "").toLowerCase();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ message: "Invalid query id" });
      return;
    }
    if (!STATUSES.includes(nextStatus)) {
      res.status(400).json({ message: "Invalid status" });
      return;
    }

    const updated = await FaqSupportRequest.findByIdAndUpdate(
      id,
      { status: nextStatus },
      { new: true, runValidators: true },
    ).lean();

    if (!updated) {
      res.status(404).json({ message: "Query not found" });
      return;
    }

    res.json({ success: true, item: serializeQuery(updated) });
  }),
);

export default faqSupportAdminRouter;
