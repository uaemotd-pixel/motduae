import mongoose from "mongoose";

const CART_KINDS = ["readyMade", "addon", "fabric"];

const cartItemSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true, trim: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    kind: {
      type: String,
      enum: CART_KINDS,
      required: true,
    },
    cutId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    version: { type: Number, default: 0, required: true },
    items: { type: [cartItemSchema], default: [] },
  },
  { timestamps: true },
);

const Cart = mongoose.model("Cart", cartSchema);

export default Cart;
export { CART_KINDS };
