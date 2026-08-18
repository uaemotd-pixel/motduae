import mongoose from "mongoose";
import CustomOrder from "../models/CustomOrder.js";
import RetailOrder from "../models/RetailOrder.js";
import FabricShop from "../models/FabricShop.js";
import TailorShop from "../models/TailorShop.js";
import PlatformSettings from "../models/PlatformSettings.js";
import {
  CUSTOMER_BOUND_TYPES,
  FABRIC_LEG_TYPES,
  SHIPMENT_STATUSES,
  isBillableShipmentType,
  requiresMotdFulfillmentAddress,
} from "../models/schemas/shipmentSchemas.js";
import { PARCEL_TYPES } from "./parcelPlanService.js";
import { getShipaClient } from "./shipa/shipaClient.js";
import { normalizeShopPickupAddress } from "../utils/shopPickupAddress.js";
import {
  notifyCustomStatusChange,
  notifyRetailStatusChange,
} from "./notificationService.js";

const OBJECT_ID_RE = /^[a-f\d]{24}$/i;

const SHIPA_STATUS_MAP = Object.freeze({
  created: "created",
  pending: "created",
  booked: "created",
  picked_up: "in_transit",
  pickedup: "in_transit",
  in_transit: "in_transit",
  intransit: "in_transit",
  transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  outfordelivery: "out_for_delivery",
  ofd: "out_for_delivery",
  delivered: "delivered",
  failed: "failed",
  undelivered: "failed",
  delivery_failed: "failed",
  exception: "failed",
  cancelled: "cancelled",
  canceled: "cancelled",
});

function idStr(value) {
  if (value == null) return null;
  return String(value);
}

function asObjectId(value) {
  const str = idStr(value);
  if (!str || !OBJECT_ID_RE.test(str)) return null;
  return new mongoose.Types.ObjectId(str);
}

function emptyAddress() {
  return {
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    emirate: "",
  };
}

function normalizeAddress(input) {
  if (!input || typeof input !== "object") return emptyAddress();
  return {
    fullName: String(input.fullName || "").trim(),
    phone: String(input.phone || "").trim(),
    line1: String(input.line1 || input.street || input.building || "").trim(),
    line2: String(input.line2 || input.notes || "").trim(),
    city: String(input.city || "").trim(),
    emirate: String(input.emirate || "").trim(),
  };
}

function addressIsComplete(address) {
  if (!address) return false;
  return Boolean(
    address.line1 &&
      address.city &&
      address.emirate &&
      (address.fullName || address.phone),
  );
}

function shopAddressFromDoc(shop) {
  if (!shop) return emptyAddress();
  const pickup = shop.pickupAddress || {};
  return normalizeAddress({
    fullName: pickup.fullName || shop.name || "",
    phone: pickup.phone || shop.phone || "",
    line1: pickup.line1 || shop.location || "",
    line2: pickup.line2 || "",
    city: pickup.city || shop.city || "",
    emirate: pickup.emirate || "",
  });
}

function detectOrderKind(order) {
  if (!order) return null;
  if (order.orderType === "retail" || order.orderItems) return "retail";
  if (order.orderType === "custom" || order.pricing) return "custom";
  return null;
}

function getBreakdown(order, orderKind) {
  if (orderKind === "custom") {
    return Array.isArray(order.pricing?.deliveryBreakdown)
      ? order.pricing.deliveryBreakdown
      : [];
  }
  return Array.isArray(order.deliveryBreakdown) ? order.deliveryBreakdown : [];
}

function resolveLinkedIdsFromBreakdown(entry, order, orderKind) {
  const fabricShopId = asObjectId(
    entry.fabricShopId ||
      (entry.from?.kind === "fabric_shop" ? entry.from.id : null),
  );
  const tailorShopId = asObjectId(
    entry.tailorShopId ||
      (entry.from?.kind === "tailor_shop"
        ? entry.from.id
        : entry.to?.kind === "tailor_shop"
          ? entry.to.id
          : null),
  );

  const itemIds = [];
  const addonIds = [];

  if (orderKind === "custom") {
    const items = Array.isArray(order.items) ? order.items : [];
    for (const item of items) {
      const itemTailor = idStr(item.tailorShopId);
      if (tailorShopId && itemTailor === String(tailorShopId)) {
        if (item._id) itemIds.push(item._id);
      }
    }

    if (entry.type === PARCEL_TYPES.ADDON_TO_CUSTOMER) {
      for (const addon of order.addons || []) {
        if (addon?.addonId) addonIds.push(addon.addonId);
      }
    }
  }

  if (Array.isArray(entry.addonIds)) {
    for (const id of entry.addonIds) {
      const oid = asObjectId(id);
      if (oid) addonIds.push(oid);
    }
  }

  return { fabricShopId, tailorShopId, itemIds, addonIds };
}

