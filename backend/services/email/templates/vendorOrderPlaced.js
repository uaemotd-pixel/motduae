import {
  bodyText,
  ctaButton,
  escapeHtml,
  emailTheme,
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

function listHtml(items) {
  const rows = items
    .map(
      (item) =>
        `<li style="margin:0 0 6px 0;padding:0;">${escapeHtml(item)}</li>`,
    )
    .join("");
  return `<ul style="font-family:${emailTheme.fontBody};font-size:14px;line-height:1.65;color:${emailTheme.nearBlack};margin:0 0 16px 0;padding:0 0 0 20px;">${rows}</ul>`;
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

function introCopy(portalKind, orderType) {
  if (portalKind === "tailor") {
    return "A customer has placed a paid custom order that includes items from your workshop.";
  }
  if (orderType === "retail") {
    return "A customer has placed a paid store order that includes items from your store.";
  }
  return "A customer has placed a paid custom order that includes fabric from your store.";
}

function lineLabels(lines) {
  if (!Array.isArray(lines)) return [];
  return lines
    .map((line) => (typeof line === "string" ? line : line?.label))
    .map((label) => String(label || "").trim())
    .filter(Boolean);
}

export function vendorOrderPlacedTemplate({
  name,
  shortOrderId,
  portalKind,
  orderType,
  portalUrl,
  lines,
}) {
  const displayName = String(name || "").trim() || "Partner";
  const idLabel = shortOrderId ? `#${String(shortOrderId).trim()}` : "";
  const prepare = lineLabels(lines);
  const subject = idLabel ? `New order · ${idLabel}` : "New order";
  const intro = introCopy(portalKind, orderType);
  const ctaLabel = "View orders";

  const textLines = [
    `Dear ${displayName},`,
    "",
    intro,
    "",
    idLabel ? `Order number: ${idLabel}` : "",
    idLabel ? "" : null,
    prepare.length ? "Please prepare:" : null,
    ...prepare.map((item) => `- ${item}`),
    prepare.length ? "" : null,
    "Sign in to the MOTD Partner Portal to view this order.",
    "",
    ctaLabel,
    portalUrl || "",
    "",
    ...SIGN_OFF,
  ].filter((line) => line !== null);

  const text = textLines
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n")
    .trim();

  const bodyHtml = `
    ${para(`Dear ${escapeHtml(displayName)},`, {
      color: emailTheme.muted,
      margin: "0 0 16px 0",
    })}
    ${para(escapeHtml(intro))}
    ${
      idLabel
        ? para(escapeHtml(`Order number: ${idLabel}`))
        : ""
    }
    ${prepare.length ? para(escapeHtml("Please prepare:")) : ""}
    ${prepare.length ? listHtml(prepare) : ""}
    ${para(
      escapeHtml(
        "Sign in to the MOTD Partner Portal to view Details of this order.",
      ),
    )}
    ${ctaBlock(portalUrl, ctaLabel)}
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
      title: "New order",
      bodyHtml,
    }),
  };
}
