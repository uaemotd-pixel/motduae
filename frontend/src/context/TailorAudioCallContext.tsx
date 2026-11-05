"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useParams, usePathname } from "next/navigation";
import AudioCallOverlay from "@/components/shared/AudioCallOverlay";
import { useAudioCall } from "@/hooks/useAudioCall";
import { safeClientNavigate } from "@/lib/safeClientNavigate";

export type TailorCallPeer = {
  name?: string | null;
  profilePic?: string | null;
};

type DialTarget = {
  sessionId: string | null;
  canDial: boolean;
  peer?: TailorCallPeer | null;
};

type TailorAudioCallContextValue = ReturnType<typeof useAudioCall> & {
  peer: TailorCallPeer;
  viewingSessionId: string | null;
  setDialTarget: (target: DialTarget) => void;
  setViewingSessionId: (id: string | null) => void;
  pendingOpenSessionId: string | null;
  clearPendingOpenSessionId: () => void;
  returnToCall: () => void;
};

const TailorAudioCallContext =
  createContext<TailorAudioCallContextValue | null>(null);

export function TailorAudioCallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isMessages = pathname.includes("/tailor/messages");

  const [dialSessionId, setDialSessionId] = useState<string | null>(null);
  const [canDial, setCanDial] = useState(false);
  const [peer, setPeer] = useState<TailorCallPeer>({});
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [pendingOpenSessionId, setPendingOpenSessionId] = useState<
    string | null
  >(null);
  const isMessagesRef = useRef(isMessages);
  isMessagesRef.current = isMessages;

  const audioCall = useAudioCall({
    sessionId: dialSessionId,
    role: "agent",
    canDial,
  });

  const setDialTarget = useCallback((target: DialTarget) => {
    setDialSessionId(target.sessionId);
    setCanDial(target.canDial);
    if (target.peer !== undefined) {
      setPeer({
        name: target.peer?.name || null,
        profilePic: target.peer?.profilePic || null,
      });
    }
  }, []);

  const clearPendingOpenSessionId = useCallback(() => {
    setPendingOpenSessionId(null);
  }, []);

  const returnToCall = useCallback(() => {
    const sid = audioCall.callSessionId;
    if (!sid) return;
    setPendingOpenSessionId(sid);
    if (!isMessagesRef.current) {
      safeClientNavigate("/tailor/messages", { locale });
    }
  }, [audioCall.callSessionId, locale]);

  const value = useMemo<TailorAudioCallContextValue>(
    () => ({
      ...audioCall,
      peer,
      viewingSessionId,
      setDialTarget,
      setViewingSessionId,
      pendingOpenSessionId,
      clearPendingOpenSessionId,
      returnToCall,
    }),
    [
      audioCall,
      peer,
      viewingSessionId,
      setDialTarget,
      pendingOpenSessionId,
      clearPendingOpenSessionId,
      returnToCall,
    ],
  );

  return (
    <TailorAudioCallContext.Provider value={value}>
      {children}
    </TailorAudioCallContext.Provider>
  );
}

/** Mount inside tailor portal `<main>` — black call bar spans the portal canvas. */
export function TailorAudioCallChrome() {
  const pathname = usePathname();
  const isMessages = pathname.includes("/tailor/messages");
  const call = useTailorAudioCall();

  const onCallThread = Boolean(
    isMessages &&
      call.callSessionId &&
      call.viewingSessionId === call.callSessionId,
  );

  const forceMinimized = call.status !== "idle" && !onCallThread;

  return (
    <AudioCallOverlay
      role="agent"
      placement="dashboard"
      status={call.status}
      error={call.error}
      muted={call.muted}
      elapsedLabel={call.elapsedLabel}
      networkQuality={call.networkQuality}
      peerName={call.peer.name || "Customer"}
      peerAvatarSrc={call.peer.profilePic}
      forceMinimized={forceMinimized}
      onReturnToCall={call.returnToCall}
      onHangup={() => void call.hangup()}
      onToggleMute={() => call.setMuted(!call.muted)}
      onDismissError={call.clearError}
    />
  );
}

export function useTailorAudioCall() {
  const ctx = useContext(TailorAudioCallContext);
  if (!ctx) {
    throw new Error(
      "useTailorAudioCall must be used within TailorAudioCallProvider",
    );
  }
  return ctx;
}
