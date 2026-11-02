"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import AudioCallOverlay from "@/components/shared/AudioCallOverlay";
import { useAudioCall } from "@/hooks/useAudioCall";

/** Keep in sync with `FAQ_CHAT_OPEN_EVENT` in FaqChatbot. */
const FAQ_CHAT_OPEN_EVENT = "motd-faq-chat-open";
import { getActiveLiveSession } from "@/lib/api/supportChat";
import {
  emitWithAck,
  getSocket,
  useSocketEvent,
} from "@/lib/realtime/socket";
import { audioCallsUiEnabled } from "@/lib/realtime/webrtcAudioCall";

type BoundSession = {
  id: string;
  agentName?: string | null;
  agentProfilePic?: string | null;
};

type ChatStartAck = {
  ok: boolean;
  error?: string;
  session?: {
    id: string;
    sessionKind?: string;
    status?: string;
    fabricStoreName?: string | null;
    agent?: { name?: string; profilePic?: string } | null;
  };
};

export const SUPPORT_SESSION_BOUND_EVENT = "motd-support-session-bound";

export type SupportSessionBoundDetail = {
  id: string | null;
  agentName?: string | null;
  agentProfilePic?: string | null;
};

export function publishSupportSessionBound(detail: SupportSessionBoundDetail) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(SUPPORT_SESSION_BOUND_EVENT, { detail }),
  );
}

type CustomerAudioCallContextValue = ReturnType<typeof useAudioCall> & {
  peerName: string;
  peerAvatarSrc: string | null | undefined;
  peerBrand: boolean;
  isAr: boolean;
  chatOpen: boolean;
};

const CustomerAudioCallContext =
  createContext<CustomerAudioCallContextValue | null>(null);

export function useCustomerAudioCall() {
  return useContext(CustomerAudioCallContext);
}

type CustomerAudioCallHostProps = {
  locale: string;
  isAr: boolean;
  /** Soft name for chat:start rebind (member / visitor). */
  customerName?: string;
  /** Auth still resolving — wait before probing active session. */
  authLoading?: boolean;
  /** Bump when live chat opens so we rebind immediately. */
  rebindKey?: string | number | boolean;
  children?: ReactNode;
};

/**
 * Keeps the customer reachable for admin audio calls even when the FAQ
 * chatbot is closed. Incoming rings use fullscreen when the chatbot is shut;
 * active-call UI mounts inside the chatbot panel.
 */
