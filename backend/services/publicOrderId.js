import crypto from "crypto";
import mongoose from "mongoose";
import OrderCounter from "../models/OrderCounter.js";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const ALPHA_LEN = 3;
const COUNTER_PAD = 4;
const MAX_CREATE_ATTEMPTS = 5;

const PUBLIC_ORDER_ID_RE = /^(RO|CO)-(\d+)([A-Z]{3})$/;
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i;

export function orderTypeToPrefix(orderType) {
  return orderType === "custom" ? "CO" : "RO";
}

export function prefixToOrderType(prefix) {
  const p = String(prefix || "").toUpperCase();
  if (p === "CO") return "custom";
  if (p === "RO") return "retail";
  return null;
}

function randomAlpha(length = ALPHA_LEN) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += ALPHA[crypto.randomInt(ALPHA.length)];
  }
  return out;
}

function formatCounter(seq) {
  const n = Math.max(1, Math.floor(Number(seq) || 0));
  return String(n).padStart(COUNTER_PAD, "0");
}

/**
 * Atomically reserve the next counter for retail or custom.
 * Safe under concurrent checkouts on multiple serverless instances.
 */
export async function nextOrderCounter(orderType) {
  const id = orderType === "custom" ? "custom" : "retail";
  const doc = await OrderCounter.findOneAndUpdate(
    { _id: id },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.seq;
}

/**
 * Build RO-0001AFG / CO-0001AFG from a reserved counter + random letters.
 */
export function buildPublicOrderId(orderType, seq, alpha = randomAlpha()) {
  const prefix = orderTypeToPrefix(orderType);
  const letters = String(alpha || randomAlpha())
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, ALPHA_LEN)
    .padEnd(ALPHA_LEN, "A");
  return `${prefix}-${formatCounter(seq)}${letters}`;
}

export async function allocatePublicOrderId(orderType) {
  const seq = await nextOrderCounter(orderType);
  return buildPublicOrderId(orderType, seq);
}

export function normalizePublicOrderId(input) {
  if (input == null) return "";
  return String(input)
    .trim()
    .toUpperCase()
    .replace(/^#/, "")
    .replace(/\s+/g, "");
}

export function isPublicOrderId(value) {
  return PUBLIC_ORDER_ID_RE.test(normalizePublicOrderId(value));
}

export function parsePublicOrderId(value) {
  const normalized = normalizePublicOrderId(value);
  const match = PUBLIC_ORDER_ID_RE.exec(normalized);
  if (!match) return null;
  return {
    publicOrderId: normalized,
    orderType: prefixToOrderType(match[1]),
    seq: Number(match[2]),
    alpha: match[3],
  };
}

export function isPublicOrderIdCollision(error) {
  if (error?.code !== 11000) return false;
  return Boolean(
    error?.keyPattern?.publicOrderId || error?.keyValue?.publicOrderId,
  );
}

export function isStripePaymentIntentCollision(error) {
  if (error?.code !== 11000) return false;
  return Boolean(
    error?.keyPattern?.stripePaymentIntentId ||
      error?.keyValue?.stripePaymentIntentId,
  );
}

/**
 * Create an order document with publicOrderId + publicTrackingToken.
 * Retries only on publicOrderId / publicTrackingToken collisions.
 * Rethrows stripePaymentIntentId collisions for the caller's idempotent handler.
 */
export async function createOrderWithPublicIds({
  Model,
  orderType,
  fields,
  createPublicTrackingToken,
  isPublicTrackingTokenCollision,
}) {
  let lastError;
  /** Reuse the reserved counter ID unless that specific key collides. */
  let publicOrderId = null;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt += 1) {
    try {
      if (!publicOrderId) {
        publicOrderId = await allocatePublicOrderId(orderType);
      }
      return await Model.create({
        ...fields,
        publicOrderId,
        publicTrackingToken: createPublicTrackingToken(),
      });
    } catch (error) {
      lastError = error;
      if (isStripePaymentIntentCollision(error)) throw error;
      if (isPublicOrderIdCollision(error)) {
        publicOrderId = null;
        continue;
      }
      if (isPublicTrackingTokenCollision?.(error)) continue;
      throw error;
    }
  }
  throw (
    lastError ||
    new Error(`Failed to persist ${orderType} order public identifiers`)
  );
}

/**
 * Resolve an order by public code (RO-/CO-) or legacy Mongo ObjectId.
 */
export async function findOrderByPublicId(input, { RetailOrder, CustomOrder }) {
  const normalized = normalizePublicOrderId(input);
  if (!normalized) return null;

  const parsed = parsePublicOrderId(normalized);
  if (parsed?.orderType === "retail") {
    const order = await RetailOrder.findOne({ publicOrderId: normalized });
    return order ? { order, orderType: "retail" } : null;
  }
  if (parsed?.orderType === "custom") {
    const order = await CustomOrder.findOne({ publicOrderId: normalized });
    return order ? { order, orderType: "custom" } : null;
  }

  if (OBJECT_ID_RE.test(normalized) && mongoose.Types.ObjectId.isValid(normalized)) {
    const [retail, custom] = await Promise.all([
      RetailOrder.findById(normalized),
      CustomOrder.findById(normalized),
    ]);
    if (retail) return { order: retail, orderType: "retail" };
    if (custom) return { order: custom, orderType: "custom" };
  }

  return null;
}

export function displayPublicOrderId(order) {
  const pub = normalizePublicOrderId(order?.publicOrderId);
  if (pub) return pub;
  return String(order?._id || order?.id || "")
    .slice(-8)
    .toUpperCase();
}

export { MAX_CREATE_ATTEMPTS, COUNTER_PAD, ALPHA_LEN };
