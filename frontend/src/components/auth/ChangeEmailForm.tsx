"use client";

import { useState, type FormEvent } from "react";
import { getTranslation } from "@/lib/getTranslation";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  buildVerifyEmailHref,
  startEmailChangeRequest,
} from "@/lib/auth/emailVerification";

type ChangeEmailFormProps = {
  locale: string;
  nextPath: string;
  compact?: boolean;
  variant?: "account" | "portal";
  onCancel?: () => void;
};

const PORTAL_INPUT_CLASS =
  "w-full border border-(--color-border) bg-white px-4 py-3 text-[14px] [font-family:var(--font-body)] text-black focus:border-black focus:outline-none";

const ACCOUNT_INPUT_CLASS =
  "w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition";

export default function ChangeEmailForm({
  locale,
  nextPath,
  compact = false,
  variant = "account",
  onCancel,
}: ChangeEmailFormProps) {
  const t = getTranslation(locale).verifyEmail;
  const isPortal = variant === "portal";
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await startEmailChangeRequest({
        newEmail: newEmail.trim(),
        password,
      });
      window.location.assign(
        buildVerifyEmailHref({
          locale,
          mode: "email-change",
          next: nextPath,
        }),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start email change"));
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={isPortal ? "space-y-5" : compact ? "space-y-3" : "space-y-4"}
    >
      {!compact && !isPortal ? (
        <p className="text-sm text-gray-500">{t.changeEmailHint}</p>
      ) : null}

      {error ? (
        <p
          className={
            isPortal
              ? "[font-family:var(--font-body)] text-[14px] text-red-700"
              : "text-sm text-red-700/80"
          }
        >
          {error}
        </p>
      ) : null}

      <div>
        <label
          htmlFor="change-email-new"
          className={
            isPortal
              ? "font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block mb-2"
              : "block text-sm font-medium text-gray-700 mb-1.5"
          }
        >
          {t.newEmail}
        </label>
        <input
          id="change-email-new"
          type="email"
          autoComplete="email"
          required
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          className={isPortal ? PORTAL_INPUT_CLASS : ACCOUNT_INPUT_CLASS}
        />
      </div>

      <div>
        <label
          htmlFor="change-email-password"
          className={
            isPortal
              ? "font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block mb-2"
              : "block text-sm font-medium text-gray-700 mb-1.5"
          }
        >
          {t.currentPassword}
        </label>
        <input
          id="change-email-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={isPortal ? PORTAL_INPUT_CLASS : ACCOUNT_INPUT_CLASS}
        />
      </div>

      <div
        className={
          isPortal
            ? "flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2"
            : "flex flex-col sm:flex-row sm:items-center gap-2 pt-1"
        }
      >
        <button
          type="submit"
          disabled={isSubmitting || !newEmail.trim() || !password}
          className={
            isPortal
              ? "px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition disabled:opacity-50 [font-family:var(--font-ui)] cursor-pointer"
              : "inline-flex items-center justify-center rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50 hover:bg-gray-800 transition cursor-pointer"
          }
        >
          {isSubmitting ? t.sending : t.continueChange}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className={
              isPortal
                ? "px-8 py-3 border border-black text-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition [font-family:var(--font-ui)] cursor-pointer disabled:opacity-50"
                : "text-sm text-gray-500 hover:text-black transition cursor-pointer"
            }
          >
            {t.cancel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
