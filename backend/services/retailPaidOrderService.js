import RetailOrder from "../models/RetailOrder.js";
import {
  prepareRetailOrder,
  deductRetailProductStock,
} from "./retailOrderService.js";
import {
  notifyRetailOrderPlacedAdmin,
  notifyRetailOrderPlacedCustomer,
} from "./notificationService.js";
import { verifyStripePaymentIntent } from "./stripeService.js";
import { createConfirmedRetailShipments } from "./shipmentService.js";
import {
  createPublicTrackingToken,
  isPublicTrackingTokenCollision,
} from "./publicTrackingToken.js";
import { sendPaidOrderPlacedEmail } from "./orderPlacedEmail.js";

export async function findRetailOrderByPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  return RetailOrder.findOne({ stripePaymentIntentId: paymentIntentId });
}

async function attachRetailShipments(order, userId) {
  if (!order?._id) return order;
  const result = await createConfirmedRetailShipments(order, {
    changedBy: userId || null,
  });
  return result?.order || order;
}

async function createRetailOrderWithTrackingToken(fields) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await RetailOrder.create({
        ...fields,
        publicTrackingToken: createPublicTrackingToken(),
      });
    } catch (error) {
      if (isPublicTrackingTokenCollision(error) && attempt === 0) continue;
      throw error;
    }
  }
  throw new Error("Failed to persist retail order tracking token");
}

/**
 * Create a paid retail order (idempotent by paymentIntentId).
 * On confirmed: seed statusHistory and create hidden retail_to_motd Shipa
 * parcels per shop (skipped when the origin is already MOTD). Last mile
 * is created later via admin pack.
 */
export async function createPaidRetailOrder({
  userId,
  userName = "Customer",
  orderItems,
  shippingAddress,
  contactEmail = "",
  paymentIntentId,
  paymentMethod,
}) {
  const existing = await findRetailOrderByPaymentIntent(paymentIntentId);
  if (existing) {
    const withShipments = await attachRetailShipments(existing, userId);
    return { order: withShipments, created: false };
  }

  if (!orderItems?.length) {
    throw new Error("No order items provided");
  }

  if (!shippingAddress) {
    throw new Error("Shipping address is required");
  }

  const prepared = await prepareRetailOrder(orderItems);

  await verifyStripePaymentIntent({
    paymentIntentId,
    userId,
    orderType: "retail",
    expectedAmountAed: prepared.totalPrice,
  });

  await deductRetailProductStock(prepared.finalOrderItems);

  const confirmedAt = new Date();
  const orderFields = {
    userId,
    orderItems: prepared.finalOrderItems,
    shippingAddress,
    contactEmail: String(contactEmail || "").toLowerCase().trim(),
    paymentMethod,
    itemsPrice: prepared.itemsPrice,
    shippingPrice: prepared.shippingPrice,
    parcelCount: prepared.parcelCount ?? 0,
    perParcelFee: prepared.perParcelFee ?? null,
    deliveryBreakdown: prepared.deliveryBreakdown ?? [],
    vatRate: prepared.vatRate,
    vatAmount: prepared.vatAmount,
    totalPrice: prepared.totalPrice,
    status: "confirmed",
    statusHistory: [
      {
        status: "confirmed",
        note: "Order confirmed",
        changedAt: confirmedAt,
        changedBy: userId,
      },
    ],
    isPaid: true,
    paidAt: confirmedAt,
    stripePaymentIntentId: paymentIntentId,
  };
  let order;
  try {
    order = await createRetailOrderWithTrackingToken(orderFields);
  } catch (error) {
    // Concurrent webhook + client create — unique index wins
    if (error?.code === 11000) {
      const raced = await findRetailOrderByPaymentIntent(paymentIntentId);
      if (raced) {
        const withShipments = await attachRetailShipments(raced, userId);
        return { order: withShipments, created: false };
      }
    }
    throw error;
  }

  const itemNames = (prepared.finalOrderItems || [])
    .map((item) => item?.name)
    .filter(Boolean);
  const message = `${userName} has placed order for ${itemNames.join(", ")} for AED ${Number(
    prepared.totalPrice,
  ).toFixed(2)}`;

  await notifyRetailOrderPlacedAdmin(order, userId, message);
  await notifyRetailOrderPlacedCustomer(order, userId);
  await sendPaidOrderPlacedEmail({
    order,
    userId,
    orderType: "retail",
  });

  const withShipments = await attachRetailShipments(order, userId);
  return { order: withShipments, created: true };
}
