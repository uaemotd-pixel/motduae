"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  emitWithAck,
  getSocket,
  useSocketEvent,
} from "@/lib/realtime/socket";
import {
  answerRemoteOffer,
  audioCallsUiEnabled,
  createAudioSession,
  handleRemoteSignal,
  sampleNetworkQuality,
  type CallSignal,
  type IceServerConfig,
  type NetworkQuality,
  type WebrtcAudioSession,
} from "@/lib/realtime/webrtcAudioCall";
import { startCallRingtone } from "@/lib/realtime/callRingtone";

export type AudioCallRole = "agent" | "customer";

export type AudioCallUiStatus =
  | "idle"
  | "calling_out"
  | "ringing_out"
  | "ringing_in"
  | "connecting"
  | "active"
  | "failed";

type PublicCall = {
  callId: string;
  sessionId: string;
  status: string;
  createdAt?: number;
  iceServers?: IceServerConfig[];
};

type Ack = {
  ok: boolean;
  error?: string;
  call?: PublicCall;
  role?: string;
  enabled?: boolean;
  customerOnline?: boolean;
  peerReachable?: boolean;
};

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * 1:1 WebRTC audio call bound to a live-chat sessionId.
 * Agent invites; customer only accepts/rejects.
 *
 * While a call is in progress, the session is locked so switching the open
 * chat (admin inbox) does not tear down or hang up the call.
 */
