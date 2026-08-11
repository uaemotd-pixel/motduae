export function createConsoleProvider({ logger = console } = {}) {
  return {
    name: "console",
    isConfigured() {
      return true;
    },
    async send({ to, from, replyTo, subject, html, text }) {
      logger.log("============================================================");
      logger.log("[Email console provider] Outbound message");
      logger.log(`From: ${from}`);
      if (replyTo) logger.log(`Reply-To: ${replyTo}`);
      logger.log(`To: ${to}`);
      logger.log(`Subject: ${subject}`);
      logger.log(`Text:\n${text || ""}`);
      if (html) logger.log(`HTML length: ${html.length}`);
      logger.log("============================================================");
      return { messageId: `console-${Date.now()}` };
    },
  };
}
