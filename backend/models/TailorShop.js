import mongoose from 'mongoose';

const tailorShopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '', trim: true },
    descriptionAr: { type: String, default: '', trim: true },
    logo: { type: String, default: '', trim: true },
    coverImage: { type: String, default: '', trim: true },
    location: { type: String, default: '', trim: true },
    city: { type: String, default: '', trim: true },
    phone: { type: String, default: '', trim: true },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
  }
);

tailorShopSchema.index({ isActive: 1, city: 1 });
tailorShopSchema.index({ ownerId: 1 });

const TailorShop = mongoose.model('TailorShop', tailorShopSchema);

export default TailorShop;
