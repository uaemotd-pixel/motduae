import express from 'express';
import expressAsyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import { isAuth } from '../middleware/auth.js';
import { isStripeConfigured, createApplePayPaymentIntent } from '../services/stripeService.js';
import { prepareRetailOrder } from '../services/retailOrderService.js';
import {
  getCustomOrderPricing,
  getMultiItemCustomOrderPricing,
  PricingValidationError,
} from '../services/pricingService.js';
import { FABRIC_SOURCES } from '../models/CustomOrder.js';

const paymentRoutes = express.Router();

function parseFabricMeters(fabricMeters) {
  const meters = Number(fabricMeters);
  if (!fabricMeters || Number.isNaN(meters) || meters <= 0) {
    throw new PricingValidationError('fabricMeters must be greater than 0');
  }
  return meters;
}

function validateFabricOrderInput({ designId, fabricSource, fabricId, fabricMeters }) {
  if (!designId || !mongoose.Types.ObjectId.isValid(designId)) {
    throw new PricingValidationError('Valid designId is required');
  }

  if (!fabricSource || !FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(', ')}`,
    );
  }

  if (
    fabricSource === 'storefront' &&
    (!fabricId || !mongoose.Types.ObjectId.isValid(fabricId))
  ) {
    throw new PricingValidationError(
      'Valid fabricId is required when fabricSource is storefront',
    );
  }

  if (fabricSource === 'self' && fabricId) {
    throw new PricingValidationError(
      'fabricId must not be provided when fabricSource is self',
    );
  }

  return {
    designId,
    fabricSource,
    fabricId: fabricSource === 'storefront' ? fabricId : null,
    fabricMeters: parseFabricMeters(fabricMeters),
  };
}

function validateMultiItemOrderInput({ fabricSource, items }) {
  if (!fabricSource || !FABRIC_SOURCES.includes(fabricSource)) {
    throw new PricingValidationError(
      `fabricSource must be one of: ${FABRIC_SOURCES.join(', ')}`,
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new PricingValidationError('At least one item is required');
  }

  return {
    fabricSource,
    items: items.map((item) =>
      validateFabricOrderInput({
        designId: item.designId,
        fabricSource,
        fabricId: item.fabricId,
        fabricMeters: item.fabricMeters,
      }),
    ),
  };
}

function isMultiItemPayload(body) {
  return Array.isArray(body?.items) && body.items.length > 0;
}

async function getCustomOrderTotal(body) {
  const { deliveryType = 'delivery' } = body;

  if (isMultiItemPayload(body)) {
    const orderInput = validateMultiItemOrderInput(body);
    const { pricing } = await getMultiItemCustomOrderPricing({
      ...orderInput,
      deliveryType,
    });
    return pricing.total;
  }

  const orderInput = validateFabricOrderInput(body);
  const pricing = await getCustomOrderPricing({
    ...orderInput,
    deliveryType,
  });

  return pricing.total;
}

function paymentNotConfigured(res) {
  return res.status(503).json({
    success: false,
    message: 'Apple Pay is not configured. Add Stripe keys to enable payments.',
  });
}

paymentRoutes.get(
  '/config',
  expressAsyncHandler(async (_req, res) => {
    res.json({
      success: true,
      configured: isStripeConfigured(),
      publishableKey: isStripeConfigured() ? env.stripe.publishableKey : '',
      currency: 'AED',
      country: 'AE',
    });
  }),
);

paymentRoutes.post(
  '/intent/retail',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
      return paymentNotConfigured(res);
    }

    const { orderItems } = req.body;

    try {
      const prepared = await prepareRetailOrder(orderItems);
      const paymentIntent = await createApplePayPaymentIntent({
        amountAed: prepared.totalPrice,
        userId: req.user._id,
        orderType: 'retail',
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: prepared.totalPrice,
        currency: 'AED',
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create payment',
      });
    }
  }),
);

paymentRoutes.post(
  '/intent/custom',
  isAuth,
  expressAsyncHandler(async (req, res) => {
    if (!isStripeConfigured()) {
      return paymentNotConfigured(res);
    }

    try {
      const total = await getCustomOrderTotal(req.body);
      const paymentIntent = await createApplePayPaymentIntent({
        amountAed: total,
        userId: req.user._id,
        orderType: 'custom',
      });

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: total,
        currency: 'AED',
      });
    } catch (error) {
      if (error instanceof PricingValidationError) {
        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create payment',
      });
    }
  }),
);

export default paymentRoutes;
