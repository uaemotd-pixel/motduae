"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Elements,
  PaymentRequestButtonElement,
  useStripe,
} from "@stripe/react-stripe-js";
import type { PaymentRequest } from "@stripe/stripe-js";
import { api } from "@/lib/api/client";
import { amountToStripeMinorUnits, getStripePromise } from "@/lib/stripe";

type PaymentConfig = {
  configured: boolean;
  publishableKey: string;
  currency: string;
  country: string;
};

type ApplePayCheckoutProps = {
  amountAed: number;
  orderLabel: string;
  disabled?: boolean;
  processingLabel?: string;
  loadingLabel?: string;
  unavailableLabel?: string;
  notConfiguredLabel?: string;
  createIntent: () => Promise<{
    clientSecret: string;
    paymentIntentId: string;
  }>;
  onPaid: (paymentIntentId: string) => Promise<void>;
  onError?: (message: string) => void;
};

type ApplePayStatus =
  | "loading"
  | "ready"
  | "unavailable"
  | "not_configured"
  | "processing";

function ApplePayButtonInner({
  amountAed,
  orderLabel,
  disabled = false,
  processingLabel = "Processing...",
  loadingLabel = "Checking Apple Pay…",
  unavailableLabel = "Apple Pay is required to complete checkout. Please use Safari on an Apple device with a card in Wallet. Also register this site domain in Stripe → Apple Pay settings.",
  notConfiguredLabel = "Apple Pay is not available yet. Payment setup is still in progress.",
  createIntent,
  onPaid,
  onError,
}: ApplePayCheckoutProps) {
  const stripe = useStripe();
  const createIntentRef = useRef(createIntent);
  const onPaidRef = useRef(onPaid);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    createIntentRef.current = createIntent;
    onPaidRef.current = onPaid;
    onErrorRef.current = onError;
  }, [createIntent, onPaid, onError]);

  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(
    null,
  );
  const [status, setStatus] = useState<ApplePayStatus>("loading");
  const [canUseApplePay, setCanUseApplePay] = useState(false);

  const amountMinor = useMemo(
    () => amountToStripeMinorUnits(amountAed),
    [amountAed],
  );

  useEffect(() => {
    if (!stripe || amountMinor <= 0) {
      return;
    }

    let cancelled = false;
    const request = stripe.paymentRequest({
      country: "AE",
      currency: "aed",
      total: {
        label: orderLabel,
        amount: amountMinor,
      },
      requestPayerName: true,
      requestPayerEmail: true,
    });

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      setCanUseApplePay(false);
      setStatus("unavailable");
    }, 15000);

    request
      .canMakePayment()
      .then((result) => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);

        if (result?.applePay) {
          setPaymentRequest(request);
          setCanUseApplePay(true);
          setStatus("ready");
        } else {
          setCanUseApplePay(false);
          setStatus("unavailable");
        }
      })
      .catch(() => {
        if (cancelled) return;
        window.clearTimeout(timeoutId);
        setCanUseApplePay(false);
        setStatus("unavailable");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [stripe, amountMinor, orderLabel]);

  useEffect(() => {
    if (stripe || amountMinor <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (!stripe && amountMinor > 0) {
        setStatus("unavailable");
      }
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [stripe, amountMinor]);

  useEffect(() => {
    if (!paymentRequest) return;

    const handlePaymentMethod = async (event: {
      complete: (status: "success" | "fail") => void;
      paymentMethod: { id: string };
    }) => {
      setStatus("processing");

      try {
        const intent = await createIntentRef.current();
        const { error, paymentIntent } = await stripe!.confirmCardPayment(
          intent.clientSecret,
          {
            payment_method: event.paymentMethod.id,
          },
          { handleActions: true },
        );

        if (error) {
          event.complete("fail");
          onErrorRef.current?.(error.message || "Payment failed");
          setStatus("ready");
          return;
        }

        if (!paymentIntent || paymentIntent.status !== "succeeded") {
          event.complete("fail");
          onErrorRef.current?.("Payment was not completed");
          setStatus("ready");
          return;
        }

        event.complete("success");
        await onPaidRef.current(paymentIntent.id);
      } catch (error) {
        event.complete("fail");
        const message =
          error instanceof Error ? error.message : "Payment failed";
        onErrorRef.current?.(message);
        setStatus("ready");
      }
    };

    paymentRequest.on("paymentmethod", handlePaymentMethod);

    return () => {
      paymentRequest.off("paymentmethod", handlePaymentMethod);
    };
  }, [paymentRequest, stripe]);

  useEffect(() => {
    if (!paymentRequest || amountMinor <= 0) return;

    paymentRequest.update({
      total: {
        label: orderLabel,
        amount: amountMinor,
      },
    });
  }, [paymentRequest, amountMinor, orderLabel]);

  if (status === "loading") {
    return (
      <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
        {loadingLabel}
      </p>
    );
  }

  if (status === "not_configured") {
    return (
      <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
        {notConfiguredLabel}
      </p>
    );
  }

  if (!canUseApplePay) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="[font-family:var(--font-body)] text-[13px] text-amber-900">
          {unavailableLabel}
        </p>
      </div>
    );
  }

  if (status === "processing" || disabled) {
    return (
      <button
        type="button"
        disabled
        className="w-full px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase opacity-40 cursor-not-allowed [font-family:var(--font-ui)]"
      >
        {processingLabel}
      </button>
    );
  }

  if (!paymentRequest) {
    return null;
  }

  return (
    <div className="apple-pay-button-wrapper [&_.StripeElement]:w-full">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequestButton: {
              type: "buy",
              theme: "dark",
              height: "48px",
            },
          },
        }}
      />
    </div>
  );
}

export default function ApplePayCheckout(props: ApplePayCheckoutProps) {
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
        {props.loadingLabel || "Checking Apple Pay…"}
      </p>
    );
  }

  if (!config.configured || !stripePromise) {
    return (
      <p className="[font-family:var(--font-body)] text-[13px] text-(--color-grey-muted)">
        {props.notConfiguredLabel ||
          "Apple Pay is not available yet. Payment setup is still in progress."}
      </p>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <ApplePayButtonInner {...props} />
    </Elements>
  );
}
