import express from 'express';
import Fabric, { FABRIC_MATERIALS } from '../models/Fabric.js';

const fabricRoutes = express.Router();

const toListItem = (fabric) => ({
  _id: fabric._id,
  slug: fabric.slug,
  name: fabric.name,
  nameAr: fabric.nameAr,
  description: fabric.description,
  descriptionAr: fabric.descriptionAr,
  images: fabric.images,
  material: fabric.material,
  color: fabric.color,
  city: fabric.city,
  tag: fabric.tag,
  tagColor: fabric.tagColor,
  pricePerMeter: fabric.pricePerMeter,
  listedByStore: fabric.listedByStore,
});

// GET /api/fabrics — active fabrics for homepage carousel and fabric selection
fabricRoutes.get('/', async (req, res) => {
  try {
    const { material, page = 1, limit = 20 } = req.query;
    const filter = { isActive: true };

    if (material) {
      const normalizedMaterial = material.trim().toLowerCase();

      if (!FABRIC_MATERIALS.includes(normalizedMaterial)) {
        return res.status(400).json({
          success: false,
          message: `Invalid material. Allowed values: ${FABRIC_MATERIALS.join(', ')}`,
        });
      }

      filter.material = normalizedMaterial;
    }

    const pageNumber = Math.max(Number(page) || 1, 1);
    const limitNumber = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const skip = (pageNumber - 1) * limitNumber;

    const [fabrics, total] = await Promise.all([
      Fabric.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber)
        .select('-__v'),
      Fabric.countDocuments(filter),
    ]);

    res.json({
      success: true,
      page: pageNumber,
      limit: limitNumber,
      total,
      totalPages: Math.ceil(total / limitNumber) || 0,
      items: fabrics.map(toListItem),
    });
  } catch (error) {
    console.error('GET /api/fabrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fabrics',
    });
  }
});

const toDetailItem = (fabric) => ({
  _id: fabric._id,
  slug: fabric.slug,
  name: fabric.name,
  nameAr: fabric.nameAr,
  description: fabric.description,
  descriptionAr: fabric.descriptionAr,
  images: fabric.images,
  material: fabric.material,
  color: fabric.color,
  city: fabric.city,
  tag: fabric.tag,
  tagColor: fabric.tagColor,
  pricePerMeter: fabric.pricePerMeter,
  storePickupAddress: fabric.storePickupAddress,
  listedByStore: fabric.listedByStore
    ? {
        _id: fabric.listedByStore._id,
        name: fabric.listedByStore.name,
        role: fabric.listedByStore.role,
      }
    : null,
  createdAt: fabric.createdAt,
  updatedAt: fabric.updatedAt,
});

// GET /api/fabrics/:slug — single fabric with store attribution and pickup address
fabricRoutes.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const fabric = await Fabric.findOne({
      slug: slug.toLowerCase(),
      isActive: true,
    })
      .populate('listedByStore', '_id name role')
      .select('-__v');

    if (!fabric) {
      return res.status(404).json({
        success: false,
        message: 'Fabric not found',
      });
    }

    res.json({
      success: true,
      item: toDetailItem(fabric),
    });
  } catch (error) {
    console.error('GET /api/fabrics/:slug error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch fabric',
    });
  }
});

export default fabricRoutes;
