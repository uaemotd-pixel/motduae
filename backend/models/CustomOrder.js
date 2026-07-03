import mongoose from 'mongoose';

const ORDER_TYPE = 'custom';

const FABRIC_SOURCES = ['storefront', 'self'];

const CUSTOM_STATUSES = [
  'pending',
  'confirmed',
  'fabric_pickup_scheduled',
  'at_tailor',
  'in_production',
  'ready',
  'out_for_delivery',
  'delivered',
];

const PAYMENT_METHODS = ['cod', 'apple_pay'];

const deliveryAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    emirate: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const pickupAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: '', trim: true },
    city: { type: String, required: true, trim: true },
    emirate: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const fabricSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    slug: { type: String, default: '', trim: true },
    material: { type: String, default: '', trim: true },
    pricePerMeter: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const designSnapshotSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, default: '', trim: true },
    slug: { type: String, default: '', trim: true },
    category: { type: String, default: '', trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    tailoringFee: { type: Number, required: true, min: 0 },
    estimatedMeters: { type: Number, min: 0, default: null },
  },
  { _id: false }
);

const measurementsSchema = new mongoose.Schema(
  {
    totalLength: { type: Number, min: 0, default: null },
    shoulderWidth: { type: Number, min: 0, default: null },
    armLength: { type: Number, min: 0, default: null },
    chestWidth: { type: Number, min: 0, default: null },
    waist: { type: Number, min: 0, default: null },
    hips: { type: Number, min: 0, default: null },
    neckWidth: { type: Number, min: 0, default: null },
    neckDepth: { type: Number, min: 0, default: null },
    armholeHeight: { type: Number, min: 0, default: null },
    sleeveOpeningWidth: { type: Number, min: 0, default: null },
    cuffWidth: { type: Number, min: 0, default: null },
    cuffLength: { type: Number, min: 0, default: null },
    notes: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const pricingSchema = new mongoose.Schema(
  {
    designBase: { type: Number, required: true, min: 0 },
    fabricMeters: { type: Number, required: true, min: 0 },
    fabricPricePerMeter: { type: Number, default: 0, min: 0 },
    fabricCost: { type: Number, required: true, min: 0 },
    tailoringFee: { type: Number, required: true, min: 0 },
    deliveryFee: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    vatRate: { type: Number, default: 0.05, min: 0, max: 1 },
    vatAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'AED', required: true },
  },
  { _id: false }
);

const statusHistoryEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: CUSTOM_STATUSES,
      required: true,
    },
    note: { type: String, default: '', trim: true },
    changedAt: { type: Date, default: Date.now, required: true },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { _id: false }
);

const customOrderItemSchema = new mongoose.Schema(
  {
    designId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
      required: true,
    },
    designSnapshot: {
      type: designSnapshotSchema,
      required: true,
    },
    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TailorShop',
      required: true,
    },
    fabricId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fabric',
      default: null,
    },
    fabricStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fabricSnapshot: {
      type: fabricSnapshotSchema,
      default: null,
    },
    fabricMeters: {
      type: Number,
      required: true,
      min: 0,
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
  },
  { _id: true }
);

const customOrderSchema = new mongoose.Schema(
  {
    orderType: {
      type: String,
      default: ORDER_TYPE,
      enum: [ORDER_TYPE],
      immutable: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    fabricSource: {
      type: String,
      enum: FABRIC_SOURCES,
      required: true,
    },
    fabricId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Fabric',
      default: null,
    },
    fabricStoreId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    fabricSnapshot: {
      type: fabricSnapshotSchema,
      default: null,
    },
    fabricMeters: {
      type: Number,
      required: true,
      min: 0,
    },
    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TailorShop',
      default: null,
    },
    designId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
      default: null,
    },
    designSnapshot: {
      type: designSnapshotSchema,
      default: null,
    },
    items: {
      type: [customOrderItemSchema],
      default: [],
    },
    measurements: {
      type: measurementsSchema,
      default: () => ({}),
    },
    customerDeliveryAddress: {
      type: deliveryAddressSchema,
      required: false,
    },
    pickupAddress: {
      type: pickupAddressSchema,
      required: false,
    },
    status: {
      type: String,
      enum: CUSTOM_STATUSES,
      default: 'pending',
      required: true,
    },
    statusHistory: {
      type: [statusHistoryEntrySchema],
      default: [],
    },
    pricing: {
      type: pricingSchema,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: 'cod',
      required: true,
    },
    isPaid: { type: Boolean, default: false, required: true },
    paidAt: { type: Date, default: null },
    stripePaymentIntentId: { type: String, default: null, trim: true },
    assignedDeliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    estimatedReadyDate: { type: Date, default: null },
    addPocket: { type: Boolean, default: false },
    addBottomWideFold: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

customOrderSchema.index({ userId: 1, createdAt: -1 });
customOrderSchema.index({ status: 1, createdAt: -1 });
customOrderSchema.index({ tailorShopId: 1, status: 1 });

customOrderSchema.pre('validate', function validateFabricSource(next) {
  const hasItems = Array.isArray(this.items) && this.items.length > 0;

  if (hasItems) {
    for (const item of this.items) {
      if (this.fabricSource === 'storefront') {
        if (!item.fabricId) {
          return next(
            new Error('fabricId is required on each item when fabricSource is storefront')
          );
        }
        if (!item.fabricStoreId) {
          return next(
            new Error('fabricStoreId is required on each item when fabricSource is storefront')
          );
        }
        if (!item.fabricSnapshot) {
          return next(
            new Error('fabricSnapshot is required on each item when fabricSource is storefront')
          );
        }
      }

      if (this.fabricSource === 'self') {
        item.fabricId = null;
        item.fabricStoreId = null;
        item.fabricSnapshot = null;
      }
    }

    return next();
  }

  if (this.fabricSource === 'storefront') {
    if (!this.fabricId) {
      return next(new Error('fabricId is required when fabricSource is storefront'));
    }
    if (!this.fabricStoreId) {
      return next(new Error('fabricStoreId is required when fabricSource is storefront'));
    }
    if (!this.fabricSnapshot) {
      return next(new Error('fabricSnapshot is required when fabricSource is storefront'));
    }
  }

  if (this.fabricSource === 'self') {
    this.fabricId = null;
    this.fabricStoreId = null;
    this.fabricSnapshot = null;
  }

  if (!this.designId || !this.tailorShopId || !this.designSnapshot) {
    return next(new Error('designId, tailorShopId, and designSnapshot are required'));
  }

  next();
});

const CustomOrder = mongoose.model('CustomOrder', customOrderSchema);

export default CustomOrder;
export { ORDER_TYPE, FABRIC_SOURCES, CUSTOM_STATUSES, PAYMENT_METHODS };
