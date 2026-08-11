import {
  bodyText,
  emailTheme,
  escapeHtml,
  renderLayout,
  uiLabel,
} from "./layout.js";

export function contactTemplate({ name, email, subject: inquirySubject, message }) {
  const safeName = escapeHtml(name || "");
  const safeEmail = escapeHtml(email || "");
  const safeSubject = escapeHtml(inquirySubject || "");
  const safeMessage = escapeHtml(message || "");
  const initial = escapeHtml((name || "?").charAt(0).toUpperCase());
  const { ink, muted, border, pageBg, nearBlack, fontDisplay, fontBody } = emailTheme;

  const subject = `Contact Form - ${inquirySubject || "Inquiry"}`;
  const text = `You have received a new message from ${name} (${email}):\n\nSubject: ${inquirySubject}\n\nMessage:\n${message}`;

  const bodyHtml = `
    ${bodyText({
      html: "You have received a new inquiry from the MOTD storefront contact form.",
      color: muted,
      margin: "0 0 24px 0",
    })}
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid ${border};background-color:${pageBg};margin:0 0 28px 0;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="48" valign="top" style="width:48px;padding-right:14px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="48" height="48" style="width:48px;height:48px;background-color:${ink};">
                  <tr>
                    <td align="center" valign="middle" style="color:#FFFFFF;font-family:${fontBody};font-size:16px;font-weight:400;height:48px;">
                      ${initial}
                    </td>
                  </tr>
                </table>
              </td>
              <td valign="middle" style="word-break:break-word;overflow-wrap:anywhere;">
                <p class="em-title" style="font-family:${fontDisplay};font-size:18px;font-weight:400;color:${ink};margin:0 0 4px 0;line-height:1.2;word-break:break-word;">
                  ${safeName}
                </p>
                <a class="em-link" href="mailto:${safeEmail}" style="font-family:${fontBody};font-size:13px;color:${muted};text-decoration:underline;word-break:break-all;">
                  ${safeEmail}
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <div style="margin:0 0 24px 0;">
      ${uiLabel({ text: "Subject of inquiry", style: "margin-bottom:8px;" })}
      <p class="em-title" style="font-family:${fontDisplay};font-size:20px;font-weight:400;color:${ink};margin:0;line-height:1.3;word-break:break-word;">
        ${safeSubject}
      </p>
    </div>
    <div>
      ${uiLabel({ text: "Message details", style: "margin-bottom:10px;" })}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;border-left:3px solid ${ink};background-color:${pageBg};">
        <tr>
          <td class="em-text" style="padding:18px 20px;font-family:${fontBody};font-size:14px;line-height:1.7;color:${nearBlack};white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;">
${safeMessage}
          </td>
        </tr>
      </table>
    </div>
  `;

  return {
    subject,
    text,
    html: renderLayout({ title: "New Contact Inquiry", bodyHtml }),
  };
}