/**
 * Seed `shipments[]` from the charged delivery breakdown when missing.
 */
export function ensurePlannedShipments(order, orderKind = detectOrderKind(order)) {
  if (!order) return order;
  if (Array.isArray(order.shipments) && order.shipments.length > 0) {
    return order;
  }

  const breakdown = getBreakdown(order, orderKind);
  order.shipments = breakdown.map((entry) => {
    const linked = resolveLinkedIdsFromBreakdown(entry, order, orderKind);
    return {
      parcelKey: entry.key,
      type: entry.type,
      label: entry.label || entry.type,
      fee: typeof entry.fee === "number" ? entry.fee : 0,
      from: {
        kind: entry.from?.kind || "",
        id: entry.from?.id ?? null,
        label: entry.from?.label || "",
      },
      to: {
        kind: entry.to?.kind || "",
        id: entry.to?.id ?? null,
        label: entry.to?.label || "",
      },
      itemIds: linked.itemIds,
      addonIds: linked.addonIds,
      fabricShopId: linked.fabricShopId,
      tailorShopId: linked.tailorShopId,
      pickupAddress: entry.pickupAddress || null,
      billable:
        typeof entry.billable === "boolean"
          ? entry.billable
          : isBillableShipmentType(entry.type),
      status: "planned",
      events: [],
    };
  });

  return order;
}

async function resolveMotdFulfillmentAddress() {
  const settings = await PlatformSettings.getSettings();
  return normalizeShopPickupAddress(settings?.fulfillmentAddress);
}

async function resolvePartyAddress(party, order, orderKind, motdAddress = null) {
  const kind = party?.kind;

  if (kind === "customer") {
    if (orderKind === "custom") {
      // Self-fabric pickup prefers explicit pickupAddress
      if (order.pickupAddress?.line1) {
        return normalizeAddress(order.pickupAddress);
      }
      return normalizeAddress(order.customerDeliveryAddress);
    }
    return normalizeAddress(order.shippingAddress);
  }

  if (kind === "fabric_shop") {
    const shopId = asObjectId(party.id) || asObjectId(order.fabricShopId);
    if (shopId) {
      const shop = await FabricShop.findById(shopId).select(
        "name phone city location pickupAddress",
      );
      const address = shopAddressFromDoc(shop);
      if (addressIsComplete(address) || address.line1) return address;
    }
    return emptyAddress();
  }

  if (kind === "tailor_shop") {
    const shopId = asObjectId(party.id);
    if (shopId) {
      const shop = await TailorShop.findById(shopId).select(
        "name phone city location pickupAddress",
      );
      const address = shopAddressFromDoc(shop);
      if (addressIsComplete(address) || address.line1) return address;
    }
    return emptyAddress();
  }

  if (kind === "motd") {
    if (motdAddress) return normalizeAddress(motdAddress);
    const fulfillment = await resolveMotdFulfillmentAddress();
    return fulfillment ? normalizeAddress(fulfillment) : emptyAddress();
  }

  return emptyAddress();
}

function shipmentNeedsShipaCreate(shipment) {
  if (!shipment) return false;
  if (shipment.awb || shipment.shipaOrderId) return false;
  if (shipment.status === "cancelled") return false;
  return shipment.status === "planned" || shipment.status === "created";
}

function typesFilterSet(typesFilter) {
  if (!typesFilter) return null;
  const list = Array.isArray(typesFilter) ? typesFilter : [typesFilter];
  return new Set(list.map(String));
}

function appendStatusHistory(order, status, note, changedBy = null) {
  if (!order.statusHistory) order.statusHistory = [];
  order.statusHistory.push({
    status,
    note: note || "",
    changedAt: new Date(),
    changedBy,
  });
}

