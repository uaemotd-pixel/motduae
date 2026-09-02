import mongoose from "mongoose";

const designSchema = new mongoose.Schema(
  {
    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TailorShop",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    descriptionAr: { type: String, default: "", trim: true },
    images: {
      type: [String],
      default: [],
      validate: {
        validator(images) {
          return images.length > 0;
        },
        message: "At least one image is required",
      },
    },
    category: {
      type: String,
      required: true,
    },
    material: { type: String, default: "", trim: true },
    materialAr: { type: String, default: "", trim: true },
    season: { type: String, default: "", trim: true },
    seasonAr: { type: String, default: "", trim: true },
    pattern: { type: String, default: "", trim: true },
    patternAr: { type: String, default: "", trim: true },
    tag: { type: String, default: "", trim: true },
    tagAr: { type: String, default: "", trim: true },
    basePrice: { type: Number, required: true, min: 0 },
    priceType: {
      type: String,
      enum: ["fixed", "per_meter"],
      default: "fixed",
      required: true,
    },
    tailoringFee: { type: Number, required: true, min: 0 },
    minCutId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cut",
      required: [true, "Minimum cut is required"],
    },
    minCutSnapshot: {
      name: { type: String, default: "" },
      nameAr: { type: String, default: "" },
      lengthInMeters: { type: Number, default: 0 },
    },
    estimatedMeters: { type: Number, required: false, min: 0 },
    estimatedDays: { type: Number, default: 7, min: 1 },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
  },
);

designSchema.index({ tailorShopId: 1 });
designSchema.index({ tailorShopId: 1, slug: 1 }, { unique: true });
designSchema.index({ tailorShopId: 1, isActive: 1 });
designSchema.index({ minCutId: 1 });

const Design = mongoose.model("Design", designSchema);

export default Design;