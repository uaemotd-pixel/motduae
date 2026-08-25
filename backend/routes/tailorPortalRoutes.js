import express from "express";
import expressAsyncHandler from "express-async-handler";
import TailorShop from "../models/TailorShop.js";
import CustomOrder, { CUSTOM_STATUSES } from "../models/CustomOrder.js";
import Design from "../models/Design.js";
import PlatformSettings from "../models/PlatformSettings.js";
import tailorDesignRoutes from "./tailorDesignRoutes.js";
import {
  uploadReadyMadeImageMiddleware,
  uploadSingleImageMiddleware,
  processTailorDesignImage,
  processTailorShopImage,
} from "../middleware/uploadReadyMadeImage.js";
import { deleteTailorShopUpload } from "../utils/uploads.js";
import {
  emptyShopPickupAddress,
  isCompleteShopPickupAddress,
  normalizeShopPickupAddress,
} from "../utils/shopPickupAddress.js";
import { markCustomTailorReady, presentCustomOrderForTailor } from "../services/shipmentService.js";
import { getTimeframeWindow } from "../utils/dateRange.js";
import { splitMotdCommission } from "../services/pricingService.js";
import PartnerPayout from "../models/PartnerPayout.js";
import PartnerPayoutCredit from "../models/PartnerPayoutCredit.js";

const tailorPortalRouter = express.Router();

const DEFAULT_TAILOR_COMMISSION_PERCENT = 12;

const resolveTailorCommissionPercent = (settings) => {
  if (
    typeof settings?.motdCommissionFromTailor === "number" &&
    Number.isFinite(settings.motdCommissionFromTailor) &&
    settings.motdCommissionFromTailor > 0
  ) {
    return Math.min(100, Math.max(0, settings.motdCommissionFromTailor));
  }
  return DEFAULT_TAILOR_COMMISSION_PERCENT;
};

function normalizePartnerLabel(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Paid totals for this tailor shop from admin PartnerPayout releases
 * (plus settlement credits after history deletes).
 */
async function getTailorSettlement(shop) {
  const shopId = String(shop._id);
  const nameNorm = normalizePartnerLabel(shop.name);
  const keys = [`tailor:${shopId}`];
  if (nameNorm) keys.push(`tailor:name:${nameNorm}`);

  const match = {
    partnerKind: "tailor",
    $or: [{ partnerId: shopId }, { partnerKey: { $in: keys } }],
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

const normalizePhoneNumber = (value) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 9) return `+971${digits}`;
  if (digits.length === 12 && digits.startsWith("971")) return `+${digits}`;

  return trimmed.startsWith("+") ? trimmed : trimmed;
};

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

  if (data.phone !== undefined) {
    data.phone = normalizePhoneNumber(data.phone);
  }

  if (body.pickupAddress !== undefined) {
    data.pickupAddress = body.pickupAddress;
  }

  return data;
};

const validateShopPayload = (data, { requireCore = false } = {}) => {
  const normalizedPhone =
    data.phone !== undefined ? normalizePhoneNumber(data.phone) : "";

  if (requireCore) {
    if (!data.name || !data.nameAr || !data.slug || !normalizedPhone) {
      return "name, nameAr, slug, and phone are required";
    }
  } else {
    if (data.phone !== undefined && !normalizedPhone) {
      return "phone is required";
    }
  }

  if (
    data.phone !== undefined &&
    data.phone !== "" &&
    !/^\+971\d{9}$/.test(normalizedPhone)
  ) {
    return "phone number must be a valid UAE number";
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

const findOwnShop = (ownerId) => TailorShop.findOne({ ownerId });

// POST /api/tailor/uploads/design-image
tailorPortalRouter.post(
  "/uploads/design-image",
  uploadReadyMadeImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: "No image file provided" });
      return;
    }

    const url = await processTailorDesignImage(req.file);
    res.status(201).json({ success: true, url });
  }),
);

// Confirms isAuth + isApprovedTailor chain
tailorPortalRouter.use("/designs", tailorDesignRoutes);

// POST /api/tailor/uploads/shop-image?variant=logo|cover
tailorPortalRouter.post(
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

tailorPortalRouter.get(
  "/status",
  expressAsyncHandler(async (req, res) => {
    res.json({
      success: true,
      tailor: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        approvalStatus: req.user.approvalStatus,
      },
    });
  }),
);

// GET /api/tailor/shop — own shop profile
tailorPortalRouter.get(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);

    if (!shop) {
      res.status(404).json({
        success: false,
        message: "Tailor shop not found",
      });
      return;
    }

    res.json({
      success: true,
      item: formatShop(shop),
    });
  }),
);

