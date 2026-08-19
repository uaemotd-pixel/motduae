import crypto from "crypto";
import {
  OTP_LENGTH,
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSES,
} from "./otpPolicy.js";
import { isEmailVerified } from "./isEmailVerified.js";
import { isPendingEmailActive } from "./emailOccupancy.js";

export class EmailVerificationError extends Error {
  constructor(code, message, status = 400, extra = {}) {
    super(message);
    this.name = "EmailVerificationError";
    this.code = code;
    this.status = status;
    this.extra = extra;
  }
}

export function hashOtp(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

export function generateOtpCode() {
  const max = 10 ** OTP_LENGTH;
  const num = crypto.randomInt(0, max);
  return String(num).padStart(OTP_LENGTH, "0");
}

function timingSafeEqualHash(a, b) {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Attempts filter: treat missing count as 0. */
export function attemptsBelowMaxFilter() {
  return {
    $expr: {
      $lt: [
        { $ifNull: ["$emailVerificationAttemptCount", 0] },
        MAX_VERIFY_ATTEMPTS,
      ],
    },
  };
}

export function getResendAvailableInSec(user) {
  if (!user?.emailVerificationOTPSentAt) return 0;
  const elapsed =
    Date.now() - new Date(user.emailVerificationOTPSentAt).getTime();
  const remainingMs = RESEND_COOLDOWN_MS - elapsed;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

export function hasActiveOtp(user) {
  return Boolean(user?.emailVerificationOTPHash);
}

export function hasPendingEmailChange(user) {
  return isPendingEmailActive(user);
}

export function clearOtpFields(user) {
  user.emailVerificationOTPHash = undefined;
  user.emailVerificationOTPExpires = undefined;
  user.emailVerificationOTPSentAt = undefined;
  user.emailVerificationAttemptCount = 0;
  user.emailVerificationPurpose = undefined;
}

export function assertCanSend(user) {
  if (isEmailVerified(user)) {
    throw new EmailVerificationError(
      "EMAIL_ALREADY_VERIFIED",
      "Email is already verified",
      400,
    );
  }

  const waitSec = getResendAvailableInSec(user);
  if (waitSec > 0) {
    throw new EmailVerificationError(
      "OTP_RESEND_COOLDOWN",
      `Please wait ${waitSec}s before requesting another code`,
      429,
      { resendAvailableInSec: waitSec },
    );
  }
}

/**
 * @returns {{ code: string, expiresAt: Date, sentAt: Date }}
 */
export function issueOtp(user) {
  assertCanSend(user);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const sentAt = new Date();

  user.emailVerificationOTPHash = hashOtp(code);
  user.emailVerificationOTPExpires = expiresAt;
  user.emailVerificationOTPSentAt = sentAt;
  user.emailVerificationAttemptCount = 0;
  user.emailVerificationPurpose = EMAIL_VERIFICATION_PURPOSES.VERIFY_EMAIL;

  return { code, expiresAt, sentAt };
}

/**
 * Classify failure after an atomic success update missed.
 * @param {object|null} user
 */
function throwVerifyFailure(user, rawCode) {
  if (!user) {
    throw new EmailVerificationError("OTP_INVALID", "User not found", 404);
  }

  if (isEmailVerified(user)) {
    throw new EmailVerificationError(
      "EMAIL_ALREADY_VERIFIED",
      "Email is already verified",
      400,
    );
  }

  if (!user.emailVerificationOTPHash || !user.emailVerificationOTPExpires) {
    throw new EmailVerificationError(
      "OTP_INVALID",
      "No verification code has been sent. Request a new code.",
      400,
    );
  }

  const attempts = user.emailVerificationAttemptCount || 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new EmailVerificationError(
      "OTP_MAX_ATTEMPTS",
      "Too many incorrect attempts. Request a new code.",
      400,
    );
  }

  if (new Date(user.emailVerificationOTPExpires).getTime() <= Date.now()) {
    throw new EmailVerificationError(
      "OTP_EXPIRED",
      "This code has expired. Request a new code.",
      400,
    );
  }

  const code = String(rawCode || "").trim();
  if (!/^\d{6}$/.test(code)) {
    throw new EmailVerificationError(
      "OTP_INVALID",
      "Invalid verification code",
      400,
    );
  }

  const incomingHash = hashOtp(code);
  if (!timingSafeEqualHash(incomingHash, user.emailVerificationOTPHash)) {
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      throw new EmailVerificationError(
        "OTP_MAX_ATTEMPTS",
        "Too many incorrect attempts. Request a new code.",
        400,
      );
    }
    throw new EmailVerificationError(
      "OTP_INVALID",
      "Invalid verification code",
      400,
    );
  }

  // Hash matched but atomic update lost the race (another request won)
  throw new EmailVerificationError(
    "EMAIL_ALREADY_VERIFIED",
    "Email is already verified",
    400,
  );
}

/**
 * Atomically verify OTP (parallel-safe).
 * Success: single findOneAndUpdate wins; clears OTP fields.
 * Failure: atomic $inc on attempts when code is wrong but session still valid.
 *
 * @param {import("mongoose").Model} UserModel
 * @param {string|import("mongoose").Types.ObjectId} userId
 * @param {string} rawCode
 * @returns {Promise<{ ok: true, user: object }>}
 */
export async function verifyOtpAtomic(UserModel, userId, rawCode) {
  const code = String(rawCode || "").trim();
  const now = new Date();

  if (!/^\d{6}$/.test(code)) {
    const bumped = await UserModel.findOneAndUpdate(
      {
        _id: userId,
        emailVerified: false,
        emailVerificationPurpose: { $ne: EMAIL_VERIFICATION_PURPOSES.CHANGE_EMAIL },
        emailVerificationOTPHash: { $exists: true, $nin: [null, ""] },
        emailVerificationOTPExpires: { $gt: now },
        ...attemptsBelowMaxFilter(),
      },
      { $inc: { emailVerificationAttemptCount: 1 } },
      { new: true },
    );

    if (bumped && (bumped.emailVerificationAttemptCount || 0) >= MAX_VERIFY_ATTEMPTS) {
      throw new EmailVerificationError(
        "OTP_MAX_ATTEMPTS",
        "Too many incorrect attempts. Request a new code.",
        400,
      );
    }

    throw new EmailVerificationError(
      "OTP_INVALID",
      "Invalid verification code",
      400,
    );
  }

  const incomingHash = hashOtp(code);

  const verifiedUser = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      emailVerified: false,
      emailVerificationPurpose: { $ne: EMAIL_VERIFICATION_PURPOSES.CHANGE_EMAIL },
      emailVerificationOTPHash: incomingHash,
      emailVerificationOTPExpires: { $gt: now },
      ...attemptsBelowMaxFilter(),
    },
    {
      $set: {
        emailVerified: true,
        emailVerificationAttemptCount: 0,
      },
      $unset: {
        emailVerificationOTPHash: "",
        emailVerificationOTPExpires: "",
        emailVerificationOTPSentAt: "",
        emailVerificationPurpose: "",
      },
    },
    { new: true },
  );

  if (verifiedUser) {
    return { ok: true, user: verifiedUser };
  }

  // Wrong code (or expired / max / already verified): bump attempts if still a live challenge
  const afterBump = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      emailVerified: false,
      emailVerificationPurpose: { $ne: EMAIL_VERIFICATION_PURPOSES.CHANGE_EMAIL },
      emailVerificationOTPHash: {
        $exists: true,
        $nin: [null, ""],
        $ne: incomingHash,
      },
      emailVerificationOTPExpires: { $gt: now },
      ...attemptsBelowMaxFilter(),
    },
    { $inc: { emailVerificationAttemptCount: 1 } },
    { new: true },
  );

  if (
    afterBump &&
    (afterBump.emailVerificationAttemptCount || 0) >= MAX_VERIFY_ATTEMPTS
  ) {
    throw new EmailVerificationError(
      "OTP_MAX_ATTEMPTS",
      "Too many incorrect attempts. Request a new code.",
      400,
    );
  }

  if (afterBump) {
    throw new EmailVerificationError(
      "OTP_INVALID",
      "Invalid verification code",
      400,
    );
  }

  const latest = await UserModel.findById(userId);
  throwVerifyFailure(latest, rawCode);
}

