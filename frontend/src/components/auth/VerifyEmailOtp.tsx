"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { getTranslation } from "@/lib/getTranslation";
import {
  getApiErrorCode,
  maskEmail,
  sendEmailOtpRequest,
  verifyEmailOtpRequest,
  resendEmailChangeOtp,
  verifyEmailChangeOtp,
  fetchVerificationStatus,
  type VerifyEmailMode,
} from "@/lib/auth/emailVerification";
import { getApiErrorMessage } from "@/lib/api/client";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";
import * as images from "../../../public/images/ImageIndex";

export type { VerifyEmailMode };

type Phase = "idle" | "sent" | "verifying" | "verified" | "failed";

const OTP_LENGTH = 6;
const EASE = [0.25, 0.1, 0.25, 1] as const;

type Props = {
  locale: string;
  mode?: VerifyEmailMode;
  nextPath?: string | null;
  pendingMaskedEmail?: string | null;
  onVerified?: () => void;
  onSkip?: () => void;
};

export default function VerifyEmailOtp({
  locale,
  mode = "signup",
  nextPath,
  pendingMaskedEmail,
  onVerified,
  onSkip,
}: Props) {
  const t = getTranslation(locale).verifyEmail;
  const { user, applyUserResponse } = useAuth();
  const isPartner =
    user?.role === "tailor" || user?.role === "fabric_store";
  const isEmailChange = mode === "email-change";

  const [phase, setPhase] = useState<Phase>("idle");
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [masked, setMasked] = useState(
    pendingMaskedEmail || (user?.email ? maskEmail(user.email) : ""),
  );
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (pendingMaskedEmail) setMasked(pendingMaskedEmail);
  }, [pendingMaskedEmail]);

  useEffect(() => {
    if (isEmailChange) return;
    if (user?.email) setMasked(maskEmail(user.email));
  }, [user?.email, isEmailChange]);

  useEffect(() => {
    if (!isEmailChange) return;
    let cancelled = false;
    fetchVerificationStatus()
      .then((status) => {
        if (cancelled) return;
        if (status.pendingEmail) setMasked(status.pendingEmail);
        if (status.otpSent) {
          setPhase("sent");
          setCooldown(status.resendAvailableInSec || 0);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isEmailChange]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setInterval(() => {
      setCooldown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldown]);

  const finishSuccess = useCallback(() => {
    if (onVerified) {
      onVerified();
      return;
    }
    const target = nextPath
      ? `/${locale}${nextPath.startsWith("/") ? nextPath : `/${nextPath}`}`
      : `/${locale}`;
    window.location.replace(target);
  }, [locale, nextPath, onVerified]);

  const handleSend = async () => {
    setError("");
    setIsSending(true);
    try {
      const res = isEmailChange
        ? await resendEmailChangeOtp()
        : await sendEmailOtpRequest();
      if (res.maskedEmail) setMasked(res.maskedEmail);
      setCooldown(res.resendAvailableInSec || 60);
      setPhase("sent");
      setDigits(Array(OTP_LENGTH).fill(""));
      window.setTimeout(() => inputsRef.current[0]?.focus(), 50);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to send code"));
    } finally {
      setIsSending(false);
    }
  };

  const runVerify = async (code: string) => {
    if (verifyingRef.current || code.length !== OTP_LENGTH) return;
    verifyingRef.current = true;
    setError("");
    setPhase("verifying");

    try {
      const response = isEmailChange
        ? await verifyEmailChangeOtp(code)
        : await verifyEmailOtpRequest(code);
      applyUserResponse(response as Parameters<typeof applyUserResponse>[0]);
      setPhase("verified");
      window.setTimeout(() => finishSuccess(), 900);
    } catch (err) {
      const codeKey = getApiErrorCode(err);
      setError(getApiErrorMessage(err, "Verification failed"));
      setPhase("failed");
      if (codeKey === "OTP_MAX_ATTEMPTS" || codeKey === "OTP_EXPIRED") {
        setDigits(Array(OTP_LENGTH).fill(""));
      }
      window.setTimeout(() => {
        setPhase("sent");
        verifyingRef.current = false;
      }, 1100);
      return;
    }
    verifyingRef.current = false;
  };

  const updateDigit = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    if (char && index < OTP_LENGTH - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const code = digits.join("");
      if (code.length === OTP_LENGTH) {
        void runVerify(code);
      }
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => {
      next[i] = ch;
    });
    setDigits(next);
    const focusAt = Math.min(pasted.length, OTP_LENGTH - 1);
    inputsRef.current[focusAt]?.focus();
  };

  const onManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    void runVerify(digits.join(""));
  };

  const title =
    phase === "verifying"
      ? t.verifying
      : phase === "verified"
        ? t.verified
        : phase === "failed"
          ? t.notVerified
          : mode === "checkout"
            ? t.checkoutTitle
            : mode === "account"
              ? t.accountTitle
              : mode === "email-change"
                ? t.changeTitle
                : t.title;

  const showDigits =
    phase === "sent" ||
    phase === "verifying" ||
    phase === "failed" ||
    phase === "verified";
  const busy = phase === "verifying" || isSending;

  return (
    <main className="min-h-screen w-full flex flex-col md:flex-row bg-[#FFFDF9]">
      <section className="hidden md:sticky md:top-0 md:block md:w-[55%] h-screen overflow-hidden relative">
        <img
          src={images.sub1.src}
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/20" />
        <div className="absolute top-7.5 left-7.5 z-10">
          <Link href="/" className="shrink-0 flex items-center p-7.5 -m-7.5">
            <img
              src="/PNG/White/MOTD_Wordmark_White.png"
              alt="MOTD"
              className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 w-auto object-contain"
            />
          </Link>
        </div>
      </section>

      <section className="w-full md:w-[45%] bg-[#FFFDF9] h-auto flex flex-col justify-center items-center py-10 px-5 sm:px-8 md:px-12 lg:px-16 xl:px-20">
        <div className="w-full max-w-100 mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <div className="md:hidden flex justify-center mb-10">
              <Image
                src={logoBlack}
                alt="MOTD — Mukhawar of the Day"
                height={35}
                width={100}
                className="h-auto w-auto object-contain"
              />
            </div>

            <header
              className={`mb-10 md:mb-12 ${
                phase === "verified" || phase === "failed"
                  ? "text-center"
                  : ""
              }`}
            >
              <h2 className="font-headline-lg text-[32px] sm:text-[36px] md:text-[40px] uppercase mb-3 tracking-[-0.01em] text-black">
                {phase === "verifying" ? `${t.verifying}…` : title}
              </h2>
              {phase !== "verified" && phase !== "failed" && (
                <>
                  <p className="font-body-md text-[14px] sm:text-[15px] text-black/50 leading-relaxed">
                    {isEmailChange
                      ? t.changeSubtitle
                      : isPartner
                        ? t.partnerSubtitle
                        : t.subtitle}
                  </p>
                  {masked ? (
                    <p className="mt-2 font-body-md text-[14px] text-black/70">
                      {masked}
                    </p>
                  ) : null}
                </>
              )}
            </header>

            {error && phase !== "verifying" ? (
              <p className="mb-4 text-sm text-red-700/80">{error}</p>
            ) : null}

            {phase === "idle" && (
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={isSending}
                className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
              >
                {isSending ? t.sending : t.sendOtp}
              </button>
            )}

            {showDigits && (
              <form onSubmit={onManualSubmit} className="space-y-6">
                <div
                  className={`relative flex items-center justify-center ${
                    phase === "verified" || phase === "verifying"
                      ? "h-28 sm:h-32"
                      : "h-16"
                  }`}
                >
                  <AnimatePresence mode="wait">
                    {phase === "verifying" ||
                    phase === "verified" ||
                    phase === "failed" ? (
                      <motion.div
                        key={`merged-${phase}`}
                        initial={{ scale: 0.85, opacity: 0.6 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.45, ease: EASE }}
                        className={
                          phase === "verified"
                            ? "w-24 h-24 sm:w-28 sm:h-28 bg-black flex items-center justify-center mx-auto"
                            : phase === "failed"
                              ? "w-20 h-20 border border-black flex items-center justify-center text-3xl text-black mx-auto"
                              : "w-20 h-20 border border-black flex items-center justify-center text-black mx-auto"
                        }
                        aria-hidden
                      >
                        {phase === "verified" ? (
                          <motion.svg
                            viewBox="0 0 24 24"
                            className="w-12 h-12 sm:w-14 sm:h-14"
                            fill="none"
                            initial={{ pathLength: 0, opacity: 0 }}
                            animate={{ pathLength: 1, opacity: 1 }}
                            transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
                          >
                            <motion.path
                              d="M5 12.5l4.5 4.5L19 7.5"
                              stroke="white"
                              strokeWidth="2.25"
                              strokeLinecap="square"
                              strokeLinejoin="miter"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{
                                duration: 0.45,
                                ease: EASE,
                                delay: 0.08,
                              }}
                            />
                          </motion.svg>
                        ) : phase === "failed" ? (
                          <span className="text-3xl leading-none">×</span>
                        ) : (
                          <span className="animate-pulse text-sm tracking-[0.3em]">
                            ···
                          </span>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="digits"
                        className="flex gap-2 sm:gap-3 w-full justify-between"
                        initial={{ opacity: 1 }}
                        exit={{
                          opacity: 0,
                          scale: 0.9,
                          transition: { duration: 0.35, ease: EASE },
                        }}
                      >
                        {digits.map((d, i) => (
                          <input
                            key={i}
                            ref={(el) => {
                              inputsRef.current[i] = el;
                            }}
                            inputMode="numeric"
                            autoComplete={i === 0 ? "one-time-code" : "off"}
                            maxLength={1}
                            value={d}
                            disabled={busy}
                            onChange={(e) => updateDigit(i, e.target.value)}
                            onKeyDown={(e) => onKeyDown(i, e)}
                            onPaste={onPaste}
                            className="w-10 sm:w-12 h-12 sm:h-14 text-center text-lg border border-black/20 bg-transparent text-black focus:border-black focus:outline-none disabled:opacity-60"
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {phase === "verified" ? (
                  <p className="text-center font-label-sm text-[11px] sm:text-[12px] text-black/40 uppercase tracking-[0.2em]">
                    {t.redirecting}…
                  </p>
                ) : null}

                {phase !== "verified" ? (
                <button
                  type="submit"
                  disabled={busy || digits.join("").length !== OTP_LENGTH}
                  className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {phase === "verifying" ? (
                    <>
                      <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                      {t.verifying}
                    </>
                  ) : (
                    t.verify
                  )}
                </button>
                ) : null}

                {phase === "sent" || phase === "failed" ? (
                  <div className="text-center space-y-2">
                    {cooldown > 0 ? (
                      <p className="font-label-sm text-[11px] text-black/40 uppercase tracking-[0.2em]">
                        {t.resendIn} 0:{String(cooldown).padStart(2, "0")}
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleSend()}
                        className="font-label-sm text-[11px] text-black/60 uppercase tracking-[0.2em] hover:text-black"
                      >
                        {t.resend}
                      </button>
                    )}
                    <p className="text-[12px] text-black/40">{t.spamHint}</p>
                  </div>
                ) : null}
              </form>
            )}

            {isEmailChange &&
            phase !== "verifying" &&
            phase !== "verified" ? (
              <button
                type="button"
                onClick={onSkip}
                disabled={busy}
                className="mt-8 w-full text-center font-label-sm text-[11px] text-black/40 uppercase tracking-[0.2em] hover:text-black/70"
              >
                {t.cancel}
              </button>
            ) : null}

            {!isEmailChange &&
            (mode === "signup" ||
              mode === "checkout" ||
              mode === "account") &&
            phase !== "verifying" &&
            phase !== "verified" ? (
              <button
                type="button"
                onClick={onSkip}
                disabled={busy}
                className="mt-8 w-full text-center font-label-sm text-[11px] text-black/40 uppercase tracking-[0.2em] hover:text-black/70"
              >
                {t.skip}
              </button>
            ) : null}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
