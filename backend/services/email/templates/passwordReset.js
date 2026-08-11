import {
  bodyText,
  ctaButton,
  escapeHtml,
  emailTheme,
  renderLayout,
} from "./layout.js";

export function passwordResetTemplate({ resetUrl }) {
  const safeUrl = resetUrl || "";
  const safeUrlHtml = escapeHtml(safeUrl);

  const subject = "Reset your MOTD password";
  const text = [
    "You requested a password reset for your MOTD account.",
    "",
    "Reset your password using this link (valid for 1 hour):",
    safeUrl,
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const bodyHtml = `
    ${bodyText({
      html: "You requested a password reset. Use the button below to choose a new password. This link expires in 1 hour.",
      color: emailTheme.nearBlack,
      margin: "0 0 8px 0",
    })}
    ${ctaButton({ href: safeUrl, label: "Reset Password" })}
    ${bodyText({
      html: `If the button does not work, copy and paste this link into your browser:<br/><a class="em-link" href="${safeUrlHtml}" style="color:${emailTheme.muted};word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${safeUrlHtml}</a>`,
      color: emailTheme.muted,
      margin: "0 0 16px 0",
    })}
    ${bodyText({
      html: "If you did not request this email, you can safely ignore it.",
      color: emailTheme.muted,
      margin: "0",
    })}
  `;

  return {
    subject,
    text,
    html: renderLayout({
      eyebrow: "MOTD Account",
      title: "Reset your password",
      bodyHtml,
    }),
  };
}