/**
 * In-memory verify (tests / non-atomic paths). Prefer verifyOtpAtomic in routes.
 * Mutates user on success or failed attempt (caller must save).
 * @returns {{ ok: true }}
 */
export function verifyOtp(user, rawCode) {
  if (isEmailVerified(user)) {
    throw new EmailVerificationError(
      "EMAIL_ALREADY_VERIFIED",
      "Email is already verified",
      400,
    );
  }

  if (!user.emailVerificationOTPHash || !user.emailVerificationOTPExpires) {
    throw new EmailVerificationError(
      "OTP_INVALID",
      "No verification code has been sent. Request a new code.",
      400,
    );
  }

  const attempts = user.emailVerificationAttemptCount || 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new EmailVerificationError(
      "OTP_MAX_ATTEMPTS",
      "Too many incorrect attempts. Request a new code.",
      400,
    );
  }

  if (new Date(user.emailVerificationOTPExpires).getTime() <= Date.now()) {
    throw new EmailVerificationError(
      "OTP_EXPIRED",
      "This code has expired. Request a new code.",
      400,
    );
  }

  const code = String(rawCode || "").trim();
  if (!/^\d{6}$/.test(code)) {
    user.emailVerificationAttemptCount = attempts + 1;
    throw new EmailVerificationError(
      "OTP_INVALID",
      "Invalid verification code",
      400,
    );
  }

  const incomingHash = hashOtp(code);
  if (!timingSafeEqualHash(incomingHash, user.emailVerificationOTPHash)) {
    user.emailVerificationAttemptCount = attempts + 1;
    if (user.emailVerificationAttemptCount >= MAX_VERIFY_ATTEMPTS) {
      throw new EmailVerificationError(
        "OTP_MAX_ATTEMPTS",
        "Too many incorrect attempts. Request a new code.",
        400,
      );
    }
    throw new EmailVerificationError(
      "OTP_INVALID",
      "Invalid verification code",
      400,
    );
  }

  user.emailVerified = true;
  clearOtpFields(user);
  return { ok: true };
}

export function getVerificationStatus(user) {
  const verified = isEmailVerified(user);
  const changePending = hasPendingEmailChange(user);
  return {
    emailVerified: verified,
    otpSent: hasActiveOtp(user),
    resendAvailableInSec:
      changePending || !verified ? getResendAvailableInSec(user) : 0,
    pendingEmail: user?.pendingEmail || null,
  };
}

export function maskEmail(email) {
  const value = String(email || "");
  const at = value.indexOf("@");
  if (at <= 0) return "***";
  const local = value.slice(0, at);
  const domain = value.slice(at);
  if (local.length <= 1) return `*${domain}`;
  return `${local[0]}***${domain}`;
}
