import { env } from "../../config/env.js";
import { createStubClient } from "./shipaStubClient.js";

/**
 * @typedef {object} ShipaAddress
 * @property {string} [fullName]
 * @property {string} [phone]
 * @property {string} [line1]
 * @property {string} [line2]
 * @property {string} [city]
 * @property {string} [emirate]
 */

/**
 * @typedef {object} ShipaCreateOrderPayload
 * @property {string} reference
 * @property {string} [parcelKey]
 * @property {string} [orderId]
 * @property {string} [shipmentType]
 * @property {ShipaAddress} pickup
 * @property {ShipaAddress} dropoff
 * @property {object} [metadata]
 */

/**
 * @typedef {object} ShipaCreateOrderResult
 * @property {string} shipaOrderId
 * @property {string} awb
 * @property {string} trackingUrl
 * @property {string} labelUrl
 * @property {string} status
 * @property {object} [raw]
 */

/**
 * @typedef {object} ShipaClient
 * @property {'stub'|'live'} mode
 * @property {(payload: ShipaCreateOrderPayload) => Promise<ShipaCreateOrderResult>} createOrder
 * @property {(awb: string) => Promise<object>} track
 * @property {(awbOrOrderId: string) => Promise<object>} getOrderStory
 * @property {(awbOrOrderId: string) => Promise<object>} cancel
 * @property {(awb: string) => Promise<object>} getLabel
 */

/**
 * Live HTTP client skeleton. Paths/headers are placeholders until Shipa docs/keys arrive.
 * Call sites use the same interface as the stub — swap via SHIPA_MODE=live.
 *
 * @param {{ apiKey: string, baseUrl: string }} config
 * @returns {ShipaClient}
 */
export function createLiveClient(config) {
  const { apiKey, baseUrl } = config;

  if (!apiKey || !baseUrl) {
    throw new Error(
      "Shipa live mode requires SHIPA_API_KEY and SHIPA_BASE_URL",
    );
  }

  async function request(method, path, body) {
    const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { rawText: text };
    }

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        `Shipa API ${method} ${path} failed (${response.status})`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  return {
    mode: "live",

    async createOrder(payload) {
      // Tentative contract — adjust paths when official Shipa docs arrive.
      const data = await request("POST", "/orders", {
        reference: payload.reference,
        pickup: payload.pickup,
        dropoff: payload.dropoff,
        metadata: {
          parcelKey: payload.parcelKey,
          orderId: payload.orderId,
          shipmentType: payload.shipmentType,
          ...(payload.metadata || {}),
        },
      });

      return {
        shipaOrderId: String(
          data.shipaOrderId || data.orderId || data.id || "",
        ),
        awb: String(data.awb || data.trackingNumber || ""),
        trackingUrl: String(data.trackingUrl || data.tracking_url || ""),
        labelUrl: String(data.labelUrl || data.label_url || ""),
        status: String(data.status || "created"),
        raw: data,
      };
    },

    async track(awb) {
      const data = await request("GET", `/orders/${encodeURIComponent(awb)}/track`);
      return {
        awb: String(data.awb || awb),
        status: String(data.status || ""),
        trackingUrl: String(data.trackingUrl || data.tracking_url || ""),
        events: Array.isArray(data.events) ? data.events : [],
        raw: data,
      };
    },

    async getOrderStory(awbOrOrderId) {
      const data = await request(
        "GET",
        `/orders/${encodeURIComponent(awbOrOrderId)}/story`,
      );
      return {
        awb: String(data.awb || ""),
        shipaOrderId: data.shipaOrderId || data.orderId || null,
        events: Array.isArray(data.events) ? data.events : [],
        raw: data,
      };
    },

    async cancel(awbOrOrderId) {
      const data = await request(
        "POST",
        `/orders/${encodeURIComponent(awbOrOrderId)}/cancel`,
      );
      return {
        awb: String(data.awb || awbOrOrderId),
        status: String(data.status || "cancelled"),
        raw: data,
      };
    },

    async getLabel(awb) {
      const data = await request(
        "GET",
        `/orders/${encodeURIComponent(awb)}/label`,
      );
      return {
        awb: String(data.awb || awb),
        labelUrl: String(data.labelUrl || data.label_url || ""),
        raw: data,
      };
    },
  };
}

/**
 * Resolve the active Shipa client from env (stub by default).
 * @returns {ShipaClient}
 */
export function getShipaClient() {
  if (env.shipa.mode === "live") {
    return createLiveClient({
      apiKey: env.shipa.apiKey,
      baseUrl: env.shipa.baseUrl,
    });
  }
  return createStubClient();
}

export function isShipaLiveMode() {
  return env.shipa.mode === "live";
}

export function isShipaWebhookConfigured() {
  return Boolean(env.shipa.webhookSecret);
}

export default getShipaClient;