export function useAudioCall(options: {
  sessionId: string | null | undefined;
  role: AudioCallRole;
  /** Session must be active for agent to dial. */
  canDial?: boolean;
  enabled?: boolean;
}) {
  const { sessionId, role, canDial = true } = options;
  const featureOn = options.enabled ?? audioCallsUiEnabled();

  const [status, setStatus] = useState<AudioCallUiStatus>("idle");
  const [callId, setCallId] = useState<string | null>(null);
  /** Session the live call belongs to (sticky across inbox switches). */
  const [callSessionId, setCallSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMutedState] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState("0:00");
  const [customerOnline, setCustomerOnline] = useState(true);
  const [networkQuality, setNetworkQuality] = useState<NetworkQuality | null>(
    null,
  );

  const sessionRef = useRef<WebrtcAudioSession | null>(null);
  const callIdRef = useRef<string | null>(null);
  const callSessionIdRef = useRef<string | null>(null);
  const statusRef = useRef<AudioCallUiStatus>("idle");
  const iceServersRef = useRef<IceServerConfig[] | undefined>(undefined);
  const activeStartedAtRef = useRef<number | null>(null);
  const makingOfferRef = useRef(false);

  const setStatusSafe = useCallback((next: AudioCallUiStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  const lockCallSession = useCallback((id: string) => {
    callSessionIdRef.current = id;
    setCallSessionId(id);
  }, []);

  const clearCallSession = useCallback(() => {
    callSessionIdRef.current = null;
    setCallSessionId(null);
  }, []);

  const teardownMedia = useCallback(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    makingOfferRef.current = false;
    activeStartedAtRef.current = null;
    setMutedState(false);
    setElapsedLabel("0:00");
    setNetworkQuality(null);
  }, []);

  const resetIdle = useCallback(() => {
    teardownMedia();
    callIdRef.current = null;
    setCallId(null);
    clearCallSession();
    setStatusSafe("idle");
  }, [clearCallSession, setStatusSafe, teardownMedia]);

  /** Session used for signaling / events — locked call wins over focused chat. */
  const getSignalSessionId = useCallback(() => {
    return callSessionIdRef.current || sessionId || null;
  }, [sessionId]);

  const matchesCallSession = useCallback(
    (payloadSessionId?: string) => {
      const locked = callSessionIdRef.current;
      if (locked) return payloadSessionId === locked;
      return Boolean(sessionId && payloadSessionId === sessionId);
    },
    [sessionId],
  );

  const sendSignal = useCallback(
    async (signal: CallSignal) => {
      const sid = getSignalSessionId();
      const cid = callIdRef.current;
      if (!sid || !cid) return;
      try {
        await emitWithAck<Ack>("call:signal", {
          sessionId: sid,
          callId: cid,
          signal,
        });
      } catch {
        /* peer may have hung up */
      }
    },
    [getSignalSessionId],
  );

  const ensureMedia = useCallback(
    async (isCaller: boolean) => {
      if (sessionRef.current) return sessionRef.current;
      const media = await createAudioSession({
        iceServers: iceServersRef.current,
        isCaller,
        onSignal: (signal) => {
          void sendSignal(signal);
        },
        onConnectionState: (state) => {
          if (state === "connected") {
            if (statusRef.current !== "active") {
              activeStartedAtRef.current = Date.now();
              setStatusSafe("active");
            }
          } else if (state === "failed") {
            setError("connection_failed");
            setStatusSafe("failed");
          } else if (state === "disconnected") {
            // Soft — wait for reconnect or hangup
          }
        },
      });
      sessionRef.current = media;
      return media;
    },
    [sendSignal, setStatusSafe],
  );

  const inviteInFlightRef = useRef(false);

  const invite = useCallback(async () => {
    if (!featureOn || role !== "agent" || !sessionId || !canDial) return;
    if (statusRef.current !== "idle" || inviteInFlightRef.current) return;
    setError(null);
    inviteInFlightRef.current = true;
    // WhatsApp-style: always start as "Calling…" until the peer device rings.
    setStatusSafe("calling_out");
    lockCallSession(sessionId);
    try {
      const res = await emitWithAck<Ack>("call:invite", { sessionId });
      if (!res?.ok || !res.call) {
        const errCode = res?.error || "invite_failed";
        if (errCode === "customer_offline") setCustomerOnline(false);
        setError(errCode);
        clearCallSession();
        setStatusSafe("idle");
        return;
      }
      callIdRef.current = res.call.callId;
      setCallId(res.call.callId);
      iceServersRef.current = res.call.iceServers;
      lockCallSession(res.call.sessionId || sessionId);
      if (res.peerReachable) {
        setCustomerOnline(true);
        setStatusSafe("ringing_out");
      } else {
        setCustomerOnline(false);
        // Stay on calling_out — upgrade to ringing_out on call:peer-ringing.
      }
    } catch {
      setError("invite_failed");
      clearCallSession();
      setStatusSafe("idle");
    } finally {
      inviteInFlightRef.current = false;
    }
  }, [
    canDial,
    clearCallSession,
    featureOn,
    lockCallSession,
    role,
    sessionId,
    setStatusSafe,
  ]);

  const accept = useCallback(async () => {
    const sid = getSignalSessionId();
    if (!featureOn || role !== "customer" || !sid) return;
    setError(null);
    setStatusSafe("connecting");
    lockCallSession(sid);
    try {
      const res = await emitWithAck<Ack>("call:accept", { sessionId: sid });
      if (!res?.ok || !res.call) {
        setError(res?.error || "accept_failed");
        resetIdle();
        return;
      }
      callIdRef.current = res.call.callId;
      setCallId(res.call.callId);
      iceServersRef.current = res.call.iceServers;
      lockCallSession(res.call.sessionId || sid);
      // Callee prepares PC without creating an offer; waits for agent offer.
      await ensureMedia(false);
    } catch (err) {
      const msg =
        err instanceof Error && /NotAllowed|Permission/i.test(err.message)
          ? "mic_denied"
          : "accept_failed";
      setError(msg);
      resetIdle();
    }
  }, [
    ensureMedia,
    featureOn,
    getSignalSessionId,
    lockCallSession,
    resetIdle,
    role,
    setStatusSafe,
  ]);

  const reject = useCallback(async () => {
    const sid = getSignalSessionId();
    if (!sid) return;
    try {
      await emitWithAck<Ack>("call:reject", { sessionId: sid });
    } catch {
      /* ignore */
    }
    resetIdle();
  }, [getSignalSessionId, resetIdle]);

  const hangup = useCallback(async () => {
    const sid = getSignalSessionId();
    if (!sid) {
      resetIdle();
      return;
    }
    try {
      await emitWithAck<Ack>("call:end", {
        sessionId: sid,
        callId: callIdRef.current,
      });
    } catch {
      /* ignore */
    }
    resetIdle();
  }, [getSignalSessionId, resetIdle]);

  const setMuted = useCallback((next: boolean) => {
    sessionRef.current?.setMuted(next);
    setMutedState(next);
  }, []);

  // Elapsed timer while active
  useEffect(() => {
    if (status !== "active") return;
    const tick = () => {
      const start = activeStartedAtRef.current || Date.now();
      setElapsedLabel(formatElapsed(Date.now() - start));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // Network quality while media is up
  useEffect(() => {
    if (status !== "active" && status !== "connecting") {
      setNetworkQuality(null);
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const pc = sessionRef.current?.pc;
      if (!pc) return;
      const q = await sampleNetworkQuality(pc);
      if (!cancelled && q) setNetworkQuality(q);
    };
    void poll();
    const id = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [status]);

  // Ringtone while calling / ringing (incoming or outbound)
  useEffect(() => {
    if (
      status !== "ringing_in" &&
      status !== "ringing_out" &&
      status !== "calling_out"
    ) {
      return;
    }
    const handle = startCallRingtone(status === "ringing_in" ? "in" : "out");
    return () => handle.stop();
  }, [status]);

  const applyServerCall = useCallback(
    async (res: Ack, sid: string) => {
      if (typeof res.customerOnline === "boolean") {
        setCustomerOnline(res.customerOnline);
      }
      if (!res.call) {
        // Invite ack may still be in flight — don't wipe "Calling…".
        if (inviteInFlightRef.current) return;
        // Only clear when the server confirms the locked call is gone.
        if (
          callSessionIdRef.current === sid &&
          callIdRef.current &&
          statusRef.current !== "idle"
        ) {
          resetIdle();
        }
        return;
      }
      lockCallSession(res.call.sessionId || sid);
      iceServersRef.current = res.call.iceServers;
      callIdRef.current = res.call.callId;
      setCallId(res.call.callId);
      if (res.call.status === "ringing") {
        if (role === "agent") {
          setStatusSafe(res.customerOnline ? "ringing_out" : "calling_out");
        } else {
          setStatusSafe("ringing_in");
        }
      } else if (
        res.call.status === "connecting" ||
        res.call.status === "active"
      ) {
        if (!sessionRef.current && role === "customer") {
          setStatusSafe("connecting");
          try {
            await ensureMedia(false);
          } catch {
            /* mic */
          }
        } else if (role === "agent" && !sessionRef.current) {
          setStatusSafe("connecting");
        } else {
          setStatusSafe(
            res.call.status === "active" ? "active" : "connecting",
          );
        }
      }
    },
    [ensureMedia, lockCallSession, resetIdle, role, setStatusSafe],
  );

  // Sync the locked call session (or focused chat when idle). Switching inbox
  // chats updates sessionId but we keep syncing the locked call session.
  useEffect(() => {
    if (!featureOn) return;
    const sid = callSessionIdRef.current || sessionId;
    if (!sid) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await emitWithAck<Ack>("call:state", { sessionId: sid });
        if (cancelled || !res?.ok) return;
        await applyServerCall(res, sid);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyServerCall, callSessionId, featureOn, sessionId]);

  // On socket reconnect, re-bind the locked call so the server cancels deferred end.
  useEffect(() => {
    if (!featureOn) return;
    const socket = getSocket();
    const onConnect = () => {
      const sid = callSessionIdRef.current;
      if (!sid) return;
      void (async () => {
        try {
          const res = await emitWithAck<Ack>("call:state", { sessionId: sid });
          if (!res?.ok) return;
          await applyServerCall(res, sid);
        } catch {
          /* ignore */
        }
      })();
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [applyServerCall, featureOn]);

  // Teardown media only on page unmount — never when switching inbox chats.
  useEffect(() => {
    return () => {
      teardownMedia();
    };
  }, [teardownMedia]);

  const onRing = useCallback(
    (payload: PublicCall & { from?: string }) => {
      const locked = callSessionIdRef.current;
      if (locked && payload.sessionId !== locked) return;
      if (!locked && (!sessionId || payload.sessionId !== sessionId)) return;
      lockCallSession(payload.sessionId);
      iceServersRef.current = payload.iceServers;
      callIdRef.current = payload.callId;
      setCallId(payload.callId);
      setError(null);
      if (role === "customer") {
        setStatusSafe("ringing_in");
      } else {
        setCustomerOnline(true);
        setStatusSafe("ringing_out");
      }
    },
    [lockCallSession, role, sessionId, setStatusSafe],
  );

  const onPeerRinging = useCallback(
    (payload: { sessionId: string; callId?: string }) => {
      if (!matchesCallSession(payload.sessionId)) return;
      if (role !== "agent") return;
      if (
        callIdRef.current &&
        payload.callId &&
        payload.callId !== callIdRef.current
      ) {
        return;
      }
      setCustomerOnline(true);
      if (
        statusRef.current === "calling_out" ||
        statusRef.current === "ringing_out"
      ) {
        setStatusSafe("ringing_out");
      }
    },
    [matchesCallSession, role, setStatusSafe],
  );

  const onAccepted = useCallback(
    async (payload: PublicCall & { callerSocketHint?: string }) => {
      if (!matchesCallSession(payload.sessionId)) return;
      lockCallSession(payload.sessionId);
      iceServersRef.current = payload.iceServers;
      callIdRef.current = payload.callId;
      setCallId(payload.callId);
      setStatusSafe("connecting");
      if (role === "agent" && !makingOfferRef.current) {
        makingOfferRef.current = true;
        try {
          sessionRef.current?.close();
          sessionRef.current = null;
          await ensureMedia(true);
        } catch (err) {
          makingOfferRef.current = false;
          const msg =
            err instanceof Error && /NotAllowed|Permission/i.test(err.message)
              ? "mic_denied"
              : "media_failed";
          setError(msg);
          void hangup();
        }
      }
    },
    [ensureMedia, hangup, lockCallSession, matchesCallSession, role, setStatusSafe],
  );

  const onSignal = useCallback(
    async (payload: {
      sessionId: string;
      callId: string;
      signal: CallSignal;
      from?: string;
    }) => {
      if (!matchesCallSession(payload.sessionId)) return;
      if (callIdRef.current && payload.callId !== callIdRef.current) return;
      try {
        if (payload.signal.type === "offer" && role === "customer") {
          const media = await ensureMedia(false);
          const answer = await answerRemoteOffer(media, payload.signal.sdp);
          await sendSignal(answer);
          return;
        }
        if (sessionRef.current) {
          await handleRemoteSignal(sessionRef.current, payload.signal);
        }
      } catch {
        setError("signal_failed");
      }
    },
    [ensureMedia, matchesCallSession, role, sendSignal],
  );

  const onEnded = useCallback(
    (payload: { sessionId: string; callId?: string; reason?: string }) => {
      if (!matchesCallSession(payload.sessionId)) return;
      if (
        callIdRef.current &&
        payload.callId &&
        payload.callId !== callIdRef.current
      ) {
        return;
      }
      if (payload.reason === "missed" && role === "agent") {
        setError("missed");
      } else if (payload.reason === "customer_offline") {
        setError("customer_offline");
      }
      // Rejected: no popup — call history bubble already records the decline.
      resetIdle();
    },
    [matchesCallSession, resetIdle, role],
  );

  useSocketEvent("call:ring", onRing);
  useSocketEvent("call:peer-ringing", onPeerRinging);
  useSocketEvent("call:accepted", onAccepted);
  useSocketEvent("call:signal", onSignal);
  useSocketEvent("call:ended", onEnded);

  // Keep socket connected for focused chat and locked call session.
  useEffect(() => {
    const sid = callSessionId || sessionId;
    if (!sid || !featureOn) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
  }, [callSessionId, featureOn, sessionId]);

  const dialDisabled =
    !featureOn ||
    role !== "agent" ||
    !sessionId ||
    !canDial ||
    status !== "idle";

  return {
    featureOn,
    status,
    callId,
    /** Session the current call belongs to (null when idle). */
    callSessionId,
    error,
    muted,
    elapsedLabel,
    customerOnline,
    networkQuality,
    dialDisabled,
    invite,
    accept,
    reject,
    hangup,
    setMuted,
    clearError: () => setError(null),
  };
}
