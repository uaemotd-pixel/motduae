import PendingCheckout from "../models/PendingCheckout.js";
import User from "../models/User.js";
import {
  createPaidRetailOrder,
  findRetailOrderByPaymentIntent,
} from "./retailPaidOrderService.js";
import {
  createPaidCustomOrder,
  findCustomOrderByPaymentIntent,
} from "./customPaidOrderService.js";
import {
  resolveStripePaymentMethod,
  retrieveStripePaymentIntent,
} from "./stripeService.js";

export async function savePendingCheckout({
  paymentIntentId,
  userId,
  orderType,
  payload,
  amountAed,
}) {
  // Never overwrite an in-flight or completed fulfillment (client/webhook race).
  const existing = await PendingCheckout.findOne({ paymentIntentId });
  if (existing && ["fulfilling", "completed"].includes(existing.status)) {
    return existing;
  }

  return PendingCheckout.findOneAndUpdate(
    {
      paymentIntentId,
      status: { $nin: ["fulfilling", "completed"] },
    },
    {
      $set: {
        paymentIntentId,
        userId,
        orderType,
        payload,
        amountAed,
        status: "pending",
        orderId: null,
        lastError: "",
        fulfilledBy: null,
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
}

export async function findExistingOrderByPaymentIntent(paymentIntentId) {
  const [retail, custom] = await Promise.all([
    findRetailOrderByPaymentIntent(paymentIntentId),
    findCustomOrderByPaymentIntent(paymentIntentId),
  ]);

  if (retail) {
    return { orderType: "retail", order: retail };
  }
  if (custom) {
    return { orderType: "custom", order: custom };
  }
  return null;
}

export async function markPendingCheckoutCompleted({
  paymentIntentId,
  orderId,
  fulfilledBy,
}) {
  return PendingCheckout.findOneAndUpdate(
    { paymentIntentId },
    {
      status: "completed",
      orderId,
      fulfilledBy,
      lastError: "",
    },
    { new: true },
  );
}

export async function markPendingCheckoutFailed(paymentIntentId, errorMessage) {
  return PendingCheckout.findOneAndUpdate(
    { paymentIntentId },
    {
      status: "failed",
      lastError: String(errorMessage || "Fulfillment failed").slice(0, 1000),
    },
    { new: true },
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForExistingOrder(paymentIntentId, attempts = 12) {
  for (let i = 0; i < attempts; i += 1) {
    const existing = await findExistingOrderByPaymentIntent(paymentIntentId);
    if (existing) return existing;
    await sleep(250);
  }
  return null;
}

/**
 * Create the MOTD order from a succeeded PaymentIntent + saved checkout snapshot.
 * Safe to call from client, webhook, or reconcile — idempotent.
 * Uses an atomic pending→fulfilling claim so client + webhook cannot double-deduct stock.
 */
export async function fulfillPaidCheckout({
  paymentIntentId,
  paymentMethod,
  fulfilledBy = "reconcile",
}) {
  if (!paymentIntentId) {
    throw new Error("paymentIntentId is required");
  }

  const existing = await findExistingOrderByPaymentIntent(paymentIntentId);
  if (existing) {
    await markPendingCheckoutCompleted({
      paymentIntentId,
      orderId: existing.order._id,
      fulfilledBy,
    });
    return {
      ...existing,
      created: false,
      pending: await PendingCheckout.findOne({ paymentIntentId }),
    };
  }

  // Atomically claim fulfillment rights (prevents double stock deduction).
  const pending = await PendingCheckout.findOneAndUpdate(
    {
      paymentIntentId,
      status: { $in: ["pending", "failed"] },
    },
    {
      status: "fulfilling",
      lastError: "",
    },
    { new: true },
  );

  if (!pending) {
    const inFlight = await PendingCheckout.findOne({ paymentIntentId });
    if (!inFlight) {
      throw new Error(
        "No saved checkout found for this payment. Contact support with your payment reference.",
      );
    }

    if (inFlight.status === "completed" && inFlight.orderId) {
      const completed = await findExistingOrderByPaymentIntent(paymentIntentId);
      if (completed) {
        return { ...completed, created: false, pending: inFlight };
      }
    }

    const waited = await waitForExistingOrder(paymentIntentId);
    if (waited) {
      return { ...waited, created: false, pending: inFlight };
    }

    throw new Error(
      "Order fulfillment is already in progress. Please wait a moment and refresh your orders.",
    );
  }

  try {
    const paymentIntent = await retrieveStripePaymentIntent(paymentIntentId, [
      "latest_charge",
    ]);

    if (paymentIntent.status !== "succeeded") {
      throw new Error("Payment has not been completed");
    }

    const resolvedMethod =
      paymentMethod || resolveStripePaymentMethod(paymentIntent);
    const user = await User.findById(pending.userId).select("name");
    const userName = user?.name || "Customer";

    let result;
    if (pending.orderType === "retail") {
      result = await createPaidRetailOrder({
        userId: pending.userId,
        userName,
        orderItems: pending.payload.orderItems,
        shippingAddress: pending.payload.shippingAddress,
        paymentIntentId,
        paymentMethod: resolvedMethod,
      });
    } else if (pending.orderType === "custom") {
      result = await createPaidCustomOrder({
        userId: pending.userId,
        userName,
        payload: pending.payload,
        paymentIntentId,
        paymentMethod: resolvedMethod,
      });
    } else {
      throw new Error(`Unsupported order type: ${pending.orderType}`);
    }

    const updatedPending = await markPendingCheckoutCompleted({
      paymentIntentId,
      orderId: result.order._id,
      fulfilledBy,
    });

    return {
      orderType: pending.orderType,
      order: result.order,
      created: result.created,
      pending: updatedPending,
    };
  } catch (error) {
    await markPendingCheckoutFailed(paymentIntentId, error.message);
    throw error;
  }
}
