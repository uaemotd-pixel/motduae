// models/customer.js
import mongoose from "mongoose";

const addressSubSchema = new mongoose.Schema({
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  emirate: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  street: { type: String, default: "", trim: true },
  building: { type: String, default: "", trim: true },
  postalCode: { type: String, default: "" },
  isDefault: { type: Boolean, default: false },
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
  }
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
    dob: { type: Date }, // date of birth
    profilePic: { type: String, trim: true }, // URL or path
    gender: { type: String, enum: ["male", "female", "other", "prefer-not"] },
    addresses: [addressSubSchema],
    defaultAddressId: { type: mongoose.Schema.Types.ObjectId },
    deletedAt: { type: Date, index: true },
    reviews: [reviewSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Removed age, added dob & profilePic

customerSchema.index(
  { userId: 1, deletedAt: 1 },
  { unique: true, partialFilterExpression: { deletedAt: null } },
);

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
