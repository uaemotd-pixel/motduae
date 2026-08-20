"use client";

import { forwardRef } from "react";

export type EmailVerifyRequiredNoticeProps = {
  message: string;
  ctaLabel: string;
  href: string;
  /** Stronger ring when user tries a gated action while unverified */
  emphasize?: boolean;
  className?: string;
  /** Persist state (e.g. wishlist session) before leaving for OTP */
  onBeforeNavigate?: () => void;
  /** If set, runs instead of navigating to href (e.g. POST start then assign). */
  onCta?: () => void | Promise<void>;
};

const EmailVerifyRequiredNotice = forwardRef<
  HTMLDivElement,
  EmailVerifyRequiredNoticeProps
>(function EmailVerifyRequiredNotice(
  {
    message,
    ctaLabel,
    href,
    emphasize = false,
    className = "",
    onBeforeNavigate,
    onCta,
  },
  ref,
) {
  return (
    <div
      ref={ref}
      id="checkout-email-verify-notice"
      role="alert"
      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl border px-4 py-3.5 transition-shadow ${
        emphasize
          ? "border-red-500 bg-red-50 shadow-[0_0_0_3px_rgba(239,68,68,0.25)]"
          : "border-red-200 bg-red-50"
      } ${className}`}
    >
      <p className="text-sm text-red-800 min-w-0">{message}</p>
      <button
        type="button"
        onClick={() => {
          onBeforeNavigate?.();
          if (onCta) {
            void onCta();
            return;
          }
          window.location.assign(href);
        }}
        className="shrink-0 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition cursor-pointer w-full sm:w-auto"
      >
        {ctaLabel}
      </button>
    </div>
  );
});

export default EmailVerifyRequiredNotice;
