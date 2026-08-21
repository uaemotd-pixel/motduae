// models/customer.js
import mongoose from "mongoose";
import { UAE_EMIRATES } from "../utils/uaeAddress.js";

const measurementsSchema = new mongoose.Schema(
  {
    totalLength: { type: Number, min: 0, default: null },
    shoulderWidth: { type: Number, min: 0, default: null },
    armLength: { type: Number, min: 0, default: null },
    chestWidth: { type: Number, min: 0, default: null },
    waist: { type: Number, min: 0, default: null },
    hips: { type: Number, min: 0, default: null },
    neckWidth: { type: Number, min: 0, default: null },
    neckDepth: { type: Number, min: 0, default: null },
    armholeHeight: { type: Number, min: 0, default: null },
    sleeveOpeningWidth: { type: Number, min: 0, default: null },
    cuffWidth: { type: Number, min: 0, default: null },
    cuffLength: { type: Number, min: 0, default: null },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const addressSubSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
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
  postalCode: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
});

// models/customer.js - change savedUserSubSchema
const savedUserSubSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  gender: { type: String, enum: ["male", "female", "other", "prefer-not"] },
  relationship: {
    type: String,
    default: "other",
  },
  address: {
    type: {
      fullName: { type: String, trim: true },
      phone: { type: String, trim: true },
      emirate: {
        type: String,
        trim: true,
        validate: {
          validator(value) {
            // Family-member address is optional; empty must not fail enum
            if (value == null || value === "") return true;
            return UAE_EMIRATES.some((e) => e.value === value);
          },
          message: "{VALUE} is not an official UAE emirate",
        },
      },
      city: { type: String, trim: true },
      street: { type: String, trim: true },
      building: { type: String, trim: true },
      postalCode: { type: String, trim: true },
    },
    required: false,
    default: undefined,
  },
  dob: { type: Date },
  age: { type: Number, default: null },
  measurements: measurementsSchema,
  createdAt: { type: Date, default: Date.now },
});

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    quoteEn: { type: String, required: true, trim: true },
    quoteAr: { type: String, trim: true, default: "" },
    titleEn: { type: String, trim: true, default: "" },
    titleAr: { type: String, trim: true, default: "" },
  },
  {
    timestamps: true,
  },
);

const customerSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, unique: true, sparse: true },

    // NOTE: customer profile fields
    dob: { type: Date },
    profilePic: { type: String, trim: true },

    gender: { type: String, enum: ["male", "female", "other", "prefer-not"] },
    addresses: [addressSubSchema],
    defaultAddressId: { type: mongoose.Schema.Types.ObjectId },

    // Family members
    savedUsers: [savedUserSubSchema],

    deletedAt: { type: Date, index: true },
    reviews: [reviewSchema],

    // Customer measurements
    measurements: measurementsSchema,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

customerSchema.index(
  { userId: 1, deletedAt: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

const hasSavedUserAddressData = (address) => {
  if (!address || typeof address !== "object") return false;
  return !!(
    address.fullName?.trim?.() ||
    address.phone?.trim?.() ||
    address.emirate?.trim?.() ||
    address.city?.trim?.() ||
    address.street?.trim?.() ||
    address.building?.trim?.() ||
    address.postalCode?.trim?.()
  );
};

// Runs before validation so empty family-member emirates cannot block
// unrelated saves (e.g. updating the customer's primary address).
customerSchema.pre("validate", function (next) {
  if (this.savedUsers?.length) {
    this.savedUsers.forEach((member) => {
      if (!member.address) return;
      if (!hasSavedUserAddressData(member.address)) {
        member.address = undefined;
        return;
      }
      if (!member.address.emirate?.trim?.()) {
        member.address.emirate = undefined;
      }
    });
  }
  next();
});

customerSchema.pre("save", function (next) {
  if (this.addresses?.length) {
    const hasDefault = this.addresses.some((addr) => addr.isDefault);
    if (!hasDefault) this.addresses[0].isDefault = true;
    if (this.defaultAddressId) {
      const exists = this.addresses.some((addr) =>
        addr._id.equals(this.defaultAddressId),
      );
      if (!exists) this.defaultAddressId = undefined;
    }
  }
  next();
});

const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
export default Customer;
