import { bodyText, ctaButton, escapeHtml, emailTheme, renderLayout } from "./layout.js";

export function welcomeTemplate({ name, storeUrl }) {
  const safeName = escapeHtml(name || "there");
  const safeUrl = storeUrl || "";

  const subject = "Welcome to MOTD";
  const text = [
    `Welcome to MOTD, ${name || "there"}.`,
    "",
    "Your account is ready. Explore fabrics, ready-made pieces, and custom tailoring.",
    safeUrl ? `Visit: ${safeUrl}` : "",
    "",
    "— MOTD",
  ]
    .filter(Boolean)
    .join("\n");

  const bodyHtml = `
    ${bodyText({ html: `Hello ${safeName},`, color: emailTheme.muted, margin: "0 0 12px 0" })}
    ${bodyText({
      html: "Welcome to Mukhawar of the Day. Your account has been successfully created, giving you access to a refined selection of curated fabrics, ready-made pieces, and custom tailoring with master ateliers.",
      color: emailTheme.nearBlack,
      margin: "0 0 8px 0",
    })}
    ${safeUrl ? ctaButton({ href: safeUrl, label: "Explore MOTD" }) : ""}
    ${bodyText({
      html: "If you did not create this account, you can ignore this email.",
      color: emailTheme.muted,
      margin: "8px 0 0 0",
    })}
  `;

  return {
    subject,
    text,
    html: renderLayout({ title: "Welcome", bodyHtml }),
  };
}
