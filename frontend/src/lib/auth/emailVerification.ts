import { api, type ApiError } from "@/lib/api/client";

export type VerifyEmailMode = "signup" | "checkout" | "account" | "email-change";

/** Build absolute-path OTP URL; caller supplies `next` (path + query, no locale). */
export function buildVerifyEmailHref(opts: {
  locale: string;
  mode: VerifyEmailMode;
  next: string;
}): string {
  const next = opts.next.startsWith("/") ? opts.next : `/${opts.next}`;
  return `/${opts.locale}/auth/verify-email?mode=${opts.mode}&next=${encodeURIComponent(next)}`;
}

export type SendOtpResponse = {
  ok: boolean;
  expiresAt: string;
  resendAvailableInSec: number;
  maskedEmail?: string;
  pendingEmail?: string;
};

export type StartEmailChangeResponse = {
  ok: boolean;
  pendingEmail?: string;
  maskedEmail?: string;
};

export type VerificationStatusResponse = {
  emailVerified: boolean;
  otpSent: boolean;
  resendAvailableInSec: number;
  maskedEmail: string;
  pendingEmail?: string | null;
};

export function maskEmail(email: string): string {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at <= 0) return "***";
  const local = value.slice(0, at);
  const domain = value.slice(at);
  if (local.length <= 1) return `*${domain}`;
  return `${local[0]}***${domain}`;
}

export function getApiErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const data = (error as ApiError).data;
  if (data && typeof data === "object" && "code" in data) {
    const code = (data as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

/** Client gate abort or API 403 EMAIL_NOT_VERIFIED — not a real order failure. */
export function isEmailVerificationGateError(error: unknown): boolean {
  if (getApiErrorCode(error) === "EMAIL_NOT_VERIFIED") return true;
  if (error instanceof Error) {
    return (
      error.message === "Email verification required" ||
      /verify your email/i.test(error.message)
    );
  }
  return false;
}

export function canChangeAccountEmail(user: {
  authProvider?: string;
  hasPassword?: boolean;
  isGuest?: boolean;
} | null | undefined): boolean {
  if (!user || user.isGuest) return false;
  return user.authProvider === "local" && user.hasPassword === true;
}

export async function sendEmailOtpRequest() {
  return api.post<SendOtpResponse>("/api/users/email/send-otp");
}

export async function verifyEmailOtpRequest(code: string) {
  return api.post("/api/users/email/verify-otp", { code });
}

export async function fetchVerificationStatus() {
  return api.get<VerificationStatusResponse>(
    "/api/users/email/verification-status",
  );
}

export async function startEmailChangeRequest(payload: {
  newEmail: string;
  password: string;
}) {
  return api.post<StartEmailChangeResponse>(
    "/api/users/email/change",
    payload,
  );
}

export async function resendEmailChangeOtp() {
  return api.post<SendOtpResponse>("/api/users/email/change/resend");
}

export async function verifyEmailChangeOtp(code: string) {
  return api.post("/api/users/email/change/verify", { code });
}

export async function cancelEmailChangeRequest() {
  return api.post<{ ok: boolean }>("/api/users/email/change/cancel");
}
