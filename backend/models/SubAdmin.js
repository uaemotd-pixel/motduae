import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const SubAdminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: String,
  address: {
    name: String,
    phone: String,
    emirate: String,
    city: String,
    street: String,
    building: String,
    postalCode: String,
  },
  perms: {
    customers: { type: Boolean, default: false },
    readyMade: { type: Boolean, default: false },
    fabrics: { type: Boolean, default: false },
    tailors: { type: Boolean, default: false },
    orders: { type: Boolean, default: false },
    partners: { type: Boolean, default: false },
    settings: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: Date.now },
});

SubAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("SubAdmin", SubAdminSchema);
