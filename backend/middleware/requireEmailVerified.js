import { isEmailVerified } from "../services/emailVerification/isEmailVerified.js";
import { isGuestUser } from "../services/emailVerification/isGuestUser.js";

/**
 * Account: emailVerified on User.
 * Guest: session must have verified guestContactEmail (checkout OTP).
 */
export function requireEmailVerified(req, res, next) {
  if (isGuestUser(req.user)) {
    if (req.user?.guestContactEmail) {
      next();
      return;
    }

    res.status(403).send({
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before continuing",
    });
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
