import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

export function createSesProvider({
  region,
  accessKeyId,
  secretAccessKey,
  configurationSet = "",
} = {}) {
  let client;

  function getClient() {
    if (client) return client;
    const config = { region };
    if (accessKeyId && secretAccessKey) {
      config.credentials = {
        accessKeyId,
        secretAccessKey,
      };
    }
    client = new SESClient(config);
    return client;
  }

  return {
    name: "ses",
    isConfigured() {
      return Boolean(region);
    },
    async send({ to, from, replyTo, subject, html, text }) {
      if (!region) {
        throw new Error("SES is not configured. Set AWS_REGION.");
      }
      if (!from) {
        throw new Error("SES_FROM_EMAIL is required to send mail.");
      }

      const destination = { ToAddresses: [to] };
      const body = {};
      if (text) body.Text = { Data: text, Charset: "UTF-8" };
      if (html) body.Html = { Data: html, Charset: "UTF-8" };

      const input = {
        Source: from,
        Destination: destination,
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: body,
        },
      };

      if (replyTo) {
        input.ReplyToAddresses = [replyTo];
      }
      if (configurationSet) {
        input.ConfigurationSetName = configurationSet;
      }

      const result = await getClient().send(new SendEmailCommand(input));
      return { messageId: result.MessageId || null };
    },
  };
}
