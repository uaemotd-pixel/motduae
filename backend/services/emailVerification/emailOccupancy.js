import { PENDING_EMAIL_TTL_MS } from "./otpPolicy.js";

export function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

export function pendingEmailExpiresAt(from = Date.now()) {
  return new Date(from + PENDING_EMAIL_TTL_MS);
}

export function isPendingEmailActive(user, now = Date.now()) {
  if (!user?.pendingEmail) return false;
  const exp = user.pendingEmailExpiresAt;
  if (!exp) return false;
  return new Date(exp).getTime() > now;
}

export function pendingEmailClearUpdate() {
  return {
    $unset: {
      pendingEmail: 1,
      pendingEmailExpiresAt: 1,
      emailVerificationPurpose: 1,
      emailVerificationOTPHash: 1,
      emailVerificationOTPExpires: 1,
      emailVerificationOTPSentAt: 1,
    },
    $set: { emailVerificationAttemptCount: 0 },
  };
}

export function applyEmailChangeRelease(user) {
  if (!user) return;
  user.pendingEmail = undefined;
  user.pendingEmailExpiresAt = undefined;
  user.emailVerificationPurpose = undefined;
  user.emailVerificationOTPHash = undefined;
  user.emailVerificationOTPExpires = undefined;
  user.emailVerificationOTPSentAt = undefined;
  user.emailVerificationAttemptCount = 0;
  if (typeof user.set === "function") {
    user.set("pendingEmail", undefined);
    user.set("pendingEmailExpiresAt", undefined);
    user.set("emailVerificationPurpose", undefined);
  }
}

export function expiredPendingFilter(email, now = new Date()) {
  return {
    pendingEmail: email,
    $or: [
      { pendingEmailExpiresAt: { $lte: now } },
      { pendingEmailExpiresAt: { $exists: false } },
      { pendingEmailExpiresAt: null },
    ],
  };
}

export async function persistReleasedEmailChange(UserModel, userId) {
  if (!UserModel || !userId) return;
  await UserModel.updateOne({ _id: userId }, pendingEmailClearUpdate());
}

export async function releaseExpiredPendingByEmail(
  UserModel,
  email,
  now = new Date(),
) {
  const normalized = normalizeEmail(email);
  if (!normalized || !UserModel) return;
  await UserModel.updateMany(
    expiredPendingFilter(normalized, now),
    pendingEmailClearUpdate(),
  );
}

export async function ensureFreshEmailChange(
  UserModel,
  user,
  now = Date.now(),
) {
  if (!user?.pendingEmail) return false;
  if (isPendingEmailActive(user, now)) return false;
  applyEmailChangeRelease(user);
  await persistReleasedEmailChange(UserModel, user._id);
  return true;
}

export async function findEmailOccupant(
  UserModel,
  email,
  { excludeUserId, now = new Date() } = {},
) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  await releaseExpiredPendingByEmail(UserModel, normalized, now);

  const filter = {
    $or: [
      { email: normalized },
      {
        pendingEmail: normalized,
        pendingEmailExpiresAt: { $gt: now },
      },
    ],
  };
  if (excludeUserId) {
    filter._id = { $ne: excludeUserId };
  }

  const query = UserModel.findOne(filter);
  if (query && typeof query.select === "function") {
    return query.select("_id role email");
  }
  return query;
}

export async function emailIsTaken(UserModel, email, opts = {}) {
  const occupant = await findEmailOccupant(UserModel, email, opts);
  return Boolean(occupant);
}
