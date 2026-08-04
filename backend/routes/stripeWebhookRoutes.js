import express from "express";
import expressAsyncHandler from "express-async-handler";
import {
  constructStripeWebhookEvent,
  isStripeWebhookConfigured,
  resolveStripePaymentMethod,
} from "../services/stripeService.js";
import {
  fulfillPaidCheckout,
  markPendingCheckoutFailed,
  findExistingOrderByPaymentIntent,
} from "../services/pendingCheckoutService.js";
import PendingCheckout from "../models/PendingCheckout.js";

const stripeWebhookRoutes = express.Router();

stripeWebhookRoutes.post(
  "/",
  express.raw({ type: "application/json" }),
  expressAsyncHandler(async (req, res) => {
    if (!isStripeWebhookConfigured()) {
      console.error("Stripe webhook received but STRIPE_WEBHOOK_SECRET is missing");
      return res.status(503).send("Webhook not configured");
    }

    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).send("Missing stripe-signature header");
    }

    let event;
    try {
      event = constructStripeWebhookEvent(req.body, signature);
    } catch (error) {
      console.error("Stripe webhook signature verification failed:", error.message);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    try {
      switch (event.type) {
        case "payment_intent.succeeded": {
          const paymentIntent = event.data.object;
          const paymentIntentId = paymentIntent.id;
          const paymentMethod = resolveStripePaymentMethod(paymentIntent);

          try {
            const result = await fulfillPaidCheckout({
              paymentIntentId,
              paymentMethod,
              fulfilledBy: "webhook",
            });
            console.info(
              `[stripe-webhook] ${result.created ? "created" : "idempotent"} ${result.orderType} order ${result.order._id} for PI ${paymentIntentId}`,
            );
          } catch (error) {
            // Still acknowledge Stripe so it does not retry forever on missing pending
            // (ops can reconcile manually). Retry-able stock/DB errors are logged.
            console.error(
              `[stripe-webhook] fulfill failed for PI ${paymentIntentId}:`,
              error.message,
            );
            await markPendingCheckoutFailed(paymentIntentId, error.message);

            const existing = await findExistingOrderByPaymentIntent(paymentIntentId);
            if (!existing) {
              // Ask Stripe to retry briefly for transient failures
              const retryable =
                /stock|timeout|ECONN|temporarily|unavailable/i.test(
                  error.message || "",
                );
              if (retryable) {
                return res.status(500).json({ received: false, error: error.message });
              }
            }
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const paymentIntent = event.data.object;
          await PendingCheckout.findOneAndUpdate(
            { paymentIntentId: paymentIntent.id, status: "pending" },
            {
              status: "failed",
              lastError:
                paymentIntent.last_payment_error?.message ||
                "Payment failed",
            },
          );
          console.info(
            `[stripe-webhook] payment_intent.payment_failed ${paymentIntent.id}`,
          );
          break;
        }

        case "charge.refunded": {
          const charge = event.data.object;
          const paymentIntentId =
            typeof charge.payment_intent === "string"
              ? charge.payment_intent
              : charge.payment_intent?.id;
          if (paymentIntentId) {
            console.info(
              `[stripe-webhook] charge.refunded for PI ${paymentIntentId} (amount_refunded=${charge.amount_refunded})`,
            );
          }
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error("[stripe-webhook] handler error:", error);
      return res.status(500).json({ received: false });
    }

    return res.json({ received: true });
  }),
);

export default stripeWebhookRoutes;
