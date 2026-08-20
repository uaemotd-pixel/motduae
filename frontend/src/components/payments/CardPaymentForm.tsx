"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CardElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import type { StripeCardElementOptions } from "@stripe/stripe-js";
import { api } from "@/lib/api/client";
import { getStripePromise } from "@/lib/stripe";

type PaymentConfig = {
  configured: boolean;
  publishableKey: string;
  currency: string;
  country: string;
};

type CardPaymentFormProps = {
  amountAed: number;
  cardholderName?: string;
  disabled?: boolean;
  payLabel?: string;
  processingLabel?: string;
  loadingLabel?: string;
  notConfiguredLabel?: string;
  createIntent: () => Promise<{
    clientSecret: string;
    paymentIntentId: string;
  } | null>;
  onPaid: (paymentIntentId: string) => Promise<void>;
  onError?: (message: string) => void;
};

const CARD_ELEMENT_OPTIONS: StripeCardElementOptions = {
  hidePostalCode: true,
  style: {
    base: {
      fontSize: "16px",
      color: "#111111",
      fontFamily: "var(--font-body), system-ui, sans-serif",
      "::placeholder": {
        color: "#9CA3AF",
      },
    },
    invalid: {
      color: "#DC2626",
    },
  },
};

function CardFormInner({
  amountAed,
  cardholderName,
  disabled = false,
  payLabel = "Pay",
  processingLabel = "Processing...",
  createIntent,
  onPaid,
  onError,
}: CardPaymentFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  const createIntentRef = useRef(createIntent);
  const onPaidRef = useRef(onPaid);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    createIntentRef.current = createIntent;
    onPaidRef.current = onPaid;
    onErrorRef.current = onError;
  }, [createIntent, onPaid, onError]);

  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!stripe || !elements || processing || disabled) return;

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) return;

    setProcessing(true);
    setCardError(null);

    try {
      const intent = await createIntentRef.current();
      if (!intent?.clientSecret) {
        setProcessing(false);
        return;
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(
        intent.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: cardholderName ? { name: cardholderName } : {},
          },
        },
      );

      if (error) {
        const message = error.message || "Payment failed";
        setCardError(message);
        onErrorRef.current?.(message);
        setProcessing(false);
        return;
      }

      if (!paymentIntent || paymentIntent.status !== "succeeded") {
        const message = "Payment was not completed";
        setCardError(message);
        onErrorRef.current?.(message);
        setProcessing(false);
        return;
      }

      await onPaidRef.current(paymentIntent.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Payment failed";
      setCardError(message);
      onErrorRef.current?.(message);
    } finally {
      setProcessing(false);
    }
  };

  const isDisabled =
    disabled || processing || !stripe || !elements || !cardComplete;

  return (
    <div className="space-y-4">
      <div className="border border-(--color-border) rounded-md bg-white px-4 py-3.5">
        <CardElement
          options={CARD_ELEMENT_OPTIONS}
          onChange={(event) => {
            setCardComplete(event.complete);
            setCardError(event.error ? event.error.message : null);
          }}
        />
      </div>

      {cardError && (
        <p className="[font-family:var(--font-body)] text-[13px] text-red-600">
          {cardError}
        </p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="w-full h-12 bg-black text-white [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.24em] hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {processing
          ? processingLabel
          : `${payLabel} AED ${amountAed.toFixed(2)}`}
      </button>
    </div>
  );
}

export default function CardPaymentForm(props: CardPaymentFormProps) {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    api
      .get<{ success: boolean } & PaymentConfig>("/api/payments/config")
      .then((response) => {
        if (cancelled) return;
        setConfig({
          configured: response.configured,
          publishableKey: response.publishableKey,
          currency: response.currency,
          country: response.country,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setConfigError("Unable to load payment configuration");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const stripePromise = useMemo(() => {
    if (!config?.publishableKey) {
      return null;
    }
    return getStripePromise(config.publishableKey);
  }, [config?.publishableKey]);

  if (configError) {
    return (
      <p className="[font-family:var(--font-body)] text-[13px] text-red-600">
        {configError}
      </p>
    );
  }

  if (!config) {
    return (
      <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
        {props.loadingLabel || "Loading secure card form…"}
      </p>
    );
  }

  if (!config.configured || !stripePromise) {
    return (
      <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
        {props.notConfiguredLabel ||
          "Card payments are not available yet. Payment setup is still in progress."}
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CardFormInner {...props} />
    </Elements>
  );
}
