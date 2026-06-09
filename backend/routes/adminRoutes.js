import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import ReadyMadeProduct from '../models/ReadyMadeProduct.js';

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

export default adminRouter;
