import mongoose from "mongoose";

export const SHIPMENT_TYPES = Object.freeze([
  "fabric_to_tailor",
  "customer_fabric_to_tailor",
  "addon_to_customer",
  "tailor_to_customer",
  "retail_to_customer",
]);

export const SHIPMENT_STATUSES = Object.freeze([
  "planned",
  "created",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
]);

export const FABRIC_LEG_TYPES = Object.freeze([
  "fabric_to_tailor",
  "customer_fabric_to_tailor",
]);

export const CUSTOMER_BOUND_TYPES = Object.freeze([
  "tailor_to_customer",
  "addon_to_customer",
  "retail_to_customer",
]);

const shipmentPartySchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ["fabric_shop", "tailor_shop", "customer", ""],
      default: "",
      trim: true,
    },
    id: { type: String, default: null },
    label: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const shipmentAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "", trim: true },
    phone: { type: String, default: "", trim: true },
    line1: { type: String, default: "", trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    emirate: { type: String, default: "", trim: true },
  },
  { _id: false },
);

const shipmentEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, default: "", trim: true },
    status: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    occurredAt: { type: Date, default: Date.now },
    raw: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { _id: false },
);

const shipmentSchema = new mongoose.Schema(
  {
    parcelKey: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: SHIPMENT_TYPES,
      required: true,
    },
    label: { type: String, default: "", trim: true },
    fee: { type: Number, default: 0, min: 0 },
    from: { type: shipmentPartySchema, default: () => ({}) },
    to: { type: shipmentPartySchema, default: () => ({}) },
    pickupAddress: { type: shipmentAddressSchema, default: null },
    dropoffAddress: { type: shipmentAddressSchema, default: null },
    itemIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    addonIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId }],
      default: [],
    },
    fabricShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FabricShop",
      default: null,
    },
    tailorShopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TailorShop",
      default: null,
    },
    shipaOrderId: { type: String, default: null, trim: true },
    awb: { type: String, default: null, trim: true },
    trackingUrl: { type: String, default: "", trim: true },
    labelUrl: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: SHIPMENT_STATUSES,
      default: "planned",
      required: true,
    },
    events: { type: [shipmentEventSchema], default: [] },
    lastSyncedAt: { type: Date, default: null },
    createdAtShipa: { type: Date, default: null },
  },
  { _id: true },
);

/**
 * Retail statusHistory mirrors CustomOrder so timeline can auto-update.
 * Status enum is intentionally open string to avoid circular imports with RetailOrder.
 */
function buildStatusHistoryEntrySchema(statusEnum) {
  return new mongoose.Schema(
    {
      status: {
        type: String,
        ...(Array.isArray(statusEnum) && statusEnum.length
          ? { enum: statusEnum }
          : {}),
        required: true,
      },
      note: { type: String, default: "", trim: true },
      changedAt: { type: Date, default: Date.now, required: true },
      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    { _id: false },
  );
}

export {
  shipmentSchema,
  shipmentPartySchema,
  shipmentAddressSchema,
  shipmentEventSchema,
  buildStatusHistoryEntrySchema,
};
