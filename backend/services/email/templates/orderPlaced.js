import {
  bodyText,
  ctaButton,
  escapeHtml,
  emailTheme,
  renderLayout,
} from "./layout.js";

export function orderPlacedTemplate({
  name,
  trackingUrl,
  orderType,
  shortOrderId,
  totalAed,
}) {
  const safeName = escapeHtml(name || "there");
  const safeUrl = trackingUrl || "";
  const safeUrlHtml = escapeHtml(safeUrl);
  const kind =
    orderType === "custom" ? "custom tailoring" : "ready-made";
  const idLabel = shortOrderId ? `#${escapeHtml(shortOrderId)}` : "";
  const totalLabel =
    totalAed != null && totalAed !== ""
      ? `AED ${escapeHtml(String(totalAed))}`
      : "";

  const subject = idLabel
    ? `Your MOTD order ${idLabel} is confirmed`
    : "Your MOTD order is confirmed";

  const text = [
    `Hello ${name || "there"},`,
    "",
    `Thank you for your ${kind} order${idLabel ? ` ${idLabel}` : ""}${
      totalLabel ? ` (${totalLabel})` : ""
    }.`,
    "",
    "Track its progress anytime — no sign-in needed. This link stays the same.",
    safeUrl,
    "",
    "— MOTD",
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");

  const details = [idLabel && `Order ${idLabel}`, kind, totalLabel]
    .filter(Boolean)
    .join(" · ");

  const bodyHtml = `
    ${bodyText({
      html: `Hello ${safeName},`,
      color: emailTheme.muted,
      margin: "0 0 12px 0",
    })}
    ${bodyText({
      html: `Thank you for your ${escapeHtml(kind)} order. You can track its progress anytime — no sign-in needed. This link stays the same as status updates.`,
      color: emailTheme.nearBlack,
      margin: "0 0 8px 0",
    })}
    ${
      details
        ? bodyText({
            html: escapeHtml(details),
            color: emailTheme.muted,
            margin: "0 0 8px 0",
          })
        : ""
    }
    ${safeUrl ? ctaButton({ href: safeUrl, label: "Track your order" }) : ""}
    ${
      safeUrl
        ? bodyText({
            html: `If the button does not work, copy and paste this link into your browser:<br/><a class="em-link" href="${safeUrlHtml}" style="color:${emailTheme.muted};word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${safeUrlHtml}</a>`,
            color: emailTheme.muted,
            margin: "0 0 16px 0",
          })
        : ""
    }
  `;

  return {
    subject,
    text,
    html: renderLayout({
      eyebrow: "MOTD Orders",
      title: "Your order is confirmed",
      bodyHtml,
    }),
  };
}