function isFabricLeg(type) {
  return FABRIC_LEG_TYPES.includes(type);
}

function isCustomerBound(type) {
  return CUSTOMER_BOUND_TYPES.includes(type);
}

function activeShipments(order) {
  return (order.shipments || []).filter((s) => s.status !== "cancelled");
}

/**
 * Aggregate custom order status from shipment progress.
 * Returns the new status if it should change, else null.
 */
export function resolveCustomStatusFromShipments(order) {
  const shipments = activeShipments(order);
  if (!shipments.length) return null;

  const fabricLegs = shipments.filter((s) => isFabricLeg(s.type));
  const customerBound = shipments.filter((s) => isCustomerBound(s.type));
  const current = order.status;

  const terminalSkip = new Set([
    "return_requested",
    "return_approved",
    "return_rejected",
    "refund_processed",
  ]);
  if (terminalSkip.has(current)) return null;

  if (
    customerBound.length > 0 &&
    customerBound.every((s) => s.status === "delivered")
  ) {
    if (current !== "delivered") return "delivered";
    return null;
  }

  const anyCustomerInTransit = customerBound.some((s) =>
    ["in_transit", "out_for_delivery", "delivered"].includes(s.status),
  );
  if (anyCustomerInTransit && current !== "delivered") {
    // Prefer OFD once any customer parcel is moving
    if (
      !["out_for_delivery", "delivered"].includes(current) &&
      ["confirmed", "fabric_delivered", "at_tailor", "in_production", "ready"].includes(
        current,
      )
    ) {
      return "out_for_delivery";
    }
  }

  if (
    fabricLegs.length > 0 &&
    fabricLegs.every((s) => s.status === "delivered") &&
    ["confirmed", "pending"].includes(current)
  ) {
    return "fabric_delivered";
  }

  return null;
}

/**
 * Aggregate retail order status from shipment progress.
 */
export function resolveRetailStatusFromShipments(order) {
  const shipments = activeShipments(order).filter((s) =>
    isCustomerBound(s.type),
  );
  if (!shipments.length) return null;

  const current = order.status;
  if (current === "cancelled") return null;

  if (shipments.every((s) => s.status === "delivered")) {
    if (current !== "delivered") return "delivered";
    return null;
  }

  const anyMoving = shipments.some((s) =>
    ["in_transit", "out_for_delivery", "delivered"].includes(s.status),
  );
  if (anyMoving && ["pending", "confirmed"].includes(current)) {
    return "shipped";
  }

  return null;
}

async function applyOrderStatusAggregation(order, orderKind, changedBy = null) {
  if (orderKind === "custom") {
    const next = resolveCustomStatusFromShipments(order);
    if (!next || next === order.status) return { changed: false, status: order.status };

    const prev = order.status;
    order.status = next;
    const note =
      next === "fabric_delivered"
        ? `All fabric inbound parcels delivered (was ${prev})`
        : `Status advanced from ${prev} via Shipa shipment updates`;
    appendStatusHistory(order, next, note, changedBy);

    await order.save();
    await notifyCustomStatusChange(order, next, changedBy);
    return { changed: true, status: next };
  }

  const next = resolveRetailStatusFromShipments(order);
  if (!next || next === order.status) return { changed: false, status: order.status };

  const prev = order.status;
  order.status = next;
  if (next === "delivered") {
    order.isDelivered = true;
    order.deliveredAt = new Date();
  }
  appendStatusHistory(
    order,
    next,
    `Status advanced from ${prev} via Shipa shipment updates`,
    changedBy,
  );
  await order.save();
  await notifyRetailStatusChange(order, next, changedBy);
  return { changed: true, status: next };
}

export const CONFIRMED_CUSTOM_SHIPMENT_TYPES = Object.freeze([
  PARCEL_TYPES.FABRIC_TO_TAILOR,
  PARCEL_TYPES.CUSTOMER_FABRIC_TO_TAILOR,
  PARCEL_TYPES.ADDON_TO_CUSTOMER,
]);

export const READY_CUSTOM_SHIPMENT_TYPES = Object.freeze([
  PARCEL_TYPES.TAILOR_TO_CUSTOMER,
]);

export const CONFIRMED_RETAIL_SHIPMENT_TYPES = Object.freeze([
  PARCEL_TYPES.RETAIL_TO_CUSTOMER,
]);

