import mongoose from "mongoose";

const ROLES = [
  "customer",
  "admin",
  "fabric_store",
  "tailor",
  "delivery",
  "sub-admin",
];

const APPROVAL_STATUSES = ["pending", "approved", "rejected"];

const AUTH_PROVIDERS = ["local", "google"];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    googleId: { type: String, sparse: true, unique: true },
    authProvider: {
      type: String,
      enum: AUTH_PROVIDERS,
      default: "local",
      required: true,
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    phone: { type: String, trim: true },
    role: {
      type: String,
      enum: ROLES,
      default: "customer",
      required: true,
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: function defaultApprovalStatus() {
        return (this.role === "tailor" || this.role === "fabric_store") ? "pending" : "approved";
      },
      required: true,
    },
    rejectionNote: { type: String, default: "", trim: true },
    isActive: { type: Boolean, default: true, required: true },
    isAdmin: { type: Boolean, default: false, required: true },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ role: 1, approvalStatus: 1 });

userSchema.pre("save", function syncDerivedFields(next) {
  this.isAdmin = this.role === "admin" || this.role === "sub-admin";
  if (this.role !== "tailor" && this.role !== "fabric_store") {
    this.approvalStatus = "approved";
    this.rejectionNote = "";
  }
  next();
});

const User = mongoose.model("User", userSchema);

export default User;
export { ROLES, APPROVAL_STATUSES, AUTH_PROVIDERS };
