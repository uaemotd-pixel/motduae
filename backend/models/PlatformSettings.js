import mongoose from 'mongoose';

const SINGLETON_KEY = 'platform';

const CURRENCY = 'AED';

const platformSettingsSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: SINGLETON_KEY,
      unique: true,
      immutable: true,
    },
    defaultDeliveryFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    defaultTailoringFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    platformFee: {
      type: Number,
      default: 0,
      min: 0,
      required: true,
    },
    vatRate: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1,
      required: true,
    },
    currency: {
      type: String,
      default: CURRENCY,
      enum: [CURRENCY],
      required: true,
    },
  },
  {
    timestamps: true,
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
