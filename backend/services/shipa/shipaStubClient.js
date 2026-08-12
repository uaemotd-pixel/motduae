import crypto from "crypto";

/**
 * Deterministic sandbox Shipa client for local/dev.
 * No network calls — AWBs and events are derived from input refs.
 */

function stableHash(input) {
  return crypto.createHash("sha1").update(String(input)).digest("hex");
}

function buildAwb(ref) {
  const hash = stableHash(ref).slice(0, 10).toUpperCase();
  return `STUB${hash}`;
}

function buildTrackingUrl(awb) {
  return `https://stub.shipa.local/track/${awb}`;
}

function buildLabelUrl(awb) {
  return `https://stub.shipa.local/labels/${awb}.pdf`;
}

/**
 * @returns {import('./shipaClient.js').ShipaClient}
 */
export function createStubClient() {
  return {
    mode: "stub",

    async createOrder(payload) {
      const ref =
        payload?.reference ||
        payload?.parcelKey ||
        payload?.orderId ||
        `order-${Date.now()}`;
      const awb = buildAwb(ref);
      const shipaOrderId = `stub_ord_${stableHash(ref).slice(0, 16)}`;

      return {
        shipaOrderId,
        awb,
        trackingUrl: buildTrackingUrl(awb),
        labelUrl: buildLabelUrl(awb),
        status: "created",
        raw: { stub: true, reference: ref, payload },
      };
    },

    async track(awb) {
      const id = String(awb || "");
      return {
        awb: id,
        status: "in_transit",
        trackingUrl: buildTrackingUrl(id),
        events: [
          {
            eventId: `stub_track_${stableHash(id).slice(0, 12)}`,
            status: "in_transit",
            description: "Stub: parcel in transit",
            occurredAt: new Date().toISOString(),
          },
        ],
        raw: { stub: true },
      };
    },

    async getOrderStory(awbOrOrderId) {
      const id = String(awbOrOrderId || "");
      const base = new Date();
      return {
        awb: id.startsWith("STUB") ? id : buildAwb(id),
        shipaOrderId: id.startsWith("stub_ord_") ? id : null,
        events: [
          {
            eventId: `stub_story_created_${stableHash(id).slice(0, 8)}`,
            status: "created",
            description: "Stub: order created",
            occurredAt: new Date(base.getTime() - 3600_000).toISOString(),
          },
          {
            eventId: `stub_story_transit_${stableHash(id).slice(0, 8)}`,
            status: "in_transit",
            description: "Stub: picked up / in transit",
            occurredAt: new Date(base.getTime() - 1800_000).toISOString(),
          },
        ],
        raw: { stub: true },
      };
    },

    async cancel(awbOrOrderId) {
      return {
        awb: String(awbOrOrderId || ""),
        status: "cancelled",
        raw: { stub: true },
      };
    },

    async getLabel(awb) {
      const id = String(awb || "");
      return {
        awb: id,
        labelUrl: buildLabelUrl(id),
        raw: { stub: true },
      };
    },
  };
}

export default createStubClient;