export default function CustomerAudioCallHost({
  locale,
  isAr,
  customerName = "",
  authLoading = false,
  rebindKey,
  children,
}: CustomerAudioCallHostProps) {
  const featureOn = audioCallsUiEnabled();
  const [bound, setBound] = useState<BoundSession | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const bindInFlightRef = useRef(false);
  const boundIdRef = useRef<string | null>(null);

  useEffect(() => {
    boundIdRef.current = bound?.id || null;
  }, [bound?.id]);

  useEffect(() => {
    const onOpen = (ev: Event) => {
      const detail = (ev as CustomEvent<{ open?: boolean }>).detail;
      setChatOpen(Boolean(detail?.open));
    };
    window.addEventListener(FAQ_CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(FAQ_CHAT_OPEN_EVENT, onOpen);
  }, []);

  const clearBound = useCallback(() => {
    setBound(null);
  }, []);

  // LiveChatPanel publishes the support session as soon as it starts/resumes.
  useEffect(() => {
    const onBound = (ev: Event) => {
      const detail = (ev as CustomEvent<SupportSessionBoundDetail>).detail;
      if (!detail?.id) {
        clearBound();
        return;
      }
      setBound({
        id: detail.id,
        agentName: detail.agentName || null,
        agentProfilePic: detail.agentProfilePic || null,
      });
    };
    window.addEventListener(SUPPORT_SESSION_BOUND_EVENT, onBound);
    return () => window.removeEventListener(SUPPORT_SESSION_BOUND_EVENT, onBound);
  }, [clearBound]);

  const rebindSupportSession = useCallback(async () => {
    if (!featureOn || authLoading || bindInFlightRef.current) return;
    bindInFlightRef.current = true;
    try {
      // Prefer an open support thread; otherwise the most recent fabric thread.
      const [{ session: support }, { session: fabric }] = await Promise.all([
        getActiveLiveSession({ kind: "support" }),
        getActiveLiveSession({ kind: "fabric" }),
      ]);
      const active =
        support?.status === "active" || support?.status === "waiting"
          ? support
          : fabric?.status === "active" || fabric?.status === "waiting"
            ? fabric
            : null;
      if (!active?.id) {
        setBound(null);
        return;
      }

      const kind = active.sessionKind === "fabric" ? "fabric" : "support";
      const name =
        customerName.trim().length >= 2
          ? customerName.trim().slice(0, 80)
          : isAr
            ? "زائر"
            : "Guest";

      const res = await emitWithAck<ChatStartAck>("chat:start", {
        name,
        locale,
        faqHistory: [],
        sessionKind: kind,
        fabricStoreOwnerId:
          kind === "fabric" ? active.fabricStoreOwnerId || undefined : undefined,
        fabricShopId:
          kind === "fabric" ? active.fabricShopId || undefined : undefined,
        fabricStoreName:
          kind === "fabric" ? active.fabricStoreName || undefined : undefined,
      });
      if (!res?.ok || !res.session?.id) {
        // Fall back to known id so call:state still works if room already joined.
        if (active.id) {
          setBound({
            id: active.id,
            agentName:
              kind === "fabric"
                ? active.fabricStoreName || active.agentName || null
                : active.agentName || null,
            agentProfilePic: null,
          });
        }
        return;
      }
      setBound({
        id: res.session.id,
        agentName:
          kind === "fabric"
            ? res.session.fabricStoreName ||
              active.fabricStoreName ||
              res.session.agent?.name ||
              active.agentName ||
              null
            : res.session.agent?.name || active.agentName || null,
        agentProfilePic: res.session.agent?.profilePic || null,
      });
    } catch {
      /* offline / unauthenticated — stay quiet */
    } finally {
      bindInFlightRef.current = false;
    }
  }, [authLoading, customerName, featureOn, isAr, locale]);

  // Bind on mount / when auth settles / live-chat opens, and again on reconnect.
  useEffect(() => {
    if (!featureOn || authLoading) return;
    void rebindSupportSession();

    const socket = getSocket();
    const onConnect = () => {
      void rebindSupportSession();
    };
    socket.on("connect", onConnect);

    // Soft refresh while browsing so presence stays fresh if the tab slept.
    const poll = window.setInterval(() => {
      void rebindSupportSession();
    }, 45_000);

    return () => {
      socket.off("connect", onConnect);
      window.clearInterval(poll);
    };
  }, [authLoading, featureOn, rebindKey, rebindSupportSession]);

  // Keep the socket connected while we have a support session to receive rings.
  useEffect(() => {
    if (!bound?.id) return;
    const socket = getSocket();
    if (!socket.connected) socket.connect();
  }, [bound?.id]);

  const onSessionEnded = useCallback(
    (payload: { sessionId?: string }) => {
      if (!payload?.sessionId || payload.sessionId !== boundIdRef.current) {
        return;
      }
      clearBound();
    },
    [clearBound],
  );

  useSocketEvent("chat:ended", onSessionEnded);
  useSocketEvent("chat:closed", onSessionEnded);

  const audioCall = useAudioCall({
    sessionId: bound?.id || null,
    role: "customer",
    enabled: featureOn && Boolean(bound?.id),
  });

  const peerName = bound?.agentName || "MOTD Care";
  const peerAvatarSrc = bound?.agentProfilePic;
  const peerBrand = !bound?.agentProfilePic && !bound?.agentName;

  const value = useMemo<CustomerAudioCallContextValue>(
    () => ({
      ...audioCall,
      peerName,
      peerAvatarSrc,
      peerBrand,
      isAr,
      chatOpen,
    }),
    [audioCall, peerName, peerAvatarSrc, peerBrand, isAr, chatOpen],
  );

  // Fullscreen only when chatbot is closed (incoming ring / miss notice).
  const showViewportFallback =
    !chatOpen &&
    (audioCall.status === "ringing_in" ||
      (audioCall.status === "idle" && Boolean(audioCall.error)));

  return (
    <CustomerAudioCallContext.Provider value={value}>
      {children}
      {showViewportFallback ? (
        <AudioCallOverlay
          role="customer"
          placement="viewport"
          status={audioCall.status}
          error={audioCall.error}
          muted={audioCall.muted}
          elapsedLabel={audioCall.elapsedLabel}
          networkQuality={audioCall.networkQuality}
          peerName={peerName}
          peerAvatarSrc={peerAvatarSrc}
          peerBrand={peerBrand}
          isAr={isAr}
          onAccept={() => void audioCall.accept()}
          onReject={() => void audioCall.reject()}
          onHangup={() => void audioCall.hangup()}
          onToggleMute={() => audioCall.setMuted(!audioCall.muted)}
          onDismissError={audioCall.clearError}
        />
      ) : null}
    </CustomerAudioCallContext.Provider>
  );
}

/** Mount inside the FAQ chatbot shell — call UI / black bar stay within the widget. */
export function CustomerAudioCallPanelOverlay() {
  const call = useCustomerAudioCall();
  if (!call) return null;

  return (
    <AudioCallOverlay
      role="customer"
      placement="panel"
      status={call.status}
      error={call.error}
      muted={call.muted}
      elapsedLabel={call.elapsedLabel}
      networkQuality={call.networkQuality}
      peerName={call.peerName}
      peerAvatarSrc={call.peerAvatarSrc}
      peerBrand={call.peerBrand}
      isAr={call.isAr}
      onAccept={() => void call.accept()}
      onReject={() => void call.reject()}
      onHangup={() => void call.hangup()}
      onToggleMute={() => call.setMuted(!call.muted)}
      onDismissError={call.clearError}
    />
  );
}