// POST /api/tailor/shop — create own shop (one per tailor)
tailorPortalRouter.post(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const existingShop = await findOwnShop(req.user._id);
    if (existingShop) {
      res.status(409).json({
        success: false,
        message: "Tailor shop already exists for this account",
      });
      return;
    }

    const data = pickShopFields(req.body);
    const validationError = validateShopPayload(data, { requireCore: true });
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    const pickupError = requirePickupAddress(data.pickupAddress);
    if (pickupError) {
      res.status(400).json({
        success: false,
        message: pickupError,
      });
      return;
    }

    const slugTaken = await TailorShop.findOne({ slug: data.slug });
    if (slugTaken) {
      res.status(409).json({
        success: false,
        message: "Shop slug is already in use",
      });
      return;
    }

    const shop = await TailorShop.create({
      ...data,
      ownerId: req.user._id,
    });

    res.status(201).json({
      success: true,
      item: formatShop(shop),
    });
  }),
);

// PUT /api/tailor/shop — update own shop
tailorPortalRouter.put(
  "/shop",
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({
        success: false,
        message: "Tailor shop not found",
      });
      return;
    }

    const data = pickShopFields(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: "No shop fields provided to update",
      });
      return;
    }

    const validationError = validateShopPayload(data);
    if (validationError) {
      res.status(400).json({
        success: false,
        message: validationError,
      });
      return;
    }

    if (data.slug && data.slug !== shop.slug) {
      const slugTaken = await TailorShop.findOne({ slug: data.slug });
      if (slugTaken) {
        res.status(409).json({
          success: false,
          message: "Shop slug is already in use",
        });
        return;
      }
    }

    const nextPickupAddress =
      data.pickupAddress !== undefined ? data.pickupAddress : shop.pickupAddress;
    const pickupError = requirePickupAddress(nextPickupAddress);
    if (pickupError) {
      res.status(400).json({
        success: false,
        message: pickupError,
      });
      return;
    }

    const previousLogo = shop.logo;
    const previousCover = shop.coverImage;

    Object.assign(shop, data);
    if (data.pickupAddress) {
      shop.pickupAddress = data.pickupAddress;
    }
    const updatedShop = await shop.save();

    if (
      data.logo !== undefined &&
      previousLogo &&
      previousLogo !== updatedShop.logo
    ) {
      await deleteTailorShopUpload(previousLogo);
    }
    if (
      data.coverImage !== undefined &&
      previousCover &&
      previousCover !== updatedShop.coverImage
    ) {
      await deleteTailorShopUpload(previousCover);
    }

    res.json({
      success: true,
      item: formatShop(updatedShop),
    });
  }),
);

// GET /api/tailor/orders — get all custom orders for this tailor's shop
tailorPortalRouter.get(
  "/orders",
  expressAsyncHandler(async (req, res) => {
    const shop = await TailorShop.findOne({ ownerId: req.user._id });
    if (!shop) {
      res.json({ success: true, items: [] });
      return;
    }

    const orders = await CustomOrder.find({
      $or: [{ tailorShopId: shop._id }, { "items.tailorShopId": shop._id }],
    })
      .populate("userId", "name email phone")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      items: orders.map((order) => presentCustomOrderForTailor(order, shop._id)),
      tailorShopId: shop._id,
    });
  }),
);

