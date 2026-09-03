import express from "express";
import expressAsyncHandler from "express-async-handler";
import mongoose from "mongoose";
import { env } from "../config/env.js";
import { isAuth } from "../middleware/auth.js";
import { requireEmailVerified } from "../middleware/requireEmailVerified.js";
import {
  isStripeConfigured,
  createStripePaymentIntent,
} from "../services/stripeService.js";
import { prepareRetailOrder } from "../services/retailOrderService.js";
import {
  getCustomOrderPricing,
  getMultiItemCustomOrderPricing,
  applyAddonsToCustomOrderPricing,
  PricingValidationError,
} from "../services/pricingService.js";
import { FABRIC_SOURCES } from "../models/CustomOrder.js";
import AddOn from "../models/AddOn.js";
import PendingCheckout from "../models/PendingCheckout.js";
import {
  savePendingCheckout,
  fulfillPaidCheckout,
  findExistingOrderByPaymentIntent,
} from "../services/pendingCheckoutService.js";
import { buildPublicOrderTrackingUrl } from "../services/publicTrackingToken.js";
import { resolveCheckoutContactEmail } from "../services/emailVerification/guestContactOtpService.js";
import { EmailVerificationError } from "../services/emailVerification/emailVerificationService.js";

const paymentRoutes = express.Router();

function parseFabricMeters(fabricMeters) {
  const meters = Number(fabricMeters);
  if (!fabricMeters || Number.isNaN(meters) || meters <= 0) {
    throw new PricingValidationError("fabricMeters must be greater than 0");
  }
  return meters;
}

function validateFabricOrderInput({
  designId,
  fabricSource,
  fabricId,
  fabricMeters,
  cutId = null,
  cutIds = null,
  cutSelections = null,
  selectedCuts = null,
}) {
  if (!designId || !mongoose.Types.ObjectId.isValid(designId)) {
    throw new PricingValidationError("Valid designId is required");
  }

  if (!fabricSource || !FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(", ")}`,
    );
  }

  if (
    fabricSource === "storefront" &&
    (!fabricId || !mongoose.Types.ObjectId.isValid(fabricId))
  ) {
    throw new PricingValidationError(
      "Valid fabricId is required when fabricSource is storefront",
    );
  }

  if (fabricSource === "self" && fabricId) {
    throw new PricingValidationError(
      "fabricId must not be provided when fabricSource is self",
    );
  }

  return {
    designId,
    fabricSource,
    fabricId: fabricSource === "storefront" ? fabricId : null,
    fabricMeters: parseFabricMeters(fabricMeters),
    cutId: cutId || null,
    cutIds: cutIds || null,
    cutSelections: cutSelections || null,
    selectedCuts: selectedCuts || null,
  };
}

function validateMultiItemOrderInput({ fabricSource, items }) {
  if (!fabricSource || !FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(", ")}`,
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingValidationError("At least one item is required");
  }

  return {
    fabricSource,
    items: items.map((item) =>
      validateFabricOrderInput({
        designId: item.designId,
        fabricSource,
        fabricId: item.fabricId,
        fabricMeters: item.fabricMeters,
        cutId: item.cutId,
        cutIds: item.cutIds,
        cutSelections: item.cutSelections,
        selectedCuts: item.selectedCuts,
      }),
    ),
  };
}

function isMultiItemPayload(body) {
  return Array.isArray(body?.items) && body.items.length > 0;
}

async function getAddonsCost(addonIds = []) {
  if (!Array.isArray(addonIds) || addonIds.length === 0) return 0;
  const dbAddons = await AddOn.find({ _id: { $in: addonIds }, isActive: true });
  return dbAddons.reduce((sum, item) => sum + item.price, 0);
}

async function getCustomOrderTotal(body) {
  const { deliveryType = "delivery", addonIds = [] } = body;
  const addonsCost = await getAddonsCost(addonIds);

  if (isMultiItemPayload(body)) {
    const orderInput = validateMultiItemOrderInput(body);
    const { pricing } = await getMultiItemCustomOrderPricing({
      ...orderInput,
      deliveryType,
      addonIds,
    });
    return applyAddonsToCustomOrderPricing(pricing, addonsCost).total;
  }

  const orderInput = validateFabricOrderInput(body);
  const pricing = await getCustomOrderPricing({
    ...orderInput,
    deliveryType,
    addonIds,
  });

  return applyAddonsToCustomOrderPricing(pricing, addonsCost).total;
}

function validateRetailShippingAddress(shippingAddress) {
  if (!shippingAddress || typeof shippingAddress !== "object") {
    throw new Error("shippingAddress is required before starting payment");
  }

  const required = ["fullName", "phone", "emirate", "city"];
  for (const key of required) {
    if (!String(shippingAddress[key] || "").trim()) {
      throw new Error(
        `shippingAddress.${key} is required before starting payment`,
      );
    }
  }

  return {
    fullName: String(shippingAddress.fullName).trim(),
    phone: String(shippingAddress.phone).trim(),
    emirate: String(shippingAddress.emirate).trim(),
    city: String(shippingAddress.city).trim(),
    street: String(shippingAddress.street || "").trim(),
    building: String(shippingAddress.building || "").trim(),
    notes: String(shippingAddress.notes || "").trim(),
  };
}

