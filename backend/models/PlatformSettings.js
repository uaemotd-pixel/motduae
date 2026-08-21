import mongoose from 'mongoose';

const SINGLETON_KEY = 'platform';

const CURRENCY = 'AED';

const fulfillmentAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    line1: { type: String, default: '', trim: true },
    line2: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    emirate: { type: String, default: '', trim: true },
  },
  { _id: false },
);

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: SINGLETON_KEY,
      unique: true,
      immutable: true,
    },
    // Per-parcel delivery rate (AED). Alias keeps legacy defaultDeliveryFee callers working.
    defaultDeliveryFee: {
      type: Number,
      default: 30,
      min: 0,
      required: true,
      alias: 'perParcelDeliveryFee',
    },
    defaultTailoringFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    motdCommissionFromTailor: {
      type: Number,
      default: 12,
      min: 0,
      max: 100,
      required: true,
    },
    motdCommissionFromFabricStore: {
      type: Number,
      default: 15,
      min: 0,
      max: 100,
      required: true,
    },
    vatRate: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1,
      required: true,
    },

    // Return/refund policy settings (for retail items)
    returnDeductionPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      required: true,
    },
    returnAllowedDays: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },

    currency: {
      type: String,
      default: CURRENCY,
      enum: [CURRENCY],
      required: true,
    },

    // Canonical MOTD warehouse for packing hops and last-mile pickup.
    fulfillmentAddress: {
      type: fulfillmentAddressSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
    toJSON: { aliases: true },
    toObject: { aliases: true },
  }
);

platformSettingsSchema.pre('validate', async function ensureSingleton(next) {
  if (!this.isNew) {
    return next();
  }

  const existing = await this.constructor.findOne({ key: SINGLETON_KEY }).select('_id');
  if (existing) {
    return next(new Error('PlatformSettings document already exists'));
  }

  next();
});

platformSettingsSchema.statics.getSettings = async function getSettings() {
  let settings = await this.findOne({ key: SINGLETON_KEY });

  if (!settings) {
    settings = await this.create({});
  }

  return settings;
};

const PlatformSettings = mongoose.model('PlatformSettings', platformSettingsSchema);

export default PlatformSettings;
export { SINGLETON_KEY, CURRENCY };
