import bcrypt from "bcryptjs";
import {
  EmailVerificationError,
  hashOtp,
  generateOtpCode,
  getResendAvailableInSec,
  clearOtpFields,
  attemptsBelowMaxFilter,
  hasPendingEmailChange,
} from "./emailVerificationService.js";
import {
  OTP_TTL_MS,
  MAX_VERIFY_ATTEMPTS,
  EMAIL_VERIFICATION_PURPOSES,
} from "./otpPolicy.js";
import {
  applyEmailChangeRelease,
  findEmailOccupant,
  normalizeEmail,
  pendingEmailExpiresAt,
} from "./emailOccupancy.js";

const CHANGE_ROLES = new Set(["customer", "tailor", "fabric_store"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDuplicateKeyError(error) {
  return Boolean(error && (error.code === 11000 || error.code === 11001));
}

export function assertCanChangeEmail(user, { isGuest } = {}) {
  if (isGuest || user?.isGuest) {
    throw new EmailVerificationError(
      "EMAIL_CHANGE_NOT_ALLOWED",
      "Email cannot be changed for this account",
      403,
    );
  }

  if (!user || user.authProvider !== "local" || !user.password) {
    throw new EmailVerificationError(
      "EMAIL_CHANGE_NOT_ALLOWED",
      "Email cannot be changed for this account",
      403,
    );
  }

  if (!CHANGE_ROLES.has(user.role)) {
    throw new EmailVerificationError(
      "EMAIL_CHANGE_NOT_ALLOWED",
      "Email cannot be changed for this account",
      403,
    );
  }
}

/**
 * @returns {{ pendingEmail: string }}
 */
export async function startEmailChange(
  UserModel,
  user,
  newEmail,
  password,
  { isGuest } = {},
) {
  assertCanChangeEmail(user, { isGuest });

  if (!password) {
    throw new EmailVerificationError(
      "INVALID_PASSWORD",
      "Current password is required",
      401,
    );
  }

  if (!bcrypt.compareSync(password, user.password)) {
    throw new EmailVerificationError(
      "INVALID_PASSWORD",
      "Current password is incorrect",
      401,
    );
  }

  const normalized = normalizeEmail(newEmail);
  if (!EMAIL_RE.test(normalized)) {
    throw new EmailVerificationError(
      "EMAIL_INVALID",
      "Enter a valid email address",
      400,
    );
  }

  if (normalized === normalizeEmail(user.email)) {
    throw new EmailVerificationError(
      "EMAIL_UNCHANGED",
      "This is already your email",
      400,
    );
  }

  const taken = await findEmailOccupant(UserModel, normalized, {
    excludeUserId: user._id,
  });

  if (taken) {
    throw new EmailVerificationError(
      "EMAIL_TAKEN",
      "This email is already in use",
      409,
    );
  }

  clearOtpFields(user);
  user.pendingEmail = normalized;
  user.pendingEmailExpiresAt = pendingEmailExpiresAt();
  user.emailVerificationPurpose = EMAIL_VERIFICATION_PURPOSES.CHANGE_EMAIL;

  return { pendingEmail: normalized };
}

/**
 * @returns {{ code: string, expiresAt: Date, sentAt: Date }}
 */
export function issueChangeOtp(user) {
  if (!hasPendingEmailChange(user)) {
    throw new EmailVerificationError(
      "EMAIL_CHANGE_NOT_PENDING",
      "No email change is in progress",
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

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  const sentAt = new Date();

  user.emailVerificationOTPHash = hashOtp(code);
  user.emailVerificationOTPExpires = expiresAt;
  user.emailVerificationOTPSentAt = sentAt;
  user.emailVerificationAttemptCount = 0;
  user.emailVerificationPurpose = EMAIL_VERIFICATION_PURPOSES.CHANGE_EMAIL;
  user.pendingEmailExpiresAt = pendingEmailExpiresAt();

  return { code, expiresAt, sentAt };
}

export function cancelEmailChange(user) {
  applyEmailChangeRelease(user);
}

function throwChangeVerifyFailure(user, rawCode) {
  if (!user) {
    throw new EmailVerificationError("OTP_INVALID", "User not found", 404);
  }

  if (!hasPendingEmailChange(user)) {
    throw new EmailVerificationError(
      "EMAIL_CHANGE_NOT_PENDING",
      "No email change is in progress",
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

  throw new EmailVerificationError(
    "OTP_INVALID",
    "Invalid verification code",
    400,
  );
}

/**
 * Atomically swap email = pendingEmail (parallel-safe).
 * @returns {Promise<{ ok: true, user: object }>}
 */
export async function verifyChangeOtpAtomic(UserModel, userId, rawCode) {
  const code = String(rawCode || "").trim();
  const now = new Date();
  const purpose = EMAIL_VERIFICATION_PURPOSES.CHANGE_EMAIL;

  const liveChallenge = {
    _id: userId,
    emailVerificationPurpose: purpose,
    pendingEmail: { $exists: true, $nin: [null, ""] },
    emailVerificationOTPHash: { $exists: true, $nin: [null, ""] },
    emailVerificationOTPExpires: { $gt: now },
    ...attemptsBelowMaxFilter(),
  };

  if (!/^\d{6}$/.test(code)) {
    const bumped = await UserModel.findOneAndUpdate(
      liveChallenge,
      { $inc: { emailVerificationAttemptCount: 1 } },
      { new: true },
    );

    if (
      bumped &&
      (bumped.emailVerificationAttemptCount || 0) >= MAX_VERIFY_ATTEMPTS
    ) {
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

  try {
    const verifiedUser = await UserModel.findOneAndUpdate(
      {
        ...liveChallenge,
        emailVerificationOTPHash: incomingHash,
      },
      [
        {
          $set: {
            email: "$pendingEmail",
            emailVerified: true,
            emailVerificationAttemptCount: 0,
          },
        },
        {
          $unset: [
            "pendingEmail",
            "pendingEmailExpiresAt",
            "emailVerificationOTPHash",
            "emailVerificationOTPExpires",
            "emailVerificationOTPSentAt",
            "emailVerificationPurpose",
          ],
        },
      ],
      { new: true },
    );

    if (verifiedUser) {
      return { ok: true, user: verifiedUser };
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new EmailVerificationError(
        "EMAIL_TAKEN",
        "This email is already in use",
        409,
      );
    }
    throw error;
  }

  const afterBump = await UserModel.findOneAndUpdate(
    {
      _id: userId,
      emailVerificationPurpose: purpose,
      pendingEmail: { $exists: true, $nin: [null, ""] },
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
  throwChangeVerifyFailure(latest, rawCode);
}

export function isDuplicatePendingEmailError(error) {
  return isDuplicateKeyError(error);
}
