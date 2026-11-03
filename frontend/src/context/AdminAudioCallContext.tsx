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

export type AdminCallPeer = {
  name?: string | null;
  profilePic?: string | null;
};

type DialTarget = {
  sessionId: string | null;
  canDial: boolean;
  peer?: AdminCallPeer | null;
};

type AdminAudioCallContextValue = ReturnType<typeof useAudioCall> & {
  peer: AdminCallPeer;
  viewingSessionId: string | null;
  setDialTarget: (target: DialTarget) => void;
  setViewingSessionId: (id: string | null) => void;
  /** Session the agent should open in Live Chat (set by return-to-call). */
  pendingOpenSessionId: string | null;
  clearPendingOpenSessionId: () => void;
  returnToCall: () => void;
};

const AdminAudioCallContext =
  createContext<AdminAudioCallContextValue | null>(null);

export function AdminAudioCallProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isSupportChat = pathname.includes("/admin/support-chat");

  const [dialSessionId, setDialSessionId] = useState<string | null>(null);
  const [canDial, setCanDial] = useState(false);
  const [peer, setPeer] = useState<AdminCallPeer>({});
  const [viewingSessionId, setViewingSessionId] = useState<string | null>(null);
  const [pendingOpenSessionId, setPendingOpenSessionId] = useState<
    string | null
  >(null);
  const isSupportChatRef = useRef(isSupportChat);
  isSupportChatRef.current = isSupportChat;

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
    if (!isSupportChatRef.current) {
      safeClientNavigate("/admin/support-chat", { locale });
    }
  }, [audioCall.callSessionId, locale]);

  const value = useMemo<AdminAudioCallContextValue>(
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
    <AdminAudioCallContext.Provider value={value}>
      {children}
    </AdminAudioCallContext.Provider>
  );
}

/** Mount inside admin `<main>` — black call bar spans the whole dashboard canvas. */
export function AdminAudioCallChrome() {
  const pathname = usePathname();
  const isSupportChat = pathname.includes("/admin/support-chat");
  const call = useAdminAudioCall();

  const onCallThread = Boolean(
    isSupportChat &&
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

export function useAdminAudioCall() {
  const ctx = useContext(AdminAudioCallContext);
  if (!ctx) {
    throw new Error(
      "useAdminAudioCall must be used within AdminAudioCallProvider",
    );
  }
  return ctx;
}
