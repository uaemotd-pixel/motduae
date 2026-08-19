import express from "express";
import expressAsyncHandler from "express-async-handler";
import crypto from "crypto";
import { env } from "../config/env.js";
import { isShipaWebhookConfigured } from "../services/shipa/shipaClient.js";
import { applyShipaWebhook } from "../services/shipmentService.js";

const shipaWebhookRoutes = express.Router();

function timingSafeEqualString(a, b) {
  const left = Buffer.from(String(a || ""), "utf8");
  const right = Buffer.from(String(b || ""), "utf8");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * Verify Shipa webhook authenticity.
 * Designed contract (until official docs arrive):
 * - Header `X-Shipa-Webhook-Secret` matches SHIPA_WEBHOOK_SECRET, OR
 * - Header `X-Shipa-Signature` = hex HMAC-SHA256 of raw body with the secret
 */
function verifyShipaWebhook(req) {
  const secret = env.shipa.webhookSecret;
  if (!secret) return { ok: false, reason: "not_configured" };

  const providedSecret =
    req.headers["x-shipa-webhook-secret"] ||
    req.headers["x-webhook-secret"];
  if (providedSecret && timingSafeEqualString(providedSecret, secret)) {
    return { ok: true, method: "shared_secret" };
  }

  const signature =
    req.headers["x-shipa-signature"] ||
    req.headers["x-signature"] ||
    "";
  if (signature) {
    const raw =
      Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(
            typeof req.body === "string" ? req.body : JSON.stringify(req.body || {}),
            "utf8",
          );
    const expected = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex");
    const normalized = String(signature)
      .replace(/^sha256=/i, "")
      .trim();
    if (timingSafeEqualString(normalized, expected)) {
      return { ok: true, method: "hmac" };
    }
  }

  return { ok: false, reason: "invalid_signature" };
}

function parseBody(req) {
  if (Buffer.isBuffer(req.body)) {
    const text = req.body.toString("utf8");
    if (!text) return {};
    return JSON.parse(text);
  }
  if (typeof req.body === "string") {
    return req.body ? JSON.parse(req.body) : {};
  }
  return req.body || {};
}

shipaWebhookRoutes.post(
  "/",
  express.raw({ type: "application/json" }),
  expressAsyncHandler(async (req, res) => {
    // Live mode must have a secret. Stub mode may omit secret for local testing.
    if (!isShipaWebhookConfigured()) {
      if (env.shipa.mode === "live") {
        console.error(
          "Shipa webhook received but SHIPA_WEBHOOK_SECRET is missing",
        );
        return res.status(503).send("Webhook not configured");
      }
      console.warn(
        "[shipa-webhook] SHIPA_WEBHOOK_SECRET unset — accepting stub webhook without verification",
      );
    } else {
      const verification = verifyShipaWebhook(req);
      if (!verification.ok) {
        console.error(
          `[shipa-webhook] verification failed: ${verification.reason}`,
        );
        return res.status(401).send("Invalid webhook signature");
      }
    }

    let payload;
    try {
      payload = parseBody(req);
    } catch (error) {
      return res.status(400).send(`Invalid JSON body: ${error.message}`);
    }

    try {
      const result = await applyShipaWebhook(payload);
      console.info(
        `[shipa-webhook] awb=${payload.awb} order=${result.order._id} ` +
          `duplicate=${result.duplicate} shipment=${result.shipmentStatus || result.shipment?.status} ` +
          `orderStatus=${result.orderStatus}`,
      );
      return res.json({
        received: true,
        duplicate: Boolean(result.duplicate),
        orderId: result.order._id,
        orderType: result.orderKind,
        orderStatus: result.orderStatus,
        shipmentStatus: result.shipmentStatus || result.shipment?.status,
      });
    } catch (error) {
      const status = error.statusCode || 500;
      console.error(`[shipa-webhook] handler error: ${error.message}`);
      if (status >= 500) {
        return res.status(status).json({ received: false, error: error.message });
      }
      return res.status(status).json({ received: false, error: error.message });
    }
  }),
);

export default shipaWebhookRoutes;
