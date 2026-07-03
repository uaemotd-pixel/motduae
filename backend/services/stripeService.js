import Stripe from 'stripe';
import { env } from '../config/env.js';

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean(env.stripe.secretKey);
}

function getStripe() {
  if (!env.stripe.secretKey) {
    throw new Error('Stripe is not configured');
  }

  if (!stripeClient) {
    stripeClient = new Stripe(env.stripe.secretKey);
  }

  return stripeClient;
}

export function amountToStripeMinorUnits(amountAed) {
  return Math.round(Number(amountAed) * 100);
}

export async function createApplePayPaymentIntent({
  amountAed,
  userId,
  orderType,
  metadata = {},
}) {
  const stripe = getStripe();
  const amount = amountToStripeMinorUnits(amountAed);

  if (amount <= 0) {
    throw new Error('Order total must be greater than zero');
  }

  return stripe.paymentIntents.create({
    amount,
    currency: 'aed',
    payment_method_types: ['card'],
    metadata: {
      userId: String(userId),
      orderType,
      amountAed: String(amountAed),
      ...metadata,
    },
  });
}

export async function verifyApplePayPaymentIntent({
  paymentIntentId,
  userId,
  orderType,
  expectedAmountAed,
}) {
  const stripe = getStripe();
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (!paymentIntent) {
    throw new Error('Payment not found');
  }

  if (paymentIntent.metadata?.userId !== String(userId)) {
    throw new Error('Payment does not belong to this user');
  }

  if (paymentIntent.metadata?.orderType !== orderType) {
    throw new Error('Payment was created for a different order type');
  }

  if (paymentIntent.status !== 'succeeded') {
    throw new Error('Payment has not been completed');
  }

  const expectedMinor = amountToStripeMinorUnits(expectedAmountAed);
  if (paymentIntent.amount !== expectedMinor) {
    throw new Error('Payment amount does not match order total');
  }

  if (paymentIntent.currency !== 'aed') {
    throw new Error('Unexpected payment currency');
  }

  return paymentIntent;
}
