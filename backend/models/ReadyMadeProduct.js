import mongoose from "mongoose";

const readyMadeProductSchema = new mongoose.Schema(
  {
    // Product Name
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

    // Optional Product Code
    code: {
      type: String,
      trim: true,
      default: "",
    },

     // Slug – URL‑friendly identifier (unique)
    slug: {
      type: String,
      unique: true,
      trim: true,
    },

    // Description
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

    // Tags
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

    // Colors (multiple selected colors)
    colors: {
      type: [String],
      default: [],
      required: true,
    },

    // Images
    thumbnailImage: {
      type: String,
      required: true,
      trim: true,
    },

    images: {
      type: [String],
      default: [],
    },

    // Fabric Type
    fabricType: {
      type: String,
      required: false,
      trim: true,
    },

    fabricTypeAr: {
      type: String,
      required: false,
      trim: true,
    },

    // Tailor Name
    tailorName: {
      type: String,
      trim: true,
    },

    tailorNameAr: {
      type: String,
      trim: true,
    },

    // Ref relations
    fabricShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FabricShop",
      required: true,
    },

    fabricId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Fabric",
      required: true,
    },

    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TailorShop",
      required: false,
    },

    designId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Design",
      required: false,
    },

    // Fabric Details
    metersPerFabric: {
      type: Number,
      required: true,
      min: 0,
    },

    fabricPriceAED: {
      type: Number,
      min: 0,
    },

    mukhawarPriceAED: {
      type: Number,
      min: 0,
    },

    finalSellingPriceAED: {
      type: Number,
      required: true,
      min: 0,
    },

    // Stock
    availableFabricStock: {
      type: Number,
      required: true,
      min: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Useful indexes
readyMadeProductSchema.index({ isActive: 1 });
readyMadeProductSchema.index({ code: 1 });

// Pre‑save hook to auto‑generate slug if missing, and populate text details from refs
readyMadeProductSchema.pre("save", async function (next) {
  if (!this.slug) {
    const base = this.name || this.nameAr || "ready-made";
    this.slug = base
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  try {
    if (this.fabricId) {
      const FabricModel = mongoose.model("Fabric");
      const fabric = await FabricModel.findById(this.fabricId);
      if (fabric) {
        this.fabricType = fabric.name;
        this.fabricTypeAr = fabric.nameAr || fabric.name;
      }
    }
    if (this.tailorShopId) {
      const TailorShopModel = mongoose.model("TailorShop");
      const shop = await TailorShopModel.findById(this.tailorShopId);
      if (shop) {
        this.tailorName = shop.name;
        this.tailorNameAr = shop.nameAr || shop.name;
      }
    } else {
      this.tailorName = "";
      this.tailorNameAr = "";
    }
  } catch (err) {
    console.error("Error in ReadyMadeProduct pre-save hook:", err);
  }

  next();
});

const ReadyMadeProduct = mongoose.model(
  "ReadyMadeProduct",
  readyMadeProductSchema,
);

export default ReadyMadeProduct;
