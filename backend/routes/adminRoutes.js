import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import ReadyMadeProduct from '../models/ReadyMadeProduct.js';
import Fabric from '../models/Fabric.js';

const adminRouter = express.Router();

// Define admin routes here (e.g. C-02 to C-10)
adminRouter.get('/health', (req, res) => {
  res.send({ message: 'Admin API is healthy' });
});

// ==========================================
// C-02: Admin Ready-Made CRUD
// ==========================================

// GET /api/admin/ready-made
// Admin can view all ready-made products (including inactive/sold)
adminRouter.get(
  '/ready-made',
  expressAsyncHandler(async (req, res) => {
    const products = await ReadyMadeProduct.find({}).sort({ createdAt: -1 });
    res.send(products);
  })
);

// POST /api/admin/ready-made
// Create a new listing (auto-set stock to 1)
adminRouter.post(
  '/ready-made',
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      price,
      size,
      style,
      city,
      tag,
      tagColor,
      returnReason,
      sourceCustomOrderId,
      condition,
      isActive,
    } = req.body;

    const newProduct = new ReadyMadeProduct({
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      price,
      size,
      style,
      city,
      tag,
      tagColor,
      returnReason: returnReason || 'size_issue',
      sourceCustomOrderId,
      condition,
      countInStock: 1, // Fixed based on MVP rules
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdProduct = await newProduct.save();
    res.status(201).send(createdProduct);
  })
);

// PUT /api/admin/ready-made/:id
// Update an existing ready-made item
adminRouter.put(
  '/ready-made/:id',
  expressAsyncHandler(async (req, res) => {
    const product = await ReadyMadeProduct.findById(req.params.id);

    if (product) {
      product.name = req.body.name || product.name;
      product.nameAr = req.body.nameAr || product.nameAr;
      product.slug = req.body.slug || product.slug;
      product.description = req.body.description !== undefined ? req.body.description : product.description;
      product.descriptionAr = req.body.descriptionAr !== undefined ? req.body.descriptionAr : product.descriptionAr;
      product.images = req.body.images || product.images;
      product.price = req.body.price !== undefined ? req.body.price : product.price;
      product.size = req.body.size || product.size;
      product.style = req.body.style || product.style;
      product.city = req.body.city !== undefined ? req.body.city : product.city;
      product.tag = req.body.tag !== undefined ? req.body.tag : product.tag;
      product.tagColor = req.body.tagColor !== undefined ? req.body.tagColor : product.tagColor;
      product.returnReason = req.body.returnReason || product.returnReason;
      product.sourceCustomOrderId = req.body.sourceCustomOrderId || product.sourceCustomOrderId;
      product.condition = req.body.condition || product.condition;
      product.isActive = req.body.isActive !== undefined ? req.body.isActive : product.isActive;
      // We might allow updating countInStock manually in the future, but MVP implies it stays 1 or goes 0.
      if (req.body.countInStock !== undefined) {
        product.countInStock = req.body.countInStock;
      }

      const updatedProduct = await product.save();
      res.send(updatedProduct);
    } else {
      res.status(404).send({ message: 'Ready-made product not found' });
    }
  })
);

// DELETE /api/admin/ready-made/:id
// Delete (or let frontend soft-delete by toggling isActive via PUT)
adminRouter.delete(
  '/ready-made/:id',
  expressAsyncHandler(async (req, res) => {
    const product = await ReadyMadeProduct.findById(req.params.id);
    if (product) {
      await product.deleteOne();
      res.send({ message: 'Ready-made product deleted' });
    } else {
      res.status(404).send({ message: 'Ready-made product not found' });
    }
  })
);

// ==========================================
// C-03: Admin Fabrics CRUD
// ==========================================

// GET /api/admin/fabrics
// Admin can view all fabrics in the catalog (including inactive)
adminRouter.get(
  '/fabrics',
  expressAsyncHandler(async (req, res) => {
    const fabrics = await Fabric.find({})
      .populate('listedByStore', 'name email')
      .sort({ createdAt: -1 });
    res.send(fabrics);
  })
);

// POST /api/admin/fabrics
// Create a new fabric catalog entry
adminRouter.post(
  '/fabrics',
  expressAsyncHandler(async (req, res) => {
    const {
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      material,
      color,
      city,
      tag,
      tagColor,
      pricePerMeter,
      listedByStore,
      storePickupAddress,
      isActive,
    } = req.body;

    const newFabric = new Fabric({
      name,
      nameAr,
      slug,
      description,
      descriptionAr,
      images,
      material,
      color,
      city,
      tag,
      tagColor,
      pricePerMeter,
      listedByStore,
      storePickupAddress,
      isActive: isActive !== undefined ? isActive : true,
    });

    const createdFabric = await newFabric.save();
    res.status(201).send(createdFabric);
  })
);

// PUT /api/admin/fabrics/:id
// Update an existing fabric
adminRouter.put(
  '/fabrics/:id',
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findById(req.params.id);

    if (fabric) {
      fabric.name = req.body.name || fabric.name;
      fabric.nameAr = req.body.nameAr || fabric.nameAr;
      fabric.slug = req.body.slug || fabric.slug;
      fabric.description = req.body.description !== undefined ? req.body.description : fabric.description;
      fabric.descriptionAr = req.body.descriptionAr !== undefined ? req.body.descriptionAr : fabric.descriptionAr;
      fabric.images = req.body.images || fabric.images;
      fabric.material = req.body.material || fabric.material;
      fabric.color = req.body.color !== undefined ? req.body.color : fabric.color;
      fabric.city = req.body.city !== undefined ? req.body.city : fabric.city;
      fabric.tag = req.body.tag !== undefined ? req.body.tag : fabric.tag;
      fabric.tagColor = req.body.tagColor !== undefined ? req.body.tagColor : fabric.tagColor;
      fabric.pricePerMeter = req.body.pricePerMeter !== undefined ? req.body.pricePerMeter : fabric.pricePerMeter;
      fabric.listedByStore = req.body.listedByStore || fabric.listedByStore;
      
      if (req.body.storePickupAddress) {
        fabric.storePickupAddress = req.body.storePickupAddress;
      }
      
      fabric.isActive = req.body.isActive !== undefined ? req.body.isActive : fabric.isActive;

      const updatedFabric = await fabric.save();
      res.send(updatedFabric);
    } else {
      res.status(404).send({ message: 'Fabric not found' });
    }
  })
);

// DELETE /api/admin/fabrics/:id
// Delete (or let frontend soft-delete by toggling isActive via PUT)
adminRouter.delete(
  '/fabrics/:id',
  expressAsyncHandler(async (req, res) => {
    const fabric = await Fabric.findById(req.params.id);
    if (fabric) {
      await fabric.deleteOne();
      res.send({ message: 'Fabric deleted' });
    } else {
      res.status(404).send({ message: 'Fabric not found' });
    }
  })
);

export default adminRouter;
