import mongoose from "mongoose";

const shopPickupAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    line1: { type: String, default: "", trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    emirate: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const fabricShopSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: { type: String, trim: true, lowercase: true },
    description: { type: String, default: "", trim: true },
    descriptionAr: { type: String, default: "", trim: true },
    logo: { type: String, default: "", trim: true },
    coverImage: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    pickupAddress: {
      type: shopPickupAddressSchema,
      default: () => ({}),
    },
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
      ref: "User",
      required: true,
      unique: true,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
    collection: "fabricshop",
  },
);

fabricShopSchema.index({ isActive: 1, city: 1 });
fabricShopSchema.index({ ownerId: 1 });
fabricShopSchema.index(
  { slug: 1 },
  {
    unique: true,
    name: "slug_unique_when_set",
    partialFilterExpression: { slug: { $type: "string", $gt: "" } },
  },
);

const FabricShop = mongoose.model("FabricShop", fabricShopSchema);

export default FabricShop;