// PATCH /api/tailor/orders/:id/status — update order status by the tailor
tailorPortalRouter.patch(
  "/orders/:id/status",
  expressAsyncHandler(async (req, res) => {
    const { status, note } = req.body;

    if (status && !CUSTOM_STATUSES.includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid custom logistics status value`,
      });
      return;
    }

    const order = await CustomOrder.findById(req.params.id);
    if (!order) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const shop = await TailorShop.findOne({ ownerId: req.user._id });
    if (!shop) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const ownsLegacyOrder =
      order.tailorShopId?.toString?.() === shop._id.toString();
    const ownsItemOrder = Array.isArray(order.items)
      ? order.items.some(
          (item) => item.tailorShopId?.toString?.() === shop._id.toString(),
        )
      : false;

    if (!ownsLegacyOrder && !ownsItemOrder) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    if (status === "ready") {
      const shipmentResult = await markCustomTailorReady(order, shop._id, {
        changedBy: req.user._id,
        tailorName: shop.name,
        note: typeof note === "string" ? note.trim() : "",
      });
      const updated = shipmentResult?.order || order;
      res.json({
        success: true,
        order: presentCustomOrderForTailor(updated, shop._id),
      });
      return;
    }

    if (status) {
      order.status = status;
      order.statusHistory.push({
        status,
        note: typeof note === "string" ? note.trim() : "",
        changedAt: new Date(),
        changedBy: req.user._id,
      });
      await order.save();
    }

    res.json({
      success: true,
      order: presentCustomOrderForTailor(order, shop._id),
    });
  }),
);

// ==========================================
// GET /api/tailor/dashboard
// ==========================================
tailorPortalRouter.get(
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
    const defaultTailoringFee = Number(settings?.defaultTailoringFee || 0);
    const commissionPercent = resolveTailorCommissionPercent(settings);

    if (!shop) {
      res.json({
        success: true,
        currency: "AED",
        tailorShopId: null,
        tailoringFeeEnabled: defaultTailoringFee > 0,
        kpis: {
          tailorRevenue: 0,
          orderCount: 0,
          activeDesigns: 0,
          inProgress: 0,
          paid: 0,
          pending: 0,
        },
        monthlyData: [],
        statusBreakdown: [],
        payout: {
          netDue: 0,
          paid: 0,
          pending: 0,
          status: null,
        },
        recentOrders: [],
        pricingOrders: [],
      });
      return;
    }

    const shopId = shop._id;
    const shopIdStr = shopId.toString();
    const orderMatch = {
      $or: [{ tailorShopId: shopId }, { "items.tailorShopId": shopId }],
    };

    const [ordersInWindow, recentScopedOrders, activeDesigns, settlement] =
      await Promise.all([
        CustomOrder.find({
          ...orderMatch,
          createdAt: { $gte: start, $lte: end },
        })
          .populate("userId", "name email")
          .sort({ createdAt: -1 })
          .lean(),
        CustomOrder.find(orderMatch)
          .populate("userId", "name email")
          .sort({ createdAt: -1 })
          .limit(20)
          .lean(),
        Design.countDocuments({ tailorShopId: shopId, isActive: true }),
        getTailorSettlement(shop),
      ]);

    const isShopItem = (item) => {
      const sid =
        item.tailorShopId?._id?.toString?.() ||
        item.tailorShopId?.toString?.() ||
        "";
      return sid === shopIdStr;
    };

    const getDesignFee = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter(isShopItem)
          .reduce((sum, item) => sum + (item.pricing?.designBase || 0), 0);
      }
      const orderShopId =
        order.tailorShopId?._id?.toString?.() ||
        order.tailorShopId?.toString?.() ||
        "";
      return orderShopId === shopIdStr ? order.pricing?.designBase || 0 : 0;
    };

    const getTailoringFee = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter(isShopItem)
          .reduce((sum, item) => sum + (item.pricing?.tailoringFee || 0), 0);
      }
      const orderShopId =
        order.tailorShopId?._id?.toString?.() ||
        order.tailorShopId?.toString?.() ||
        "";
      return orderShopId === shopIdStr ? order.pricing?.tailoringFee || 0 : 0;
    };

    // Tailor gross for custom stitching = design + tailoring fees for this shop.
    const getTailorGross = (order) => getDesignFee(order) + getTailoringFee(order);

    let tailoringFees = 0;
    let tailorRevenue = 0;
    const statusMap = new Map();
    const IN_PROGRESS = new Set([
      "confirmed",
      "fabric_delivered",
      "at_tailor",
      "in_production",
      "ready",
      "out_for_delivery",
    ]);
    let inProgress = 0;

    for (const order of ordersInWindow) {
      const design = getDesignFee(order);
      const tailoring = getTailoringFee(order);
      const gross = design + tailoring;
      const breakdown = splitMotdCommission(gross, commissionPercent);

      tailoringFees += tailoring;
      tailorRevenue += breakdown.net;

      const st = order.status || "unknown";
      statusMap.set(st, (statusMap.get(st) || 0) + 1);
      if (IN_PROGRESS.has(st)) inProgress += 1;
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
    const monthlyOrders = await CustomOrder.find({
      ...orderMatch,
      createdAt: { $gte: rangeStart, $lte: end },
    }).lean();

    const monthlyMap = new Map();
    for (const order of monthlyOrders) {
      const d = new Date(order.createdAt);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      const design = getDesignFee(order);
      const tailoring = getTailoringFee(order);
      const net = splitMotdCommission(
        design + tailoring,
        commissionPercent,
      ).net;
      const prev = monthlyMap.get(key) || {
        design: 0,
        tailoring: 0,
        revenue: 0,
      };
      monthlyMap.set(key, {
        design: prev.design + design,
        tailoring: prev.tailoring + tailoring,
        revenue: prev.revenue + net,
      });
    }

    const monthlyData = monthStarts.map((d) => {
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      const row = monthlyMap.get(key) || {
        design: 0,
        tailoring: 0,
        revenue: 0,
      };
      return {
        month: d.toLocaleString("en-US", { month: "short" }),
        revenue: Number(row.revenue.toFixed(2)),
      };
    });

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const recentOrders = recentScopedOrders
      .map((o) => {
        const breakdown = splitMotdCommission(
          getTailorGross(o),
          commissionPercent,
        );
        const orderId = o._id.toString();
        const paidForOrder = Number(settlement.paidByOrderId.get(orderId)) || 0;
        const pendingForOrder = Math.max(
          0,
          Number((breakdown.net - paidForOrder).toFixed(2)),
        );
        const paymentStatus =
          breakdown.net <= 0
            ? o.status
            : pendingForOrder <= 0
              ? "paid"
              : paidForOrder > 0
                ? "partially_paid"
                : "pending_payment";
        return {
          id: orderId,
          amount: breakdown.net,
          status: paymentStatus,
          date: o.createdAt ? new Date(o.createdAt).toISOString() : "",
          type: "custom",
        };
      })
      .filter((o) => o.amount > 0)
      .slice(0, 8);

    const pricingOrders = recentScopedOrders
      .map((o) => {
        const designFee = getDesignFee(o);
        const tailoringFee = getTailoringFee(o);
        const gross = designFee + tailoringFee;
        const breakdown = splitMotdCommission(gross, commissionPercent);
        const orderId = o._id.toString();
        const paidForOrder = Number(settlement.paidByOrderId.get(orderId)) || 0;
        const pendingForOrder = Math.max(
          0,
          Number((breakdown.net - paidForOrder).toFixed(2)),
        );
        const paymentStatus =
          breakdown.net <= 0
            ? "pending"
            : pendingForOrder <= 0
              ? "paid"
              : paidForOrder > 0
                ? "partially_paid"
                : "pending_payment";
        // Lean payload — no gross/commission fields for tailor privacy.
        return {
          _id: o._id,
          userId: o.userId,
          createdAt: o.createdAt,
          status: o.status,
          payoutNet: breakdown.net,
          payoutPaid: paidForOrder,
          payoutPending: pendingForOrder,
          paymentStatus,
        };
      })
      .filter((o) => o.payoutNet > 0)
      .slice(0, 20);

    // Attribute admin releases to orders in this timeframe when order ids are known.
    let paidInWindow = 0;
    for (const order of ordersInWindow) {
      const orderId = String(order._id);
      paidInWindow += Number(settlement.paidByOrderId.get(orderId)) || 0;
    }
    // If releases have no per-order rows, fall back to shop-level paid capped by window net.
    if (paidInWindow <= 0 && settlement.paidTotal > 0 && tailorRevenue > 0) {
      paidInWindow = Math.min(settlement.paidTotal, tailorRevenue);
    }
    paidInWindow = Number(Math.min(paidInWindow, tailorRevenue).toFixed(2));
    const pendingInWindow = Math.max(
      0,
      Number((tailorRevenue - paidInWindow).toFixed(2)),
    );
    const payoutStatus =
      tailorRevenue <= 0
        ? null
        : pendingInWindow > 0
          ? "pending"
          : "approved";

    // KPI "Your payout": still owed when pending, otherwise amount already paid.
    const kpiPayoutValue =
      pendingInWindow > 0 ? pendingInWindow : paidInWindow;

    const tailoringFeeEnabled = defaultTailoringFee > 0 || tailoringFees > 0;

    res.json({
      success: true,
      currency: "AED",
      tailorShopId: shopId,
      // Intentionally omit commissionPercent / MOTD earnings from tailor clients.
      tailoringFeeEnabled,
      kpis: {
        tailorRevenue: Number(kpiPayoutValue.toFixed(2)),
        orderCount: ordersInWindow.length,
        activeDesigns,
        inProgress,
        paid: paidInWindow,
        pending: pendingInWindow,
        netDue: Number(tailorRevenue.toFixed(2)),
      },
      monthlyData,
      statusBreakdown,
      payout: {
        netDue: Number(tailorRevenue.toFixed(2)),
        paid: paidInWindow,
        pending: pendingInWindow,
        status: payoutStatus,
      },
      recentOrders,
      pricingOrders: allScopedOrders.map((o) =>
        presentCustomOrderForTailor(o, shopId),
      ),
    });
  }),
);

export default tailorPortalRouter;
