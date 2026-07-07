import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  if (!env.smtp.user || !env.smtp.pass) {
    throw new Error(
      'Email is not configured. Set SMTP_USER and SMTP_PASS in backend/.env',
    );
  }

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass,
    },
  });

  return transporter;
}

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const mailer = getTransporter();
  const from = env.smtp.from || env.smtp.user;

  await mailer.sendMail({
    from: `"MOTD" <${from}>`,
    to,
    subject: 'Reset your MOTD password',
    text: [
      'You requested a password reset for your MOTD account.',
      '',
      `Reset your password using this link (valid for 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; color: #111;">
        <p style="letter-spacing: 0.2em; font-size: 11px; text-transform: uppercase; color: #666;">MOTD Account</p>
        <h1 style="font-size: 24px; font-weight: 400; text-transform: uppercase;">Reset your password</h1>
        <p style="color: #555; line-height: 1.6;">
          You requested a password reset. Click the button below to choose a new password.
          This link expires in 1 hour.
        </p>
        <p style="margin: 32px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #000; color: #fff; text-decoration: none; padding: 14px 28px; letter-spacing: 0.2em; font-size: 12px; text-transform: uppercase;">
            Reset Password
          </a>
        </p>
        <p style="color: #888; font-size: 13px; line-height: 1.6;">
          If the button does not work, copy and paste this link into your browser:<br/>
          <a href="${resetUrl}" style="color: #555; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #aaa; font-size: 12px; margin-top: 32px;">
          If you did not request this email, you can safely ignore it.
        </p>
      </div>
    `,
  });
}

export function isEmailConfigured() {
  return Boolean(env.smtp.user && env.smtp.pass);
}

export async function sendContactMessageEmail({ name, email, subject, message }) {
  if (!isEmailConfigured()) {
    console.log('============================================================');
    console.log('[Contact Email Fallback Log] Email service not configured.');
    console.log(`To: uaemotd@gmail.com`);
    console.log(`From: ${name} <${email}>`);
    console.log(`Subject: ${subject}`);
    console.log(`Message:\n${message}`);
    console.log('============================================================');
    return;
  }
  const mailer = getTransporter();
  const from = env.smtp.from || env.smtp.user;
  const to = 'uaemotd@gmail.com';

  await mailer.sendMail({
    from: `"MOTD Contact Form" <${from}>`,
    to,
    replyTo: email,
    subject: `Contact Form - ${subject}`,
    text: `You have received a new message from ${name} (${email}):\n\nSubject: ${subject}\n\nMessage:\n${message}`,
    html: `
      <div style="background-color: #F8F6F2; padding: 40px 20px; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #2D2D2A;">
        <div style="max-width: 560px; margin: 0 auto; background-color: #ffffff; border: 1px solid #EAE6DF; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.03);">
          <!-- Brand Header Banner -->
          <div style="background-color: #1A1A18; padding: 40px 30px; text-align: center; border-bottom: 3px solid #C5A880;">
            <span style="font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: #C5A880; font-weight: 600; display: block; margin-bottom: 8px;">
              MUKHAWAR OF THE DAY
            </span>
            <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 300; color: #FFFFFF; margin: 0; letter-spacing: 0.02em;">
              New Contact Inquiry
            </h1>
          </div>

          <!-- Main Content Container -->
          <div style="padding: 40px 35px;">
            <!-- Greeting and Intro -->
            <p style="font-size: 14px; line-height: 1.6; color: #6E6E6A; margin-top: 0; margin-bottom: 30px;">
              You have received a new inquiry from the MOTD storefront contact form. Below are the submission details:
            </p>

            <!-- Customer Summary Profile Card -->
            <div style="background-color: #FDFDFB; border: 1px solid #F0ECE6; border-radius: 12px; padding: 24px; margin-bottom: 30px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="width: 48px; vertical-align: top; padding-right: 16px;">
                    <!-- Circle Initial Avatar -->
                    <div style="width: 48px; height: 48px; background-color: #1A1A18; border-radius: 50%; text-align: center; line-height: 48px; color: #C5A880; font-weight: 600; font-size: 18px;">
                      ${name.charAt(0).toUpperCase()}
                    </div>
                  </td>
                  <td style="vertical-align: middle;">
                    <h2 style="font-size: 16px; font-weight: 600; color: #1A1A18; margin: 0; line-height: 1.2;">
                      ${name}
                    </h2>
                    <p style="font-size: 13px; color: #8C8C88; margin: 4px 0 0 0;">
                      <a href="mailto:${email}" style="color: #8C8C88; text-decoration: none; border-bottom: 1px solid #D1CDC4;">
                        ${email}
                      </a>
                    </p>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Subject & Metadata -->
            <div style="margin-bottom: 30px;">
              <span style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #8C8C88; font-weight: 600; display: block; margin-bottom: 6px;">
                SUBJECT OF INQUIRY
              </span>
              <h3 style="font-size: 18px; font-weight: 500; color: #1A1A18; margin: 0; line-height: 1.4;">
                ${subject}
              </h3>
            </div>

            <!-- Message Textarea Card -->
            <div style="margin-bottom: 20px;">
              <span style="font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; color: #8C8C88; font-weight: 600; display: block; margin-bottom: 10px;">
                MESSAGE DETAILS
              </span>
              <div style="background-color: #FAF8F5; border-left: 4px solid #C5A880; border-radius: 4px; padding: 24px; font-size: 14px; line-height: 1.7; color: #3A3A37; white-space: pre-wrap; font-family: 'Inter', system-ui, sans-serif;">
${message}
              </div>
            </div>
          </div>

          <!-- Premium Brand Footer -->
          <div style="background-color: #FAF9F6; padding: 24px 35px; text-align: center; border-top: 1px solid #EAE6DF;">
            <p style="font-size: 11px; color: #8C8C88; margin: 0; line-height: 1.6; letter-spacing: 0.02em;">
              This is an automated notification from your digital marketplace platform.<br/>
              © ${new Date().getFullYear()} MOTD UAE. All Rights Reserved.
            </p>
          </div>
        </div>
      </div>
    `,
  });
}
