import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePromise(publishableKey: string) {
  if (!publishableKey) {
    return Promise.resolve(null);
  }

  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }

  return stripePromise;
}

export function resetStripePromise() {
  stripePromise = null;
}

export function amountToStripeMinorUnits(amountAed: number) {
  return Math.round(Number(amountAed) * 100);
}
