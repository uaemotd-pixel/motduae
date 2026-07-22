import mongoose from "mongoose";

const addOnSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameAr: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    descriptionAr: {
      type: String,
      default: "",
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    thumbnailImage: {
      type: String,
      required: true,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    tag: {
      type: String,
      default: "",
      trim: true,
    },
    tagAr: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
    fabricShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FabricShop",
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

addOnSchema.index({ isActive: 1 });

const AddOn = mongoose.model("AddOn", addOnSchema);

export default AddOn;
