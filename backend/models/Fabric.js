import mongoose from 'mongoose';

const FABRIC_MATERIALS = ['wool', 'silk', 'linen', 'cashmere', 'cotton'];

const storePickupAddressSchema = new mongoose.Schema(
  {
    emirate: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, default: '', trim: true },
    building: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const fabricSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    descriptionAr: { type: String, default: '', trim: true },
    images: {
      type: [String],
      default: [],
      validate: {
        validator(images) {
          return images.length > 0;
        },
        message: 'At least one image is required',
      },
    },
    material: {
      type: String,
      enum: FABRIC_MATERIALS,
      required: true,
    },
    color: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    tag: { type: String, default: '', trim: true },
    tagColor: { type: String, default: '', trim: true },
    pricePerMeter: { type: Number, required: true, min: 0 },
    listedByStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    storePickupAddress: {
      type: storePickupAddressSchema,
      required: true,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
  }
);

fabricSchema.index({ isActive: 1, material: 1 });
fabricSchema.index({ listedByStore: 1 });

const Fabric = mongoose.model('Fabric', fabricSchema);

export default Fabric;
export { FABRIC_MATERIALS };
