import { bodyText, escapeHtml, emailTheme, renderLayout } from "./layout.js";
import { OTP_PURPOSES } from "../../emailVerification/otpPolicy.js";

/**
 * Shared OTP email. Pass `purpose` for the reason line (only copy that changes per use-case).
 */
export function otpTemplate({
  name,
  otp,
  purpose = OTP_PURPOSES.VERIFY_EMAIL_ADDRESS,
}) {
  const safeName = escapeHtml(name || "there");
  const safeOtp = escapeHtml(String(otp || ""));
  const safePurpose = escapeHtml(String(purpose || OTP_PURPOSES.VERIFY_EMAIL_ADDRESS));

  const subject = "Your MOTD verification code";
  const text = [
    `Hello ${name || "there"},`,
    "",
    `${purpose || OTP_PURPOSES.VERIFY_EMAIL_ADDRESS}:`,
    "",
    `Your verification code is: ${otp}`,
    "",
    "This code expires in 15 minutes.",
    "If you did not request this, you can ignore this email.",
    "",
    "— MOTD",
  ].join("\n");

  const bodyHtml = `
    ${bodyText({ html: `Hello ${safeName},`, color: emailTheme.muted, margin: "0 0 12px 0" })}
    ${bodyText({
      html: `${safePurpose}:`,
      color: emailTheme.nearBlack,
      margin: "0 0 20px 0",
    })}
    <p style="margin:0 0 20px 0;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:32px;letter-spacing:0.35em;color:#111111;font-weight:normal;">
      ${safeOtp}
    </p>
    ${bodyText({
      html: "This code expires in <strong>15 minutes</strong>.",
      color: emailTheme.muted,
      margin: "0 0 8px 0",
    })}
    ${bodyText({
      html: "If you did not request this, you can ignore this email.",
      color: emailTheme.muted,
      margin: "0",
    })}
  `;

  return {
    subject,
    text,
    html: renderLayout({ title: "Verification code", bodyHtml }),
  };
}

/** @deprecated use otpTemplate */
export const emailOtpTemplate = otpTemplate;
