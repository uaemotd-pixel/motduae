import mongoose from "mongoose";
import { CUT_UNITS } from "../utils/fabricUnits.js";

const cutSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Cut name (English) is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    nameAr: {
      type: String,
      trim: true,
      maxlength: [100, "Arabic name cannot exceed 100 characters"],
      default: "",
    },
    value: {
      type: Number,
      required: [true, "Cut length is required"],
      min: [0.01, "Cut length must be greater than 0"],
    },
    unit: {
      type: String,
      enum: {
        values: CUT_UNITS,
        message: "{VALUE} is not a valid cut unit",
      },
      required: [true, "Cut unit is required"],
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

cutSchema.index({ isActive: 1, name: 1 });
cutSchema.index({ unit: 1, value: 1 });

const Cut = mongoose.model("Cut", cutSchema);

export default Cut;
