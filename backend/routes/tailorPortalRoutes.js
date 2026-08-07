import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import TailorShop from '../models/TailorShop.js';
import CustomOrder, { CUSTOM_STATUSES } from '../models/CustomOrder.js';
import Design from '../models/Design.js';
import PlatformSettings from '../models/PlatformSettings.js';
import tailorDesignRoutes from './tailorDesignRoutes.js';
import {
  uploadReadyMadeImageMiddleware,
  uploadSingleImageMiddleware,
  processTailorDesignImage,
  processTailorShopImage,
} from '../middleware/uploadReadyMadeImage.js';
import { deleteTailorShopUpload } from '../utils/uploads.js';

const tailorPortalRouter = express.Router();

const SHOP_FIELDS = [
  'name',
  'nameAr',
  'slug',
  'description',
  'descriptionAr',
  'logo',
  'coverImage',
  'location',
  'city',
  'phone',
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
        typeof body[field] === 'string' ? body[field].trim() : body[field];
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
      return 'name, nameAr, slug, and phone are required';
    }
  } else {
    if (data.phone !== undefined && !data.phone) {
      return 'phone is required';
    }
  }

  if (data.phone !== undefined && data.phone !== '' && !/^\d{9}$/.test(data.phone)) {
    return 'phone number must be exactly 9 digits';
  }

  if (data.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) {
    return 'slug must be lowercase letters, numbers, and hyphens only';
  }

  return null;
};

const findOwnShop = (ownerId) => TailorShop.findOne({ ownerId });

// POST /api/tailor/uploads/design-image
tailorPortalRouter.post(
  '/uploads/design-image',
  uploadReadyMadeImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const url = await processTailorDesignImage(req.file);
    res.status(201).json({ success: true, url });
  })
);

// Confirms isAuth + isApprovedTailor chain
tailorPortalRouter.use('/designs', tailorDesignRoutes);

// POST /api/tailor/uploads/shop-image?variant=logo|cover
tailorPortalRouter.post(
  '/uploads/shop-image',
  uploadSingleImageMiddleware,
  expressAsyncHandler(async (req, res) => {
    if (!req.file) {
      res.status(400).json({ message: 'No image file provided' });
      return;
    }

    const variant = req.query.variant === 'logo' ? 'logo' : 'cover';
    const url = await processTailorShopImage(req.file, { variant });

    res.status(201).json({ success: true, url });
  })
);

tailorPortalRouter.get(
  '/status',
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
  })
);

// GET /api/tailor/shop — own shop profile
tailorPortalRouter.get(
  '/shop',
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);

    if (!shop) {
      res.status(404).json({
        success: false,
        message: 'Tailor shop not found',
      });
      return;
    }

    res.json({
      success: true,
      item: formatShop(shop),
    });
  })
);

// POST /api/tailor/shop — create own shop (one per tailor)
tailorPortalRouter.post(
  '/shop',
  expressAsyncHandler(async (req, res) => {
    const existingShop = await findOwnShop(req.user._id);
    if (existingShop) {
      res.status(409).json({
        success: false,
        message: 'Tailor shop already exists for this account',
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

    const slugTaken = await TailorShop.findOne({ slug: data.slug });
    if (slugTaken) {
      res.status(409).json({
        success: false,
        message: 'Shop slug is already in use',
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
  })
);

// PUT /api/tailor/shop — update own shop
tailorPortalRouter.put(
  '/shop',
  expressAsyncHandler(async (req, res) => {
    const shop = await findOwnShop(req.user._id);
    if (!shop) {
      res.status(404).json({
        success: false,
        message: 'Tailor shop not found',
      });
      return;
    }

    const data = pickShopFields(req.body);
    if (Object.keys(data).length === 0) {
      res.status(400).json({
        success: false,
        message: 'No shop fields provided to update',
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
          message: 'Shop slug is already in use',
        });
        return;
      }
    }

    const previousLogo = shop.logo;
    const previousCover = shop.coverImage;

    Object.assign(shop, data);
    const updatedShop = await shop.save();

    if (data.logo !== undefined && previousLogo && previousLogo !== updatedShop.logo) {
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
  })
);

// GET /api/tailor/orders — get all custom orders for this tailor's shop
tailorPortalRouter.get(
  '/orders',
  expressAsyncHandler(async (req, res) => {
    const shop = await TailorShop.findOne({ ownerId: req.user._id });
    if (!shop) {
      res.json({ success: true, items: [] });
      return;
    }

    const orders = await CustomOrder.find({
      $or: [{ tailorShopId: shop._id }, { "items.tailorShopId": shop._id }],
    })
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      items: orders,
      tailorShopId: shop._id,
    });
  })
);

// PATCH /api/tailor/orders/:id/status — update order status by the tailor
tailorPortalRouter.patch(
  '/orders/:id/status',
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
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    const shop = await TailorShop.findOne({ ownerId: req.user._id });
    if (!shop) {
      res.status(403).json({ success: false, message: 'Forbidden' });
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
      res.status(403).json({ success: false, message: 'Forbidden' });
      return;
    }

    if (status) {
      order.status = status;
      order.statusHistory.push({
        status,
        note: typeof note === 'string' ? note.trim() : '',
        changedAt: new Date(),
        changedBy: req.user._id,
      });
      await order.save();
    }

    res.json({
      success: true,
      order,
    });
  })
);

// ==========================================
// GET /api/tailor/dashboard
// ==========================================
function getPartnerTimeframeWindow(timeframe) {
  const now = new Date();
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 999);

  let start;
  if (timeframe === 'week') {
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 6);
  } else if (timeframe === 'year') {
    start = new Date(end);
    start.setUTCMonth(start.getUTCMonth() - 11);
  } else {
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 29);
  }
  start.setUTCHours(0, 0, 0, 0);
  return { start, end };
}

