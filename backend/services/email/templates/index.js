import { welcomeTemplate } from "./welcome.js";
import { passwordResetTemplate } from "./passwordReset.js";
import { contactTemplate } from "./contact.js";
import { otpTemplate } from "./emailOtp.js";
import { orderConfirmationTemplate } from "./orderConfirmation.js";
import { statusUpdateTemplate } from "./statusUpdate.js";
import { EMAIL_EVENTS } from "../emailEvents.js";

const registry = {
  [EMAIL_EVENTS.AUTH_WELCOME]: welcomeTemplate,
  [EMAIL_EVENTS.AUTH_PASSWORD_RESET]: passwordResetTemplate,
  [EMAIL_EVENTS.AUTH_OTP]: otpTemplate,
  [EMAIL_EVENTS.OPS_CONTACT]: contactTemplate,
  [EMAIL_EVENTS.ORDER_CONFIRMED]: orderConfirmationTemplate,
  [EMAIL_EVENTS.ORDER_STATUS_UPDATED]: statusUpdateTemplate,
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
