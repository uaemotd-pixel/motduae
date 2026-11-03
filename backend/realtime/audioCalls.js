import { randomBytes } from "crypto";
import { env } from "../config/env.js";

/**
 * In-memory 1:1 audio call registry (support + fabric live-chat sessions).
 * @typedef {"ringing"|"connecting"|"active"} CallStatus
 * @typedef {"answered"|"missed"|"rejected"|"cancelled"|"failed"} CallOutcome
 * @typedef {{
 *   callId: string,
 *   sessionId: string,
 *   status: CallStatus,
 *   adminSocketId: string,
 *   customerSocketId: string,
 *   createdAt: number,
 *   acceptedAt: number | null,
 *   connectedAt: number | null,
 *   ringTimer: ReturnType<typeof setTimeout> | null,
 * }} AudioCall
 */

/** @type {Map<string, AudioCall>} sessionId → call */
const callsBySession = new Map();

/** @type {Map<string, string>} callId → sessionId */
const sessionByCallId = new Map();

function mintCallId() {
  return `call_${randomBytes(8).toString("hex")}`;
}

export function isAudioCallsEnabled() {
  return Boolean(env.audioCalls?.enabled);
}

export function getIceServers() {
  return env.audioCalls?.iceServers || [
    { urls: "stun:stun.l.google.com:19302" },
  ];
}

export function getRingTimeoutMs() {
  return env.audioCalls?.ringTimeoutMs || 40_000;
}

/**
 * @param {string} sessionId
 * @returns {AudioCall | null}
 */
export function getCallBySession(sessionId) {
  const id = String(sessionId || "").trim();
  if (!id) return null;
  return callsBySession.get(id) || null;
}

/**
 * @param {string} callId
 * @returns {AudioCall | null}
 */
export function getCallById(callId) {
  const id = String(callId || "").trim();
  if (!id) return null;
  const sessionId = sessionByCallId.get(id);
  if (!sessionId) return null;
  return callsBySession.get(sessionId) || null;
}

/**
 * @param {AudioCall} call
 */
function clearRingTimer(call) {
  if (call.ringTimer) {
    clearTimeout(call.ringTimer);
    call.ringTimer = null;
  }
}

/**
 * Map end reason + prior call status → WhatsApp-style call outcome.
 * @param {Pick<AudioCall, "status"|"acceptedAt"|"connectedAt">} call
 * @param {string} reason
 * @returns {{ outcome: CallOutcome, durationMs: number }}
 */
export function resolveCallHistory(call, reason = "ended") {
  const why = String(reason || "ended");
  const priorStatus = call?.status || "ringing";
  const now = Date.now();

  if (priorStatus === "ringing") {
    if (why === "rejected") {
      return { outcome: "rejected", durationMs: 0 };
    }
    if (why === "missed") {
      return { outcome: "missed", durationMs: 0 };
    }
    // Agent cancel / peer left before answer / chat closed while ringing
    if (
      why === "hangup" ||
      why === "peer_disconnect" ||
      why === "chat_ended" ||
      why === "chat_closed"
    ) {
      return { outcome: "cancelled", durationMs: 0 };
    }
    return { outcome: "missed", durationMs: 0 };
  }

  // Accepted (connecting/active): show answered with talk time when possible.
  const start =
    call?.connectedAt ||
    call?.acceptedAt ||
    null;
  const durationMs = start
    ? Math.max(0, Math.min(now - start, 24 * 60 * 60 * 1000))
    : 0;

  if (why === "peer_disconnect" && priorStatus === "connecting" && !call?.connectedAt) {
    return { outcome: "failed", durationMs: 0 };
  }

  return { outcome: "answered", durationMs };
}

/**
 * @param {string} sessionId
 * @param {{ adminSocketId: string, customerSocketId: string, onRingTimeout?: (call: AudioCall) => void }} opts
 */
export function createRingingCall(sessionId, opts) {
  const sid = String(sessionId || "").trim();
  if (!sid) throw new Error("missing_session");
  if (callsBySession.has(sid)) {
    const err = new Error("busy");
    err.code = "busy";
    throw err;
  }

  const callId = mintCallId();
  /** @type {AudioCall} */
  const call = {
    callId,
    sessionId: sid,
    status: "ringing",
    adminSocketId: String(opts.adminSocketId || ""),
    customerSocketId: String(opts.customerSocketId || ""),
    createdAt: Date.now(),
    acceptedAt: null,
    connectedAt: null,
    ringTimer: null,
  };

  const timeoutMs = getRingTimeoutMs();
  call.ringTimer = setTimeout(() => {
    const current = callsBySession.get(sid);
    if (!current || current.callId !== callId) return;
    if (current.status !== "ringing") return;
    console.info("[audioCall] missed", {
      callId,
      sessionId: sid,
      reason: "ring_timeout",
    });
    const ended = endCall(sid, "missed");
    opts.onRingTimeout?.(ended || current);
  }, timeoutMs);

  callsBySession.set(sid, call);
  sessionByCallId.set(callId, sid);
  console.info("[audioCall] invite", {
    callId,
    sessionId: sid,
    adminSocketId: call.adminSocketId,
  });
  return call;
}

/**
 * When a customer reconnects during an outbound ring, attach their socket
 * so we can deliver `call:ring`.
 * @param {string} sessionId
 * @param {string} customerSocketId
 * @returns {AudioCall | null}
 */
