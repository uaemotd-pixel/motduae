import mongoose from "mongoose";

const WISHLIST_KINDS = ["readyMade", "addon", "fabric", "design"];

const wishlistItemSchema = new mongoose.Schema(
  {
    lineId: { type: String, required: true, trim: true },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    kind: {
      type: String,
      enum: WISHLIST_KINDS,
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

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    version: { type: Number, default: 0, required: true },
    items: { type: [wishlistItemSchema], default: [] },
  },
  { timestamps: true },
);

const Wishlist = mongoose.model("Wishlist", wishlistSchema);

export default Wishlist;
export { WISHLIST_KINDS };
