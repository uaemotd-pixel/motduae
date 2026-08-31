import mongoose from "mongoose";
import {
  YEARS_OPERATING,
  MAKE_TIMES,
  WORK_SETUPS,
  OFFERINGS,
} from "../services/partnerApplication/policy.js";

const partnerApplicationSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    role: {
      type: String,
      enum: ["tailor", "fabric_store"],
      required: true,
    },
    businessName: { type: String, default: "", trim: true },
    businessNameAr: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    emirate: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    location: { type: String, default: "", trim: true },
    area: { type: String, default: "", trim: true },
    about: { type: String, default: "", trim: true },
    aboutAr: { type: String, default: "", trim: true },
    yearsOperating: {
      type: String,
      enum: [...YEARS_OPERATING, ""],
      default: "",
    },
    logoUrl: { type: String, default: "", trim: true },
    website: { type: String, default: "", trim: true },
    social: { type: mongoose.Schema.Types.Mixed, default: [] },
    licenceNumber: { type: String, default: "", trim: true },
    licenceFileUrl: { type: String, default: "", trim: true },
    makeTime: {
      type: String,
      enum: [...MAKE_TIMES, ""],
      default: "",
    },
    workSetup: {
      type: String,
      enum: [...WORK_SETUPS, ""],
      default: "",
    },
    offering: {
      type: String,
      enum: [...OFFERINGS, ""],
      default: "",
    },
    submittedAt: { type: Date, default: undefined },
    confirmedAt: { type: Date, default: undefined },
    requestNumber: { type: String, trim: true, default: undefined },
    partnerNote: { type: String, default: "", trim: true, maxlength: 1000 },
    resubmitCount: { type: Number, default: 0 },
    resubmittedAt: { type: Date, default: undefined },
  },
  { timestamps: true },
);

partnerApplicationSchema.index({ ownerId: 1 }, { unique: true });
partnerApplicationSchema.index({ role: 1, submittedAt: 1 });
partnerApplicationSchema.index(
  { requestNumber: 1 },
  { unique: true, sparse: true },
);

const PartnerApplication = mongoose.model(
  "PartnerApplication",
  partnerApplicationSchema,
);

export default PartnerApplication;
