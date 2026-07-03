import mongoose from "mongoose";

const ORDER_TYPE = "retail";

const RETAIL_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

const PAYMENT_METHODS = ["cod", "apple_pay"];

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
    emirate: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    street: { type: String, default: "", trim: true },
    building: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
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
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      default: "cod",
      required: true,
    },
    itemsPrice: { type: Number, required: true, min: 0 },
    shippingPrice: { type: Number, default: 0, min: 0, required: true },
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
    isPaid: { type: Boolean, default: false, required: true },
    isDelivered: { type: Boolean, default: false, required: true },
    paidAt: { type: Date, default: null },
    stripePaymentIntentId: { type: String, default: null, trim: true },
    deliveredAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

retailOrderSchema.index({ userId: 1, createdAt: -1 });
retailOrderSchema.index({ status: 1, createdAt: -1 });

const RetailOrder = mongoose.model("RetailOrder", retailOrderSchema);

export default RetailOrder;
export { ORDER_TYPE, RETAIL_ORDER_STATUSES, PAYMENT_METHODS };