/**
 * Create Shipa parcels for an order.
 * Only creates missing Shipa orders for shipments matching `typesFilter`
 * (omit filter to create all planned shipments that still need Shipa).
 *
 * @param {object} orderDoc - CustomOrder or RetailOrder mongoose doc (or lean+id)
 * @param {string[]|string|null} typesFilter
 * @param {{ client?: object, tailorShopId?: string, changedBy?: object }} [options]
 */
export async function createShipmentsForOrder(
  orderDoc,
  typesFilter = null,
  options = {},
) {
  if (!orderDoc?._id) {
    throw new Error("createShipmentsForOrder requires a persisted order");
  }

  const orderKind = detectOrderKind(orderDoc);
  if (!orderKind) {
    throw new Error("Unable to determine order type for shipment creation");
  }

  const Model = orderKind === "custom" ? CustomOrder : RetailOrder;
  const order = await Model.findById(orderDoc._id);
  if (!order) {
    throw new Error("Order not found for shipment creation");
  }

  ensurePlannedShipments(order, orderKind);

  const filter = typesFilterSet(typesFilter);
  const tailorFilter = options.tailorShopId
    ? String(options.tailorShopId)
    : null;
  const client = options.client || getShipaClient();

  const created = [];
  const skipped = [];
  const errors = [];

  const needsMotdAddress = order.shipments.some(
    (shipment) =>
      requiresMotdFulfillmentAddress(shipment.type) &&
      (!filter || filter.has(shipment.type)),
  );
  const motdAddress = needsMotdAddress
    ? await resolveMotdFulfillmentAddress()
    : null;

  for (const shipment of order.shipments) {
    if (filter && !filter.has(shipment.type)) {
      skipped.push({ parcelKey: shipment.parcelKey, reason: "type_filtered" });
      continue;
    }

    if (
      tailorFilter &&
      shipment.type === PARCEL_TYPES.TAILOR_TO_CUSTOMER &&
      idStr(shipment.tailorShopId) !== tailorFilter
    ) {
      skipped.push({
        parcelKey: shipment.parcelKey,
        reason: "tailor_filtered",
      });
      continue;
    }

    if (!shipmentNeedsShipaCreate(shipment)) {
      skipped.push({
        parcelKey: shipment.parcelKey,
        reason: "already_created",
      });
      continue;
    }

    if (requiresMotdFulfillmentAddress(shipment.type) && !motdAddress) {
      errors.push({
        parcelKey: shipment.parcelKey,
        error:
          "MOTD fulfillment address is incomplete — set it in Admin → Settings before creating this parcel",
      });
      continue;
    }

    const plannedPickup = normalizeAddress(shipment.pickupAddress);
    const pickupAddress =
      plannedPickup.line1
        ? plannedPickup
        : await resolvePartyAddress(
            shipment.from,
            order,
            orderKind,
            motdAddress,
          );
    const dropoffAddress = await resolvePartyAddress(
      shipment.to,
      order,
      orderKind,
      motdAddress,
    );

    if (!pickupAddress.line1 || !dropoffAddress.line1) {
      errors.push({
        parcelKey: shipment.parcelKey,
        error:
          "Missing pickup or dropoff address — set the ready-made pickup address (or shop pickupAddress) and customer delivery address",
      });
      continue;
    }

    try {
      const result = await client.createOrder({
        reference: `${order._id}:${shipment.parcelKey}`,
        parcelKey: shipment.parcelKey,
        orderId: String(order._id),
        shipmentType: shipment.type,
        pickup: pickupAddress,
        dropoff: dropoffAddress,
        metadata: {
          orderType: orderKind,
          fabricShopId: idStr(shipment.fabricShopId),
          tailorShopId: idStr(shipment.tailorShopId),
        },
      });

      shipment.pickupAddress = pickupAddress;
      shipment.dropoffAddress = dropoffAddress;
      shipment.shipaOrderId = result.shipaOrderId || null;
      shipment.awb = result.awb || null;
      shipment.trackingUrl = result.trackingUrl || "";
      shipment.labelUrl = result.labelUrl || "";
      shipment.status = "created";
      shipment.createdAtShipa = new Date();
      shipment.lastSyncedAt = new Date();
      shipment.events = [
        ...(shipment.events || []),
        {
          eventId: `create:${result.awb || result.shipaOrderId}`,
          status: "created",
          description: "Shipa order created",
          occurredAt: new Date(),
          raw: result.raw || null,
        },
      ];

      created.push({
        parcelKey: shipment.parcelKey,
        awb: shipment.awb,
        shipaOrderId: shipment.shipaOrderId,
        type: shipment.type,
      });
    } catch (error) {
      errors.push({
        parcelKey: shipment.parcelKey,
        error: error.message || String(error),
      });
    }
  }

  if (created.length > 0) {
    const noteParts = created.map(
      (c) => `${c.type} AWB ${c.awb || "pending"}`,
    );
    appendStatusHistory(
      order,
      order.status,
      `Shipa parcels created: ${noteParts.join("; ")}`,
      options.changedBy || null,
    );
  }

  if (errors.length > 0) {
    appendStatusHistory(
      order,
      order.status,
      `Shipa parcel create failed: ${errors
        .map((e) => `${e.parcelKey || "unknown"}: ${e.error}`)
        .join("; ")}`,
      options.changedBy || null,
    );
  }

  await order.save();

  return {
    order,
    orderKind,
    created,
    skipped,
    errors,
  };
}

