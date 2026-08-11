import { env } from "../../config/env.js";
import { createEmailModule } from "./createEmailModule.js";
import { createProvider } from "./providers/createProvider.js";
import { createMongoEmailLogStore } from "./emailLogStore.js";
import { EMAIL_EVENTS, buildDedupeKey } from "./emailEvents.js";

const emailConfig = env.email;

const provider = createProvider({
  provider: emailConfig.provider,
  awsRegion: emailConfig.awsRegion,
  awsAccessKeyId: emailConfig.awsAccessKeyId,
  awsSecretAccessKey: emailConfig.awsSecretAccessKey,
  configurationSet: emailConfig.configurationSet,
  logger: console,
});

const emailModule = createEmailModule({
  provider,
  store: createMongoEmailLogStore(),
  from: {
    email:
      emailConfig.fromEmail ||
      (emailConfig.provider === "console" ? "noreply@localhost" : ""),
    name: emailConfig.fromName || "MOTD",
  },
  defaultReplyTo: emailConfig.replyTo || "",
  logger: console,
});

export { EMAIL_EVENTS, buildDedupeKey, emailModule };
export const send = emailModule.send.bind(emailModule);
export const sendCritical = emailModule.sendCritical.bind(emailModule);
export const isConfigured = emailModule.isConfigured.bind(emailModule);
export default emailModule;
