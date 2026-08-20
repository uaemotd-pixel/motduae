import { env } from "../../config/env.js";
import { createStubClient } from "./shipaStubClient.js";
import {
  SHIPA_V2_SANDBOX_BASE_URL,
  publicTrackingUrl,
  toShipaV2OrderBody,
} from "./shipaV2.js";

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

function joinUrl(baseUrl, path, query = {}) {
  const url = new URL(
    path.startsWith("/") ? path.slice(1) : path,
    `${baseUrl.replace(/\/$/, "")}/`,
  );
  for (const [key, value] of Object.entries(query)) {
    if (value != null && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function mapCreateResponse(data, customerRef) {
  const record = Array.isArray(data) ? data[0] : data;
  const shipaRef = String(record?.shipaRef || record?.awb || "").trim();
  if (!shipaRef) {
    throw new Error("Shipa V2 create order returned no shipaRef");
  }
  const orderStatus = String(record?.orderStatus || record?.status || "created");
  return {
    shipaOrderId: shipaRef,
    awb: shipaRef,
    trackingUrl: publicTrackingUrl(shipaRef),
    labelUrl: "",
    status: orderStatus.toLowerCase().includes("cancel")
      ? "cancelled"
      : "created",
    raw: { customerRef, ...record },
  };
}

/**
 * Live Shipa Delivery API V2 client.
 * Auth: Apigee `apikey` query param. Body: origin / destination / packages.
 *
 * @param {{ apiKey: string, baseUrl: string }} config
 * @returns {ShipaClient}
 */
export function createLiveClient(config) {
  const apiKey = config.apiKey;
  const baseUrl = (config.baseUrl || SHIPA_V2_SANDBOX_BASE_URL).replace(
    /\/$/,
    "",
  );

  if (!apiKey) {
    throw new Error("Shipa live mode requires SHIPA_API_KEY");
  }

  async function request(method, path, { body, query, accept } = {}) {
    const url = joinUrl(baseUrl, path, { apikey: apiKey, ...query });
    const headers = {
      Accept: accept || "application/json",
    };
    if (body != null) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    });

    if (accept === "application/pdf") {
      if (!response.ok) {
        const text = await response.text();
        const error = new Error(
          `Shipa API ${method} ${path} failed (${response.status}) ${text}`.trim(),
        );
        error.status = response.status;
        throw error;
      }
      return response.arrayBuffer();
    }

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
      const orderBody = toShipaV2OrderBody(payload);
      const data = await request("POST", "/orders", { body: orderBody });
      return mapCreateResponse(data, orderBody.customerRef);
    },

    async track(awb) {
      const id = encodeURIComponent(String(awb || ""));
      const data = await request("GET", `/orders/${id}/tracking`);
      return {
        awb: String(awb || ""),
        status: "",
        trackingUrl: publicTrackingUrl(awb),
        events: [],
        raw: data,
      };
    },

    async getOrderStory(awbOrOrderId) {
      const id = encodeURIComponent(String(awbOrOrderId || ""));
      const data = await request("GET", `/orders/${id}/story`);
      const events = Array.isArray(data) ? data : data?.events || [];
      return {
        awb: String(awbOrOrderId || ""),
        shipaOrderId: awbOrOrderId || null,
        events,
        raw: data,
      };
    },

    async cancel(awbOrOrderId) {
      const id = encodeURIComponent(String(awbOrOrderId || ""));
      const data = await request("POST", `/orders/${id}/cancel`, {
        body: { cancelReasonId: 17 },
      });
      return {
        awb: String(awbOrOrderId || ""),
        status: "cancelled",
        raw: data,
      };
    },

    async getLabel(awb) {
      const id = encodeURIComponent(String(awb || ""));
      const pdf = await request("GET", `/orders/${id}/pdf`, {
        query: { mode: "attachment", template: "A4", copies: 1 },
        accept: "application/pdf",
      });
      return {
        awb: String(awb || ""),
        labelUrl: "",
        raw: pdf,
      };
    },
  };
}

export function getShipaClient() {
  if (env.shipa.mode === "live") {
    return createLiveClient({
      apiKey: env.shipa.apiKey,
      baseUrl: env.shipa.baseUrl || SHIPA_V2_SANDBOX_BASE_URL,
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
