"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type CSSProperties,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowLeft,
  Ban,
  CheckSquare,
  Eraser,
  Headphones,
  Info,
  Mic,
  MessageSquare,
  MoreVertical,
  Palette,
  Paperclip,
  PenLine,
  Phone,
  PhoneOff,
  RefreshCw,
  Search,
  Send,
  Smile,
  Trash2,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import ChatThreadSearchBar from "@/components/shared/ChatThreadSearchBar";
import ChatSearchHighlight from "@/components/shared/ChatSearchHighlight";
import { findThreadMatchIds } from "@/lib/chat/threadSearch";
import { motion } from "framer-motion";
import type { Socket } from "socket.io-client";
import {
  disconnectSocket,
  emitWithAck,
  getSocket,
  useSocketEvent,
} from "@/lib/realtime/socket";
import MessageStatusTicks, {
  type MessageDeliveryStatus,
} from "@/components/shared/MessageStatusTicks";
import ChatTypingBubble from "@/components/shared/ChatTypingBubble";
import VoiceNoteBubble from "@/components/shared/VoiceNoteBubble";
import ChatAttachMenu, {
  type ChatAttachMenuAction,
} from "@/components/shared/ChatAttachMenu";
import ChatAttachmentBubble from "@/components/shared/ChatAttachmentBubble";
import ChatComposerAttachPreview from "@/components/shared/ChatComposerAttachPreview";
import ChatEmojiPicker from "@/components/shared/ChatEmojiPicker";
import ChatMessageMenu, {
  type ChatMessageMenuAction,
} from "@/components/shared/ChatMessageMenu";
import ChatAvatar from "@/components/shared/ChatAvatar";
import {
  formatRecordingTime,
  useVoiceRecorder,
} from "@/hooks/useVoiceRecorder";
import {
  attachmentErrorMessage,
  AUDIO_ACCEPT,
  FILE_ACCEPT,
  IMAGE_ACCEPT,
  prepareChatAttachment,
  VIDEO_ACCEPT,
  type ChatAttachKind,
  type PreparedChatAttachment,
} from "@/lib/chat/attachments";

type ChatReplyTo = {
  id: string;
  role: "customer" | "agent" | "system";
  kind?: "text" | "voice" | "image" | "file";
  text: string;
  senderName?: string;
};

type ChatMessage = {
  id: string;
  role: "customer" | "agent" | "system";
  kind?: "text" | "voice" | "image" | "file";
  text: string;
  caption?: string;
  audio?: string;
  durationMs?: number;
  data?: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  attachmentKind?: "image" | "file";
  at: string;
  senderName?: string;
  status?: MessageDeliveryStatus;
  deleted?: boolean;
  deletedBy?: "customer" | "agent" | null;
  replyTo?: ChatReplyTo | null;
  editedAt?: string | null;
};

function replyPreviewOf(msg: ChatMessage) {
  if (msg.deleted) return "Deleted message";
  if (msg.kind === "voice") return "Voice message";
  if (msg.kind === "image") return "Photo";
  if (msg.kind === "file") return msg.fileName || "Document";
  return (msg.caption || msg.text || "").trim();
}

type LiveSessionSummary = {
  id: string;
  customer: {
    name: string;
    email?: string;
    kind?: string;
    profilePic?: string;
  };
  agent: { name: string; userId?: string; profilePic?: string } | null;
  status: "waiting" | "active" | "ended";
  locale?: string;
  messageCount: number;
  /** Customer messages the agent has not marked read yet. */
  unreadCount?: number;
  lastActivityAt: number;
  preview: ChatMessage | null;
  endedBy?: "customer" | "agent" | null;
};

type LiveSession = LiveSessionSummary & {
  messages: ChatMessage[];
};

type AckResult = {
  ok: boolean;
  error?: string;
  sessions?: LiveSessionSummary[];
  session?: LiveSession;
  message?: ChatMessage;
  endedBy?: "customer" | "agent";
};

type InboxFilter = "all" | "waiting" | "active" | "ended";

type HeaderPanel = "contact" | "theme" | "block" | "call" | null;

type ConfirmAction = "clear" | "deleteAll" | "deleteForMe" | null;

const INBOX_WIDTH_KEY = "motd-admin-livechat-inbox-width";
const INBOX_MIN = 280;
const INBOX_MAX = 560;
const INBOX_DEFAULT = 380;

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("en-AE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function formatListTime(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString("en-AE", { hour: "2-digit", minute: "2-digit" });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate()
  ) {
    return "Yesterday";
  }
  return d.toLocaleDateString("en-AE", { day: "numeric", month: "short" });
}

function kindLabel(kind?: string) {
  if (kind === "registered") return "Customer";
  if (kind === "guest") return "Guest";
  return "Visitor";
}

function readInboxWidth() {
  if (typeof window === "undefined") return INBOX_DEFAULT;
  try {
    const raw = Number(localStorage.getItem(INBOX_WIDTH_KEY));
    if (Number.isFinite(raw) && raw >= INBOX_MIN && raw <= INBOX_MAX) {
      return Math.round(raw);
    }
  } catch {
    // ignore
  }
  return INBOX_DEFAULT;
}

