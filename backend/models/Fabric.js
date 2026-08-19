import mongoose from "mongoose";
import {
  UAE_EMIRATES,
  isValidEmirate,
  normalizeAddress,
  normalizeEmirate,
} from "../utils/uaeAddress.js";

const storePickupAddressSchema = new mongoose.Schema(
  {
    emirate: {
      type: String,
      required: true,
      trim: true,
      enum: {
        values: UAE_EMIRATES.map((e) => e.value),
        message: "{VALUE} is not an official UAE emirate",
      },
    },
    city: { type: String, required: true, trim: true },
    street: { type: String, default: "", trim: true },
    building: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
  },
  {
    _id: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

storePickupAddressSchema.virtual("emirateAr").get(function () {
  const found = UAE_EMIRATES.find((e) => e.value === this.emirate);
  return found?.ar || "";
});

storePickupAddressSchema.virtual("emirateEn").get(function () {
  const found = UAE_EMIRATES.find((e) => e.value === this.emirate);
  return found?.en || "";
});

const fabricSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
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
    material: {
      type: String,
      required: true,
    },
    materialAr: { type: String, trim: true, default: "" },
    tag: { type: String, default: "", trim: true },
    tagAr: { type: String, default: "", trim: true },
    colors: { type: [String], default: [] },
    pricePerMeter: { type: Number, required: true, min: 0 },
    stockInMeters: { type: Number, required: true, default: 0, min: 0 },
    listedByStore: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fabricShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FabricShop",
    },
    storePickupAddress: {
      type: storePickupAddressSchema,
      required: true,
    },
    isVariantOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fabric",
      default: null,
    },
    isActive: { type: Boolean, default: true, required: true },
  },
  {
    timestamps: true,
  },
);

fabricSchema.index({ isActive: 1, material: 1 });
fabricSchema.index({ listedByStore: 1 });
fabricSchema.index({ isVariantOf: 1 });

fabricSchema.pre("save", async function populateFabricShopId(next) {
  if (this.listedByStore) {
    try {
      const FabricShop = mongoose.model("FabricShop");
      const shop = await FabricShop.findOne({ ownerId: this.listedByStore });
      if (shop) {
        this.fabricShopId = shop._id;
      }
    } catch (err) {
      console.error(
        "Failed to auto-populate fabricShopId on pre-save hook:",
        err,
      );
    }
  }
  next();
});

const Fabric = mongoose.model("Fabric", fabricSchema);

export default Fabric;
