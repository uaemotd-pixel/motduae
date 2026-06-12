import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import TailorShop from '../models/TailorShop.js';
import tailorDesignRoutes from './tailorDesignRoutes.js';
import {
  uploadReadyMadeImageMiddleware,
  processTailorDesignImage,
} from '../middleware/uploadReadyMadeImage.js';
  uploadSingleImageMiddleware,
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
    if (!data.name || !data.nameAr || !data.slug) {
      return 'name, nameAr, and slug are required';
    }
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
      deleteTailorShopUpload(previousLogo);
    }
    if (
      data.coverImage !== undefined &&
      previousCover &&
      previousCover !== updatedShop.coverImage
    ) {
      deleteTailorShopUpload(previousCover);
    }

    res.json({
      success: true,
      item: formatShop(updatedShop),
    });
  })
);

export default tailorPortalRouter;