function SessionRow({
  session,
  selected,
  onSelect,
}: {
  session: LiveSessionSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  const waiting = session.status === "waiting";
  const ended = session.status === "ended";
  const unread = Math.max(0, Number(session.unreadCount) || 0);
  const hasUnread = unread > 0 && !selected;
  const preview =
    session.preview?.kind === "voice"
      ? "Voice message"
      : session.preview?.kind === "image"
        ? "Photo"
        : session.preview?.kind === "file"
          ? session.preview.fileName || "Document"
          : session.preview?.text ||
            (waiting
              ? "Waiting for an agent…"
              : ended
                ? "Chat ended — can continue"
                : "Conversation in progress");

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 px-3 py-3 text-start transition hover:cursor-pointer ${
        selected ? "bg-[#F0EEE8]" : "bg-white hover:bg-[#F7F5F0]"
      }`}
    >
      <ChatAvatar
        name={session.customer?.name || "Visitor"}
        src={session.customer?.profilePic}
        size="lg"
        online={!waiting && !ended}
        className={
          waiting
            ? "ring-2 ring-amber-400/80"
            : ended
              ? "opacity-80"
              : undefined
        }
      />

      <span className="min-w-0 flex-1 border-b border-[#E8E8E4] pb-3">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={`truncate text-[15px] text-black [font-family:var(--font-body)] ${
              hasUnread ? "font-semibold" : ""
            }`}
          >
            {session.customer?.name || "Visitor"}
          </span>
          <span
            className={`shrink-0 text-[11px] tabular-nums [font-family:var(--font-ui)] ${
              hasUnread
                ? "font-medium text-black"
                : waiting
                  ? "text-amber-700"
                  : "text-[#8A8A80]"
            }`}
          >
            {formatListTime(session.lastActivityAt)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {!waiting && session.preview?.role === "agent" && !hasUnread ? (
            <MessageStatusTicks status={session.preview?.status || "sent"} />
          ) : null}
          <span
            className={`min-w-0 flex-1 truncate text-[13px] [font-family:var(--font-body)] ${
              hasUnread
                ? "font-medium text-[#111111]"
                : "text-[#8A8A80]"
            }`}
          >
            {preview}
          </span>
          {hasUnread ? (
            <span
              aria-label={`${unread > 99 ? "99+" : unread} unread`}
              className="ms-auto flex h-[1.25rem] min-w-[1.25rem] shrink-0 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-semibold leading-none text-white tabular-nums [font-family:var(--font-ui)]"
            >
              {unread > 99 ? "99+" : unread}
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

export default function AdminSupportChatPage() {
  const [sessions, setSessions] = useState<LiveSessionSummary[]>([]);
  const [active, setActive] = useState<LiveSession | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  /** Soft notice above the composer (wrong format, size, mic). */
  const [attachNotice, setAttachNotice] = useState("");
  const [connected, setConnected] = useState(false);
  const [inboxWidth, setInboxWidth] = useState(INBOX_DEFAULT);
  const [resizing, setResizing] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [chatEndedBy, setChatEndedBy] = useState<"customer" | "agent" | null>(
    null,
  );
  const [restarting, setRestarting] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ChatReplyTo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<ChatMessage | null>(null);
  const [copyToast, setCopyToast] = useState("");
  const [copyToastShown, setCopyToastShown] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [headerPanel, setHeaderPanel] = useState<HeaderPanel>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const threadSearchInputRef = useRef<HTMLInputElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const searchQuery = threadSearch.trim();
  const matchIds = useMemo(
    () => findThreadMatchIds(active?.messages || [], searchQuery),
    [active?.messages, searchQuery],
  );
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const splitRef = useRef<HTMLDivElement>(null);
  const activeIdRef = useRef<string | null>(null);
  const draftRef = useRef("");
  const sendingRef = useRef(false);
  const endingRef = useRef(false);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const amTypingRef = useRef(false);
  const voice = useVoiceRecorder();
  const hasDraft = draft.trim().length > 0;
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PreparedChatAttachment | null>(null);
  const pendingAttachmentRef = useRef<PreparedChatAttachment | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const canSend = hasDraft || !!pendingAttachment;

  const clearPendingAttachment = useCallback(() => {
    pendingAttachmentRef.current = null;
    setPendingAttachment(null);
  }, []);

  useEffect(() => {
    setInboxWidth(readInboxWidth());
  }, []);

  useEffect(() => {
    if (!attachNotice) return;
    const t = window.setTimeout(() => setAttachNotice(""), 4000);
    return () => window.clearTimeout(t);
  }, [attachNotice]);

  useEffect(() => {
    if (!copyToast) return;
    setCopyToastShown(true);
    const fade = window.setTimeout(() => setCopyToastShown(false), 2200);
    const clear = window.setTimeout(() => setCopyToast(""), 2800);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(clear);
    };
  }, [copyToast]);

  useEffect(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setHeaderPanel(null);
    setConfirmAction(null);
    setThreadSearchOpen(false);
    setThreadSearch("");
    setActiveMatchIndex(0);
    setAttachNotice("");
  }, [active?.id]);

  useEffect(() => {
    if (!threadSearchOpen) return;
    window.setTimeout(() => threadSearchInputRef.current?.focus(), 40);
  }, [threadSearchOpen]);

  useEffect(() => {
    setActiveMatchIndex(matchIds.length > 0 ? matchIds.length - 1 : 0);
  }, [searchQuery, matchIds.length]);

  useEffect(() => {
    if (!threadSearchOpen || !searchQuery || matchIds.length === 0) return;
    const safeIndex = Math.min(activeMatchIndex, matchIds.length - 1);
    const id = matchIds[safeIndex];
    if (!id) return;
    const el = threadRef.current?.querySelector(
      `[data-msg-id="${id.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`,
    );
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeMatchIndex, matchIds, threadSearchOpen, searchQuery]);

  const goPrevMatch = useCallback(() => {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((i) => (i <= 0 ? matchIds.length - 1 : i - 1));
  }, [matchIds.length]);

  const goNextMatch = useCallback(() => {
    if (matchIds.length === 0) return;
    setActiveMatchIndex((i) => (i >= matchIds.length - 1 ? 0 : i + 1));
  }, [matchIds.length]);

  const closeThreadSearch = useCallback(() => {
    setThreadSearchOpen(false);
    setThreadSearch("");
    setActiveMatchIndex(0);
  }, []);

  useEffect(() => {
    activeIdRef.current = active?.id ?? null;
  }, [active?.id]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    sendingRef.current = sending;
  }, [sending]);

  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [active?.id, active?.messages?.length, chatEndedBy, peerTyping]);

  const emitTyping = useCallback((typing: boolean) => {
    const sessionId = activeIdRef.current;
    if (!sessionId) return;
    if (amTypingRef.current === typing) return;
    amTypingRef.current = typing;
    getSocket().emit("chat:typing", { sessionId, typing });
  }, []);

  const onDraftChange = (value: string) => {
    setDraft(value);
    draftRef.current = value;
    if (chatEndedBy) return;
    if (value.trim()) {
      emitTyping(true);
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      typingIdleRef.current = setTimeout(() => emitTyping(false), 1400);
    } else {
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      emitTyping(false);
    }
  };

  useEffect(() => {
    setHeaderMenuOpen(false);
  }, [active?.id, chatEndedBy]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!headerMenuRef.current?.contains(e.target as Node)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [headerMenuOpen]);

  const refreshInbox = useCallback(async () => {
    try {
      const res = await emitWithAck<AckResult>("inbox:list");
      if (res?.ok && Array.isArray(res.sessions)) {
        setSessions(res.sessions);
        setError("");
        return;
      }
      if (res?.error === "forbidden") {
        setError("Staff access required for live chat.");
        return;
      }
      setError("Could not load inbox.");
    } catch {
      setError("Could not load inbox.");
    }
  }, []);

  useEffect(() => {
    const socket = getSocket();
    let alive = true;
    const effectId = Symbol("support-chat");
    (
      getSocket() as Socket & { __supportChatEffect?: symbol }
    ).__supportChatEffect = effectId;

    const onConnect = () => {
      if (!alive) return;
      setConnected(true);
      setError("");
      void refreshInbox();
    };
    const onDisconnect = () => {
      if (!alive) return;
      setConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) onConnect();
    else socket.connect();

    return () => {
      alive = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      window.setTimeout(() => {
        const s = getSocket() as Socket & { __supportChatEffect?: symbol };
        if (s.__supportChatEffect === effectId) {
          s.__supportChatEffect = undefined;
          disconnectSocket();
        }
      }, 400);
    };
  }, [refreshInbox]);

  const onInboxUpdated = useCallback((list: LiveSessionSummary[]) => {
    if (!Array.isArray(list)) return;
    setSessions(list);
    // Keep open thread avatar in sync when inbox backfills profilePic.
    setActive((prev) => {
      if (!prev) return prev;
      const row = list.find((s) => s.id === prev.id);
      if (!row?.customer) return prev;
      const nextPic = row.customer.profilePic || "";
      const curPic = prev.customer?.profilePic || "";
      if (!nextPic || nextPic === curPic) return prev;
      return {
        ...prev,
        customer: { ...prev.customer, ...row.customer },
      };
    });
  }, []);

  const markCustomerMessagesRead = useCallback((sessionId: string) => {
    const socket = getSocket();
    if (!socket.connected) return;
    socket.emit("chat:read", { sessionId });
  }, []);

  const onMessage = useCallback(
    (payload: { sessionId: string; message: ChatMessage }) => {
      if (payload.sessionId !== activeIdRef.current) return;
      setPeerTyping(false);
      setActive((prev) => {
        if (!prev || prev.id !== payload.sessionId) return prev;
        if (prev.messages.some((m) => m.id === payload.message.id)) return prev;
        return { ...prev, messages: [...prev.messages, payload.message] };
      });

      // Customer message arrived while this thread is open → delivered + read.
      if (payload.message.role === "customer") {
        const socket = getSocket();
        socket.emit("chat:delivered", {
          sessionId: payload.sessionId,
          messageId: payload.message.id,
        });
        socket.emit("chat:read", { sessionId: payload.sessionId });
      }
    },
    [],
  );

  const onTyping = useCallback(
    (payload: {
      sessionId: string;
      typing: boolean;
      from?: "agent" | "customer";
    }) => {
      if (payload.sessionId !== activeIdRef.current) return;
      if (payload.from && payload.from !== "customer") return;
      setPeerTyping(Boolean(payload.typing));
    },
    [],
  );

  const onStatus = useCallback(
    (payload: {
      sessionId: string;
      messages: { id: string; status: MessageDeliveryStatus }[];
    }) => {
      if (!payload?.messages?.length) return;
      const map = new Map(payload.messages.map((m) => [m.id, m.status]));

      // Update open thread bubbles.
      if (payload.sessionId === activeIdRef.current) {
        setActive((prev) => {
          if (!prev || prev.id !== payload.sessionId) return prev;
          return {
            ...prev,
            messages: prev.messages.map((m) =>
              map.has(m.id) ? { ...m, status: map.get(m.id) } : m,
            ),
          };
        });
      }

      // Update inbox row ticks when the preview message status changes.
      setSessions((prev) =>
        prev.map((s) => {
          if (s.id !== payload.sessionId || !s.preview) return s;
          const nextStatus = map.get(s.preview.id);
          if (!nextStatus || s.preview.status === nextStatus) return s;
          return {
            ...s,
            preview: { ...s.preview, status: nextStatus },
          };
        }),
      );
    },
    [],
  );

  const onEnded = useCallback(
    (payload: { sessionId: string; endedBy?: "customer" | "agent" }) => {
      const who = payload.endedBy === "agent" ? "agent" : "customer";
      setSessions((prev) =>
        prev.map((s) =>
          s.id === payload.sessionId
            ? { ...s, status: "ended", endedBy: who }
            : s,
        ),
      );
      if (activeIdRef.current !== payload.sessionId) return;
      setPeerTyping(false);
      emitTyping(false);
      endingRef.current = false;
      setChatEndedBy(who);
      setActive((prev) =>
        prev && prev.id === payload.sessionId
          ? { ...prev, status: "ended", endedBy: who }
          : prev,
      );
      setDraft("");
      draftRef.current = "";
    },
    [emitTyping],
  );

  const onRestarted = useCallback((payload: { session: LiveSession }) => {
    if (!payload?.session) return;
    if (
      activeIdRef.current &&
      payload.session.id !== activeIdRef.current
    ) {
      return;
    }
    activeIdRef.current = payload.session.id;
    endingRef.current = false;
    setActive(payload.session);
    setChatEndedBy(null);
    setRestarting(false);
    setPeerTyping(false);
    setSessions((prev) => {
      const others = prev.filter((s) => s.id !== payload.session.id);
      return [
        {
          id: payload.session.id,
          customer: payload.session.customer,
          agent: payload.session.agent,
          status: payload.session.status,
          locale: payload.session.locale,
          messageCount: payload.session.messages?.length || 0,
          unreadCount: 0,
          lastActivityAt: payload.session.lastActivityAt,
          endedBy: null,
          preview:
            payload.session.messages?.[payload.session.messages.length - 1] ||
            null,
        },
        ...others,
      ];
    });
  }, []);

  const onClosed = useCallback((payload: { sessionId: string }) => {
    setSessions((prev) => prev.filter((s) => s.id !== payload.sessionId));
    if (activeIdRef.current !== payload.sessionId) return;
    setActive(null);
    setChatEndedBy(null);
    setDraft("");
    draftRef.current = "";
    activeIdRef.current = null;
  }, []);

  const onCleared = useCallback((payload: { sessionId: string }) => {
    if (activeIdRef.current !== payload.sessionId) return;
    setActive((prev) =>
      prev && prev.id === payload.sessionId
        ? { ...prev, messages: [] }
        : prev,
    );
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const onMessagesDeleted = useCallback(
    (payload: {
      sessionId: string;
      messageIds?: string[];
      deletedBy?: "customer" | "agent";
      session?: LiveSession;
    }) => {
      if (activeIdRef.current !== payload.sessionId) return;
      if (payload.session) {
        setActive(payload.session);
      } else if (payload.messageIds?.length) {
        const removed = new Set(payload.messageIds);
        const by = payload.deletedBy === "customer" ? "customer" : "agent";
        setActive((prev) =>
          prev && prev.id === payload.sessionId
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  removed.has(m.id)
                    ? {
                        ...m,
                        kind: "text",
                        text: "",
                        caption: undefined,
                        audio: undefined,
                        data: undefined,
                        deleted: true,
                        deletedBy: by,
                      }
                    : m,
                ),
              }
            : prev,
        );
      }
      setSelectMode(false);
      setSelectedIds(new Set());
      setConfirmAction(null);
    },
    [],
  );

  const onMessagesHidden = useCallback(
    (payload: { sessionId: string; messageIds?: string[] }) => {
      if (activeIdRef.current !== payload.sessionId) return;
      if (!payload.messageIds?.length) return;
      const hidden = new Set(payload.messageIds);
      setActive((prev) =>
        prev && prev.id === payload.sessionId
          ? {
              ...prev,
              messages: prev.messages.filter((m) => !hidden.has(m.id)),
            }
          : prev,
      );
      setSelectMode(false);
      setSelectedIds(new Set());
      setConfirmAction(null);
    },
    [],
  );

  const onMessageEdited = useCallback(
    (payload: { sessionId: string; message?: ChatMessage }) => {
      if (activeIdRef.current !== payload.sessionId || !payload.message) return;
      const next = payload.message;
      setActive((prev) =>
        prev && prev.id === payload.sessionId
          ? {
              ...prev,
              messages: prev.messages.some((m) => m.id === next.id)
                ? prev.messages.map((m) =>
                    m.id === next.id ? { ...m, ...next } : m,
                  )
                : [...prev.messages, next],
            }
          : prev,
      );
      setEditingId((id) => (id === next.id ? null : id));
    },
    [],
  );

  useSocketEvent("inbox:updated", onInboxUpdated);
  useSocketEvent("chat:message", onMessage);
  useSocketEvent("chat:typing", onTyping);
  useSocketEvent("chat:status", onStatus);
  useSocketEvent("chat:ended", onEnded);
  useSocketEvent("chat:restarted", onRestarted);
  useSocketEvent("chat:closed", onClosed);
  useSocketEvent("chat:cleared", onCleared);
  useSocketEvent("chat:messages-deleted", onMessagesDeleted);
  useSocketEvent("chat:messages-hidden", onMessagesHidden);
  useSocketEvent("chat:message-edited", onMessageEdited);

  const openSession = async (summary: LiveSessionSummary) => {
    voice.cancel();
    clearPendingAttachment();
    setAttachOpen(false);
    setError("");
    setChatEndedBy(null);
    setPeerTyping(false);
    emitTyping(false);
    // Optimistic WhatsApp-style clear — server confirms via chat:read + inbox:updated.
    setSessions((prev) =>
      prev.map((s) =>
        s.id === summary.id ? { ...s, unreadCount: 0 } : s,
      ),
    );
    try {
      if (summary.status === "waiting") {
        const res = await emitWithAck<AckResult>("chat:accept", {
          sessionId: summary.id,
        });
        if (!res?.ok || !res.session) {
          if (res?.error === "already_accepted") {
            const join = await emitWithAck<AckResult>("chat:join", {
              sessionId: summary.id,
            });
            if (join?.ok && join.session) {
              activeIdRef.current = join.session.id;
              setActive(join.session);
              setChatEndedBy(
                join.session.status === "ended"
                  ? join.session.endedBy === "customer"
                    ? "customer"
                    : "agent"
                  : null,
              );
              markCustomerMessagesRead(join.session.id);
              window.setTimeout(() => composerRef.current?.focus(), 80);
              return;
            }
          }
          setError("Could not accept this chat.");
          void refreshInbox();
          return;
        }
        activeIdRef.current = res.session.id;
        setActive(res.session);
        setChatEndedBy(null);
        markCustomerMessagesRead(res.session.id);
        window.setTimeout(() => composerRef.current?.focus(), 80);
        return;
      }

      const join = await emitWithAck<AckResult>("chat:join", {
        sessionId: summary.id,
      });
      if (!join?.ok || !join.session) {
        setError("Could not open this chat.");
        return;
      }
      activeIdRef.current = join.session.id;
      setActive(join.session);
      setChatEndedBy(
        join.session.status === "ended"
          ? join.session.endedBy === "customer"
            ? "customer"
            : "agent"
          : null,
      );
      markCustomerMessagesRead(join.session.id);
      window.setTimeout(() => composerRef.current?.focus(), 80);
    } catch {
      setError("Connection error.");
    }
  };

  const clearReplyAndEdit = useCallback(() => {
    setReplyTo(null);
    setEditingId(null);
  }, []);

  const onMessageMenuAction = useCallback(
    async (msg: ChatMessage, action: ChatMessageMenuAction, mine: boolean) => {
      if (action === "reply") {
        setEditingId(null);
        setReplyTo({
          id: msg.id,
          role: msg.role,
          kind: msg.kind || "text",
          text: replyPreviewOf(msg),
          senderName: msg.senderName,
        });
        window.setTimeout(() => composerRef.current?.focus(), 0);
        return;
      }
      if (action === "edit") {
        if (!mine) return;
        setReplyTo(null);
        setEditingId(msg.id);
        const next = msg.caption || msg.text || "";
        setDraft(next);
        draftRef.current = next;
        window.setTimeout(() => composerRef.current?.focus(), 0);
        return;
      }
      if (action === "copy") {
        const text = (msg.caption || msg.text || "").trim();
        if (!text) return;
        try {
          await navigator.clipboard.writeText(text);
          setCopyToast("Copied");
        } catch {
          setAttachNotice("Could not copy message.");
        }
        return;
      }
      if (action === "info") {
        setInfoMsg(msg);
        return;
      }
      if (action === "select") {
        setSelectMode(true);
        setSelectedIds(new Set([msg.id]));
        return;
      }
      if (action === "delete") {
        setSelectedIds(new Set([msg.id]));
        setConfirmAction("deleteForMe");
      }
    },
    [],
  );

  const sendMessage = useCallback(async () => {
    const sessionId = activeIdRef.current;
    const text = draftRef.current.trim();
    const attachment = pendingAttachmentRef.current;
    if (
      !sessionId ||
      sendingRef.current ||
      (!text && !attachment) ||
      chatEndedBy ||
      voice.recording
    ) {
      return;
    }

    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    emitTyping(false);

    sendingRef.current = true;
    setSending(true);
    setDraft("");
    draftRef.current = "";
    clearPendingAttachment();
    const replyToId = replyTo?.id;
    const editId = editingId;
    setReplyTo(null);
    setEditingId(null);

    try {
      if (editId) {
        const res = await emitWithAck<AckResult>("chat:edit", {
          sessionId,
          messageId: editId,
          text,
        });
        if (!res?.ok) {
          setDraft(text);
          draftRef.current = text;
          setEditingId(editId);
        } else {
          window.setTimeout(() => composerRef.current?.focus(), 0);
        }
        return;
      }
      const res = await emitWithAck<AckResult>(
        "chat:send",
        attachment
          ? {
              sessionId,
              kind: attachment.kind,
              text,
              data: attachment.data,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
              replyToId,
            }
          : { sessionId, text, replyToId },
      );
      if (!res?.ok) {
        setDraft(text);
        draftRef.current = text;
        if (attachment) {
          pendingAttachmentRef.current = attachment;
          setPendingAttachment(attachment);
        }
      } else {
        window.setTimeout(() => composerRef.current?.focus(), 0);
      }
    } catch {
      setDraft(text);
      draftRef.current = text;
      if (editId) setEditingId(editId);
      if (attachment) {
        pendingAttachmentRef.current = attachment;
        setPendingAttachment(attachment);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [
    chatEndedBy,
    clearPendingAttachment,
    editingId,
    emitTyping,
    replyTo?.id,
    voice.recording,
  ]);

  const startVoiceNote = useCallback(async () => {
    if (
      !activeIdRef.current ||
      sendingRef.current ||
      voice.recording ||
      chatEndedBy ||
      draftRef.current.trim()
    ) {
      return;
    }
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    emitTyping(false);
    const result = await voice.start();
    if (result === "mic_denied") {
      setAttachNotice("Please allow microphone access to send voice notes.");
    }
  }, [chatEndedBy, emitTyping, voice.recording, voice.start]);

  const cancelVoiceNote = useCallback(() => {
    voice.cancel();
  }, [voice.cancel]);

  const sendVoiceNote = useCallback(async () => {
    const sessionId = activeIdRef.current;
    if (!sessionId || sendingRef.current || chatEndedBy) return;
    const attachment = pendingAttachmentRef.current;

    sendingRef.current = true;
    setSending(true);
    try {
      const clip = await voice.stop();
      if (!clip) return;
      clearPendingAttachment();
      const res = await emitWithAck<AckResult>("chat:send", {
        sessionId,
        kind: "voice",
        audio: clip.audio,
        durationMs: clip.durationMs,
        ...(attachment
          ? {
              attachmentKind: attachment.kind,
              data: attachment.data,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
            }
          : {}),
      });
      if (!res?.ok && attachment) {
        pendingAttachmentRef.current = attachment;
        setPendingAttachment(attachment);
      }
    } catch {
      if (attachment) {
        pendingAttachmentRef.current = attachment;
        setPendingAttachment(attachment);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [chatEndedBy, clearPendingAttachment, voice.stop]);

  const stageAttachment = useCallback(
    async (file: File, kind: ChatAttachKind) => {
      const sessionId = activeIdRef.current;
      if (!sessionId || sendingRef.current || chatEndedBy || voice.recording) {
        return;
      }
      const prepared = await prepareChatAttachment(file, kind);
      if (!prepared.ok) {
        setAttachNotice(
          attachmentErrorMessage(prepared.error, false, {
            kind,
            fileName: file.name,
          }),
        );
        return;
      }
      setAttachNotice("");
      setAttachOpen(false);
      pendingAttachmentRef.current = prepared.attachment;
      setPendingAttachment(prepared.attachment);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    },
    [chatEndedBy, voice.recording],
  );

  const onAttachFileChange = (
    e: ChangeEvent<HTMLInputElement>,
    kind: ChatAttachKind,
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void stageAttachment(file, kind);
  };

  const onAttachMenuPick = (action: ChatAttachMenuAction) => {
    if (action === "document") fileInputRef.current?.click();
    else if (action === "photos") imageInputRef.current?.click();
    else if (action === "video") videoInputRef.current?.click();
    else if (action === "audio") audioInputRef.current?.click();
  };

  /** Leave the open conversation pane only — session stays live in the inbox. */
  const closeChatWindow = () => {
    voice.cancel();
    clearPendingAttachment();
    setAttachNotice("");
    setAttachOpen(false);
    setHeaderMenuOpen(false);
    endingRef.current = false;
    setSelectMode(false);
    setSelectedIds(new Set());
    setHeaderPanel(null);
    setConfirmAction(null);
    setPeerTyping(false);
    emitTyping(false);
    setActive(null);
    setDraft("");
    draftRef.current = "";
    setChatEndedBy(null);
    activeIdRef.current = null;
  };

  // Esc closes overlays first, then the open chat window (same as Close chat).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (confirmAction) {
        setConfirmAction(null);
        return;
      }
      if (headerPanel) {
        setHeaderPanel(null);
        return;
      }
      if (headerMenuOpen) {
        setHeaderMenuOpen(false);
        return;
      }
      if (emojiOpen) {
        setEmojiOpen(false);
        return;
      }
      if (attachOpen) {
        setAttachOpen(false);
        return;
      }
      if (selectMode) {
        setSelectMode(false);
        setSelectedIds(new Set());
        return;
      }
      if (threadSearchOpen) {
        setThreadSearchOpen(false);
        setThreadSearch("");
        return;
      }
      closeChatWindow();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    active,
    confirmAction,
    headerPanel,
    headerMenuOpen,
    attachOpen,
    emojiOpen,
    selectMode,
    threadSearchOpen,
  ]);

  const toggleSelectMessage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearChatMessages = async () => {
    const sessionId = active?.id || activeIdRef.current;
    if (!sessionId) return;
    try {
      const res = await emitWithAck<AckResult>("chat:clear", { sessionId });
      if (!res?.ok) {
        setError("Could not clear this chat.");
        return;
      }
      setActive((prev) =>
        prev && prev.id === sessionId ? { ...prev, messages: [] } : prev,
      );
      setSelectMode(false);
      setSelectedIds(new Set());
      setConfirmAction(null);
      void refreshInbox();
    } catch {
      setError("Could not clear this chat. Check your connection.");
    }
  };

  const selectedHasOthers = [...selectedIds].some((id) => {
    const msg = active?.messages?.find((m) => m.id === id);
    return Boolean(msg && msg.role !== "agent");
  });

  const requestDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (selectedHasOthers) {
      setConfirmAction("deleteForMe");
      return;
    }
    void runDeleteSelected();
  };

  const runDeleteSelected = async () => {
    const sessionId = active?.id || activeIdRef.current;
    if (!sessionId || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setConfirmAction(null);
    try {
      const res = await emitWithAck<
        AckResult & { mineIds?: string[]; otherIds?: string[] }
      >("chat:delete-messages", {
        sessionId,
        messageIds: ids,
      });
      if (!res?.ok) {
        setError("Could not delete messages.");
        return;
      }
      if (res.session) {
        setActive(res.session);
      } else {
        const mine = new Set(res.mineIds || []);
        const others = new Set(res.otherIds || []);
        setActive((prev) =>
          prev && prev.id === sessionId
            ? {
                ...prev,
                messages: prev.messages
                  .filter((m) => !others.has(m.id))
                  .map((m) =>
                    mine.has(m.id)
                      ? {
                          ...m,
                          kind: "text" as const,
                          text: "",
                          caption: undefined,
                          audio: undefined,
                          data: undefined,
                          deleted: true,
                          deletedBy: "agent" as const,
                        }
                      : m,
                  ),
              }
            : prev,
        );
      }
      setSelectMode(false);
      setSelectedIds(new Set());
      void refreshInbox();
    } catch {
      setError("Could not delete messages. Check your connection.");
    }
  };

  const runConfirmAction = () => {
    if (confirmAction === "clear" || confirmAction === "deleteAll") {
      void clearChatMessages();
    } else if (confirmAction === "deleteForMe") {
      void runDeleteSelected();
    }
  };

  const endChat = async () => {
    const sessionId = active?.id || activeIdRef.current;
    if (!sessionId || chatEndedBy || endingRef.current) return;
    endingRef.current = true;
    activeIdRef.current = sessionId;
    voice.cancel();
    clearPendingAttachment();
    setAttachOpen(false);
    setHeaderMenuOpen(false);
    setError("");

    // Optimistic UI — pause the thread; history stays in Mongo / inbox.
    setPeerTyping(false);
    emitTyping(false);
    setChatEndedBy("agent");
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, status: "ended", endedBy: "agent" } : s,
      ),
    );
    setActive((prev) =>
      prev && prev.id === sessionId
        ? { ...prev, status: "ended", endedBy: "agent" }
        : prev,
    );
    setDraft("");
    draftRef.current = "";

    try {
      const res = await emitWithAck<AckResult>("chat:end", { sessionId }, 15000);
      if (!res?.ok) {
        endingRef.current = false;
        setChatEndedBy(null);
        setError(
          res?.error === "forbidden"
            ? "Could not end this chat."
            : "Could not end this chat. Please try again.",
        );
        void refreshInbox();
        return;
      }
      setChatEndedBy(res.endedBy === "customer" ? "customer" : "agent");
      endingRef.current = false;
    } catch {
      endingRef.current = false;
      setChatEndedBy(null);
      setError("Could not end this chat. Check your connection.");
      void refreshInbox();
    }
  };

  const restartChat = async () => {
    const sessionId = activeIdRef.current;
    if (!sessionId || !chatEndedBy || restarting) return;
    setRestarting(true);
    try {
      const res = await emitWithAck<AckResult>("chat:restart", { sessionId });
      if (!res?.ok || !res.session) {
        setRestarting(false);
        return;
      }
      onRestarted({ session: res.session });
    } catch {
      setRestarting(false);
    }
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    e.stopPropagation();
    void sendMessage();
  };

  const onComposerSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendMessage();
  };

  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const split = splitRef.current;
    if (!split) return;

    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);
    setResizing(true);

    const onMove = (ev: PointerEvent) => {
      const rect = split.getBoundingClientRect();
      const maxForPane = Math.min(INBOX_MAX, Math.floor(rect.width * 0.55));
      const next = Math.min(
        maxForPane,
        Math.max(INBOX_MIN, ev.clientX - rect.left),
      );
      setInboxWidth(Math.round(next));
    };

    const onUp = (ev: PointerEvent) => {
      handle.releasePointerCapture(ev.pointerId);
      handle.removeEventListener("pointermove", onMove);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      setResizing(false);
      setInboxWidth((w) => {
        try {
          localStorage.setItem(INBOX_WIDTH_KEY, String(w));
        } catch {
          // ignore
        }
        return w;
      });
    };

    handle.addEventListener("pointermove", onMove);
    handle.addEventListener("pointerup", onUp);
    handle.addEventListener("pointercancel", onUp);
  };

  const waitingCount = sessions.filter((s) => s.status === "waiting").length;
  const activeCount = sessions.filter((s) => s.status === "active").length;
  const endedCount = sessions.filter((s) => s.status === "ended").length;

  const filteredSessions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sessions
      .filter((s) => {
        if (filter === "waiting" && s.status !== "waiting") return false;
        if (filter === "active" && s.status !== "active") return false;
        if (filter === "ended" && s.status !== "ended") return false;
        if (!q) return true;
        const hay = [
          s.customer?.name,
          s.customer?.email,
          s.customer?.kind,
          s.preview?.text,
          s.agent?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => {
        if (a.status !== b.status) {
          const rank = { waiting: 0, active: 1, ended: 2 } as const;
          return (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
        }
        return b.lastActivityAt - a.lastActivityAt;
      });
  }, [sessions, filter, search]);

  const filters: { id: InboxFilter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: sessions.length },
    { id: "waiting", label: "Waiting", count: waitingCount },
    { id: "active", label: "Active", count: activeCount },
    { id: "ended", label: "Ended", count: endedCount },
  ];

  return (
    <div
      ref={splitRef}
      className={`flex min-h-0 flex-1 flex-col overflow-hidden bg-[#F7F5F0] lg:flex-row ${
        resizing ? "select-none" : ""
      }`}
    >
      {/* Inbox column — full screen on mobile until a chat is opened */}
      <aside
        className={`${
          active ? "hidden" : "flex"
        } min-h-0 w-full flex-1 flex-col border-r border-[#E8E8E4] bg-white lg:flex lg:h-full lg:w-[var(--inbox-w)] lg:flex-none lg:shrink-0`}
        style={{ "--inbox-w": `${inboxWidth}px` } as CSSProperties}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#E8E8E4] bg-[#FFFDF9] py-3 pe-3 ps-14 sm:pe-4 lg:px-4">
          <div className="min-w-0">
            <h1 className="truncate text-[18px] font-light tracking-tight text-black [font-family:var(--font-display)] sm:text-[20px]">
              Live Chat
            </h1>
            <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#8A8A80] [font-family:var(--font-body)]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  connected ? "bg-emerald-500" : "bg-gray-400"
                }`}
              />
              {connected ? "You're online" : "Connecting…"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void refreshInbox()}
            title="Refresh inbox"
            className="flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/5 hover:cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="shrink-0 border-b border-[#E8E8E4] bg-white px-3 pb-2 pt-2">
          <label className="flex items-center gap-3 rounded-full border border-[#E8E8E4] bg-[#F7F5F0] px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#8A8A80]" strokeWidth={1.75} />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-black outline-none placeholder:text-[#8A8A80] [font-family:var(--font-body)]"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-[#8A8A80] hover:cursor-pointer"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            ) : null}
          </label>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {filters.map((f) => {
              const on = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] transition hover:cursor-pointer [font-family:var(--font-body)] ${
                    on
                      ? "bg-black text-white"
                      : "bg-[#F0EEE8] text-[#5A5A52] hover:bg-[#E8E8E4]"
                  }`}
                >
                  {f.label}
                  {typeof f.count === "number" ? (
                    <span className="ms-1 opacity-70">{f.count}</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {error ? (
          <p className="shrink-0 border-y border-red-100 bg-red-50 px-4 py-2 text-[12px] text-red-700 [font-family:var(--font-body)]">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-8 py-20 text-center">
              <MessageSquare
                className="h-10 w-10 text-[#D4D4CE]"
                strokeWidth={1.25}
              />
              <p className="text-[15px] text-black [font-family:var(--font-body)]">
                {sessions.length === 0 ? "No live chats yet" : "No matches"}
              </p>
              <p className="text-[13px] text-[#8A8A80] [font-family:var(--font-body)]">
                {sessions.length === 0
                  ? "Stay on this page so customers can reach you."
                  : "Try another search or filter."}
              </p>
            </div>
          ) : (
            filteredSessions.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                selected={active?.id === s.id}
                onSelect={() => void openSession(s)}
              />
            ))
          )}
        </div>
      </aside>

      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize inbox"
        onPointerDown={onResizePointerDown}
        className={`relative z-10 hidden w-[5px] shrink-0 cursor-col-resize touch-none bg-transparent lg:block ${
          resizing ? "bg-[#E8E8E4]" : "hover:bg-[#E8E8E4]"
        }`}
      >
        <span className="absolute inset-y-0 -left-1 -right-1" />
      </div>

      {/* Conversation / empty state — full screen on mobile when a chat is open */}
      <section
        className={`${
          active ? "flex" : "hidden"
        } relative min-h-0 min-w-0 flex-1 flex-col bg-[#F7F5F0] lg:flex`}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage:
              "radial-gradient(#000 0.55px, transparent 0.55px)",
            backgroundSize: "16px 16px",
          }}
        />

        {!active ? (
          <div className="relative z-[1] flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-8 text-center sm:px-6 sm:py-10">
            {/* Soft ambient glow */}
            <motion.div
              aria-hidden
              className="pointer-events-none absolute h-72 w-72 rounded-full bg-black/[0.04] blur-3xl"
              animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.7, 0.45] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-lg"
            >
              {/* Orbiting support icons */}
              <div className="relative mx-auto mb-8 flex h-44 w-full max-w-sm items-center justify-center">
                {(
                  [
                    { key: "chat", Icon: MessageSquare, x: -96, y: -42, delay: 0 },
                    { key: "phone", Icon: Phone, x: 98, y: -34, delay: 0.2 },
                    { key: "pen", Icon: PenLine, x: -88, y: 52, delay: 0.4 },
                    { key: "headset", Icon: Headphones, x: 90, y: 56, delay: 0.55 },
                    { key: "agent", Icon: UserRound, x: 0, y: -78, delay: 0.3 },
                  ] as const
                ).map(({ key, Icon, x, y, delay }) => (
                  <motion.div
                    key={key}
                    aria-hidden
                    className="absolute flex h-11 w-11 items-center justify-center rounded-full border border-[#E8E8E4] bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
                    initial={{ opacity: 0, scale: 0.6, x, y }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x,
                      y: [y, y - 8, y],
                    }}
                    transition={{
                      opacity: { delay, duration: 0.45 },
                      scale: {
                        delay,
                        duration: 0.45,
                        type: "spring",
                        stiffness: 260,
                        damping: 18,
                      },
                      y: {
                        delay: delay + 0.4,
                        duration: 3.2 + delay,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  </motion.div>
                ))}

                {/* Center agent mark */}
                <motion.div
                  className="relative z-[1] flex h-20 w-20 items-center justify-center rounded-full bg-black text-white shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 280, damping: 20 }}
                >
                  <motion.span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full border border-black/20"
                    animate={{ scale: [1, 1.35], opacity: [0.4, 0] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
                  />
                  <Headphones className="h-8 w-8" strokeWidth={1.4} />
                </motion.div>
              </div>

              <motion.h2
                className="text-[28px] font-light tracking-tight text-black [font-family:var(--font-display)] sm:text-[32px]"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.45 }}
              >
                MOTD Live Support
              </motion.h2>
              <motion.p
                className="mx-auto mt-3 max-w-sm text-[14px] leading-relaxed text-[#8A8A80] [font-family:var(--font-body)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.32, duration: 0.45 }}
              >
                Pick a waiting chat to accept it, or reopen an active conversation
                from the inbox when you&apos;re ready to help.
              </motion.p>

              <motion.div
                className="mx-auto mt-8 grid max-w-xs grid-cols-2 gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.42, duration: 0.45 }}
              >
                {[
                  {
                    label: "Waiting",
                    value: waitingCount,
                    hint: "Ready to accept",
                    accent: waitingCount > 0,
                  },
                  {
                    label: "Active",
                    value: activeCount,
                    hint: "In progress",
                    accent: activeCount > 0,
                  },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    className="rounded-2xl border border-[#E8E8E4] bg-white/90 px-4 py-4 backdrop-blur-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.48 + i * 0.08, duration: 0.4 }}
                    whileHover={{ y: -2, transition: { duration: 0.2 } }}
                  >
                    <p className="text-[26px] font-medium tabular-nums tracking-tight text-black [font-family:var(--font-body)]">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-[#8A8A80] [font-family:var(--font-ui)]">
                      {stat.label}
                    </p>
                    <p
                      className={`mt-2 text-[11px] [font-family:var(--font-body)] ${
                        stat.accent ? "text-black" : "text-[#B0B0A8]"
                      }`}
                    >
                      {stat.hint}
                    </p>
                  </motion.div>
                ))}
              </motion.div>

              <motion.p
                className="mt-8 text-[12px] text-[#A3A39A] [font-family:var(--font-body)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.5 }}
              >
                Stay online — new customer chats appear in the inbox instantly.
              </motion.p>
            </motion.div>
          </div>
        ) : (
          <>
            {copyToast ? (
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-28 z-30 flex justify-center px-4 transition-opacity duration-500 ${
                  copyToastShown ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="rounded-full bg-[#111B21]/90 px-3.5 py-1.5 text-[12px] text-white shadow-lg [font-family:var(--font-body)]">
                  {copyToast}
                </p>
              </div>
            ) : null}
              <header
                className={`relative flex shrink-0 items-center justify-between gap-1.5 border-b border-[#E8E8E4] bg-[#FFFDF9] py-2 pe-2 ps-3 sm:gap-3 sm:px-4 sm:py-2.5 ${
                  headerMenuOpen ? "z-40" : "z-20"
                }`}
              >
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  aria-label="Back to inbox"
                  title="Back to inbox"
                  onClick={closeChatWindow}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/10 hover:text-black hover:cursor-pointer lg:hidden"
                >
                  <ArrowLeft className="h-5 w-5" strokeWidth={1.75} />
                </button>
                <ChatAvatar
                  name={active.customer?.name || "Visitor"}
                  src={active.customer?.profilePic}
                  size="md"
                  online={!chatEndedBy && active.status === "active"}
                />
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] text-black [font-family:var(--font-body)] sm:text-[16px]">
                    {active.customer?.name || "Visitor"}
                  </h2>
                  <p className="truncate text-[11px] text-[#8A8A80] [font-family:var(--font-body)] sm:text-[12px]">
                    {chatEndedBy
                      ? chatEndedBy === "customer"
                        ? "Customer ended the chat"
                        : "You ended the chat"
                      : peerTyping
                        ? "typing…"
                        : [
                            kindLabel(active.customer?.kind),
                            active.locale?.toUpperCase(),
                            chatEndedBy
                              ? "Ended"
                              : active.status === "waiting"
                                ? "Waiting"
                                : "Online",
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                  </p>
                </div>
              </div>
              <div className="relative z-50 flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  aria-label="Audio call"
                  title="Audio call"
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setHeaderPanel("call");
                  }}
                  className="hidden h-9 w-9 items-center justify-center rounded-full text-[#54656F] transition-colors duration-150 hover:cursor-pointer hover:bg-black/10 hover:text-black sm:flex"
                >
                  <Phone
                    className="pointer-events-none h-5 w-5"
                    strokeWidth={1.75}
                  />
                </button>
                <button
                  type="button"
                  aria-label="Search messages"
                  title="Search messages"
                  aria-pressed={threadSearchOpen}
                  onClick={() => {
                    setHeaderMenuOpen(false);
                    setThreadSearchOpen((v) => {
                      if (v) setThreadSearch("");
                      return !v;
                    });
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[#54656F] transition-colors duration-150 hover:cursor-pointer hover:bg-black/10 hover:text-black ${
                    threadSearchOpen ? "bg-black/10 text-black" : ""
                  }`}
                >
                  <Search
                    className="pointer-events-none h-5 w-5"
                    strokeWidth={1.75}
                  />
                </button>
                <div ref={headerMenuRef} className="relative shrink-0">
                <button
                  type="button"
                  aria-label="Chat options"
                  aria-expanded={headerMenuOpen}
                  aria-haspopup="menu"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setThreadSearchOpen(false);
                    setHeaderMenuOpen((v) => !v);
                  }}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-[#54656F] transition-colors duration-150 hover:cursor-pointer hover:bg-black/10 hover:text-black ${
                    headerMenuOpen ? "bg-black/10 text-black" : ""
                  }`}
                >
                  <MoreVertical
                    className="pointer-events-none h-5 w-5"
                    strokeWidth={1.75}
                  />
                </button>
                {headerMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute end-0 top-full z-[100] mt-1.5 max-h-[min(70vh,28rem)] min-w-[14.5rem] overflow-y-auto overflow-x-hidden rounded-lg border border-[#E8E8E4] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
                  >
                    {(
                      [
                        {
                          key: "contact",
                          label: "Contact info",
                          icon: Info,
                          tone: "default" as const,
                          onPick: () => {
                            setHeaderMenuOpen(false);
                            setHeaderPanel("contact");
                          },
                        },
                        {
                          key: "select",
                          label: "Select messages",
                          icon: CheckSquare,
                          tone: "default" as const,
                          onPick: () => {
                            setHeaderMenuOpen(false);
                            setSelectMode(true);
                            setSelectedIds(new Set());
                          },
                        },
                        {
                          key: "theme",
                          label: "Chat theme",
                          icon: Palette,
                          tone: "default" as const,
                          onPick: () => {
                            setHeaderMenuOpen(false);
                            setHeaderPanel("theme");
                          },
                        },
                        {
                          key: "clear",
                          label: "Clear chat",
                          icon: Eraser,
                          tone: "default" as const,
                          onPick: () => {
                            setHeaderMenuOpen(false);
                            setConfirmAction("clear");
                          },
                        },
                        {
                          key: "deleteAll",
                          label: "Delete all messages",
                          icon: Trash2,
                          tone: "danger" as const,
                          onPick: () => {
                            setHeaderMenuOpen(false);
                            setConfirmAction("deleteAll");
                          },
                        },
                        {
                          key: "close",
                          label: "Close chat",
                          icon: XCircle,
                          tone: "default" as const,
                          onPick: () => {
                            closeChatWindow();
                          },
                        },
                        {
                          key: "block",
                          label: "Block",
                          icon: Ban,
                          tone: "danger" as const,
                          onPick: () => {
                            setHeaderMenuOpen(false);
                            setHeaderPanel("block");
                          },
                        },
                        chatEndedBy
                          ? {
                              key: "continue",
                              label: "Continue chat",
                              icon: PhoneOff,
                              tone: "default" as const,
                              onPick: () => {
                                setHeaderMenuOpen(false);
                                void restartChat();
                              },
                            }
                          : {
                              key: "end",
                              label: "End chat",
                              icon: PhoneOff,
                              tone: "danger" as const,
                              onPick: () => {
                                setHeaderMenuOpen(false);
                                void endChat();
                              },
                            },
                      ] as const
                    ).map((item, index) => {
                      const Icon = item.icon;
                      const showDivider = index === 3 || index === 7;
                      return (
                        <div key={item.key}>
                          {showDivider ? (
                            <div
                              className="border-t border-[#EFEFEA]"
                              role="separator"
                            />
                          ) : null}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              e.stopPropagation();
                              item.onPick();
                            }}
                            className={`group flex w-full items-center gap-2.5 px-3.5 py-2.5 text-start text-[13px] transition-colors duration-150 hover:cursor-pointer [font-family:var(--font-body)] ${
                              item.tone === "danger"
                                ? "text-[#B42318] hover:bg-[#FFF5F5]"
                                : "text-[#111B21] hover:bg-[#F0EFEC]"
                            }`}
                          >
                            <Icon
                              className={`pointer-events-none h-4 w-4 shrink-0 transition-colors duration-150 ${
                                item.tone === "danger"
                                  ? "text-[#B42318] group-hover:text-[#912018]"
                                  : "text-[#667781] group-hover:text-black"
                              }`}
                              strokeWidth={1.75}
                            />
                            <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                              {item.label}
                            </span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                </div>
              </div>
            </header>

            {threadSearchOpen ? (
              <ChatThreadSearchBar
                value={threadSearch}
                onChange={setThreadSearch}
                onClose={closeThreadSearch}
                inputRef={threadSearchInputRef}
                matchCount={matchIds.length}
                activeIndex={
                  matchIds.length === 0
                    ? 0
                    : Math.min(activeMatchIndex, matchIds.length - 1)
                }
                onPrev={goPrevMatch}
                onNext={goNextMatch}
                placeholder="Search messages"
              />
            ) : null}

            {selectMode ? (
              <div className="relative z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-[#E8E8E4] bg-white px-4 py-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="text-[12px] text-[#54656F] transition hover:text-black hover:cursor-pointer [font-family:var(--font-body)]"
                >
                  Cancel
                </button>
                <p className="text-[12px] text-black [font-family:var(--font-body)]">
                  {selectedIds.size} selected
                </p>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={requestDeleteSelected}
                  className="text-[12px] text-[#B42318] transition hover:cursor-pointer disabled:opacity-40 disabled:hover:cursor-not-allowed [font-family:var(--font-body)]"
                >
                  Delete
                </button>
              </div>
            ) : null}

            <div
              ref={threadRef}
              data-lenis-prevent
              className="relative z-0 min-h-0 flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y px-3 py-3 [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-4 md:px-8 lg:px-10"
            >
              {(active.messages || []).map((msg) => {
                const isMatch =
                  searchQuery.length > 0 && matchIds.includes(msg.id);
                const isActiveMatch =
                  isMatch &&
                  matchIds[
                    Math.min(activeMatchIndex, Math.max(0, matchIds.length - 1))
                  ] === msg.id;
                const dimWhileSearch =
                  searchQuery.length > 0 && !isMatch && msg.role !== "system";

                if (msg.role === "system") {
                  return (
                    <div
                      key={msg.id}
                      data-msg-id={msg.id}
                      className={`flex justify-center py-2 transition-opacity ${
                        searchQuery && !isMatch ? "opacity-35" : ""
                      }`}
                    >
                      <p className="max-w-[92%] rounded-full bg-[#FFFFFFCC] px-3.5 py-1 text-center text-[11.5px] leading-snug text-[#667781] shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] backdrop-blur-sm [font-family:var(--font-body)]">
                        {searchQuery ? (
                          <ChatSearchHighlight
                            text={msg.text}
                            query={searchQuery}
                            active={isActiveMatch}
                          />
                        ) : (
                          msg.text
                        )}
                      </p>
                    </div>
                  );
                }
                // FAQ / MOTD Care bot history stays on the left (context), not as "mine".
                const isCareBot =
                  msg.role === "agent" &&
                  (msg.senderName === "MOTD Care" ||
                    msg.senderName === "MOTD Assistant");
                const mine = msg.role === "agent" && !isCareBot;
                const selected = selectedIds.has(msg.id);
                return (
                  <div
                    key={msg.id}
                    data-msg-id={msg.id}
                    className={`flex items-center gap-2 transition-opacity ${mine ? "justify-end" : "justify-start"} ${
                      selectMode ? "cursor-pointer" : ""
                    } ${dimWhileSearch ? "opacity-35" : "opacity-100"}`}
                    onClick={() => {
                      if (!selectMode) return;
                      toggleSelectMessage(msg.id);
                    }}
                  >
                    {selectMode ? (
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          selected
                            ? "border-black bg-black text-white"
                            : "border-[#C8C8C0] bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    ) : null}
                    <div
                      className={`group relative max-w-[min(92%,20rem)] px-2.5 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] sm:max-w-[min(85%,28rem)] lg:max-w-[min(85%,32rem)] ${
                        mine
                          ? "rounded-[7.5px] rounded-tr-none bg-black text-white"
                          : "rounded-[7.5px] rounded-tl-none border border-[#EBEBE8] bg-[#FFFDF9] text-black"
                      } ${selected ? "ring-2 ring-black/25" : ""} ${
                        isActiveMatch
                          ? "ring-2 ring-[#FFEB3B] ring-offset-1 ring-offset-transparent"
                          : isMatch
                            ? "ring-1 ring-[#FFF59D]/80"
                            : ""
                      }`}
                      onContextMenu={(e) => {
                        if (selectMode || chatEndedBy) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuMsgId(msg.id);
                      }}
                    >
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute top-0 h-0 w-0 border-y-[6px] border-y-transparent ${
                          mine
                            ? "-right-[6px] border-l-[6px] border-l-black"
                            : "-left-[6px] border-r-[6px] border-r-[#FFFDF9]"
                        }`}
                      />
                      {msg.deleted ? (
                        !selectMode && !chatEndedBy ? (
                          <div
                            className={`absolute top-1 z-20 ${
                              mine ? "start-1" : "end-1"
                            }`}
                          >
                            <ChatMessageMenu
                              open={menuMsgId === msg.id}
                              onOpenChange={(next) =>
                                setMenuMsgId(next ? msg.id : null)
                              }
                              mine={mine}
                              onDark={mine}
                              tombstone
                              hideTrigger
                              menuAlign={mine ? "start" : "end"}
                              onAction={(action) =>
                                void onMessageMenuAction(msg, action, mine)
                              }
                            />
                          </div>
                        ) : null
                      ) : (
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          {mine ? (
                            <>
                              {!selectMode && !chatEndedBy ? (
                                <div
                                  className={`opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 ${
                                    menuMsgId === msg.id
                                      ? "sm:opacity-100"
                                      : ""
                                  }`}
                                >
                                  <ChatMessageMenu
                                    open={menuMsgId === msg.id}
                                    onOpenChange={(next) =>
                                      setMenuMsgId(next ? msg.id : null)
                                    }
                                    mine={mine}
                                    onDark={mine}
                                    canEdit={
                                      mine &&
                                      (msg.kind === "text" ||
                                        msg.kind === "image" ||
                                        msg.kind === "file" ||
                                        !msg.kind)
                                    }
                                    canCopy={Boolean(
                                      (msg.caption || msg.text || "").trim(),
                                    )}
                                    menuAlign="start"
                                    onAction={(action) =>
                                      void onMessageMenuAction(
                                        msg,
                                        action,
                                        mine,
                                      )
                                    }
                                  />
                                </div>
                              ) : (
                                <span />
                              )}
                              <p className="min-w-0 truncate text-end text-[11px] font-medium text-white/75 [font-family:var(--font-body)]">
                                You
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="min-w-0 flex-1 truncate text-start text-[11px] font-medium text-[#8A8A80] [font-family:var(--font-body)]">
                                {msg.senderName ? (
                                  searchQuery ? (
                                    <ChatSearchHighlight
                                      text={msg.senderName}
                                      query={searchQuery}
                                      active={isActiveMatch}
                                    />
                                  ) : (
                                    msg.senderName
                                  )
                                ) : (
                                  "Customer"
                                )}
                              </p>
                              {!selectMode && !chatEndedBy ? (
                                <div
                                  className={`opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 ${
                                    menuMsgId === msg.id
                                      ? "sm:opacity-100"
                                      : ""
                                  }`}
                                >
                                  <ChatMessageMenu
                                    open={menuMsgId === msg.id}
                                    onOpenChange={(next) =>
                                      setMenuMsgId(next ? msg.id : null)
                                    }
                                    mine={mine}
                                    onDark={mine}
                                    canEdit={false}
                                    canCopy={Boolean(
                                      (msg.caption || msg.text || "").trim(),
                                    )}
                                    menuAlign="end"
                                    onAction={(action) =>
                                      void onMessageMenuAction(
                                        msg,
                                        action,
                                        mine,
                                      )
                                    }
                                  />
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}
                      {msg.replyTo ? (
                        <div
                          className={`mb-1.5 rounded-md border-s-[3px] px-2 py-1 ${
                            mine
                              ? "border-s-white/70 bg-white/10"
                              : "border-s-black bg-black/[0.04]"
                          }`}
                        >
                          <p
                            className={`truncate text-[11px] font-medium [font-family:var(--font-body)] ${
                              mine ? "text-white/80" : "text-[#54656F]"
                            }`}
                          >
                            {msg.replyTo.senderName ||
                              (msg.replyTo.role === "agent"
                                ? "You"
                                : "Customer")}
                          </p>
                          <p
                            className={`truncate text-[12px] [font-family:var(--font-body)] ${
                              mine ? "text-white/65" : "text-[#8A8A80]"
                            }`}
                          >
                            {msg.replyTo.text}
                          </p>
                        </div>
                      ) : null}
                      {msg.deleted ? (
                        <p
                          className={`italic whitespace-pre-wrap break-words text-[14.2px] leading-[1.4] [font-family:var(--font-body)] ${
                            mine ? "text-white/70" : "text-[#8A8A80]"
                          }`}
                        >
                          {msg.deletedBy === "agent"
                            ? "You deleted this message"
                            : "Customer deleted this message"}
                        </p>
                      ) : (
                        <>
                          {msg.kind === "voice" && msg.audio ? (
                            <div className="space-y-1.5">
                              {msg.data ? (
                                <ChatAttachmentBubble
                                  kind={
                                    msg.attachmentKind === "file"
                                      ? "file"
                                      : "image"
                                  }
                                  data={msg.data}
                                  fileName={msg.fileName}
                                  fileSize={msg.fileSize}
                                  onDark={mine}
                                />
                              ) : null}
                              <VoiceNoteBubble
                                audio={msg.audio}
                                durationMs={msg.durationMs}
                                onDark={mine}
                              />
                            </div>
                          ) : msg.kind === "image" && msg.data ? (
                            <div className="space-y-1">
                              <ChatAttachmentBubble
                                kind="image"
                                data={msg.data}
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                onDark={mine}
                              />
                              {msg.caption ? (
                                <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[1.4] [font-family:var(--font-body)]">
                                  {searchQuery ? (
                                    <ChatSearchHighlight
                                      text={msg.caption}
                                      query={searchQuery}
                                      active={isActiveMatch}
                                    />
                                  ) : (
                                    msg.caption
                                  )}
                                </p>
                              ) : null}
                            </div>
                          ) : msg.kind === "file" && msg.data ? (
                            <div className="space-y-1">
                              <ChatAttachmentBubble
                                kind="file"
                                data={msg.data}
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                onDark={mine}
                              />
                              {msg.caption ? (
                                <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[1.4] [font-family:var(--font-body)]">
                                  {searchQuery ? (
                                    <ChatSearchHighlight
                                      text={msg.caption}
                                      query={searchQuery}
                                      active={isActiveMatch}
                                    />
                                  ) : (
                                    msg.caption
                                  )}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <p className="whitespace-pre-wrap break-words text-[14.2px] leading-[1.4] [font-family:var(--font-body)]">
                              {searchQuery ? (
                                <ChatSearchHighlight
                                  text={msg.text}
                                  query={searchQuery}
                                  active={isActiveMatch}
                                />
                              ) : (
                                msg.text
                              )}
                            </p>
                          )}
                        </>
                      )}
                      <p
                        className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] tabular-nums [font-family:var(--font-ui)] ${
                          mine ? "text-white/50" : "text-[#8A8A80]"
                        }`}
                      >
                        {msg.editedAt ? <span>Edited</span> : null}
                        {formatMsgTime(msg.at)}
                        {mine && !msg.deleted ? (
                          <MessageStatusTicks
                            status={msg.status || "sent"}
                            onDark
                          />
                        ) : null}
                      </p>
                    </div>
                  </div>
                );
              })}

              {!chatEndedBy && peerTyping ? (
                <ChatTypingBubble label="typing…" />
              ) : null}

              {chatEndedBy ? (
                <div className="flex justify-center py-4">
                  <div className="rounded-[7.5px] bg-[#FFFFFFE6] px-3.5 py-1.5 text-center shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] backdrop-blur-sm">
                    <p className="text-[12.5px] text-[#54656F] [font-family:var(--font-body)]">
                      {chatEndedBy === "customer"
                        ? "This chat was ended by the customer"
                        : "You ended this chat"}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {chatEndedBy ? (
              <div className="relative z-[1] flex shrink-0 flex-col gap-2 border-t border-[#E8E8E4] bg-[#FFFDF9] px-4 py-3">
                <button
                  type="button"
                  disabled={restarting}
                  onClick={() => void restartChat()}
                  className="w-full bg-black px-4 py-3 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-[#1a1a1a] disabled:opacity-40 hover:cursor-pointer disabled:hover:cursor-not-allowed [font-family:var(--font-ui)]"
                >
                  {restarting ? "Continuing…" : "Continue chat"}
                </button>
              </div>
            ) : (
              <div className="relative z-[1] shrink-0 bg-transparent px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-2.5">
                {attachNotice ? (
                  <div
                    role="alert"
                    className="mb-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-start shadow-sm"
                  >
                    <p className="min-w-0 flex-1 text-[12px] leading-snug text-red-800 [font-family:var(--font-body)] sm:text-[13px]">
                      {attachNotice}
                    </p>
                    <button
                      type="button"
                      aria-label="Dismiss"
                      onClick={() => setAttachNotice("")}
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-red-700 transition hover:bg-red-100 hover:cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                ) : null}
                {editingId || replyTo ? (
                  <div className="mb-2 flex items-stretch gap-2 overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-sm">
                    <div className="w-1 shrink-0 bg-black" />
                    <div className="min-w-0 flex-1 py-2 pe-1">
                      <p className="text-[11px] font-medium text-black [font-family:var(--font-body)]">
                        {editingId ? "Editing message" : "Replying"}
                      </p>
                      <p className="truncate text-[12px] text-[#667781] [font-family:var(--font-body)]">
                        {editingId ? draft || "…" : replyTo?.text || ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Cancel"
                      onClick={clearReplyAndEdit}
                      className="me-1 flex h-8 w-8 shrink-0 items-center justify-center self-center rounded-full text-[#667781] transition hover:bg-black/5 hover:cursor-pointer"
                    >
                      <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                  </div>
                ) : null}
                {pendingAttachment ? (
                  <ChatComposerAttachPreview
                    attachment={pendingAttachment}
                    onClear={clearPendingAttachment}
                  />
                ) : null}
                {voice.recording ? (
                  <div className="flex min-h-[48px] w-full items-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-sm">
                    <button
                      type="button"
                      onClick={cancelVoiceNote}
                      aria-label="Cancel recording"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#E53935] transition hover:bg-[#FFF5F5] hover:cursor-pointer"
                    >
                      <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                    </button>
                    <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#E53935]" />
                    <span className="text-[14px] tabular-nums text-[#111B21] [font-family:var(--font-ui)]">
                      {formatRecordingTime(voice.elapsedMs)}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-[#667781] [font-family:var(--font-body)]">
                      Recording…
                    </span>
                    <button
                      type="button"
                      disabled={sending}
                      onClick={() => void sendVoiceNote()}
                      aria-label="Send voice note"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#1a1a1a] disabled:opacity-35 hover:cursor-pointer"
                    >
                      <Send className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                ) : (
                  <form onSubmit={onComposerSubmit} className="relative w-full">
                    <ChatEmojiPicker
                      open={emojiOpen}
                      onClose={() => setEmojiOpen(false)}
                      onPick={(emoji) => {
                        setDraft((d) => d + emoji);
                        window.setTimeout(
                          () => composerRef.current?.focus(),
                          0,
                        );
                      }}
                    />
                    <div className="relative flex min-h-[48px] w-full items-end gap-1 rounded-full bg-white px-2 py-1.5 shadow-sm">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept={FILE_ACCEPT}
                        className="hidden"
                        onChange={(e) => onAttachFileChange(e, "file")}
                      />
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept={IMAGE_ACCEPT}
                        className="hidden"
                        onChange={(e) => onAttachFileChange(e, "image")}
                      />
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept={VIDEO_ACCEPT}
                        className="hidden"
                        onChange={(e) => onAttachFileChange(e, "video")}
                      />
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept={AUDIO_ACCEPT}
                        className="hidden"
                        onChange={(e) => onAttachFileChange(e, "audio")}
                      />
                      <div className="relative mb-0.5">
                        <button
                          type="button"
                          disabled={sending}
                          aria-label="Attach"
                          aria-expanded={attachOpen}
                          onClick={() => {
                            setEmojiOpen(false);
                            setAttachOpen((v) => !v);
                          }}
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer disabled:opacity-40"
                        >
                          <Paperclip
                            className="h-[22px] w-[22px]"
                            strokeWidth={1.5}
                          />
                        </button>
                        <ChatAttachMenu
                          open={attachOpen}
                          onClose={() => setAttachOpen(false)}
                          onPick={onAttachMenuPick}
                          compact
                        />
                      </div>
                      <div className="relative mb-0.5">
                        <button
                          type="button"
                          tabIndex={-1}
                          data-chat-emoji-toggle
                          aria-label="Emoji"
                          aria-expanded={emojiOpen}
                          onClick={() => {
                            setAttachOpen(false);
                            setEmojiOpen((v) => !v);
                          }}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer ${
                            emojiOpen ? "bg-black/5 text-black" : ""
                          }`}
                        >
                          <Smile
                            className="h-[22px] w-[22px]"
                            strokeWidth={1.5}
                          />
                        </button>
                      </div>
                      <textarea
                        ref={composerRef}
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onKeyDown={onComposerKeyDown}
                        rows={1}
                        placeholder={
                          pendingAttachment
                            ? "Add a caption…"
                            : "Type a message"
                        }
                        className="max-h-28 min-h-[36px] min-w-0 flex-1 resize-none bg-transparent py-2 pe-1 text-[16px] leading-relaxed text-[#111B21] outline-none placeholder:text-[#667781] [font-family:var(--font-body)] sm:text-[15px]"
                      />
                      <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
                        {!hasDraft ? (
                          <button
                            type="button"
                            disabled={sending || !voice.supported}
                            onClick={() => void startVoiceNote()}
                            aria-label="Record voice note"
                            className="flex h-9 w-9 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer disabled:opacity-40"
                          >
                            <Mic className="h-5 w-5" strokeWidth={1.75} />
                          </button>
                        ) : null}
                        {canSend ? (
                          <button
                            type="submit"
                            disabled={sending}
                            aria-label="Send message"
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white transition hover:bg-[#1a1a1a] disabled:opacity-35 hover:cursor-pointer disabled:hover:cursor-not-allowed"
                          >
                            <Send className="h-4 w-4" strokeWidth={1.75} />
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </form>
                )}
              </div>
            )}
          </>
        )}

        {headerPanel === "contact" && active ? (
          <div className="absolute inset-0 z-40 flex justify-end bg-black/25 p-0 backdrop-blur-[1px] sm:p-3">
            <div className="flex h-full w-full max-w-sm flex-col overflow-hidden rounded-none border border-[#E8E8E4] bg-white shadow-xl sm:rounded-xl">
              <div className="flex items-center justify-between border-b border-[#E8E8E4] px-4 py-3">
                <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
                  Contact info
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setHeaderPanel(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-8">
                <ChatAvatar
                  name={active.customer?.name || "Visitor"}
                  src={active.customer?.profilePic}
                  size="lg"
                  online={!chatEndedBy && active.status === "active"}
                />
                <div className="w-full space-y-3 text-center">
                  <p className="text-[18px] text-black [font-family:var(--font-display)]">
                    {active.customer?.name || "Visitor"}
                  </p>
                  <dl className="space-y-2 text-start text-[13px] [font-family:var(--font-body)]">
                    <div className="rounded-lg bg-[#F7F5F0] px-3 py-2.5">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-[#8A8A80]">
                        Email
                      </dt>
                      <dd className="mt-0.5 text-black">
                        {active.customer?.email || "—"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#F7F5F0] px-3 py-2.5">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-[#8A8A80]">
                        Visitor type
                      </dt>
                      <dd className="mt-0.5 text-black">
                        {kindLabel(active.customer?.kind)}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#F7F5F0] px-3 py-2.5">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-[#8A8A80]">
                        Locale
                      </dt>
                      <dd className="mt-0.5 text-black">
                        {active.locale?.toUpperCase() || "EN"}
                      </dd>
                    </div>
                    <div className="rounded-lg bg-[#F7F5F0] px-3 py-2.5">
                      <dt className="text-[10px] uppercase tracking-[0.14em] text-[#8A8A80]">
                        Status
                      </dt>
                      <dd className="mt-0.5 text-black">
                        {chatEndedBy
                          ? "Ended"
                          : active.status === "waiting"
                            ? "Waiting"
                            : "Active"}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {headerPanel === "theme" ||
        headerPanel === "block" ||
        headerPanel === "call" ? (
          <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/25 p-3 backdrop-blur-[1px] sm:items-center sm:p-4">
            <div className="max-h-[min(90dvh,32rem)] w-full max-w-sm overflow-y-auto overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E8E8E4] px-4 py-3">
                <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
                  {headerPanel === "block"
                    ? "Block"
                    : headerPanel === "call"
                      ? "Audio call"
                      : "Chat theme"}
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setHeaderPanel(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer"
                >
                  <X className="h-4 w-4" strokeWidth={1.75} />
                </button>
              </div>
              <div className="space-y-3 px-5 py-6 text-center">
                {headerPanel === "block" ? (
                  <Ban
                    className="mx-auto h-8 w-8 text-[#8A8A80]"
                    strokeWidth={1.5}
                  />
                ) : headerPanel === "call" ? (
                  <Phone
                    className="mx-auto h-8 w-8 text-[#8A8A80]"
                    strokeWidth={1.5}
                  />
                ) : (
                  <Palette
                    className="mx-auto h-8 w-8 text-[#8A8A80]"
                    strokeWidth={1.5}
                  />
                )}
                <p className="text-[14px] text-black [font-family:var(--font-body)]">
                  Coming soon
                </p>
                <p className="text-[13px] leading-relaxed text-[#8A8A80] [font-family:var(--font-body)]">
                  {headerPanel === "block"
                    ? "Blocking contacts will be available in a later update. The menu option is ready for that phase."
                    : headerPanel === "call"
                      ? "Audio calling will be available in a later update. The phone control is ready for that phase."
                      : "Chat themes will be available in a later update. The menu option is ready for that phase."}
                </p>
                <button
                  type="button"
                  onClick={() => setHeaderPanel(null)}
                  className="mt-1 rounded-full bg-black px-4 py-2 text-[12px] text-white transition hover:bg-[#1a1a1a] hover:cursor-pointer [font-family:var(--font-body)]"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {infoMsg ? (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] sm:items-center sm:p-4">
            <div className="w-full max-w-xs overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#E8E8E4] px-4 py-3">
                <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
                  Message info
                </h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setInfoMsg(null)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[#667781] transition hover:bg-black/5 hover:cursor-pointer"
                >
                  <X className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
              <div className="divide-y divide-[#F0F0EC] px-4 py-1 text-[13px] [font-family:var(--font-body)]">
                {(() => {
                  const status = infoMsg.status || "sent";
                  const seen = status === "read";
                  const when = new Date(infoMsg.at).toLocaleString("en-AE", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  });
                  return (
                    <>
                      <div className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <MessageStatusTicks status="sent" />
                          <span className="text-[#111B21]">Sent</span>
                        </div>
                        <span className="shrink-0 tabular-nums text-[#667781] [font-family:var(--font-ui)]">
                          {when}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-2">
                          <MessageStatusTicks status="read" />
                          <span className="text-[#111B21]">Seen</span>
                        </div>
                        <span className="shrink-0 tabular-nums text-[#667781] [font-family:var(--font-ui)]">
                          {seen ? when : "—"}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        ) : null}

        {confirmAction ? (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] sm:items-center sm:p-4">
            <div className="max-h-[min(90dvh,32rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-[#E8E8E4] bg-white p-4 shadow-xl sm:p-5">
              <h3 className="text-[16px] text-black [font-family:var(--font-body)]">
                {confirmAction === "clear"
                  ? "Clear chat?"
                  : confirmAction === "deleteForMe"
                    ? "Delete for you?"
                    : "Delete all messages?"}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-[#667781] [font-family:var(--font-body)]">
                {confirmAction === "clear"
                  ? "All messages in this chat will be removed. The conversation stays open."
                  : confirmAction === "deleteForMe"
                    ? "Removed from your chat only. The customer still sees them."
                    : "This permanently deletes every message in this chat."}
              </p>
              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-full border border-[#E8E8E4] px-3.5 py-2 text-[12px] text-black transition hover:border-black hover:cursor-pointer [font-family:var(--font-body)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runConfirmAction}
                  className="rounded-full bg-[#B42318] px-3.5 py-2 text-[12px] text-white transition hover:bg-[#912018] hover:cursor-pointer [font-family:var(--font-body)]"
                >
                  {confirmAction === "clear"
                    ? "Clear"
                    : confirmAction === "deleteForMe"
                      ? "Delete for me"
                      : "Delete all"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