function normalizeWebhookStatus(rawStatus) {
  if (!rawStatus) return null;
  const key = String(rawStatus)
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  const compact = key.replace(/_/g, "");
  return (
    SHIPA_STATUS_MAP[key] ||
    SHIPA_STATUS_MAP[compact] ||
    (SHIPMENT_STATUSES.includes(key) ? key : null)
  );
}

async function findOrderByAwb(awb) {
  if (!awb) return null;
  const custom = await CustomOrder.findOne({ "shipments.awb": awb });
  if (custom) return { order: custom, orderKind: "custom" };
  const retail = await RetailOrder.findOne({ "shipments.awb": awb });
  if (retail) return { order: retail, orderKind: "retail" };
  return null;
}

/**
 * Apply a per-AWB Shipa webhook payload. Idempotent by AWB + eventId (or status+time).
 *
 * Expected payload shape (designed contract until official docs arrive):
 * {
 *   eventId?: string,
 *   awb: string,
 *   shipaOrderId?: string,
 *   status: string,
 *   description?: string,
 *   occurredAt?: string|Date,
 *   trackingUrl?: string,
 *   labelUrl?: string,
 * }
 */
export async function applyShipaWebhook(payload = {}) {
  const awb = String(payload.awb || payload.AWB || "").trim();
  if (!awb) {
    const error = new Error("Webhook payload missing awb");
    error.statusCode = 400;
    throw error;
  }

  const mappedStatus = normalizeWebhookStatus(
    payload.status || payload.eventStatus || payload.event_type,
  );
  if (!mappedStatus) {
    const error = new Error(
      `Unrecognized Shipa status: ${payload.status || payload.eventStatus || "unknown"}`,
    );
    error.statusCode = 400;
    throw error;
  }

  const found = await findOrderByAwb(awb);
  if (!found) {
    const error = new Error(`No order found for AWB ${awb}`);
    error.statusCode = 404;
    throw error;
  }

  const { order, orderKind } = found;
  const shipment = (order.shipments || []).find((s) => s.awb === awb);
  if (!shipment) {
    const error = new Error(`Shipment not found for AWB ${awb}`);
    error.statusCode = 404;
    throw error;
  }

  const occurredAt = payload.occurredAt
    ? new Date(payload.occurredAt)
    : new Date();
  const eventId =
    String(payload.eventId || payload.id || "").trim() ||
    `${awb}:${mappedStatus}:${occurredAt.toISOString()}`;

  const alreadyApplied = (shipment.events || []).some(
    (evt) => evt.eventId && evt.eventId === eventId,
  );
  if (alreadyApplied) {
    return {
      order,
      orderKind,
      shipment,
      duplicate: true,
      statusChanged: false,
      orderStatus: order.status,
    };
  }

  shipment.events = [
    ...(shipment.events || []),
    {
      eventId,
      status: mappedStatus,
      description:
        payload.description ||
        payload.message ||
        `Shipa status: ${mappedStatus}`,
      occurredAt,
      raw: payload,
    },
  ];

  if (payload.trackingUrl) shipment.trackingUrl = String(payload.trackingUrl);
  if (payload.labelUrl) shipment.labelUrl = String(payload.labelUrl);
  if (payload.shipaOrderId) {
    shipment.shipaOrderId = String(payload.shipaOrderId);
  }

  const previousShipmentStatus = shipment.status;

  // Failed delivery: keep shipment out_for_delivery (or prior transit) + timeline note
  if (mappedStatus === "failed") {
    if (
      !["out_for_delivery", "in_transit", "delivered"].includes(shipment.status)
    ) {
      shipment.status = "out_for_delivery";
    }
    appendStatusHistory(
      order,
      order.status,
      `Delivery failed for AWB ${awb}${
        payload.description ? `: ${payload.description}` : ""
      }. Order remains ${order.status}.`,
      null,
    );
  } else if (mappedStatus === "cancelled") {
    shipment.status = "cancelled";
    appendStatusHistory(
      order,
      order.status,
      `Shipment cancelled for AWB ${awb}`,
      null,
    );
  } else {
    shipment.status = mappedStatus;
    if (previousShipmentStatus !== mappedStatus) {
      appendStatusHistory(
        order,
        order.status,
        `Shipment ${shipment.type} (${awb}): ${previousShipmentStatus} → ${mappedStatus}`,
        null,
      );
    }
  }

  shipment.lastSyncedAt = new Date();
  await order.save();

  const aggregation = await applyOrderStatusAggregation(order, orderKind, null);

  return {
    order,
    orderKind,
    shipment,
    duplicate: false,
    statusChanged: aggregation.changed,
    orderStatus: aggregation.status,
    shipmentStatus: shipment.status,
  };
}

