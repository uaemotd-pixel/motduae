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

/**
 * Create a paid retail order (idempotent by paymentIntentId).
 * On confirmed: seed statusHistory and create one retail_to_customer Shipa
 * parcel per FabricShop (best-effort; never rolls back the paid order).
 */
export async function createPaidRetailOrder({
  userId,
  userName = "Customer",
  orderItems,
  shippingAddress,
  paymentIntentId,
  paymentMethod,
  locale,
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

  await deductRetailProductStock(orderItems);

  const confirmedAt = new Date();
  let order;
  try {
    order = await RetailOrder.create({
      userId,
      orderItems: prepared.finalOrderItems,
      shippingAddress,
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
      locale: locale || "en",
    });
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

  const withShipments = await attachRetailShipments(order, userId);
  return { order: withShipments, created: true };
}
