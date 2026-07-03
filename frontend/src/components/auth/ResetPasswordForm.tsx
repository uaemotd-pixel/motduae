"use client";

import { useState, FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { motion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { getTranslation } from "@/lib/getTranslation";
import { api } from "@/lib/api/client";
import {
  getPasswordValidationMessage,
  isPasswordValid,
} from "@/lib/auth/passwordValidation";
import PasswordChecklist from "@/components/auth/PasswordChecklist";

export default function ResetPasswordForm() {
  const params = useParams();
  const localeParam = params.locale as string;
  const t = getTranslation(localeParam);
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Reset link is invalid or missing.");
      return;
    }

    const validationMessage = getPasswordValidationMessage(password);
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.signup.passwordMismatch || "Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/api/users/reset-password", { token, password });
      setSuccess(true);
      setTimeout(() => {
        router.replace("/auth/login");
      }, 2000);
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to reset password.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h2 className="font-headline-lg text-2xl uppercase">Invalid reset link</h2>
        <p className="text-black/50">
          This password reset link is invalid or has expired.
        </p>
        <Link
          href="/auth/forgetPassword"
          className="inline-flex h-12 items-center justify-center bg-black px-8 text-white text-xs uppercase tracking-[0.25em]"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center space-y-4 fade-in">
        <h2 className="font-headline-lg text-2xl uppercase text-green-700">
          Password updated
        </h2>
        <p className="text-black/50">Redirecting you to sign in...</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <header className="mb-10 md:mb-12">
        <div className="flex items-center gap-2 mb-4">
          <span className="block w-8 h-px bg-black/20"></span>
          <span className="font-label-sm text-[11px] md:text-[12px] tracking-[0.3em] text-black/40 uppercase">
            Account Security
          </span>
        </div>
        <h2 className="font-headline-lg text-[28px] sm:text-[32px] md:text-[38px] uppercase mb-3 tracking-[-0.01em] text-black">
          Reset Password
        </h2>
        <p className="font-body-md text-[14px] sm:text-[15px] text-black/50 leading-relaxed">
          Choose a new password for your MOTD account.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label
            htmlFor="new-password"
            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
          >
            New Password
          </label>
          <div className="relative">
            <input
              id="new-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 pr-10 transition-all focus:border-black focus:outline-none text-black"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-black/40 hover:text-black transition-colors"
              tabIndex={-1}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <PasswordChecklist password={password} />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm-new-password"
            className="font-label-sm text-[11px] md:text-[12px] text-black/60 uppercase tracking-[0.2em] block"
          >
            Confirm Password
          </label>
          <input
            id="confirm-new-password"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full h-11 md:h-12 bg-transparent border-b border-black/15 text-[15px] md:text-[16px] font-body-md rounded-none px-0 transition-all focus:border-black focus:outline-none text-black"
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md border border-red-200">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading || !isPasswordValid(password)}
          className="w-full h-12 md:h-13 bg-black text-white font-label-sm text-[12px] md:text-[13px] uppercase tracking-[0.25em] hover:bg-black/80 transition-all duration-300 active:scale-[0.98] mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Updating..." : "Update Password"}
        </button>
      </form>
    </motion.div>
  );
}
