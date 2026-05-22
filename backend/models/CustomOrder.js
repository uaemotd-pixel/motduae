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

const PAYMENT_METHODS = ['cod'];

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
    chest: { type: Number, min: 0, default: null },
    waist: { type: Number, min: 0, default: null },
    hips: { type: Number, min: 0, default: null },
    inseam: { type: Number, min: 0, default: null },
    sleeveLength: { type: Number, min: 0, default: null },
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
      required: true,
    },
    designId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Design',
      required: true,
    },
    designSnapshot: {
      type: designSnapshotSchema,
      required: true,
    },
    measurements: {
      type: measurementsSchema,
      default: () => ({}),
    },
    customerDeliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    pickupAddress: {
      type: pickupAddressSchema,
      required: true,
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
    assignedDeliveryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    estimatedReadyDate: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

customOrderSchema.index({ userId: 1, createdAt: -1 });
customOrderSchema.index({ status: 1, createdAt: -1 });
customOrderSchema.index({ tailorShopId: 1, status: 1 });

customOrderSchema.pre('validate', function validateFabricSource(next) {
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

  next();
});

const CustomOrder = mongoose.model('CustomOrder', customOrderSchema);

export default CustomOrder;
export { ORDER_TYPE, FABRIC_SOURCES, CUSTOM_STATUSES, PAYMENT_METHODS };