export function attachCustomerToRingingCall(sessionId, customerSocketId) {
  const call = getCallBySession(sessionId);
  if (!call || call.status !== "ringing") return null;
  call.customerSocketId = String(customerSocketId || "");
  return call;
}

/**
 * @param {string} sessionId
 * @param {string} customerSocketId
 */
export function acceptCall(sessionId, customerSocketId) {
  const call = getCallBySession(sessionId);
  if (!call) {
    const err = new Error("not_found");
    err.code = "not_found";
    throw err;
  }
  if (call.status !== "ringing") {
    const err = new Error("invalid_state");
    err.code = "invalid_state";
    throw err;
  }
  if (call.customerSocketId && call.customerSocketId !== customerSocketId) {
    // Allow accept if customer reconnected with a new socket on same session room;
    // update the customer socket id.
    call.customerSocketId = customerSocketId;
  }
  clearRingTimer(call);
  call.status = "connecting";
  call.acceptedAt = Date.now();
  console.info("[audioCall] accepted", {
    callId: call.callId,
    sessionId: call.sessionId,
  });
  return call;
}

/**
 * @param {string} sessionId
 */
export function markCallActive(sessionId) {
  const call = getCallBySession(sessionId);
  if (!call) return null;
  if (call.status === "connecting" || call.status === "active") {
    call.status = "active";
    if (!call.connectedAt) call.connectedAt = Date.now();
  }
  return call;
}

/**
 * @param {string} sessionId
 * @param {string} [reason]
 * @returns {(AudioCall & { endReason?: string, history?: { outcome: CallOutcome, durationMs: number } }) | null}
 */
export function endCall(sessionId, reason = "ended") {
  const sid = String(sessionId || "").trim();
  const call = callsBySession.get(sid);
  if (!call) return null;
  clearRingTimer(call);
  callsBySession.delete(sid);
  sessionByCallId.delete(call.callId);
  const history = resolveCallHistory(call, reason);
  console.info("[audioCall] end", {
    callId: call.callId,
    sessionId: sid,
    reason,
    priorStatus: call.status,
    outcome: history.outcome,
    durationMs: history.durationMs,
  });
  return {
    ...call,
    status: call.status,
    endReason: reason,
    history,
  };
}

/** @type {Map<string, ReturnType<typeof setTimeout>>} socketId → pending end */
const pendingDisconnectEnds = new Map();

/**
 * Re-bind a participant socket after reconnect (tab switch / brief drop).
 * @param {string} sessionId
 * @param {"agent"|"customer"} role
 * @param {string} socketId
 * @returns {AudioCall | null}
 */
export function reattachCallSocket(sessionId, role, socketId) {
  const call = getCallBySession(sessionId);
  if (!call || !socketId) return null;
  if (role === "agent") {
    call.adminSocketId = String(socketId);
  } else {
    call.customerSocketId = String(socketId);
  }
  cancelPendingDisconnectEnd(socketId);
  // Also cancel any pending end for the previous socket id if we knew it —
  // callers pass the new id; clear all timers that point at this session.
  for (const [sid, timer] of pendingDisconnectEnds.entries()) {
    const c = [...callsBySession.values()].find(
      (x) => x.adminSocketId === sid || x.customerSocketId === sid,
    );
    if (c && c.sessionId === call.sessionId) {
      clearTimeout(timer);
      pendingDisconnectEnds.delete(sid);
    }
  }
  return call;
}

/**
 * Cancel a deferred end scheduled for this socket.
 * @param {string} socketId
 */
export function cancelPendingDisconnectEnd(socketId) {
  const sid = String(socketId || "");
  const timer = pendingDisconnectEnds.get(sid);
  if (timer) {
    clearTimeout(timer);
    pendingDisconnectEnds.delete(sid);
  }
}

/**
 * End call if this socket was a participant — deferred so brief tab/network
 * drops (and Socket.IO reconnects) do not instantly cancel ringing calls.
 * @param {string} socketId
 * @param {{ graceMs?: number, onEnd?: (call: ReturnType<typeof endCall>) => void }} [opts]
 * @returns {AudioCall | null} the live call that was scheduled, if any
 */
export function endCallForSocket(socketId, opts = {}) {
  const sid = String(socketId || "");
  let matched = null;
  for (const call of callsBySession.values()) {
    if (call.adminSocketId === sid || call.customerSocketId === sid) {
      matched = call;
      break;
    }
  }
  if (!matched) return null;

  const graceMs =
    Number.isFinite(opts.graceMs) && opts.graceMs >= 0
      ? opts.graceMs
      : 15_000;

  cancelPendingDisconnectEnd(sid);
  const sessionKey = matched.sessionId;
  const callId = matched.callId;
  const timer = setTimeout(() => {
    pendingDisconnectEnds.delete(sid);
    const current = callsBySession.get(sessionKey);
    // Only end if this socket is still the bound participant (not reattached).
    if (
      !current ||
      current.callId !== callId ||
      (current.adminSocketId !== sid && current.customerSocketId !== sid)
    ) {
      return;
    }
    const ended = endCall(sessionKey, "peer_disconnect");
    opts.onEnd?.(ended);
  }, graceMs);
  pendingDisconnectEnds.set(sid, timer);
  return matched;
}

/**
 * Public snapshot for clients.
 * @param {AudioCall} call
 */
export function toPublicCall(call) {
  if (!call) return null;
  return {
    callId: call.callId,
    sessionId: call.sessionId,
    status: call.status,
    createdAt: call.createdAt,
    iceServers: getIceServers(),
  };
}
