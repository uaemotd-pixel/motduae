import mongoose from "mongoose";

/**
 * Atomic per-type sequence for public order IDs (RO-####XXX / CO-####XXX).
 * One document per order type: _id "retail" | "custom".
 */
const orderCounterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: false },
);

const OrderCounter =
  mongoose.models.OrderCounter ||
  mongoose.model("OrderCounter", orderCounterSchema);

export default OrderCounter;
