import Stripe from 'stripe';
import { env } from '../config/env.js';

let stripeClient = null;

export function isStripeConfigured() {
  return Boolean(env.stripe.secretKey);
}

export function isStripeWebhookConfigured() {
  return Boolean(env.stripe.secretKey && env.stripe.webhookSecret);
}

export function getStripe() {
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

export async function createStripePaymentIntent({
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
    // Supports both Apple Pay and direct card entry (Visa, Mastercard, etc.).
    payment_method_types: ['card'],
    metadata: {
      userId: String(userId),
      orderType,
      amountAed: String(amountAed),
      ...metadata,
    },
  });
}

// Backwards-compatible alias.
export const createApplePayPaymentIntent = createStripePaymentIntent;

export async function verifyStripePaymentIntent({
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

// Backwards-compatible alias.
export const verifyApplePayPaymentIntent = verifyStripePaymentIntent;

export function constructStripeWebhookEvent(rawBody, signature) {
  if (!env.stripe.webhookSecret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  const stripe = getStripe();
  return stripe.webhooks.constructEvent(
    rawBody,
    signature,
    env.stripe.webhookSecret,
  );
}

export async function retrieveStripePaymentIntent(paymentIntentId, expand = []) {
  const stripe = getStripe();
  return stripe.paymentIntents.retrieve(paymentIntentId, {
    expand,
  });
}

/** Map Stripe PI / charge details to MOTD paymentMethod enum. */
export function resolveStripePaymentMethod(paymentIntent) {
  const charge =
    typeof paymentIntent.latest_charge === 'object' && paymentIntent.latest_charge
      ? paymentIntent.latest_charge
      : null;

  const walletType =
    charge?.payment_method_details?.card?.wallet?.type ||
    paymentIntent.payment_method?.card?.wallet?.type;

  if (walletType === 'apple_pay') {
    return 'apple_pay';
  }

  return 'card';
}
