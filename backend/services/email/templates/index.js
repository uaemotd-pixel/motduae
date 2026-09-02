import { welcomeTemplate } from "./welcome.js";
import { passwordResetTemplate } from "./passwordReset.js";
import { contactTemplate } from "./contact.js";
import { otpTemplate } from "./emailOtp.js";
import { orderPlacedTemplate } from "./orderPlaced.js";
import { partnerApplicationTemplate } from "./partnerApplication.js";
import { vendorOrderPlacedTemplate } from "./vendorOrderPlaced.js";
import { EMAIL_EVENTS } from "../emailEvents.js";

const registry = {
  [EMAIL_EVENTS.AUTH_WELCOME]: welcomeTemplate,
  [EMAIL_EVENTS.AUTH_PASSWORD_RESET]: passwordResetTemplate,
  [EMAIL_EVENTS.AUTH_OTP]: otpTemplate,
  [EMAIL_EVENTS.OPS_CONTACT]: contactTemplate,
  [EMAIL_EVENTS.ORDER_RETAIL_PLACED]: orderPlacedTemplate,
  [EMAIL_EVENTS.ORDER_CUSTOM_PLACED]: orderPlacedTemplate,
  [EMAIL_EVENTS.PARTNER_SUBMITTED]: partnerApplicationTemplate,
  [EMAIL_EVENTS.PARTNER_RESUBMITTED]: partnerApplicationTemplate,
  [EMAIL_EVENTS.PARTNER_APPROVED]: partnerApplicationTemplate,
  [EMAIL_EVENTS.PARTNER_REJECTED]: partnerApplicationTemplate,
  [EMAIL_EVENTS.ORDER_CUSTOM_PLACED_TAILOR]: vendorOrderPlacedTemplate,
  [EMAIL_EVENTS.ORDER_CUSTOM_PLACED_FABRIC]: vendorOrderPlacedTemplate,
  [EMAIL_EVENTS.ORDER_RETAIL_PLACED_FABRIC]: vendorOrderPlacedTemplate,
};

export function getTemplate(event) {
  const template = registry[event];
  if (!template) {
    throw new Error(`No email template registered for event: ${event}`);
  }
  return template;
}

export function listRegisteredEvents() {
  return Object.keys(registry);
}
