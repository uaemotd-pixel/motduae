import { bodyText, emailTheme, escapeHtml, kvTable, renderLayout } from "./layout.js";

export function supportQueryReceivedTemplate({ name, referenceNumber, locale }) {
  const isAr = locale === "ar";
  const safeName = escapeHtml(name || (isAr ? "عميلنا" : "there"));
  const reference = String(referenceNumber || "").trim();

  const subject = isAr
    ? "استلمنا طلب الدعم الخاص بك"
    : "We received your MOTD support request";

  const greeting = isAr ? `مرحباً ${name || "عميلنا"}،` : `Hello ${name || "there"},`;
  const received = isAr
    ? "لقد استلمنا طلبك."
    : "We have received your request.";
  const followUp = isAr
    ? "سيتواصل معك فريق الدعم قريباً."
    : "The support team will contact you shortly.";
  const referenceLabel = isAr ? "رقم المرجع" : "Reference number";

  const text = [greeting, "", received, reference ? `${referenceLabel}: ${reference}` : "", followUp, "", "— MOTD"]
    .filter((line) => line !== "")
    .join("\n");

  const bodyHtml = `
    <div dir="${isAr ? "rtl" : "ltr"}" style="text-align:${isAr ? "right" : "left"};">
      ${bodyText({
        html: isAr ? `مرحباً ${safeName}،` : `Hello ${safeName},`,
        color: emailTheme.muted,
        margin: "0 0 12px 0",
      })}
      ${bodyText({
        html: escapeHtml(received),
        color: emailTheme.nearBlack,
        margin: "0 0 16px 0",
      })}
      ${kvTable({
        rows: [{ label: referenceLabel, value: reference, prominent: true, breakAll: true }],
      })}
      ${bodyText({
        html: escapeHtml(followUp),
        color: emailTheme.nearBlack,
        margin: "0",
      })}
    </div>
  `;

  return {
    subject,
    text,
    html: renderLayout({
      title: isAr ? "تم استلام الطلب" : "Request received",
      bodyHtml,
    }),
  };
}
