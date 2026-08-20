import GuestContactOtp from "../../models/GuestContactOtp.js";
import User from "../../models/User.js";
import {
  EmailVerificationError,
  hashOtp,
  generateOtpCode,
  maskEmail,
} from "./emailVerificationService.js";
import {
  OTP_TTL_MS,
  RESEND_COOLDOWN_MS,
  MAX_VERIFY_ATTEMPTS,
} from "./otpPolicy.js";
import { findEmailOccupant, normalizeEmail } from "./emailOccupancy.js";
import { isGuestCustomerEmail, isGuestUser } from "./isGuestUser.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CUSTOMER_ROLE = "customer";

function attemptsBelowMaxFilter() {
  return {
    $expr: {
      $lt: [{ $ifNull: ["$attemptCount", 0] }, MAX_VERIFY_ATTEMPTS],
    },
  };
}

export function assertGuestSession(user) {
  if (!isGuestUser(user)) {
    throw new EmailVerificationError(
      "GUEST_OTP_NOT_ALLOWED",
      "This action is only for guest checkout",
      403,
    );
  }
}

function getResendAvailableInSec(challenge) {
  if (!challenge?.otpSentAt) return 0;
  const elapsed = Date.now() - new Date(challenge.otpSentAt).getTime();
  const remainingMs = RESEND_COOLDOWN_MS - elapsed;
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

async function assertGuestContactAvailable(email) {
  const occupant = await findEmailOccupant(User, email);
  if (!occupant) return;

  if (isGuestCustomerEmail(occupant.email)) {
    throw new EmailVerificationError(
      "EMAIL_INVALID",
      "Enter a valid email address",
      400,
    );
  }

  if (occupant.role === CUSTOMER_ROLE) {
    throw new EmailVerificationError(
      "EMAIL_IN_USE_SIGN_IN",
      "This email already has an account. Please sign in",
      409,
    );
  }

  throw new EmailVerificationError(
    "EMAIL_TAKEN",
    "This email cannot be used for guest checkout",
    409,
  );
}

export async function startGuestContact(user, rawEmail) {
  assertGuestSession(user);

  const email = normalizeEmail(rawEmail);
  if (!EMAIL_RE.test(email)) {
    throw new EmailVerificationError(
      "EMAIL_INVALID",
      "Enter a valid email address",
      400,
    );
  }

  if (isGuestCustomerEmail(email)) {
    throw new EmailVerificationError(
      "EMAIL_INVALID",
      "Enter a valid email address",
      400,
    );
  }

  await assertGuestContactAvailable(email);

  return { email, maskedEmail: maskEmail(email) };
}

export async function issueGuestOtp(user, rawEmail) {
  assertGuestSession(user);

  const email = normalizeEmail(rawEmail);
  if (!email) {
    throw new EmailVerificationError(
      "GUEST_CONTACT_NOT_PENDING",
      "No guest email is in progress",
      400,
    );
  }

  await assertGuestContactAvailable(email);

  const existing = await GuestContactOtp.findOne({ email });
  const waitSec = getResendAvailableInSec(existing);
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

  await GuestContactOtp.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        otpHash: hashOtp(code),
        otpExpires: expiresAt,
        otpSentAt: sentAt,
        attemptCount: 0,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { code, expiresAt, sentAt, email, maskedEmail: maskEmail(email) };
}

function throwGuestVerifyFailure(challenge, rawCode) {
  if (!challenge) {
    throw new EmailVerificationError(
      "OTP_INVALID",
      "No verification code has been sent. Request a new code.",
      400,
    );
  }

  if (!challenge.otpHash || !challenge.otpExpires) {
    throw new EmailVerificationError(
      "OTP_INVALID",
      "No verification code has been sent. Request a new code.",
      400,
    );
  }

  const attempts = challenge.attemptCount || 0;
  if (attempts >= MAX_VERIFY_ATTEMPTS) {
    throw new EmailVerificationError(
      "OTP_MAX_ATTEMPTS",
      "Too many incorrect attempts. Request a new code.",
      400,
    );
  }

  if (new Date(challenge.otpExpires).getTime() <= Date.now()) {
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

export async function verifyGuestOtp(user, rawEmail, rawCode) {
  assertGuestSession(user);

  const email = normalizeEmail(rawEmail);
  if (!email) {
    throw new EmailVerificationError(
      "GUEST_CONTACT_NOT_PENDING",
      "No guest email is in progress",
      400,
    );
  }

  const code = String(rawCode || "").trim();
  const now = new Date();
  const liveChallenge = {
    email,
    otpHash: { $exists: true, $nin: [null, ""] },
    otpExpires: { $gt: now },
    ...attemptsBelowMaxFilter(),
  };

  if (!/^\d{6}$/.test(code)) {
    const bumped = await GuestContactOtp.findOneAndUpdate(
      liveChallenge,
      { $inc: { attemptCount: 1 } },
      { new: true },
    );

    if (bumped && (bumped.attemptCount || 0) >= MAX_VERIFY_ATTEMPTS) {
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

  const verified = await GuestContactOtp.findOneAndUpdate(
    {
      ...liveChallenge,
      otpHash: incomingHash,
    },
    {
      $unset: {
        otpHash: "",
        otpExpires: "",
        otpSentAt: "",
      },
      $set: { attemptCount: 0 },
    },
    { new: true },
  );

  if (verified) {
    return { ok: true, email };
  }

  const afterBump = await GuestContactOtp.findOneAndUpdate(
    {
      ...liveChallenge,
      otpHash: { $exists: true, $nin: [null, ""], $ne: incomingHash },
    },
    { $inc: { attemptCount: 1 } },
    { new: true },
  );

  if (afterBump && (afterBump.attemptCount || 0) >= MAX_VERIFY_ATTEMPTS) {
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

  const latest = await GuestContactOtp.findOne({ email });
  throwGuestVerifyFailure(latest, rawCode);
}

export async function getGuestContactStatus(user, pendingEmail, verifiedEmail) {
  assertGuestSession(user);

  const pending = normalizeEmail(pendingEmail);
  const verified = normalizeEmail(verifiedEmail);
  const challengeEmail = pending || verified;
  const challenge = challengeEmail
    ? await GuestContactOtp.findOne({ email: challengeEmail })
    : null;

  return {
    emailVerified: Boolean(verified),
    otpSent: Boolean(challenge?.otpHash),
    resendAvailableInSec: getResendAvailableInSec(challenge),
    maskedEmail: pending
      ? maskEmail(pending)
      : verified
        ? maskEmail(verified)
        : "",
    pendingEmail: pending ? maskEmail(pending) : null,
    guestContactEmail: verified || null,
  };
}

export function assertGuestContactMatches(req, payloadEmail) {
  if (!isGuestUser(req.user)) return;

  const claim = normalizeEmail(req.user.guestContactEmail);
  const payload = normalizeEmail(payloadEmail);
  if (!claim || !payload || claim !== payload) {
    throw new EmailVerificationError(
      "EMAIL_NOT_VERIFIED",
      "Please verify your email before continuing",
      403,
    );
  }
}

export function resolveCheckoutContactEmail(req, payloadEmail) {
  if (isGuestUser(req.user)) {
    assertGuestContactMatches(req, payloadEmail);
    return normalizeEmail(payloadEmail);
  }
  return normalizeEmail(req.user?.email);
}
