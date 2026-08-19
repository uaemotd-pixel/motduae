import { getTemplate } from "./templates/index.js";

function formatFromAddress(fromEmail, fromName) {
  if (!fromEmail) return "";
  if (!fromName) return fromEmail;
  const safeName = String(fromName).replace(/"/g, "");
  return `"${safeName}" <${fromEmail}>`;
}

function safePayloadSnapshot(payload = {}) {
  const {
    resetUrl,
    resetToken,
    token,
    password,
    otp,
    code,
    ...rest
  } = payload;
  return rest;
}

/**
 * @param {object} deps
 * @param {object} deps.provider
 * @param {object} deps.store
 * @param {{ email: string, name?: string }} deps.from
 * @param {string} [deps.defaultReplyTo]
 * @param {object} [deps.logger]
 */
export function createEmailModule({
  provider,
  store,
  from,
  defaultReplyTo = "",
  logger = console,
} = {}) {
  if (!provider) {
    throw new Error("createEmailModule requires a provider");
  }
  if (!store) {
    throw new Error("createEmailModule requires a store");
  }

  function isConfigured() {
    if (provider.name === "console") {
      return true;
    }
    return Boolean(provider.isConfigured?.() && from?.email);
  }

  async function dispatch(event, payload = {}, options = {}) {
    const critical = Boolean(options.critical);
    const to = options.to || payload.to;
    const replyTo =
      options.replyTo !== undefined ? options.replyTo : defaultReplyTo || undefined;
    const dedupeKey = options.dedupeKey || null;
    const userId = options.userId || payload.userId || null;
    const orderId = options.orderId || payload.orderId || null;
    const orderType = options.orderType || payload.orderType || null;
    const locale = options.locale || payload.locale || "en";

    if (!to) {
      const error = new Error(`Email event ${event} is missing recipient "to"`);
      if (critical) throw error;
      logger.error(error.message);
      return { ok: false, status: "failed", logId: null, error: error.message };
    }

    const fromAddress = formatFromAddress(from?.email, from?.name);
    let log = null;

    const pendingDoc = {
      event,
      to,
      from: fromAddress,
      subject: "",
      provider: provider.name,
      userId,
      orderId,
      payloadSnapshot: safePayloadSnapshot(payload),
      dedupeKey,
      locale,
      attemptCount: 1,
    };
    if (orderType === "custom" || orderType === "retail") {
      pendingDoc.orderType = orderType;
    }

    // Misconfigured SES: still write EmailLog (failed) so attempts are auditable
    if (!isConfigured() && provider.name === "ses") {
      const message =
        "Email is not configured. Set EMAIL_PROVIDER, AWS_REGION, and SES_FROM_EMAIL.";
      try {
        const pending = await store.createPending(pendingDoc);
        log = pending.log;
        if (pending.skipped) {
          return {
            ok: true,
            status: "skipped",
            logId: log?._id?.toString?.() || log?._id || null,
          };
        }
        if (log?._id) {
          await store.markFailed(log._id, {
            error: message,
            from: fromAddress || from?.email || "",
          });
        }
      } catch (logError) {
        logger.error("Failed to write EmailLog for misconfigured SES:", logError);
      }

      logger.error(message);
      if (critical) {
        throw new Error(message);
      }
      return {
        ok: false,
        status: "failed",
        logId: log?._id?.toString?.() || log?._id || null,
        error: message,
      };
    }

    try {
      const pending = await store.createPending(pendingDoc);

      log = pending.log;

      if (pending.skipped) {
        return {
          ok: true,
          status: "skipped",
          logId: log?._id?.toString?.() || log?._id || null,
        };
      }

      const template = getTemplate(event);
      const rendered = template(payload);
      const subject = rendered.subject;
      const html = rendered.html;
      const text = rendered.text;

      const result = await provider.send({
        to,
        from: fromAddress || from?.email,
        replyTo: replyTo || undefined,
        subject,
        html,
        text,
      });

      await store.markSent(log._id, {
        providerMessageId: result.messageId,
        subject,
        from: fromAddress || from?.email,
      });

      return {
        ok: true,
        status: "sent",
        logId: log._id.toString(),
        messageId: result.messageId || null,
      };
    } catch (error) {
      const message = error?.message || String(error);
      if (log?._id) {
        try {
          await store.markFailed(log._id, {
            error: message,
            from: fromAddress || from?.email,
          });
        } catch (logError) {
          logger.error("Failed to update EmailLog after send error:", logError);
        }
      }

      if (critical) {
        throw error instanceof Error ? error : new Error(message);
      }

      logger.error(`Email send failed for ${event}:`, message);
      return {
        ok: false,
        status: "failed",
        logId: log?._id?.toString?.() || null,
        error: message,
      };
    }
  }

  return {
    send(event, payload, options = {}) {
      return dispatch(event, payload, { ...options, critical: false });
    },
    sendCritical(event, payload, options = {}) {
      return dispatch(event, payload, { ...options, critical: true });
    },
    isConfigured,
  };
}
