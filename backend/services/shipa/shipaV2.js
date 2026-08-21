/**
 * Shipa Delivery API V2 helpers.
 * Spec: sandbox OpenAPI (developer.shipadelivery.com) — POST /orders, query apikey.
 */

import crypto from "crypto";

export const SHIPA_V2_SANDBOX_BASE_URL =
  "https://sandbox-api.shipadelivery.com/v2";
export const SHIPA_V2_LIVE_BASE_URL = "https://api.shipadelivery.com/v2";

const INTERNAL_SHIPMENT_TYPES = new Set([
  "fabric_to_tailor",
  "customer_fabric_to_tailor",
  "tailor_to_motd",
  "addon_to_motd",
  "retail_to_motd",
]);

/** Shipa V2 event → MOTD shipment status. */
export const SHIPA_V2_EVENT_STATUS = Object.freeze({
  "order.created": "created",
  "order.confirmed": "created",
  "order.pickup.initiated": "in_transit",
  "order.pickup.started": "in_transit",
  "order.pickup.arrived": "in_transit",
  "order.pickup.completed": "in_transit",
  "order.pickup.failed": "failed",
  "order.dropoff.initiated": "out_for_delivery",
  "order.dropoff.started": "out_for_delivery",
  "order.dropoff.arrived": "out_for_delivery",
  "order.dropoff.completed": "delivered",
  "order.dropoff.failed": "failed",
  "order.return.initiated": "failed",
  "order.return.started": "failed",
  "order.return.arrived": "failed",
  "order.return.completed": "failed",
  "order.return.failed": "failed",
  "order.cancelled": "cancelled",
  "order.readyForCollection": "out_for_delivery",
  "order.transit.receivedByOriginHub": "in_transit",
  "order.transit.receivedBySortingHub": "in_transit",
  "order.transit.receivedByDestinationHub": "in_transit",
});

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

/** Shipa wants international digits without +, e.g. 971564475217. */
export function toShipaPhone(phone) {
  let digits = digitsOnly(phone);
  if (!digits) return "";
  if (digits.startsWith("00971")) digits = digits.slice(2);
  if (digits.startsWith("971") && digits.length >= 12) return digits.slice(0, 12);
  if (digits.length === 9) return `971${digits}`;
  if (digits.length === 10 && digits.startsWith("0")) return `971${digits.slice(1)}`;
  return digits;
}

export function toShipaCity(address = {}) {
  const city = String(address.city || "").trim();
  if (city) return city;
  return String(address.emirate || "").trim();
}

export function toShipaStreet(address = {}) {
  return [address.line1, address.line2, address.street, address.building]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ")
    .slice(0, 1000);
}

export function toShipaParty(address = {}) {
  const contactNo = toShipaPhone(address.phone);
  const city = toShipaCity(address);
  return {
    contactName: String(address.fullName || "Contact").trim().slice(0, 150),
    contactNo,
    address: toShipaStreet(address),
    city,
    country: "ARE",
  };
}

/** Shipa V2 OpenAPI: order and package `customerRef` maxLength is 50. */
export const SHIPA_V2_REF_MAX_LENGTH = 50;

/**
 * Fit a MOTD parcel key / order reference into Shipa's 50-char customerRef.
 * Long values keep a stable 8-char hash so truncated keys stay unique.
 */
export function sanitizeShipaRef(value, max = SHIPA_V2_REF_MAX_LENGTH) {
  const cleaned = String(value || "").replace(/\s+/g, "");
  if (!cleaned) return "";
  if (cleaned.length <= max) return cleaned;
  const hash = crypto.createHash("sha1").update(cleaned).digest("hex").slice(0, 8);
  const keep = Math.max(1, max - 9);
  return `${cleaned.slice(0, keep)}-${hash}`.slice(0, max);
}

/**
 * Map MOTD createOrder payload → Shipa V2 Order body.
 * @param {object} payload
 */
export function toShipaV2OrderBody(payload) {
  const customerRef = sanitizeShipaRef(
    payload.reference ||
      `${payload.orderId || "order"}:${payload.parcelKey || Date.now()}`,
  );
  const packageRef = sanitizeShipaRef(payload.parcelKey || customerRef);
  const shipmentType = payload.shipmentType || "parcel";
  const origin = toShipaParty(payload.pickup);
  const destination = toShipaParty(payload.dropoff);

  if (!origin.contactNo || !origin.city) {
    throw new Error(
      "Shipa V2 origin requires contact phone and city/emirate",
    );
  }
  if (!destination.contactNo || !destination.city) {
    throw new Error(
      "Shipa V2 destination requires contact phone and city/emirate",
    );
  }

  return {
    customerRef,
    type: "Delivery",
    category: "Next Day",
    autoConfirm: true,
    origin,
    destination: {
      ...destination,
      type: "Doorstep",
    },
    packages: [
      {
        customerRef: packageRef,
        name: INTERNAL_SHIPMENT_TYPES.has(shipmentType)
          ? "MOTD parcel"
          : "Customer delivery",
        description: String(shipmentType).slice(0, 1000),
        quantity: 1,
      },
    ],
  };
}

function firstString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function nested(obj, path) {
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
}

/**
 * Normalize stub test payloads and Shipa V2 webhook bodies into
 * { awb, shipaOrderId, status, eventId, description, occurredAt, ignored }.
 */
export function normalizeShipaWebhookPayload(raw = {}) {
  const body = Array.isArray(raw) ? raw[0] : raw;
  const data = body?.data && typeof body.data === "object" ? body.data : body;
  const event = firstString(
    body.event,
    body.eventType,
    body.event_type,
    data.event,
    nested(body, "payload.event"),
  );

  const awb = firstString(
    body.awb,
    body.AWB,
    body.shipaRef,
    data.shipaRef,
    data.awb,
    nested(body, "order.shipaRef"),
    nested(data, "order.shipaRef"),
    body.customerRef,
    data.customerRef,
    nested(body, "order.customerRef"),
  );

  const shipaOrderId = firstString(
    body.shipaOrderId,
    body.shipaRef,
    data.shipaRef,
    nested(body, "order.shipaRef"),
  );

  const eventStatus = event
    ? SHIPA_V2_EVENT_STATUS[event]
    : null;
  const status = firstString(
    eventStatus,
    body.status,
    body.eventStatus,
    data.status,
    data.orderStatus,
    nested(body, "order.status"),
  );

  if (event && !eventStatus && !status) {
    return {
      ignored: true,
      event,
      awb,
      shipaOrderId,
      status: null,
      eventId: firstString(body.eventId, body.id, event, ""),
      description: `Ignored Shipa event: ${event}`,
      occurredAt: new Date().toISOString(),
      raw: body,
    };
  }

  const eventId = firstString(
    body.eventId,
    body.id,
    body.notificationId,
    data.id,
    event && awb ? `${event}:${awb}` : "",
  );

  return {
    ignored: false,
    event: event || null,
    awb,
    shipaOrderId,
    customerRef: firstString(body.customerRef, data.customerRef),
    status,
    eventId,
    description: firstString(
      body.description,
      body.message,
      data.details,
      event,
    ),
    occurredAt:
      body.occurredAt ||
      body.date ||
      data.date ||
      nested(body, "order.updatedAt") ||
      new Date().toISOString(),
    trackingUrl: firstString(body.trackingUrl, data.trackingUrl),
    labelUrl: firstString(body.labelUrl, data.labelUrl),
    raw: body,
  };
}

export function publicTrackingUrl(shipaRef) {
  if (!shipaRef) return "";
  return `https://www.shipadelivery.com/track/${encodeURIComponent(shipaRef)}`;
}
