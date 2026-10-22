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
    /** Optional product code — unique when provided (empty allowed for many docs) */
    code: {
      type: String,
      trim: true,
      default: "",
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
      min: 1,
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
    category: {
      type: String,
      default: "",
      trim: true,
    },
    categoryAr: {
      type: String,
      default: "",
      trim: true,
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
    material: {
      type: String,
      default: "",
      trim: true,
    },
    materialAr: {
      type: String,
      default: "",
      trim: true,
    },
    // Pattern catalog value (UI label: Pattern; legacy field name: design)
    design: {
      type: String,
      default: "",
      trim: true,
    },
    designAr: {
      type: String,
      default: "",
      trim: true,
    },
    pattern: {
      type: String,
      default: "",
      trim: true,
    },
    patternAr: {
      type: String,
      default: "",
      trim: true,
    },
    season: {
      type: String,
      default: "",
      trim: true,
    },
    seasonAr: {
      type: String,
      default: "",
      trim: true,
    },
    colors: {
      type: [String],
      default: [],
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
    ownerName: {
      type: String,
      default: "MOTD Admin",
      required: true,
      trim: true,
    },
    pickupAddress: {
      type: new mongoose.Schema(
        {
          fullName: { type: String, default: "", trim: true },
          phone: { type: String, default: "", trim: true },
          line1: { type: String, default: "", trim: true },
          line2: { type: String, default: "", trim: true },
          building: { type: String, default: "", trim: true },
          city: { type: String, default: "", trim: true },
          emirate: { type: String, default: "", trim: true },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  }
);

addOnSchema.index({ isActive: 1 });
addOnSchema.index(
  { code: 1 },
  {
    unique: true,
    partialFilterExpression: { code: { $type: "string", $gt: "" } },
  },
);

const AddOn = mongoose.model("AddOn", addOnSchema);

/** Optional add-on product code — empty string when omitted. */
export function normalizeOptionalAddOnCode(value) {
  return String(value ?? "").trim();
}

/**
 * Ensure a non-empty add-on code is not already used.
 * Empty codes are always allowed (many add-ons may omit code).
 */
export async function assertAddOnCodeAvailable(code, { excludeId } = {}) {
  const normalized = normalizeOptionalAddOnCode(code);
  if (!normalized) {
    return { ok: true, code: "" };
  }

  const filter = { code: normalized };
  if (excludeId && mongoose.Types.ObjectId.isValid(String(excludeId))) {
    filter._id = { $ne: excludeId };
  }

  const existing = await AddOn.findOne(filter).select("_id").lean();
  if (existing) {
    return {
      ok: false,
      message: "Add-on code already exists",
      code: normalized,
    };
  }

  return { ok: true, code: normalized };
}

export default AddOn;
