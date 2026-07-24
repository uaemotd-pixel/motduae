import mongoose from "mongoose";

const seasonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Season name (English) is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    nameAr: {
      type: String,
      trim: true,
      maxlength: [100, "Arabic name cannot exceed 100 characters"],
      default: "",
    },
    domain: {
      type: String,
      enum: {
        values: ["designs", "fabrics", "ready-made", "add-ons", "general"],
        message: "{VALUE} is not a valid domain",
      },
      default: "general",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    descriptionAr: {
      type: String,
      trim: true,
      maxlength: [500, "Arabic description cannot exceed 500 characters"],
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Compound index for efficient queries by domain
seasonSchema.index({ domain: 1, name: 1 });
seasonSchema.index({ domain: 1, isActive: 1 });

const Season = mongoose.model("Season", seasonSchema);

export default Season;