tailorPortalRouter.get(
  '/dashboard',
  expressAsyncHandler(async (req, res) => {
    const timeframeRaw = req.query.timeframe;
    const timeframe =
      timeframeRaw === 'week' ||
      timeframeRaw === 'month' ||
      timeframeRaw === 'year'
        ? timeframeRaw
        : 'month';
    const { start, end } = getPartnerTimeframeWindow(timeframe);

    const shop = await findOwnShop(req.user._id);
    const settings = await PlatformSettings.findOne({}).lean();
    const defaultTailoringFee = Number(settings?.defaultTailoringFee || 0);

    if (!shop) {
      res.json({
        success: true,
        currency: 'AED',
        tailorShopId: null,
        tailoringFeeEnabled: defaultTailoringFee > 0,
        kpis: {
          designFees: 0,
          tailoringFees: 0,
          orderCount: 0,
          activeDesigns: 0,
          inProgress: 0,
        },
        monthlyData: [],
        statusBreakdown: [],
        feeSplit: { designFees: 0, tailoringFees: 0 },
        recentOrders: [],
        pricingOrders: [],
      });
      return;
    }

    const shopId = shop._id;
    const orderMatch = {
      $or: [{ tailorShopId: shopId }, { 'items.tailorShopId': shopId }],
    };

    const [ordersInWindow, allScopedOrders, activeDesigns] = await Promise.all([
      CustomOrder.find({
        ...orderMatch,
        createdAt: { $gte: start, $lte: end },
      })
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .lean(),
      CustomOrder.find(orderMatch)
        .populate('userId', 'name email')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Design.countDocuments({ tailorShopId: shopId, isActive: true }),
    ]);

    const getDesignFee = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter((item) => {
            const sid =
              item.tailorShopId?._id?.toString?.() ||
              item.tailorShopId?.toString?.() ||
              '';
            return sid === shopId.toString();
          })
          .reduce((sum, item) => sum + (item.pricing?.designBase || 0), 0);
      }
      const orderShopId =
        order.tailorShopId?._id?.toString?.() ||
        order.tailorShopId?.toString?.() ||
        '';
      return orderShopId === shopId.toString()
        ? order.pricing?.designBase || 0
        : 0;
    };

    const getTailoringFee = (order) => {
      if (order.items && order.items.length > 0) {
        return order.items
          .filter((item) => {
            const sid =
              item.tailorShopId?._id?.toString?.() ||
              item.tailorShopId?.toString?.() ||
              '';
            return sid === shopId.toString();
          })
          .reduce((sum, item) => sum + (item.pricing?.tailoringFee || 0), 0);
      }
      const orderShopId =
        order.tailorShopId?._id?.toString?.() ||
        order.tailorShopId?.toString?.() ||
        '';
      return orderShopId === shopId.toString()
        ? order.pricing?.tailoringFee || 0
        : 0;
    };

    let designFees = 0;
    let tailoringFees = 0;
    const statusMap = new Map();
    const IN_PROGRESS = new Set([
      'confirmed',
      'fabric_delivered',
      'at_tailor',
      'in_production',
      'ready',
      'out_for_delivery',
    ]);
    let inProgress = 0;

    for (const order of ordersInWindow) {
      designFees += getDesignFee(order);
      tailoringFees += getTailoringFee(order);
      const st = order.status || 'unknown';
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
      const prev = monthlyMap.get(key) || { design: 0, tailoring: 0 };
      monthlyMap.set(key, {
        design: prev.design + getDesignFee(order),
        tailoring: prev.tailoring + getTailoringFee(order),
      });
    }

    const monthlyData = monthStarts.map((d) => {
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
      const row = monthlyMap.get(key) || { design: 0, tailoring: 0 };
      return {
        month: d.toLocaleString('en-US', { month: 'short' }),
        design: row.design,
        tailoring: row.tailoring,
        revenue: row.design + row.tailoring,
      };
    });

    const statusBreakdown = Array.from(statusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const recentOrders = allScopedOrders.map((o) => ({
      id: o._id.toString(),
      amount: getDesignFee(o) + getTailoringFee(o),
      status: o.status,
      date: o.createdAt ? new Date(o.createdAt).toISOString() : '',
      type: 'custom',
    }));

    // Optional platform fee: show only if admin default > 0 or this period has any charged.
    const tailoringFeeEnabled =
      defaultTailoringFee > 0 || tailoringFees > 0;

    res.json({
      success: true,
      currency: 'AED',
      tailorShopId: shopId,
      tailoringFeeEnabled,
      kpis: {
        designFees,
        tailoringFees,
        orderCount: ordersInWindow.length,
        activeDesigns,
        inProgress,
      },
      monthlyData,
      statusBreakdown,
      feeSplit: { designFees, tailoringFees },
      recentOrders,
      pricingOrders: allScopedOrders,
    });
  }),
);

export default tailorPortalRouter;
