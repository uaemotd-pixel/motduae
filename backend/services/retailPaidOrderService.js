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

export async function findRetailOrderByPaymentIntent(paymentIntentId) {
  if (!paymentIntentId) return null;
  return RetailOrder.findOne({ stripePaymentIntentId: paymentIntentId });
}

/**
 * Create a paid retail order (idempotent by paymentIntentId).
 */
export async function createPaidRetailOrder({
  userId,
  userName = "Customer",
  orderItems,
  shippingAddress,
  paymentIntentId,
  paymentMethod,
}) {
  const existing = await findRetailOrderByPaymentIntent(paymentIntentId);
  if (existing) {
    return { order: existing, created: false };
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

  let order;
  try {
    order = await RetailOrder.create({
      userId,
      orderItems: prepared.finalOrderItems,
      shippingAddress,
      paymentMethod,
      itemsPrice: prepared.itemsPrice,
      shippingPrice: prepared.shippingPrice,
      vatRate: prepared.vatRate,
      vatAmount: prepared.vatAmount,
      totalPrice: prepared.totalPrice,
      status: "confirmed",
      isPaid: true,
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    });
  } catch (error) {
    // Concurrent webhook + client create — unique index wins
    if (error?.code === 11000) {
      const raced = await findRetailOrderByPaymentIntent(paymentIntentId);
      if (raced) return { order: raced, created: false };
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

  return { order, created: true };
}