function paymentNotConfigured(res) {
  return res.status(503).json({
    success: false,
    message:
      "Online payments are not configured. Add Stripe keys to enable payments.",
  });
}

paymentRoutes.get(
  "/config",
  expressAsyncHandler(async (_req, res) => {
    res.json({
      success: true,
      configured: isStripeConfigured(),
      publishableKey: isStripeConfigured() ? env.stripe.publishableKey : "",
      currency: "AED",
      country: "AE",
    });
  }),
);

paymentRoutes.post(
  "/intent/retail",
  isAuth,
  requireEmailVerified,
  expressAsyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
      return paymentNotConfigured(res);
    }

    const { orderItems, shippingAddress, contactEmail } = req.body;

    // Reject any client-supplied price fields — compute prices server-side only
    if (
      Array.isArray(orderItems) &&
      orderItems.some(
        (it) => it && Object.prototype.hasOwnProperty.call(it, "price"),
      )
    ) {
      console.warn(`Price tampering detected for user ${req.user?._id}`);
      return res
        .status(400)
        .json({
          success: false,
          message: "Client-supplied price is not allowed",
        });
    }

    try {
      const normalizedShipping = validateRetailShippingAddress(shippingAddress);
      const storedContactEmail = resolveCheckoutContactEmail(req, contactEmail);
      const prepared = await prepareRetailOrder(orderItems);
      const paymentIntent = await createStripePaymentIntent({
        amountAed: prepared.totalPrice,
        userId: req.user._id,
        orderType: "retail",
      });

      await savePendingCheckout({
        paymentIntentId: paymentIntent.id,
        userId: req.user._id,
        orderType: "retail",
        amountAed: prepared.totalPrice,
        payload: {
          orderItems,
          shippingAddress: normalizedShipping,
          contactEmail: storedContactEmail,
        },
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: prepared.totalPrice,
        currency: "AED",
      });
    } catch (error) {
      if (error instanceof EmailVerificationError) {
        return res.status(error.status).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create payment",
      });
    }
  }),
);

paymentRoutes.post(
  "/intent/custom",
  isAuth,
  requireEmailVerified,
  expressAsyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
      return paymentNotConfigured(res);
    }

    try {
      const storedContactEmail = resolveCheckoutContactEmail(
        req,
        req.body?.contactEmail,
      );
      const total = await getCustomOrderTotal(req.body);
      const paymentIntent = await createStripePaymentIntent({
        amountAed: total,
        userId: req.user._id,
        orderType: "custom",
      });

      // Persist full checkout snapshot so webhook can create the order if the browser dies.
      const {
        paymentIntentId: _ignored,
        paymentMethod: _ignoredMethod,
        ...checkoutPayload
      } = req.body;
      checkoutPayload.contactEmail = storedContactEmail;

      await savePendingCheckout({
        paymentIntentId: paymentIntent.id,
        userId: req.user._id,
        orderType: "custom",
        amountAed: total,
        payload: checkoutPayload,
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: total,
        currency: "AED",
      });
    } catch (error) {
      if (error instanceof PricingValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      if (error instanceof EmailVerificationError) {
        return res.status(error.status).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || "Failed to create payment",
      });
    }
  }),
);

/**
 * Recover/create order after a succeeded PaymentIntent when the client POST failed
 * or the tab closed. Idempotent — safe to call multiple times.
 */
paymentRoutes.post(
  "/reconcile",
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
      return paymentNotConfigured(res);
    }

    const { paymentIntentId, paymentMethod } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: "paymentIntentId is required",
      });
    }

    try {
      const existing = await findExistingOrderByPaymentIntent(paymentIntentId);
      const pending = await PendingCheckout.findOne({ paymentIntentId });

      const ownerId = existing?.order?.userId || pending?.userId;
      if (!ownerId) {
        return res.status(404).json({
          success: false,
          message:
            "No checkout found for this payment. Contact support with your payment reference.",
        });
      }

      if (String(ownerId) !== String(req.user._id) && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          message: "This payment does not belong to your account",
        });
      }

      const result = await fulfillPaidCheckout({
        paymentIntentId,
        paymentMethod,
        fulfilledBy: "reconcile",
      });

      res.status(result.created ? 201 : 200).json({
        success: true,
        created: result.created,
        orderType: result.orderType,
        orderId: result.order._id,
        trackingUrl: buildPublicOrderTrackingUrl(
          result.order.publicTrackingToken,
        ),
        order: result.order,
        message: result.created
          ? "Order created from payment"
          : "Order already exists for this payment",
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || "Failed to reconcile payment",
      });
    }
  }),
);

export default paymentRoutes;
