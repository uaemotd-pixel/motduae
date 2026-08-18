"use client";

import { useEffect, useState } from "react";
import { getTranslation } from "@/lib/getTranslation";
import {
  buildVerifyEmailHref,
  cancelEmailChangeRequest,
  fetchVerificationStatus,
} from "@/lib/auth/emailVerification";

type EmailChangePendingBannerProps = {
  locale: string;
  nextPath: string;
  variant?: "account" | "portal";
  onCancelled?: () => void;
};

export default function EmailChangePendingBanner({
  locale,
  nextPath,
  variant = "account",
  onCancelled,
}: EmailChangePendingBannerProps) {
  const t = getTranslation(locale).verifyEmail;
  const isPortal = variant === "portal";
  const [masked, setMasked] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchVerificationStatus()
      .then((status) => {
        if (cancelled) return;
        setMasked(status.pendingEmail || null);
      })
      .catch(() => {
        if (!cancelled) setMasked(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!masked) return null;

  const resume = () => {
    window.location.assign(
      buildVerifyEmailHref({
        locale,
        mode: "email-change",
        next: nextPath,
      }),
    );
  };

  const cancel = async () => {
    setIsCancelling(true);
    try {
      await cancelEmailChangeRequest();
      setMasked(null);
      onCancelled?.();
    } catch {
      setIsCancelling(false);
    }
  };

  return (
    <div
      role="status"
      className={
        isPortal
          ? "border border-(--color-border) bg-white px-4 py-4 sm:px-5"
          : "rounded-xl border border-gray-200 bg-white px-4 py-3.5"
      }
    >
      <p
        className={
          isPortal
            ? "[font-family:var(--font-body)] text-[14px] text-black"
            : "text-sm text-gray-800"
        }
      >
        {t.pendingChangeBody}{" "}
        <span className={isPortal ? "text-black" : "font-medium text-black"}>
          {masked}
        </span>
      </p>
      <div
        className={
          isPortal
            ? "mt-3 flex flex-col sm:flex-row gap-3"
            : "mt-3 flex flex-col sm:flex-row gap-2"
        }
      >
        <button
          type="button"
          onClick={resume}
          disabled={isCancelling}
          className={
            isPortal
              ? "px-6 py-2.5 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-50 [font-family:var(--font-ui)] cursor-pointer"
              : "px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium bg-black text-white hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
          }
        >
          {t.pendingChangeResume}
        </button>
        <button
          type="button"
          onClick={() => void cancel()}
          disabled={isCancelling}
          className={
            isPortal
              ? "px-6 py-2.5 border border-black text-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition disabled:opacity-50 [font-family:var(--font-ui)] cursor-pointer"
              : "px-3.5 py-2 rounded-lg text-xs sm:text-sm font-medium border border-gray-300 text-gray-700 hover:border-black hover:text-black transition cursor-pointer disabled:opacity-50"
          }
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}
