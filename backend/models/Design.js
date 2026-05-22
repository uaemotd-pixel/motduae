import mongoose from 'mongoose';

const DESIGN_CATEGORIES = ['kandura', 'abaya', 'bisht', 'mukhawar', 'jalabiya', 'kaftan', 'thob'];

const designSchema = new mongoose.Schema(
  {
    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TailorShop',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
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
    category: {
      type: String,
      enum: DESIGN_CATEGORIES,
      required: true,
    },
    basePrice: { type: Number, required: true, min: 0 },
    tailoringFee: { type: Number, required: true, min: 0 },
    estimatedMeters: { type: Number, required: true, min: 0 },
    estimatedDays: { type: Number, default: 7, min: 1 },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
  }
);

designSchema.index({ tailorShopId: 1 });
designSchema.index({ tailorShopId: 1, slug: 1 }, { unique: true });
designSchema.index({ tailorShopId: 1, isActive: 1 });

const Design = mongoose.model('Design', designSchema);

export default Design;
export { DESIGN_CATEGORIES };
