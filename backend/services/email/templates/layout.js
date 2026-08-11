/**
 * MOTD email design system (site-matched + client-safe).
 *
 * Rules for future templates (do not hand-roll buttons/layout):
 * - Always wrap content with renderLayout(...)
 * - Always use ctaButton({ href, label }) for any button — never raw <a> CTAs
 * - Use bodyText / uiLabel for copy — keeps typography + wrapping consistent
 * - Buttons are fluid by design (padding on <td>, not width+padding on <a>)
 */

export const emailTheme = {
  pageBg: "#FFFDF9",
  surface: "#FFFFFF",
  ink: "#000000",
  nearBlack: "#1A1A1A",
  muted: "#5A5A56",
  border: "#E8E8E4",
  fontDisplay: "Georgia, 'Times New Roman', Times, serif",
  fontBody: "Arial, Helvetica, sans-serif",
};

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function uiLabel({ text, style = "" }) {
  return `<span class="em-label" style="font-family:${emailTheme.fontBody};font-size:10px;letter-spacing:0.24em;text-transform:uppercase;color:${emailTheme.muted};font-weight:400;display:block;${style}">${escapeHtml(text)}</span>`;
}

export function bodyText({ html, color = emailTheme.muted, margin = "0 0 16px 0" }) {
  return `<p class="em-text" style="font-family:${emailTheme.fontBody};font-size:14px;line-height:1.65;color:${color};margin:${margin};word-break:break-word;overflow-wrap:anywhere;max-width:100%;">${html}</p>`;
}

/**
 * Table-based shell — Outlook-safe, fluid/responsive, site-matched.
 */
export function renderLayout({
  eyebrow = "MUKHAWAR OF THE DAY",
  title,
  bodyHtml,
  year = new Date().getFullYear(),
}) {
  const safeTitle = escapeHtml(title);
  const safeEyebrow = escapeHtml(eyebrow);
  const { pageBg, surface, ink, nearBlack, muted, border, fontDisplay, fontBody } =
    emailTheme;

  return `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${safeTitle}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <style>
    table, td, div, p, a { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
  <style type="text/css">
    html, body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    * { -ms-text-size-adjust: 100%; -webkit-text-size-adjust: 100%; }
    table, td { border-collapse: collapse !important; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; max-width: 100% !important; height: auto !important; display: block; }
    a { text-decoration: none; }
    .em-root, .em-card, .em-cta { width: 100% !important; max-width: 100% !important; }
    .em-card { max-width: 560px !important; }
    .em-text, .em-title, .em-link, .em-cta-label {
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
      max-width: 100% !important;
    }
    /* Spacing / type only — buttons stay fluid via table markup (no width+padding on <a>) */
    @media only screen and (max-width: 620px) {
      .em-outer { padding: 16px 10px !important; }
      .em-card { width: 100% !important; max-width: 100% !important; }
      .em-header { padding: 24px 18px !important; }
      .em-body { padding: 24px 18px !important; }
      .em-footer { padding: 16px 18px !important; }
      .em-title { font-size: 22px !important; line-height: 1.25 !important; }
      .em-eyebrow { font-size: 9px !important; letter-spacing: 0.18em !important; }
      .em-text { font-size: 15px !important; line-height: 1.7 !important; }
      .em-cta-cell { padding: 16px 14px !important; }
      .em-cta-label { font-size: 11px !important; letter-spacing: 0.14em !important; }
      .em-label { font-size: 9px !important; letter-spacing: 0.16em !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${pageBg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">
    ${safeTitle} — MOTD
  </div>
  <table role="presentation" class="em-root" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${pageBg};margin:0;padding:0;width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" class="em-outer" style="padding:40px 16px;">
        <!--[if mso]>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" align="center"><tr><td>
        <![endif]-->
        <table role="presentation" class="em-card" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;width:100%;background-color:${surface};border:1px solid ${border};border-collapse:collapse;">
          <tr>
            <td class="em-header" style="background-color:${ink};padding:36px 32px;text-align:center;">
              <p class="em-eyebrow" style="font-family:${fontBody};font-size:10px;letter-spacing:0.28em;text-transform:uppercase;color:#FFFFFF;margin:0 0 12px 0;opacity:0.7;">
                ${safeEyebrow}
              </p>
              <h1 class="em-title" style="font-family:${fontDisplay};font-size:28px;font-weight:400;line-height:1.15;letter-spacing:-0.01em;color:#FFFFFF;margin:0;word-break:break-word;">
                ${safeTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td class="em-body" style="padding:36px 32px;font-family:${fontBody};color:${nearBlack};word-break:break-word;overflow-wrap:anywhere;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td class="em-footer" style="padding:20px 32px;border-top:1px solid ${border};text-align:center;background-color:${pageBg};">
              <p style="font-family:${fontBody};font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:${muted};margin:0;line-height:1.7;">
                Automated message from MOTD<br/>
                &copy; ${year} MOTD UAE
              </p>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
`.trim();
}

/**
 * Bulletproof CTA — always use this for buttons in every template.
 * Padding lives on <td> (not width:100% + padding on <a>) so mobile never overflows.
 */
export function ctaButton({ href, label }) {
  const safeHref = escapeHtml(href);
  const safeLabel = escapeHtml(label);
  const { ink, fontBody } = emailTheme;

  return `
    <table role="presentation" class="em-cta" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;max-width:100%;margin:28px 0;border-collapse:collapse;">
      <tr>
        <td class="em-cta-cell" align="center" bgcolor="${ink}" style="background-color:${ink};padding:14px 20px;width:100%;max-width:100%;">
          <a class="em-cta-label" href="${safeHref}" target="_blank" style="display:block;width:100%;max-width:100%;background-color:${ink};color:#FFFFFF;text-decoration:none;font-family:${fontBody};font-size:11px;letter-spacing:0.2em;text-transform:uppercase;font-weight:400;line-height:1.4;text-align:center;word-break:break-word;overflow-wrap:anywhere;mso-line-height-rule:exactly;">
            ${safeLabel}
          </a>
        </td>
      </tr>
    </table>
  `;
}
