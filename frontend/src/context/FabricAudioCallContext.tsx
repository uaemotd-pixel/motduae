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

export type FabricCallPeer = {
  name?: string | null;
  profilePic?: string | null;
};

type DialTarget = {
  sessionId: string | null;
  canDial: boolean;
  peer?: FabricCallPeer | null;
};

type FabricAudioCallContextValue = ReturnType<typeof useAudioCall> & {
  peer: FabricCallPeer;
  viewingSessionId: string | null;
  setDialTarget: (target: DialTarget) => void;
  setViewingSessionId: (id: string | null) => void;
  pendingOpenSessionId: string | null;
  clearPendingOpenSessionId: () => void;
  returnToCall: () => void;
};

const FabricAudioCallContext =
  createContext<FabricAudioCallContextValue | null>(null);

export function FabricAudioCallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isMessages = pathname.includes("/fabric/messages");

  const [dialSessionId, setDialSessionId] = useState<string | null>(null);
  const [canDial, setCanDial] = useState(false);
  const [peer, setPeer] = useState<FabricCallPeer>({});
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
      safeClientNavigate("/fabric/messages", { locale });
    }
  }, [audioCall.callSessionId, locale]);

  const value = useMemo<FabricAudioCallContextValue>(
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
    <FabricAudioCallContext.Provider value={value}>
      {children}
    </FabricAudioCallContext.Provider>
  );
}

/** Mount inside fabric portal `<main>` — black call bar spans the portal canvas. */
export function FabricAudioCallChrome() {
  const pathname = usePathname();
  const isMessages = pathname.includes("/fabric/messages");
  const call = useFabricAudioCall();

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

export function useFabricAudioCall() {
  const ctx = useContext(FabricAudioCallContext);
  if (!ctx) {
    throw new Error(
      "useFabricAudioCall must be used within FabricAudioCallProvider",
    );
  }
  return ctx;
}
