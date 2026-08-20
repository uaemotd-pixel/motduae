import mongoose from "mongoose";
import {
  shipmentSchema,
  buildStatusHistoryEntrySchema,
} from "./schemas/shipmentSchemas.js";
import { UAE_EMIRATES } from "../utils/uaeAddress.js";

const ORDER_TYPE = "retail";

const RETAIL_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_METHODS = ["apple_pay", "card"];

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReadyMadeProduct",
      required: true,
    },
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, default: "", trim: true },
    slug: { type: String, required: true, trim: true },
    image: { type: String, default: "", trim: true },
    size: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const shippingAddressSchema = new mongoose.Schema(
  {
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
    postalCode: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
  },
  { _id: false },
);

shippingAddressSchema.virtual("emirateAr").get(function () {
  const found = UAE_EMIRATES.find((e) => e.value === this.emirate);
  return found?.ar || "";
});

shippingAddressSchema.virtual("emirateEn").get(function () {
  const found = UAE_EMIRATES.find((e) => e.value === this.emirate);
  return found?.en || "";
});

const deliveryBreakdownEntrySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    label: { type: String, default: "", trim: true },
    fee: { type: Number, required: true, min: 0 },
    from: {
      kind: { type: String, default: "", trim: true },
      id: { type: String, default: null },
      label: { type: String, default: "", trim: true },
    },
    to: {
      kind: { type: String, default: "", trim: true },
      id: { type: String, default: null },
      label: { type: String, default: "", trim: true },
    },
    pickupAddress: {
      fullName: { type: String, default: "", trim: true },
      phone: { type: String, default: "", trim: true },
      line1: { type: String, default: "", trim: true },
      line2: { type: String, default: "", trim: true },
      city: { type: String, default: "", trim: true },
      emirate: { type: String, default: "", trim: true },
    },
    billable: { type: Boolean, default: true },
    fabricShopId: { type: String, default: null, trim: true },
    tailorShopId: { type: String, default: null, trim: true },
    addonIds: { type: [String], default: [] },
  },
  { _id: false },
);

const retailOrderSchema = new mongoose.Schema(
  {
    orderType: {
      type: String,
      default: ORDER_TYPE,
      enum: [ORDER_TYPE],
      immutable: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderItems: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator(items) {
          return items.length > 0;
        },
        message: "At least one order item is required",
      },
    },
    shippingAddress: {
      type: shippingAddressSchema,
      required: true,
    },
    contactEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "card",
      required: true,
    },
    itemsPrice: { type: Number, required: true, min: 0 },
    shippingPrice: { type: Number, default: 0, min: 0, required: true },
    parcelCount: { type: Number, default: 0, min: 0 },
    perParcelFee: { type: Number, default: null, min: 0 },
    deliveryBreakdown: {
      type: [deliveryBreakdownEntrySchema],
      default: [],
    },
    vatRate: { type: Number, default: 0.05, min: 0, max: 1, required: true },
    vatAmount: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "AED", required: true },
    status: {
      type: String,
      enum: RETAIL_ORDER_STATUSES,
      default: "pending",
      required: true,
    },
    statusHistory: {
      type: [buildStatusHistoryEntrySchema(RETAIL_ORDER_STATUSES)],
      default: [],
    },
    shipments: {
      type: [shipmentSchema],
      default: [],
    },
    isPaid: { type: Boolean, default: false, required: true },
    isDelivered: { type: Boolean, default: false, required: true },
    paidAt: { type: Date, default: null },
    packedAt: { type: Date, default: null },
    stripePaymentIntentId: { type: String, default: null, trim: true },
    deliveredAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

retailOrderSchema.index({ userId: 1, createdAt: -1 });
retailOrderSchema.index({ status: 1, createdAt: -1 });
retailOrderSchema.index({ "shipments.awb": 1 });
retailOrderSchema.index({ "shipments.shipaOrderId": 1 });
retailOrderSchema.index(
  { stripePaymentIntentId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      stripePaymentIntentId: { $type: "string", $gt: "" },
    },
  },
);

const RetailOrder = mongoose.model("RetailOrder", retailOrderSchema);

export default RetailOrder;
export { ORDER_TYPE, RETAIL_ORDER_STATUSES, PAYMENT_METHODS };