/**
 * Whether the order has active customer-bound Shipa parcels (webhook owns delivered).
 * Planned/created parcels count — once a Shipa customer leg exists, mark-received is disabled.
 */
export function hasActiveCustomerShipments(order) {
  return (order?.shipments || []).some(
    (s) =>
      isCustomerBound(s.type) &&
      !["cancelled", "delivered"].includes(s.status),
  );
}

/**
 * Whether inbound fabric legs exist in Shipa but are not yet delivered (portal override / lag).
 */
export function hasActiveFabricShipments(order) {
  return (order?.shipments || []).some(
    (s) =>
      isFabricLeg(s.type) &&
      s.awb &&
      !["cancelled", "delivered"].includes(s.status),
  );
}

/**
 * Best-effort Shipa create — never throws to the caller (paid/status flows must not roll back).
 */
export async function safeCreateShipmentsForOrder(
  orderDoc,
  typesFilter = null,
  options = {},
) {
  try {
    return await createShipmentsForOrder(orderDoc, typesFilter, options);
  } catch (error) {
    console.error("createShipmentsForOrder failed:", error);
    return {
      order: orderDoc,
      orderKind: detectOrderKind(orderDoc),
      created: [],
      skipped: [],
      errors: [{ error: error.message || String(error) }],
    };
  }
}

/** Leg-1 + addon parcels on custom order confirmed. */
export async function createConfirmedCustomShipments(order, options = {}) {
  return safeCreateShipmentsForOrder(
    order,
    CONFIRMED_CUSTOM_SHIPMENT_TYPES,
    options,
  );
}

/** One retail_to_customer parcel per FabricShop on retail order confirmed. */
export async function createConfirmedRetailShipments(order, options = {}) {
  return safeCreateShipmentsForOrder(
    order,
    CONFIRMED_RETAIL_SHIPMENT_TYPES,
    options,
  );
}

/**
 * Leg-2 tailor → customer parcels when that tailor (or admin) sets ready.
 * Pass `tailorShopId` to create only that tailor's parcels; omit to create all.
 */
export async function createReadyCustomShipments(
  order,
  tailorShopId = null,
  options = {},
) {
  return safeCreateShipmentsForOrder(order, READY_CUSTOM_SHIPMENT_TYPES, {
    ...options,
    tailorShopId: tailorShopId || undefined,
  });
}

export {
  FABRIC_LEG_TYPES,
  CUSTOMER_BOUND_TYPES,
  normalizeWebhookStatus,
  detectOrderKind,
};
