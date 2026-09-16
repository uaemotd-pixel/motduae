import {
  bodyText,
  ctaButton,
  escapeHtml,
  emailTheme,
  kvTable,
  lineItemsTable,
  renderLayout,
} from "./layout.js";

const SIGN_OFF = ["Kind regards,", "MOTD Partner Support Team"];

function para(html, extra = {}) {
  return bodyText({
    html,
    color: extra.color || emailTheme.nearBlack,
    margin: extra.margin || "0 0 12px 0",
  });
}

function ctaBlock(url, label) {
  if (!url) return "";
  const safeUrlHtml = escapeHtml(url);
  return `
    ${ctaButton({ href: url, label })}
    ${bodyText({
      html: `If the button does not work, copy and paste this link into your browser:<br/><a class="em-link" href="${safeUrlHtml}" style="color:${emailTheme.muted};word-break:break-all;overflow-wrap:anywhere;text-decoration:underline;">${safeUrlHtml}</a>`,
      color: emailTheme.muted,
      margin: "0 0 16px 0",
    })}
  `;
}

export function partnerPayoutCompletedTemplate(payload = {}) {
  const displayName = String(payload.name || "").trim() || "Partner";
  const amountLabel = String(payload.amountLabel || "").trim() || "0.00";
  const amountDisplay = `AED ${amountLabel}`;
  const bankRef = String(payload.bankRef || "").trim();
  const sentOn = String(payload.sentOn || "").trim();
  const paidTo = String(payload.paidTo || "").trim();
  const portalUrl = String(payload.portalUrl || "").trim();
  const moreCount = Number(payload.moreCount) || 0;
  const orderLines = Array.isArray(payload.orderLines)
    ? payload.orderLines
    : [];

  const orderItems = orderLines.map((line) => {
    const label = String(line?.label || "").trim();
    const amount = String(line?.amountLabel || "").trim();
    return {
      left: label,
      right: amount ? `AED ${amount}` : "",
      text: `${label} · AED ${amount}`.trim(),
    };
  });
  const moreNote =
    moreCount > 0 ? `and ${moreCount} more in your portal` : "";

  const facts = [
    `Amount: ${amountDisplay}`,
    bankRef ? `Transfer number: ${bankRef}` : "",
    sentOn ? `Sent on: ${sentOn}` : "",
    paidTo ? `Paid to: ${paidTo}` : "",
  ].filter(Boolean);

  const subject = `Payout Released from MOTD · AED ${amountLabel}`;

  const text = [
    `Dear ${displayName},`,
    "",
    "MOTD has sent a payout to your account.",
    "",
    ...facts,
    "",
    orderItems.length ? "Orders included:" : "",
    ...orderItems.map((item) => item.text),
    moreNote,
    "",
    "Open your dashboard:",
    portalUrl,
    "",
    "It can take 1–2 business days for this transfer to appear on your bank statement.",
    "",
    "If something looks wrong, reply to this mail with the amount and transfer number.",
    "",
    ...SIGN_OFF,
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();

  const bodyHtml = `
    ${para(`Dear ${escapeHtml(displayName)},`, {
      color: emailTheme.muted,
      margin: "0 0 16px 0",
    })}
    ${para("MOTD has sent a payout to your account.", { margin: "0 0 20px 0" })}
    ${kvTable({
      rows: [
        { label: "Amount", value: amountDisplay, prominent: true },
        { label: "Transfer number", value: bankRef, breakAll: true },
        { label: "Sent on", value: sentOn },
        { label: "Paid to", value: paidTo },
      ],
      margin: "0 0 24px 0",
    })}
    ${lineItemsTable({
      caption: "Orders included",
      headers: { left: "Order", right: "Amount" },
      rows: orderItems,
      note: moreNote,
      total: { left: "Total", right: amountDisplay },
      margin: "0 0 8px 0",
    })}
    ${ctaBlock(portalUrl, "Open your dashboard")}
    ${para(
      "It can take 1&ndash;2 business days for this transfer to appear on your bank statement.",
      { color: emailTheme.muted },
    )}
    ${para(escapeHtml(SIGN_OFF[0]), {
      color: emailTheme.muted,
      margin: "16px 0 0 0",
    })}
    ${para(escapeHtml(SIGN_OFF[1]), {
      color: emailTheme.muted,
      margin: "0",
    })}
  `;

  return {
    subject,
    text,
    html: renderLayout({
      title: "Payout sent",
      bodyHtml,
    }),
  };
}
