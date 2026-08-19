import { isEmailVerified } from "../services/emailVerification/isEmailVerified.js";

/**
 * Guest checkout uses a shared account + JWT `isGuest` flag — no OTP.
 * Aligns with account UI (banner/profile Verify hidden for guests).
 */
export function requireEmailVerified(req, res, next) {
  if (req.user?.isGuest) {
    next();
    return;
  }

  if (isEmailVerified(req.user)) {
    next();
    return;
  }

  res.status(403).send({
    code: "EMAIL_NOT_VERIFIED",
    message: "Please verify your email before continuing",
  });
}
