"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckSquare,
  Eraser,
  Info,
  Maximize2,
  Minimize2,
  Mic,
  MoreVertical,
  Paperclip,
  PhoneOff,
  Search,
  Send,
  Smile,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import ChatThreadSearchBar from "@/components/shared/ChatThreadSearchBar";
import ChatSearchHighlight from "@/components/shared/ChatSearchHighlight";
import ChatLinkedText from "@/components/shared/ChatLinkedText";
import ChatLinkPreviews from "@/components/shared/ChatLinkPreviews";
import ChatJumpToLatest from "@/components/shared/ChatJumpToLatest";
import { findThreadMatchIds } from "@/lib/chat/threadSearch";
import {
  clearChatDraft,
  readChatDraft,
  writeChatDraft,
} from "@/lib/chat/draftStore";
import {
  formatThreadDateBadge,
  messageDayKey,
} from "@/lib/chat/threadDates";
import {
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
import { useChatThreadLenis } from "@/components/providers/lenisProvider";
import { insertAtCursor } from "@/lib/chat/insertAtCursor";
import ChatMessageMenu, {
  ChatPinnedMessagesBar,
  ChatReactionBar,
  ChatReactionChips,
  type ChatMessageMenuAction,
  type ChatMessageReaction,
  type ChatReactionEmoji,
} from "@/components/shared/ChatMessageMenu";
import ChatAvatar from "@/components/shared/ChatAvatar";
import CallHistoryBubble from "@/components/shared/CallHistoryBubble";
import { publishSupportSessionBound } from "@/components/shared/CustomerAudioCallHost";
import { useChatThreadScroll } from "@/hooks/useChatThreadScroll";
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
  type AttachUploadStatus,
  type ChatAttachKind,
  type PreparedChatAttachment,
} from "@/lib/chat/attachments";

export type LiveChatReplyTo = {
  id: string;
  role: "customer" | "agent" | "system";
  kind?: "text" | "voice" | "image" | "file" | "call";
  text: string;
  senderName?: string;
};

export type LiveChatMessage = {
  id: string;
  role: "customer" | "agent" | "system";
  kind?: "text" | "voice" | "image" | "file" | "call";
  text: string;
  caption?: string;
  audio?: string;
  durationMs?: number;
  callOutcome?: "answered" | "missed" | "rejected" | "cancelled" | "failed";
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
  replyTo?: LiveChatReplyTo | null;
  editedAt?: string | null;
  reactions?: ChatMessageReaction[];
  pinnedAt?: string | null;
  pinnedBy?: "customer" | "agent" | null;
};

type LiveSession = {
  id: string;
  customer: {
    name: string;
    email?: string;
    kind?: string;
    profilePic?: string;
  };
  agent: { name: string; userId?: string; profilePic?: string } | null;
  status: "waiting" | "active" | "ended";
  messages: LiveChatMessage[];
  endedBy?: "customer" | "agent" | null;
  sessionKind?: "support" | "fabric" | "tailor";
  fabricStoreName?: string | null;
  tailorName?: string | null;
};

type AckResult = {
  ok: boolean;
  error?: string;
  session?: LiveSession;
  message?: LiveChatMessage;
  endedBy?: "customer" | "agent";
};

function replyPreviewOf(msg: LiveChatMessage) {
  if (msg.deleted) return "Deleted message";
  if (msg.kind === "voice") return "Voice message";
  if (msg.kind === "image") return "Photo";
  if (msg.kind === "file") return msg.fileName || "Document";
  if (msg.kind === "call") return (msg.text || "Voice call").trim();
  return (msg.caption || msg.text || "").trim();
}

function formatTime(iso: string, locale: string) {
  try {
    return new Date(iso).toLocaleTimeString(locale === "ar" ? "ar-AE" : "en-AE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function resolveCustomerName(initialName: string, isAr: boolean) {
  const trimmed = initialName.trim();
  if (trimmed.length >= 2) return trimmed.slice(0, 80);
  return isAr ? "زائر" : "Guest";
}

export type FaqHandoffMessage = {
  role: "bot" | "user";
  text: string;
};

export type LiveChatContext = {
  sessionKind?: "support" | "fabric" | "tailor";
  fabricStoreOwnerId?: string;
  fabricShopId?: string;
  fabricStoreName?: string;
  tailorOwnerId?: string;
  tailorShopId?: string;
  tailorName?: string;
};

type LiveChatPanelProps = {
  open: boolean;
  /** Leave live panel and return to FAQ (does not end the agent thread). */
  onClose: () => void;
  /** Close the whole chatbot widget (does not end the agent thread). */
  onCloseWidget?: () => void;
  /** Desktop-only: report half-screen expand so the host can resize the shell. */
  onExpandedChange?: (expanded: boolean) => void;
  locale: string;
  isAr: boolean;
  initialName?: string;
  /** FAQ chatbot transcript to seed the live session for agent context. */
  priorMessages?: FaqHandoffMessage[];
  /** support (default) or fabric store thread. */
  chatContext?: LiveChatContext;
};

export default function LiveChatPanel({
  open,
  onClose,
  onCloseWidget,
  onExpandedChange,
  locale,
  isAr,
  initialName = "",
  priorMessages = [],
  chatContext,
}: LiveChatPanelProps) {
  const [step, setStep] = useState<"connecting" | "chat" | "ended">("connecting");
  const [draft, setDraft] = useState("");
  const [session, setSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [error, setError] = useState("");
  /** Soft notice above the composer (wrong format, size, mic) — does not replace the chat. */
  const [attachNotice, setAttachNotice] = useState("");
  const [sending, setSending] = useState(false);
  const [endedBy, setEndedBy] = useState<"customer" | "agent" | null>(null);
  const [restarting, setRestarting] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [headerPanel, setHeaderPanel] = useState<null | "contact">(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [confirmDeleteForMe, setConfirmDeleteForMe] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState<null | "clear" | "deleteAll">(
    null,
  );
  const [threadSearchOpen, setThreadSearchOpen] = useState(false);
  const [threadSearch, setThreadSearch] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const threadRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const threadSearchInputRef = useRef<HTMLInputElement>(null);
  const searchQuery = threadSearch.trim();
  const matchIds = useMemo(
    () => findThreadMatchIds(messages, searchQuery),
    [messages, searchQuery],
  );
  const endingRef = useRef(false);
  const startedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const amTypingRef = useRef(false);
  const voice = useVoiceRecorder();
  const hasDraft = draft.trim().length > 0;
  const [attachOpen, setAttachOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [menuMsgId, setMenuMsgId] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<LiveChatReplyTo | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<LiveChatMessage | null>(null);
  const [copyToast, setCopyToast] = useState("");
  const [copyToastShown, setCopyToastShown] = useState(false);
  const [pendingAttachment, setPendingAttachment] =
    useState<PreparedChatAttachment | null>(null);
  const pendingAttachmentRef = useRef<PreparedChatAttachment | null>(null);
  const [attachStatus, setAttachStatus] =
    useState<AttachUploadStatus>("idle");
  const [attachProgress, setAttachProgress] = useState<number | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const canSend =
    attachStatus !== "preparing" &&
    attachStatus !== "sending" &&
    (hasDraft ||
      (!!pendingAttachmentRef.current &&
        (attachStatus === "ready" || attachStatus === "failed")));

  const copy = isAr
    ? {
        closeWidget: "إغلاق المحادثة",
        chatOptions: "خيارات المحادثة",
        expand: "توسيع النافذة",
        collapse: "تصغير النافذة",
        contactInfo: "معلومات الاتصال",
        selectMessages: "تحديد الرسائل",
        clearChat: "مسح المحادثة",
        deleteAll: "حذف كل الرسائل",
        block: "حظر",
        searchMessages: "بحث في الرسائل",
        searchPlaceholder: "ابحث في الرسائل",
        closeSearch: "إغلاق البحث",
        cancelSelect: "إلغاء",
        selectedCount: (n: number) => `${n} محددة`,
        deleteSelected: "حذف",
        deleteFailed: "تعذر حذف الرسائل.",
        deleteForMeTitle: "حذف من محادثتك؟",
        deleteForMeBody: "تُحذف من محادثتك فقط. الطرف الآخر ما زال يراها.",
        deleteForMeConfirm: "حذف لديّ",
        comingSoon: "قريباً",
        gotIt: "حسناً",
        close: "إغلاق",
        email: "البريد",
        status: "الحالة",
        statusActive: "نشطة",
        statusWaiting: "بانتظار",
        statusEnded: "منتهية",
        endChat: "إنهاء المحادثة",
        endChatConfirmTitle: "إنهاء المحادثة؟",
        endChatConfirmBody:
          "سيُنهى الحديث مع الوكيل. يمكنكِ المتابعة خلال وقت قصير إن احتاج الأمر.",
        endChatConfirmAction: "إنهاء",
        blockedStart:
          "تم حظر المحادثة المباشرة لهذا الحساب. راسلينا عبر نموذج التواصل.",
        clearConfirmTitle: "مسح المحادثة؟",
        clearConfirmBody: "ستُحذف كل الرسائل. المحادثة تبقى مفتوحة.",
        clearConfirmAction: "مسح",
        deleteAllConfirmTitle: "حذف كل الرسائل؟",
        deleteAllConfirmBody: "سيتم حذف كل رسالة في هذه المحادثة نهائياً.",
        deleteAllConfirmAction: "حذف الكل",
        clearFailed: "تعذر مسح المحادثة.",
        waiting: "بانتظار وكيل…",
        online: "متصل",
        typing: "يكتب…",
        agentFallback: "وكيل الدعم",
        starting: "جاري الاتصال…",
        placeholder: "اكتبي رسالتك…",
        send: "إرسال",
        voice: "رسالة صوتية",
        recording: "جاري التسجيل…",
        micDenied: "يرجى السماح بالوصول إلى الميكروفون.",
        cancelRecording: "إلغاء",
        endedByYou: "لقد أنهيتِ المحادثة",
        endedByAgent: "أنهى الوكيل المحادثة",
        continueChat: "متابعة المحادثة",
        restarting: "جاري المتابعة…",
        editing: "تعديل الرسالة",
        replying: "رد",
        edited: "تم التعديل",
        messageInfo: "معلومات الرسالة",
        sent: "أُرسلت",
        seen: "تم الاطلاع",
        copyFailed: "تعذر النسخ",
        copied: "تم النسخ",
        cancelEdit: "إلغاء",
        startFailed: "تعذر بدء المحادثة. حاولي مرة أخرى.",
        retry: "إعادة المحاولة",
      }
    : {
        closeWidget: "Close chat",
        chatOptions: "Chat options",
        expand: "Expand window",
        collapse: "Collapse window",
        contactInfo: "Contact info",
        selectMessages: "Select messages",
        clearChat: "Clear chat",
        deleteAll: "Delete all messages",
        block: "Block",
        searchMessages: "Search messages",
        searchPlaceholder: "Search messages",
        closeSearch: "Close search",
        cancelSelect: "Cancel",
        selectedCount: (n: number) => `${n} selected`,
        deleteSelected: "Delete",
        deleteFailed: "Could not delete messages.",
        deleteForMeTitle: "Delete for you?",
        deleteForMeBody:
          "Removed from your chat only. The other person still sees them.",
        deleteForMeConfirm: "Delete for me",
        comingSoon: "Coming soon",
        gotIt: "Got it",
        close: "Close",
        email: "Email",
        status: "Status",
        statusActive: "Active",
        statusWaiting: "Waiting",
        statusEnded: "Ended",
        endChat: "End chat",
        endChatConfirmTitle: "End this chat?",
        endChatConfirmBody:
          "This ends the conversation with the agent. You can continue within a short window if needed.",
        endChatConfirmAction: "End chat",
        blockedStart:
          "Live chat is blocked for this account. Please use the contact form instead.",
        clearConfirmTitle: "Clear chat?",
        clearConfirmBody:
          "All messages in this chat will be removed. The conversation stays open.",
        clearConfirmAction: "Clear",
        deleteAllConfirmTitle: "Delete all messages?",
        deleteAllConfirmBody: "This permanently deletes every message in this chat.",
        deleteAllConfirmAction: "Delete all",
        clearFailed: "Could not clear this chat.",
        waiting: "Waiting for an agent…",
        online: "online",
        typing: "typing…",
        agentFallback: "Support agent",
        starting: "Connecting…",
        placeholder: "Type your message…",
        send: "Send",
        voice: "Voice message",
        recording: "Recording…",
        micDenied: "Please allow microphone access.",
        cancelRecording: "Cancel",
        endedByYou: "You ended the chat",
        endedByAgent: "The agent ended the chat",
        continueChat: "Continue chat",
        restarting: "Continuing…",
        editing: "Editing message",
        replying: "Replying",
        edited: "Edited",
        messageInfo: "Message info",
        sent: "Sent",
        seen: "Seen",
        copyFailed: "Could not copy",
        copied: "Copied",
        cancelEdit: "Cancel",
        startFailed: "Could not start chat. Please try again.",
        retry: "Try again",
      };

  const clearPendingAttachment = useCallback(() => {
    pendingAttachmentRef.current = null;
    setPendingAttachment(null);
    setAttachStatus("idle");
    setAttachProgress(null);
  }, []);

  const resetLocal = useCallback(() => {
    voice.cancel();
    setAttachOpen(false);
    setEmojiOpen(false);
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmDeleteForMe(false);
    setConfirmWipe(null);
    clearPendingAttachment();
    setAttachNotice("");
    setStep("connecting");
    setDraft("");
    setSession(null);
    setMessages([]);
    setError("");
    setSending(false);
    setEndedBy(null);
    setRestarting(false);
    setPeerTyping(false);
    endingRef.current = false;
    startedRef.current = false;
    sessionIdRef.current = null;
    amTypingRef.current = false;
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current);
      typingIdleRef.current = null;
    }
  }, [voice.cancel, clearPendingAttachment]);

  const emitTyping = useCallback((typing: boolean) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || endingRef.current) return;
    if (amTypingRef.current === typing) return;
    amTypingRef.current = typing;
    getSocket().emit("chat:typing", { sessionId, typing });
  }, []);

  const onDraftChange = (value: string) => {
    setDraft(value);
    const sid = sessionIdRef.current;
    if (sid) writeChatDraft(sid, value);
    if (step !== "chat" || endingRef.current) return;
    if (value.trim()) {
      emitTyping(true);
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      typingIdleRef.current = setTimeout(() => {
        emitTyping(false);
      }, 1400);
    } else {
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
      emitTyping(false);
    }
  };

  const setExpandedSafe = useCallback(
    (next: boolean) => {
      setExpanded(next);
      onExpandedChange?.(next);
    },
    [onExpandedChange],
  );

  const finishClose = useCallback(() => {
    // Mark away so agent replies can toast while the widget is closed.
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        getSocket().emit("chat:away", { sessionId: sid });
      } catch {
        /* ignore */
      }
    }
    // Keep the Socket.IO connection so incoming rings / resume still work.
    setHeaderMenuOpen(false);
    setHeaderPanel(null);
    setThreadSearchOpen(false);
    setThreadSearch("");
    setExpandedSafe(false);
    resetLocal();
    onClose();
  }, [onClose, resetLocal, setExpandedSafe]);

  /** Close the floating chatbot without ending the live Mongo thread (can resume). */
  const closeWidget = useCallback(() => {
    // Mark away so agent replies can toast while the widget is closed.
    const sid = sessionIdRef.current;
    if (sid) {
      try {
        getSocket().emit("chat:away", { sessionId: sid });
      } catch {
        /* ignore */
      }
    }
    // Do not disconnectSocket — audio calls + session resume need the socket.
    setHeaderMenuOpen(false);
    setHeaderPanel(null);
    setThreadSearchOpen(false);
    setThreadSearch("");
    setExpandedSafe(false);
    resetLocal();
    if (onCloseWidget) onCloseWidget();
    else onClose();
  }, [onClose, onCloseWidget, resetLocal, setExpandedSafe]);

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

  // Expand is desktop-only — collapse if the viewport drops below md.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 768px)");
    const onChange = () => {
      if (!mq.matches) setExpandedSafe(false);
    };
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open, setExpandedSafe]);

  useEffect(() => {
    if (!open) {
      setHeaderMenuOpen(false);
      setExpandedSafe(false);
    }
  }, [open, setExpandedSafe]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    let onPointerDown: ((e: PointerEvent) => void) | null = null;
    // Defer so the opening click does not immediately dismiss the menu.
    const timer = window.setTimeout(() => {
      onPointerDown = (e: PointerEvent) => {
        const el = headerMenuRef.current;
        if (el && !el.contains(e.target as Node)) {
          setHeaderMenuOpen(false);
        }
      };
      document.addEventListener("pointerdown", onPointerDown);
    }, 0);
    return () => {
      window.clearTimeout(timer);
      if (onPointerDown) {
        document.removeEventListener("pointerdown", onPointerDown);
      }
    };
  }, [headerMenuOpen]);

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
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      if (confirmEnd) {
        setConfirmEnd(false);
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
      if (confirmWipe) {
        setConfirmWipe(null);
        return;
      }
      if (confirmDeleteForMe) {
        setConfirmDeleteForMe(false);
        return;
      }
      if (infoMsg) {
        setInfoMsg(null);
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
      // No overlay open — close the floating chatbot (same as header Close).
      closeWidget();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [
    open,
    headerPanel,
    headerMenuOpen,
    attachOpen,
    emojiOpen,
    confirmWipe,
    confirmEnd,
    confirmDeleteForMe,
    infoMsg,
    selectMode,
    threadSearchOpen,
    closeWidget,
  ]);

  const startChat = useCallback(async () => {
    setError("");
    setStep("connecting");
    try {
      getSocket().connect();
      // Session resume is server-side (Mongo by userId). Seed FAQ transcript on new threads.
      const faqHistory = priorMessages
        .filter((m) => m?.text?.trim())
        .slice(-40)
        .map((m) => ({
          role: m.role === "user" ? "user" : "bot",
          text: String(m.text).trim().slice(0, 2000),
        }));
      const kind =
        chatContext?.sessionKind === "fabric"
          ? "fabric"
          : chatContext?.sessionKind === "tailor"
            ? "tailor"
            : "support";
      const res = await emitWithAck<AckResult>("chat:start", {
        name: resolveCustomerName(initialName, isAr),
        locale,
        faqHistory: kind === "support" ? faqHistory : [],
        sessionKind: kind,
        fabricStoreOwnerId:
          kind === "fabric" ? chatContext?.fabricStoreOwnerId : undefined,
        fabricShopId: kind === "fabric" ? chatContext?.fabricShopId : undefined,
        fabricStoreName:
          kind === "fabric" ? chatContext?.fabricStoreName : undefined,
        tailorOwnerId:
          kind === "tailor" ? chatContext?.tailorOwnerId : undefined,
        tailorShopId: kind === "tailor" ? chatContext?.tailorShopId : undefined,
        tailorName: kind === "tailor" ? chatContext?.tailorName : undefined,
      });
      if (!res?.ok || !res.session) {
        setError(
          res?.error === "blocked"
            ? copy.blockedStart
            : res?.error === "rate_limited"
              ? isAr
                ? "محاولات كثيرة. يُرجى الانتظار قليلاً ثم المحاولة من جديد."
                : "Too many attempts. Please wait a moment and try again."
              : res?.error === "store_not_eligible" ||
                  res?.error === "tailor_not_eligible"
                ? isAr
                  ? "يمكنكِ الدردشة فقط مع شركاء تعاملتِ معهم من قبل."
                  : "You can only chat with partners you’ve ordered from."
                : res?.error === "login_required"
                  ? isAr
                    ? "يرجى تسجيل الدخول للدردشة مع هذا الشريك."
                    : "Please sign in to chat with this partner."
                  : copy.startFailed,
        );
        return;
      }
      sessionIdRef.current = res.session.id;
      setSession(res.session);
      setMessages(res.session.messages || []);
      setStep("chat");
      // Viewing the thread → mark agent messages as read.
      getSocket().emit("chat:read", { sessionId: res.session.id });
      publishSupportSessionBound({
        id: res.session.id,
        agentName:
          kind === "fabric"
            ? res.session.fabricStoreName ||
              chatContext?.fabricStoreName ||
              res.session.agent?.name ||
              null
            : kind === "tailor"
              ? res.session.tailorName ||
                chatContext?.tailorName ||
                res.session.agent?.name ||
                null
              : res.session.agent?.name || null,
        agentProfilePic: res.session.agent?.profilePic || null,
      });
    } catch {
      setError(copy.startFailed);
    }
  }, [
    chatContext?.fabricShopId,
    chatContext?.fabricStoreName,
    chatContext?.fabricStoreOwnerId,
    chatContext?.tailorName,
    chatContext?.tailorOwnerId,
    chatContext?.tailorShopId,
    chatContext?.sessionKind,
    copy.startFailed,
    copy.blockedStart,
    initialName,
    isAr,
    locale,
    priorMessages,
  ]);

  useEffect(() => {
    if (!open) {
      resetLocal();
      return;
    }
    if (startedRef.current) return;
    startedRef.current = true;
    void startChat();
  }, [open, resetLocal, startChat]);

  const { scrollToBottom: scrollThreadToBottom } = useChatThreadLenis(
    threadRef,
    open && (step === "chat" || step === "ended"),
    step,
  );

  const {
    nearBottom,
    unseenCount,
    showJump,
    jumpToLatest,
  } = useChatThreadScroll(threadRef, messages.length, {
    enabled: open && (step === "chat" || step === "ended"),
    resetKey: session?.id || null,
  });

  useEffect(() => {
    if (!nearBottom) return;
    scrollThreadToBottom(true);
  }, [messages, step, peerTyping, nearBottom, scrollThreadToBottom]);

  useEffect(() => {
    const id = session?.id;
    if (!id) return;
    const saved = readChatDraft(id);
    setDraft(saved);
  }, [session?.id]);

  const handleMessage = useCallback(
    (payload: { sessionId: string; message: LiveChatMessage }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      setPeerTyping(false);
      setMessages((prev) => {
        if (prev.some((m) => m.id === payload.message.id)) return prev;
        return [...prev, payload.message];
      });

      // Agent message while panel is open → delivered + read.
      if (payload.message.role === "agent") {
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

  const handleTyping = useCallback(
    (payload: {
      sessionId: string;
      typing: boolean;
      from?: "agent" | "customer";
    }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      if (payload.from && payload.from !== "agent") return;
      setPeerTyping(Boolean(payload.typing));
    },
    [],
  );

  const handleStatus = useCallback(
    (payload: {
      sessionId: string;
      messages: { id: string; status: MessageDeliveryStatus }[];
    }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      if (!payload?.messages?.length) return;
      const map = new Map(payload.messages.map((m) => [m.id, m.status]));
      setMessages((prev) =>
        prev.map((m) => (map.has(m.id) ? { ...m, status: map.get(m.id) } : m)),
      );
      // Drop edit mode if the message was just read by the peer.
      setEditingId((id) => {
        if (!id || map.get(id) !== "read") return id;
        setDraft("");
        return null;
      });
    },
    [],
  );

  const isFabricThread = chatContext?.sessionKind === "fabric";
  const isTailorThread = chatContext?.sessionKind === "tailor";

  const partnerPeerName = useCallback(
    (live: LiveSession | null | undefined) => {
      if (isFabricThread) {
        return (
          live?.fabricStoreName ||
          chatContext?.fabricStoreName ||
          live?.agent?.name ||
          null
        );
      }
      if (isTailorThread) {
        return (
          live?.tailorName ||
          chatContext?.tailorName ||
          live?.agent?.name ||
          null
        );
      }
      return live?.agent?.name || null;
    },
    [
      chatContext?.fabricStoreName,
      chatContext?.tailorName,
      isFabricThread,
      isTailorThread,
    ],
  );

  const handleAccepted = useCallback(
    (payload: { session: LiveSession }) => {
      if (!payload?.session) return;
      if (
        sessionIdRef.current &&
        payload.session.id !== sessionIdRef.current
      ) {
        return;
      }
      sessionIdRef.current = payload.session.id;
      setSession(payload.session);
      setMessages(payload.session.messages || []);
      getSocket().emit("chat:read", { sessionId: payload.session.id });
      publishSupportSessionBound({
        id: payload.session.id,
        agentName: partnerPeerName(payload.session),
        agentProfilePic: payload.session.agent?.profilePic || null,
      });
    },
    [partnerPeerName],
  );

  const handleEnded = useCallback(
    (payload: { sessionId: string; endedBy?: "customer" | "agent" }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      endingRef.current = true;
      setPeerTyping(false);
      emitTyping(false);
      setEndedBy(payload.endedBy === "agent" ? "agent" : "customer");
      setStep("ended");
      setDraft("");
      setReplyTo(null);
      setEditingId(null);
      setMenuMsgId(null);
      setInfoMsg(null);
      publishSupportSessionBound({ id: null });
    },
    [emitTyping],
  );

  const handleRestarted = useCallback(
    (payload: { session: LiveSession }) => {
      if (!payload?.session) return;
      if (
        sessionIdRef.current &&
        payload.session.id !== sessionIdRef.current
      ) {
        return;
      }
      sessionIdRef.current = payload.session.id;
      endingRef.current = false;
      setEndedBy(null);
      setRestarting(false);
      setSession(payload.session);
      setMessages(payload.session.messages || []);
      setStep("chat");
      getSocket().emit("chat:read", { sessionId: payload.session.id });
      publishSupportSessionBound({
        id: payload.session.id,
        agentName: partnerPeerName(payload.session),
        agentProfilePic: payload.session.agent?.profilePic || null,
      });
    },
    [partnerPeerName],
  );

  const handleClosed = useCallback(
    (payload: { sessionId: string }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      publishSupportSessionBound({ id: null });
      finishClose();
    },
    [finishClose],
  );

  const handleMessagesDeleted = useCallback(
    (payload: {
      sessionId: string;
      messageIds?: string[];
      deletedBy?: "customer" | "agent";
      session?: LiveSession;
    }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      if (payload.session?.messages) {
        setSession(payload.session);
        setMessages(payload.session.messages);
      } else if (payload.messageIds?.length) {
        const removed = new Set(payload.messageIds);
        const by = payload.deletedBy === "customer" ? "customer" : "agent";
        setMessages((prev) =>
          prev.map((m) =>
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
        );
      }
      setSelectMode(false);
      setSelectedIds(new Set());
      setConfirmDeleteForMe(false);
    },
    [],
  );

  const handleMessagesHidden = useCallback(
    (payload: { sessionId: string; messageIds?: string[] }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      if (!payload.messageIds?.length) return;
      const hidden = new Set(payload.messageIds);
      setMessages((prev) => prev.filter((m) => !hidden.has(m.id)));
      setSelectMode(false);
      setSelectedIds(new Set());
      setConfirmDeleteForMe(false);
    },
    [],
  );

  const handleCleared = useCallback((payload: { sessionId: string }) => {
    if (payload.sessionId !== sessionIdRef.current) return;
    setMessages([]);
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmWipe(null);
    setConfirmDeleteForMe(false);
  }, []);

  const handleMessageEdited = useCallback(
    (payload: { sessionId: string; message?: LiveChatMessage }) => {
      if (payload.sessionId !== sessionIdRef.current || !payload.message) return;
      const next = payload.message;
      setMessages((prev) => {
        if (prev.some((m) => m.id === next.id)) {
          return prev.map((m) => (m.id === next.id ? { ...m, ...next } : m));
        }
        return [...prev, next];
      });
      setEditingId((id) => (id === next.id ? null : id));
    },
    [],
  );

  const handleMessageReacted = useCallback(
    (payload: { sessionId: string; message?: LiveChatMessage }) => {
      if (payload.sessionId !== sessionIdRef.current || !payload.message) return;
      const next = payload.message;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === next.id
            ? { ...m, reactions: next.reactions || [] }
            : m,
        ),
      );
    },
    [],
  );

  const mergePinnedMessages = useCallback((updates: LiveChatMessage[]) => {
    if (!updates.length) return;
    setMessages((prev) => {
      const byId = new Map(updates.map((m) => [m.id, m]));
      return prev.map((m) => {
        const next = byId.get(m.id);
        if (!next) return m;
        return {
          ...m,
          pinnedAt: next.pinnedAt ?? null,
          pinnedBy: next.pinnedBy ?? null,
        };
      });
    });
  }, []);

  const handleMessagePinned = useCallback(
    (payload: {
      sessionId: string;
      message?: LiveChatMessage;
      messages?: LiveChatMessage[];
    }) => {
      if (payload.sessionId !== sessionIdRef.current) return;
      const updates =
        Array.isArray(payload.messages) && payload.messages.length
          ? payload.messages
          : payload.message
            ? [payload.message]
            : [];
      mergePinnedMessages(updates);
    },
    [mergePinnedMessages],
  );

  useSocketEvent("chat:message", handleMessage);
  useSocketEvent("chat:typing", handleTyping);
  useSocketEvent("chat:status", handleStatus);
  useSocketEvent("chat:accepted", handleAccepted);
  useSocketEvent("chat:ended", handleEnded);
  useSocketEvent("chat:restarted", handleRestarted);
  useSocketEvent("chat:closed", handleClosed);
  useSocketEvent("chat:messages-deleted", handleMessagesDeleted);
  useSocketEvent("chat:messages-hidden", handleMessagesHidden);
  useSocketEvent("chat:cleared", handleCleared);
  useSocketEvent("chat:message-edited", handleMessageEdited);
  useSocketEvent("chat:message-reacted", handleMessageReacted);
  useSocketEvent("chat:message-pinned", handleMessagePinned);

  const pushLocalMessage = (message: LiveChatMessage) => {
    setMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) {
        return prev.map((m) => (m.id === message.id ? { ...m, ...message } : m));
      }
      return [...prev, message];
    });
  };

  const clearReplyAndEdit = () => {
    setReplyTo(null);
    setEditingId(null);
  };

  const reactToChatMessage = async (
    msg: LiveChatMessage,
    emoji: ChatReactionEmoji,
  ) => {
    const sid = sessionIdRef.current;
    if (!sid || step === "ended" || msg.deleted) return;
    const myRole = "customer" as const;
    const prevReaction = msg.reactions?.find((r) => r.byRole === myRole)?.emoji;
    const nextReactions =
      prevReaction === emoji
        ? (msg.reactions || []).filter((r) => r.byRole !== myRole)
        : [
            ...(msg.reactions || []).filter((r) => r.byRole !== myRole),
            { emoji, byRole: myRole, at: new Date().toISOString() },
          ];
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, reactions: nextReactions } : m,
      ),
    );
    try {
      const res = await emitWithAck<AckResult>("chat:react", {
        sessionId: sid,
        messageId: msg.id,
        emoji,
      });
      if (res?.ok && res.message) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === res.message!.id
              ? { ...m, reactions: res.message!.reactions || [] }
              : m,
          ),
        );
      }
    } catch {
      /* socket may reconnect; server event will reconcile */
    }
  };

  const flashClearRef = useRef<number | null>(null);
  const [flashMsgId, setFlashMsgId] = useState<string | null>(null);

  const jumpToMessage = useCallback(
    (id: string) => {
      const safeId = String(id || "").trim();
      if (!safeId) return;
      const el = threadRef.current?.querySelector(
        `[data-msg-id="${safeId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`,
      ) as HTMLElement | null;
      if (!el) {
        setAttachNotice(
          isAr ? "الرسالة الأصلية غير متاحة" : "Original message is unavailable",
        );
        return;
      }
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashMsgId(safeId);
      if (flashClearRef.current) window.clearTimeout(flashClearRef.current);
      flashClearRef.current = window.setTimeout(() => {
        setFlashMsgId(null);
        flashClearRef.current = null;
      }, 1600);
    },
    [isAr],
  );

  useEffect(() => {
    return () => {
      if (flashClearRef.current) window.clearTimeout(flashClearRef.current);
    };
  }, []);

  const pinChatMessage = async (msg: LiveChatMessage, pinned: boolean) => {
    const sid = sessionIdRef.current;
    if (!sid || msg.deleted) return;
    const nextPinnedAt = pinned ? new Date().toISOString() : null;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id
          ? {
              ...m,
              pinnedAt: nextPinnedAt,
              pinnedBy: pinned ? "customer" : null,
            }
          : m,
      ),
    );
    try {
      const res = await emitWithAck<{
        ok?: boolean;
        message?: LiveChatMessage;
        messages?: LiveChatMessage[];
      }>("chat:pin", {
        sessionId: sid,
        messageId: msg.id,
        pinned,
      });
      if (res?.ok) {
        const updates =
          Array.isArray(res.messages) && res.messages.length
            ? res.messages
            : res.message
              ? [res.message]
              : [];
        mergePinnedMessages(updates);
      }
    } catch {
      /* reconcile via socket */
    }
  };

  const onMessageMenuAction = async (
    msg: LiveChatMessage,
    action: ChatMessageMenuAction,
  ) => {
    if (action === "reply") {
      setEditingId(null);
      setReplyTo({
        id: msg.id,
        role: msg.role,
        kind: msg.kind || "text",
        text: replyPreviewOf(msg),
        senderName: msg.senderName,
      });
      return;
    }
    if (action === "pin") {
      void pinChatMessage(msg, true);
      return;
    }
    if (action === "unpin") {
      void pinChatMessage(msg, false);
      return;
    }
    if (action === "edit") {
      if (msg.status === "read") return;
      setReplyTo(null);
      setEditingId(msg.id);
      setDraft(msg.caption || msg.text || "");
      return;
    }
    if (action === "copy") {
      const text = (msg.caption || msg.text || "").trim();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        setCopyToast(copy.copied);
      } catch {
        setAttachNotice(copy.copyFailed);
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
      setConfirmDeleteForMe(true);
    }
  };

  const sendMessage = async () => {
    if (!session || sending || voice.recording) return;
    if (attachStatus === "preparing") return;
    const text = draft.trim();
    const attachment = pendingAttachmentRef.current;
    if (!text && !attachment) return;
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    emitTyping(false);
    setSending(true);
    setDraft("");
    clearChatDraft(session.id);
    if (attachment) {
      setAttachStatus("sending");
      setAttachProgress(null);
    }
    const replyToId = replyTo?.id;
    const editId = editingId;
    setReplyTo(null);
    setEditingId(null);
    try {
      if (editId) {
        const res = await emitWithAck<AckResult>("chat:edit", {
          sessionId: session.id,
          messageId: editId,
          text,
        });
        if (!res?.ok) {
          setDraft(text);
          writeChatDraft(session.id, text);
          setEditingId(editId);
        } else if (res.message) {
          pushLocalMessage(res.message);
        }
        return;
      }
      const res = await emitWithAck<AckResult>(
        "chat:send",
        attachment
          ? {
              sessionId: session.id,
              kind: attachment.kind,
              text,
              data: attachment.data,
              fileName: attachment.fileName,
              mimeType: attachment.mimeType,
              fileSize: attachment.fileSize,
              replyToId,
            }
          : {
              sessionId: session.id,
              text,
              replyToId,
            },
      );
      if (!res?.ok) {
        setDraft(text);
        writeChatDraft(session.id, text);
        if (replyToId) {
          const prev = messages.find((m) => m.id === replyToId);
          if (prev) {
            setReplyTo({
              id: prev.id,
              role: prev.role,
              kind: prev.kind || "text",
              text: replyPreviewOf(prev),
              senderName: prev.senderName,
            });
          }
        }
        if (attachment) {
          pendingAttachmentRef.current = attachment;
          setPendingAttachment(attachment);
          setAttachStatus("failed");
          setAttachNotice(
            res.error === "rate_limited"
              ? isAr
                ? "إرسال سريع جداً. انتظري قليلاً ثم أعيدي المحاولة."
                : "Sending too fast. Wait a moment, then tap Retry."
              : isAr
                ? "تعذر إرسال المرفق. أعد المحاولة."
                : "Could not send the attachment. Tap Retry.",
          );
        } else if (res.error === "rate_limited") {
          setAttachNotice(
            isAr
              ? "إرسال سريع جداً. انتظري قليلاً ثم أعيدي المحاولة."
              : "Sending too fast. Wait a moment and try again.",
          );
        }
      } else if (res.message) {
        if (attachment) clearPendingAttachment();
        pushLocalMessage(res.message);
      }
    } catch {
      setDraft(text);
      writeChatDraft(session.id, text);
      if (editId) setEditingId(editId);
      if (attachment) {
        pendingAttachmentRef.current = attachment;
        setPendingAttachment(attachment);
        setAttachStatus("failed");
        setAttachNotice(
          isAr
            ? "تعذر إرسال المرفق. أعد المحاولة."
            : "Could not send the attachment. Tap Retry.",
        );
      }
    } finally {
      setSending(false);
    }
  };

  const startVoiceNote = async () => {
    if (!session || sending || voice.recording || hasDraft) return;
    if (typingIdleRef.current) clearTimeout(typingIdleRef.current);
    emitTyping(false);
    const result = await voice.start();
    if (result === "mic_denied") setAttachNotice(copy.micDenied);
  };

  const cancelVoiceNote = () => {
    voice.cancel();
  };

  const sendVoiceNote = async () => {
    if (!session || sending) return;
    const attachment = pendingAttachmentRef.current;
    setSending(true);
    try {
      const clip = await voice.stop();
      if (!clip) return;
      clearPendingAttachment();
      const res = await emitWithAck<AckResult>("chat:send", {
        sessionId: session.id,
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
      if (!res?.ok) {
        if (attachment) {
          pendingAttachmentRef.current = attachment;
          setPendingAttachment(attachment);
          setAttachStatus("ready");
        }
      } else if (res.message) {
        pushLocalMessage(res.message);
      }
    } catch {
      if (attachment) {
        pendingAttachmentRef.current = attachment;
        setPendingAttachment(attachment);
        setAttachStatus("ready");
      }
    } finally {
      setSending(false);
    }
  };

  const stageAttachment = async (file: File, kind: ChatAttachKind) => {
    if (!session || sending || voice.recording) return;
    const fileName = (file.name || "file")
      .replace(/[\\/:*?"<>|]/g, "_")
      .slice(0, 120);
    const previewUrl =
      kind === "image" ? URL.createObjectURL(file) : "";
    const stub: PreparedChatAttachment = {
      kind: kind === "image" ? "image" : "file",
      fileName,
      mimeType: file.type || "",
      fileSize: file.size,
      data: previewUrl,
    };
    pendingAttachmentRef.current = null;
    setPendingAttachment(stub);
    setAttachStatus("preparing");
    setAttachProgress(0);
    setAttachOpen(false);
    setAttachNotice("");
    const prepared = await prepareChatAttachment(file, kind, (pct) => {
      setAttachProgress(pct);
    });
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (!prepared.ok) {
      clearPendingAttachment();
      setAttachNotice(
        attachmentErrorMessage(prepared.error, isAr, {
          kind,
          fileName: file.name,
        }),
      );
      return;
    }
    pendingAttachmentRef.current = prepared.attachment;
    setPendingAttachment(prepared.attachment);
    setAttachStatus("ready");
    setAttachProgress(null);
  };

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

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const toggleSelectMessage = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedHasOthers = [...selectedIds].some((id) => {
    const msg = messages.find((m) => m.id === id);
    return msg && msg.role !== "customer";
  });

  const requestDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (selectedHasOthers) {
      setConfirmDeleteForMe(true);
      return;
    }
    void runDeleteSelected();
  };

  const clearChatMessages = async () => {
    const sessionId = session?.id || sessionIdRef.current;
    if (!sessionId) return;
    setConfirmWipe(null);
    try {
      const res = await emitWithAck<AckResult>("chat:clear", { sessionId });
      if (!res?.ok) {
        setError(copy.clearFailed);
        return;
      }
      setMessages([]);
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      setError(copy.clearFailed);
    }
  };

  const runDeleteSelected = async () => {
    const sessionId = session?.id || sessionIdRef.current;
    if (!sessionId || selectedIds.size === 0) return;
    const ids = [...selectedIds];
    setConfirmDeleteForMe(false);
    try {
      const res = await emitWithAck<
        AckResult & { mineIds?: string[]; otherIds?: string[] }
      >("chat:delete-messages", {
        sessionId,
        messageIds: ids,
      });
      if (!res?.ok) {
        setError(copy.deleteFailed);
        return;
      }
      if (res.session?.messages) {
        setSession(res.session);
        setMessages(res.session.messages);
      } else {
        const mine = new Set(res.mineIds || []);
        const others = new Set(res.otherIds || []);
        setMessages((prev) =>
          prev
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
                    deletedBy: "customer" as const,
                  }
                : m,
            ),
        );
      }
      setSelectMode(false);
      setSelectedIds(new Set());
    } catch {
      setError(copy.deleteFailed);
    }
  };

  const restartChat = async () => {
    if (!session || restarting) return;
    setRestarting(true);
    try {
      const res = await emitWithAck<AckResult>("chat:restart", {
        sessionId: session.id,
      });
      if (!res?.ok || !res.session) {
        setRestarting(false);
        return;
      }
      handleRestarted({ session: res.session });
    } catch {
      setRestarting(false);
    }
  };

  const endChat = async () => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || step === "ended") return;
    try {
      const res = await emitWithAck<{ ok?: boolean; endedBy?: string }>(
        "chat:end",
        { sessionId },
      );
      if (!res?.ok) return;
      handleEnded({
        sessionId,
        endedBy: res.endedBy === "agent" ? "agent" : "customer",
      });
    } catch {
      /* ignore */
    }
  };

  const agentName =
    (isFabricThread &&
      (session?.fabricStoreName || chatContext?.fabricStoreName)) ||
    (isTailorThread && (session?.tailorName || chatContext?.tailorName)) ||
    session?.agent?.name ||
    copy.agentFallback;
  // Never show agent/store/tailor online or last-seen to the customer.
  const statusLine =
    step === "ended"
      ? endedBy === "agent"
        ? copy.endedByAgent
        : copy.endedByYou
      : peerTyping
        ? copy.typing
        : session?.status === "waiting" || !session?.agent
          ? copy.waiting
          : null;
  const chatLocked = step === "ended";
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: isAr ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: isAr ? -16 : 16 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      data-lenis-prevent
      data-lenis-prevent-wheel
      className="absolute inset-0 z-20 flex min-h-0 flex-col overflow-hidden bg-[#FFFDF9]"
    >
      <header className="relative z-40 shrink-0 overflow-visible bg-black px-2.5 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] text-white xs:px-3.5 xs:pb-3 sm:px-4 sm:pb-3.5 sm:pt-[max(0.875rem,env(safe-area-inset-top))]">
        <div className="relative flex items-center gap-1.5 xs:gap-2 sm:gap-2.5">
          {/* WhatsApp Web-style contact avatar beside title */}
          <ChatAvatar
            name={agentName}
            src={session?.agent?.profilePic}
            brand={!session?.agent}
            size="md"
            online={false}
            className="ring-2 ring-white/15"
          />
          <div className="min-w-0 flex-1">
            <h2 className="chat-text-title truncate font-light tracking-tight [font-family:var(--font-display)]">
              {agentName}
            </h2>
            {step === "chat" || step === "ended" ? (
              statusLine ? (
                <p className="chat-text-subtitle mt-0.5 truncate uppercase tracking-[0.14em] text-white/65 [font-family:var(--font-ui)]">
                  {statusLine}
                </p>
              ) : null
            ) : step === "connecting" && !error ? (
              <p className="chat-text-subtitle mt-0.5 uppercase tracking-[0.14em] text-white/65 [font-family:var(--font-ui)]">
                {copy.starting}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            aria-label={copy.searchMessages}
            title={copy.searchMessages}
            aria-pressed={threadSearchOpen}
            onClick={() => {
              setHeaderMenuOpen(false);
              setThreadSearchOpen((v) => {
                if (v) setThreadSearch("");
                return !v;
              });
            }}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors duration-150 hover:cursor-pointer hover:bg-white hover:text-black sm:h-9 sm:w-9 ${
              threadSearchOpen ? "bg-white text-black" : ""
            }`}
          >
            <Search
              className="pointer-events-none h-4 w-4 sm:h-5 sm:w-5"
              strokeWidth={1.75}
            />
          </button>
          {/* Desktop only: expand live agent chat */}
          <button
            type="button"
            onClick={() => {
              setHeaderMenuOpen(false);
              setExpandedSafe(!expanded);
            }}
            aria-label={expanded ? copy.collapse : copy.expand}
            aria-pressed={expanded}
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition hover:cursor-pointer hover:bg-white hover:text-black md:flex"
          >
            {expanded ? (
              <Minimize2 className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Maximize2 className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
          <div ref={headerMenuRef} className="relative z-50 shrink-0">
            <button
              type="button"
              aria-label={copy.chatOptions}
              aria-expanded={headerMenuOpen}
              aria-haspopup="menu"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setHeaderMenuOpen((v) => !v);
              }}
              className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors duration-150 hover:cursor-pointer hover:bg-white hover:text-black ${
                headerMenuOpen ? "bg-white text-black" : ""
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
                className="absolute end-0 top-full z-[200] mt-1.5 max-h-[min(70vh,28rem)] w-max max-w-[min(100vw-2rem,16rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-[#E8E8E4] bg-white shadow-[0_12px_40px_rgba(0,0,0,0.18)]"
              >
                {(
                  [
                    {
                      key: "contact",
                      label: copy.contactInfo,
                      icon: Info,
                      tone: "default" as const,
                      onPick: () => {
                        setHeaderMenuOpen(false);
                        setHeaderPanel("contact");
                      },
                    },
                    {
                      key: "select",
                      label: copy.selectMessages,
                      icon: CheckSquare,
                      tone: "default" as const,
                      onPick: () => {
                        setHeaderMenuOpen(false);
                        setThreadSearchOpen(false);
                        setThreadSearch("");
                        setSelectMode(true);
                        setSelectedIds(new Set());
                      },
                    },
                    {
                      key: "clear",
                      label: copy.clearChat,
                      icon: Eraser,
                      tone: "default" as const,
                      onPick: () => {
                        setHeaderMenuOpen(false);
                        setConfirmWipe("clear");
                      },
                    },
                    {
                      key: "deleteAll",
                      label: copy.deleteAll,
                      icon: Trash2,
                      tone: "danger" as const,
                      onPick: () => {
                        setHeaderMenuOpen(false);
                        setConfirmWipe("deleteAll");
                      },
                    },
                    {
                      key: "close",
                      label: copy.closeWidget,
                      icon: XCircle,
                      tone: "default" as const,
                      onPick: () => {
                        setHeaderMenuOpen(false);
                        closeWidget();
                      },
                    },
                    ...(!chatLocked
                      ? [
                          {
                            key: "end",
                            label: copy.endChat,
                            icon: PhoneOff,
                            tone: "danger" as const,
                            onPick: () => {
                              setHeaderMenuOpen(false);
                              setConfirmEnd(true);
                            },
                          },
                        ]
                      : []),
                    ...(chatLocked
                      ? [
                          {
                            key: "continue",
                            label: copy.continueChat,
                            icon: PhoneOff,
                            tone: "default" as const,
                            onPick: () => {
                              setHeaderMenuOpen(false);
                              void restartChat();
                            },
                          },
                        ]
                      : []),
                  ] as const
                ).map((item, index) => {
                  const Icon = item.icon;
                  const showDivider = index === 2 || index === 5;
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
                        className={`group flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-start text-[12px] transition-colors duration-150 hover:cursor-pointer [font-family:var(--font-body)] ${
                          item.tone === "danger"
                            ? "text-[#B42318] hover:bg-[#FFF5F5]"
                            : "text-[#111B21] hover:bg-[#F0EFEC]"
                        }`}
                      >
                        <Icon
                          className={`pointer-events-none h-3.5 w-3.5 shrink-0 transition-colors duration-150 ${
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
          isAr={isAr}
          placeholder={copy.searchPlaceholder}
        />
      ) : null}

      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-0 flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center"
          >
            <p className="[font-family:var(--font-body)] text-[13px] text-red-700">
              {error}
            </p>
            <button
              type="button"
              onClick={() => {
                startedRef.current = true;
                void startChat();
              }}
              className="rounded-full bg-black px-4 py-2.5 [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.16em] text-white hover:cursor-pointer"
            >
              {copy.retry}
            </button>
          </motion.div>
        ) : step === "connecting" ? (
          <motion.div
            key="connecting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-1 items-center justify-center px-6"
          >
            <p className="[font-family:var(--font-body)] text-[13px] text-[#8A8A80]">
              {copy.starting}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-0 flex min-h-0 flex-1 flex-col"
          >
            {copyToast ? (
              <div
                className={`pointer-events-none absolute inset-x-0 bottom-24 z-30 flex justify-center px-4 transition-opacity duration-500 ${
                  copyToastShown ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="rounded-full bg-[#111B21]/90 px-3.5 py-1.5 text-[12px] text-white shadow-lg [font-family:var(--font-body)]">
                  {copyToast}
                </p>
              </div>
            ) : null}
            {selectMode ? (
              <div className="relative z-[1] flex shrink-0 items-center justify-between gap-3 border-b border-[#E8E8E4] bg-white px-3 py-2 sm:px-4">
                <button
                  type="button"
                  onClick={() => {
                    setSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="text-[12px] text-[#54656F] transition hover:text-black hover:cursor-pointer [font-family:var(--font-body)]"
                >
                  {copy.cancelSelect}
                </button>
                <p className="text-[12px] text-black [font-family:var(--font-body)]">
                  {copy.selectedCount(selectedIds.size)}
                </p>
                <button
                  type="button"
                  disabled={selectedIds.size === 0}
                  onClick={requestDeleteSelected}
                  className="text-[12px] text-[#B42318] transition hover:cursor-pointer disabled:opacity-40 disabled:hover:cursor-not-allowed [font-family:var(--font-body)]"
                >
                  {copy.deleteSelected}
                </button>
              </div>
            ) : null}
            <div className="relative min-h-0 flex-1">
            <div
              ref={threadRef}
              data-chat-scroll
              className="h-full min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain touch-pan-y bg-[#F7F5F0] px-2.5 py-3 [-webkit-overflow-scrolling:touch] xs:px-3 sm:px-3.5 sm:py-3.5"
            >
              <ChatPinnedMessagesBar
                messages={messages}
                isAr={isAr}
                onJump={jumpToMessage}
                onUnpin={(id) => {
                  const msg = messages.find((m) => m.id === id);
                  if (msg) void pinChatMessage(msg, false);
                }}
              />
              <div className="space-y-3">
              {messages.map((msg, index, list) => {
                const isMatch =
                  searchQuery.length > 0 && matchIds.includes(msg.id);
                const isActiveMatch =
                  isMatch &&
                  matchIds[
                    Math.min(activeMatchIndex, Math.max(0, matchIds.length - 1))
                  ] === msg.id;
                const dimWhileSearch =
                  searchQuery.length > 0 && !isMatch && msg.role !== "system";
                const prevMsg = index > 0 ? list[index - 1] : null;
                const day = messageDayKey(msg.at);
                const showDateBadge =
                  Boolean(day) &&
                  (!prevMsg || messageDayKey(prevMsg.at) !== day);
                const dateBadge = showDateBadge ? (
                  <div className="flex justify-center py-1.5">
                    <p className="chat-text-system rounded-full bg-[#FFFFFFCC] px-2.5 py-0.5 text-center text-[#54656F] shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-3.5 sm:py-1">
                      {formatThreadDateBadge(msg.at, {
                        isAr,
                        locale: locale || (isAr ? "ar-AE" : "en-AE"),
                      })}
                    </p>
                  </div>
                ) : null;

                if (msg.kind === "call") {
                  // Successful talk → center. Customer cancel → right. Agent cancel → left.
                  const callAlign =
                    msg.role === "system" || msg.callOutcome === "answered"
                      ? "center"
                      : msg.role === "customer"
                        ? "end"
                        : "start";
                  const callMine = callAlign === "end";
                  const callSelected = selectedIds.has(msg.id);
                  const callCanSelect = selectMode && !msg.deleted;
                  return (
                    <Fragment key={msg.id}>
                      {dateBadge}
                    <div
                      data-msg-id={msg.id}
                      className={callCanSelect ? "cursor-pointer" : undefined}
                      onClick={() => {
                        if (!callCanSelect) return;
                        toggleSelectMessage(msg.id);
                      }}
                    >
                      <CallHistoryBubble
                        text={msg.text}
                        callOutcome={msg.callOutcome}
                        durationMs={msg.durationMs}
                        at={msg.at}
                        locale={locale}
                        align={callAlign}
                        searchQuery={searchQuery}
                        searchActive={isActiveMatch}
                        dimmed={dimWhileSearch}
                        leading={
                          selectMode ? (
                            <span
                              aria-hidden
                              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                                callSelected
                                  ? "border-black bg-black text-white"
                                  : "border-[#C8C8C0] bg-white text-transparent"
                              }`}
                            >
                              ✓
                            </span>
                          ) : null
                        }
                        onContextMenu={(e) => {
                          if (selectMode || chatLocked) return;
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuMsgId(msg.id);
                        }}
                        menu={
                          !selectMode && !chatLocked ? (
                            <ChatMessageMenu
                              open={menuMsgId === msg.id}
                              onOpenChange={(next) =>
                                setMenuMsgId(next ? msg.id : null)
                              }
                              mine={callMine}
                              onDark={callMine}
                              callBadge
                              hideTrigger
                              isAr={isAr}
                              menuAlign={
                                callAlign === "end" ? "start" : "end"
                              }
                              onAction={(action) =>
                                void onMessageMenuAction(msg, action)
                              }
                            />
                          ) : null
                        }
                      />
                    </div>
                    </Fragment>
                  );
                }
                if (msg.role === "system") {
                  return (
                    <Fragment key={msg.id}>
                      {dateBadge}
                    <div
                      data-msg-id={msg.id}
                      className={`flex justify-center py-1.5 transition-opacity ${
                        searchQuery && !isMatch ? "opacity-35" : ""
                      } ${isActiveMatch ? "opacity-100" : ""}`}
                    >
                      <p className="chat-text-system max-w-[92%] rounded-full bg-[#FFFFFFCC] px-2.5 py-0.5 text-center text-[#667781] shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:px-3.5 sm:py-1">
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
                    </Fragment>
                  );
                }
                const mine = msg.role === "customer";
                const selected = selectedIds.has(msg.id);
                const canSelect = selectMode && !msg.deleted;
                return (
                  <Fragment key={msg.id}>
                    {dateBadge}
                  <div
                    data-msg-id={msg.id}
                    className={`flex items-center gap-2 transition-opacity ${mine ? "justify-end" : "justify-start"} ${
                      canSelect ? "cursor-pointer" : ""
                    } ${dimWhileSearch ? "opacity-35" : "opacity-100"}`}
                    onClick={() => {
                      if (!canSelect) return;
                      toggleSelectMessage(msg.id);
                    }}
                  >
                    {selectMode ? (
                      <span
                        aria-hidden
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                          selected
                            ? "border-black bg-black text-white"
                            : msg.deleted
                              ? "border-[#E0E0D8] bg-[#F5F5F0] text-transparent"
                              : "border-[#C8C8C0] bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    ) : null}
                    <div
                      className={`group relative w-fit min-w-[8.75rem] max-w-[min(92%,18rem)] px-2.5 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] xs:max-w-[min(88%,20rem)] xs:px-3 sm:min-w-[9.5rem] sm:max-w-[82%] ${
                        mine
                          ? "rounded-[7.5px] rounded-tr-none bg-black/80 text-white"
                          : "rounded-[7.5px] rounded-tl-none border border-[#EBEBE8] bg-[#FFFDF9] text-black"
                      } ${selected ? "ring-2 ring-black/25" : ""} ${
                        flashMsgId === msg.id || isActiveMatch
                          ? "ring-2 ring-[#FFEB3B] ring-offset-1 ring-offset-transparent"
                          : isMatch
                            ? "ring-1 ring-[#FFF59D]/80"
                            : ""
                      } ${
                        !msg.deleted && (msg.reactions?.length || 0) > 0
                          ? "mb-3"
                          : ""
                      }`}
                      onContextMenu={(e) => {
                        if (selectMode || chatLocked) return;
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuMsgId(msg.id);
                      }}
                    >
                      <span
                        aria-hidden
                        className={`pointer-events-none absolute top-0 h-0 w-0 border-y-[6px] border-y-transparent ${
                          mine
                            ? "-right-[6px] border-l-[6px] border-l-black/80"
                            : "-left-[6px] border-r-[6px] border-r-[#FFFDF9]"
                        }`}
                      />
                      {!msg.deleted && !selectMode && !chatLocked ? (
                        <ChatReactionBar
                          myReaction={
                            msg.reactions?.find((r) => r.byRole === "customer")
                              ?.emoji || null
                          }
                          onReact={(emoji) =>
                            void reactToChatMessage(msg, emoji)
                          }
                          align={mine ? "end" : "start"}
                          isAr={isAr}
                        />
                      ) : null}
                      {!msg.deleted && (msg.reactions?.length || 0) > 0 ? (
                        <ChatReactionChips
                          reactions={msg.reactions || []}
                          myRole="customer"
                          mine={mine}
                          disabled={chatLocked || selectMode}
                          onToggle={(emoji) =>
                            void reactToChatMessage(msg, emoji)
                          }
                        />
                      ) : null}
                      {msg.deleted ? (
                        !selectMode && !chatLocked ? (
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
                              isAr={isAr}
                              menuAlign={mine ? "start" : "end"}
                              onAction={(action) =>
                                void onMessageMenuAction(msg, action)
                              }
                            />
                          </div>
                        ) : null
                      ) : (
                        <div className="mb-0.5 flex items-center justify-between gap-2">
                          {mine ? (
                            <>
                              {!selectMode && !chatLocked ? (
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
                                      msg.status !== "read" &&
                                      (msg.kind === "text" ||
                                        msg.kind === "image" ||
                                        msg.kind === "file" ||
                                        !msg.kind)
                                    }
                                    canCopy={Boolean(
                                      (msg.caption || msg.text || "").trim(),
                                    )}
                                    canPin
                                    isPinned={Boolean(msg.pinnedAt)}
                                    isAr={isAr}
                                    menuAlign="start"
                                    myReaction={
                                      msg.reactions?.find(
                                        (r) => r.byRole === "customer",
                                      )?.emoji || null
                                    }
                                    onReact={(emoji) =>
                                      void reactToChatMessage(msg, emoji)
                                    }
                                    onAction={(action) =>
                                      void onMessageMenuAction(msg, action)
                                    }
                                  />
                                </div>
                              ) : (
                                <span />
                              )}
                              <p
                                className={`chat-text-meta min-w-0 truncate text-end font-medium ${
                                  mine ? "text-white/75" : "text-[#8A8A80]"
                                }`}
                              >
                                {isAr ? "أنت" : "You"}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="chat-text-meta min-w-0 flex-1 truncate text-start font-medium text-[#8A8A80]">
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
                                  copy.agentFallback
                                )}
                              </p>
                              {!selectMode && !chatLocked ? (
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
                                    canPin
                                    isPinned={Boolean(msg.pinnedAt)}
                                    isAr={isAr}
                                    menuAlign="end"
                                    myReaction={
                                      msg.reactions?.find(
                                        (r) => r.byRole === "customer",
                                      )?.emoji || null
                                    }
                                    onReact={(emoji) =>
                                      void reactToChatMessage(msg, emoji)
                                    }
                                    onAction={(action) =>
                                      void onMessageMenuAction(msg, action)
                                    }
                                  />
                                </div>
                              ) : null}
                            </>
                          )}
                        </div>
                      )}
                      {msg.replyTo ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (msg.replyTo?.id) jumpToMessage(msg.replyTo.id);
                          }}
                          className={`mb-1.5 w-full rounded-md border-s-[3px] px-2 py-1 text-start transition hover:cursor-pointer ${
                            mine
                              ? "border-s-white/70 bg-white/10 hover:bg-white/15"
                              : "border-s-black bg-black/[0.04] hover:bg-black/[0.07]"
                          }`}
                          title={isAr ? "الانتقال إلى الرسالة" : "Jump to message"}
                        >
                          <p
                            className={`chat-text-meta truncate font-medium ${
                              mine ? "text-white/80" : "text-[#54656F]"
                            }`}
                          >
                            {msg.replyTo.senderName ||
                              (msg.replyTo.role === "customer"
                                ? isAr
                                  ? "أنت"
                                  : "You"
                                : copy.agentFallback)}
                          </p>
                          <p
                            className={`chat-text-list-preview truncate ${
                              mine ? "text-white/65" : "text-[#8A8A80]"
                            }`}
                          >
                            {msg.replyTo.text}
                          </p>
                        </button>
                      ) : null}
                      {(() => {
                        const metaInline = (
                          <span
                            className={`chat-text-time chat-text-time-inline tabular-nums ${
                              mine ? "text-white/55" : "text-[#8A8A80]"
                            }`}
                          >
                            {msg.editedAt ? (
                              <span className="normal-case">{copy.edited}</span>
                            ) : null}
                            {formatTime(msg.at, locale)}
                            {mine && !msg.deleted ? (
                              <MessageStatusTicks
                                status={msg.status || "sent"}
                                onDark
                              />
                            ) : null}
                          </span>
                        );
                        const metaRow = (
                          <p
                            className={`chat-text-time mt-0.5 flex items-center justify-end gap-1 tabular-nums ${
                              mine ? "text-white/55" : "text-[#8A8A80]"
                            }`}
                          >
                            {msg.editedAt ? (
                              <span className="normal-case">{copy.edited}</span>
                            ) : null}
                            {formatTime(msg.at, locale)}
                            {mine && !msg.deleted ? (
                              <MessageStatusTicks
                                status={msg.status || "sent"}
                                onDark
                              />
                            ) : null}
                          </p>
                        );
                        const textBodyClass =
                          "chat-text-body whitespace-pre-wrap break-words after:clear-both after:table";

                        if (msg.deleted) {
                          return (
                            <p
                              className={`italic ${textBodyClass} ${
                                mine ? "text-white/70" : "text-[#8A8A80]"
                              }`}
                            >
                              {msg.deletedBy === "customer"
                                ? isAr
                                  ? "حذفت هذه الرسالة"
                                  : "You deleted this message"
                                : isAr
                                  ? "حذف وكيل دعم MOTD هذه الرسالة"
                                  : "MOTD Support Agent deleted this message"}
                              {metaInline}
                            </p>
                          );
                        }

                        if (msg.kind === "voice" && msg.audio) {
                          return (
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
                                  mimeType={msg.mimeType}
                                  onDark={mine}
                                />
                              ) : null}
                              <VoiceNoteBubble
                                audio={msg.audio}
                                durationMs={msg.durationMs}
                                onDark={mine}
                              />
                              {metaRow}
                            </div>
                          );
                        }

                        if (msg.kind === "image" && msg.data) {
                          return (
                            <div className="space-y-1">
                              <ChatAttachmentBubble
                                kind="image"
                                data={msg.data}
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                mimeType={msg.mimeType}
                                onDark={mine}
                              />
                              {msg.caption ? (
                                <div className="space-y-0">
                                  <p className={textBodyClass}>
                                    <ChatLinkedText
                                      text={msg.caption}
                                      query={searchQuery}
                                      active={isActiveMatch}
                                      onDark={mine}
                                    />
                                    {metaInline}
                                  </p>
                                  <ChatLinkPreviews
                                    text={msg.caption}
                                    onDark={mine}
                                  />
                                </div>
                              ) : (
                                metaRow
                              )}
                            </div>
                          );
                        }

                        if (msg.kind === "file" && msg.data) {
                          return (
                            <div className="space-y-1">
                              <ChatAttachmentBubble
                                kind="file"
                                data={msg.data}
                                fileName={msg.fileName}
                                fileSize={msg.fileSize}
                                mimeType={msg.mimeType}
                                onDark={mine}
                              />
                              {msg.caption ? (
                                <div className="space-y-0">
                                  <p className={textBodyClass}>
                                    <ChatLinkedText
                                      text={msg.caption}
                                      query={searchQuery}
                                      active={isActiveMatch}
                                      onDark={mine}
                                    />
                                    {metaInline}
                                  </p>
                                  <ChatLinkPreviews
                                    text={msg.caption}
                                    onDark={mine}
                                  />
                                </div>
                              ) : (
                                metaRow
                              )}
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-0">
                            <p className={textBodyClass}>
                              <ChatLinkedText
                                text={msg.text}
                                query={searchQuery}
                                active={isActiveMatch}
                                onDark={mine}
                              />
                              {metaInline}
                            </p>
                            <ChatLinkPreviews text={msg.text} onDark={mine} />
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  </Fragment>
                );
              })}

              {!chatLocked && peerTyping ? (
                <ChatTypingBubble label={copy.typing} />
              ) : null}

              {chatLocked ? (
                <div className="flex justify-center py-3">
                  <div className="max-w-[90%] rounded-[7.5px] bg-[#FFFFFFE6] px-3.5 py-1.5 text-center shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] backdrop-blur-sm">
                    <p className="chat-text-system text-[#54656F]">
                      {endedBy === "agent"
                        ? copy.endedByAgent
                        : copy.endedByYou}
                    </p>
                  </div>
                </div>
              ) : null}
              </div>
            </div>
            <ChatJumpToLatest
              visible={showJump}
              count={unseenCount}
              isAr={isAr}
              onJump={() => jumpToLatest(scrollThreadToBottom)}
            />
            </div>

            <div className="shrink-0 bg-transparent px-2 py-1.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] sm:px-3 sm:py-2">
              {chatLocked ? (
                <button
                  type="button"
                  disabled={restarting}
                  onClick={() => void restartChat()}
                  className="w-full rounded-full bg-black px-4 py-3 [font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-40 hover:cursor-pointer disabled:hover:cursor-not-allowed"
                >
                  {restarting ? copy.restarting : copy.continueChat}
                </button>
              ) : (
                <>
                  {attachNotice ? (
                    <div
                      role="alert"
                      className="mb-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-start shadow-sm"
                    >
                      <p className="min-w-0 flex-1 [font-family:var(--font-body)] text-[12px] leading-snug text-red-800 sm:text-[13px]">
                        {attachNotice}
                      </p>
                      <button
                        type="button"
                        aria-label={isAr ? "إغلاق" : "Dismiss"}
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
                          {editingId ? copy.editing : copy.replying}
                        </p>
                        <p className="truncate text-[12px] text-[#667781] [font-family:var(--font-body)]">
                          {editingId
                            ? draft || "…"
                            : replyTo?.text || ""}
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label={copy.cancelEdit}
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
                      isAr={isAr}
                      status={attachStatus}
                      progress={attachProgress}
                      onRetry={() => void sendMessage()}
                    />
                  ) : null}
                  {voice.recording ? (
                    <div className="chat-composer-shell flex w-full items-center gap-1 rounded-full bg-white px-1.5 py-0.5 shadow-sm sm:py-1">
                      <button
                        type="button"
                        onClick={cancelVoiceNote}
                        aria-label={copy.cancelRecording}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#E53935] transition hover:bg-[#FFF5F5] hover:cursor-pointer"
                      >
                        <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                      </button>
                      <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-[#E53935]" />
                      <span className="[font-family:var(--font-ui)] text-[13px] tabular-nums text-[#111B21]">
                        {formatRecordingTime(voice.elapsedMs)}
                      </span>
                      <span className="min-w-0 flex-1 truncate [font-family:var(--font-body)] text-[13px] text-[#667781]">
                        {copy.recording}
                      </span>
                      <button
                        type="button"
                        disabled={sending}
                        onClick={() => void sendVoiceNote()}
                        aria-label={copy.send}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black text-white disabled:opacity-35 hover:cursor-pointer"
                      >
                        <Send
                          className={`h-4 w-4 ${isAr ? "-scale-x-100" : ""}`}
                          strokeWidth={1.75}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="relative w-full">
                      <ChatEmojiPicker
                        open={emojiOpen}
                        onClose={() => setEmojiOpen(false)}
                        onPick={(emoji) =>
                          insertAtCursor(
                            composerRef.current,
                            draft,
                            emoji,
                            (next) => onDraftChange(next),
                          )
                        }
                        isAr={isAr}
                      />
                      <div className="chat-composer-shell relative flex w-full items-end gap-0.5 rounded-full bg-white px-1.5 py-0.5 shadow-sm sm:py-1">
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
                          aria-label={isAr ? "إرفاق" : "Attach"}
                          aria-expanded={attachOpen}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setEmojiOpen(false);
                            setAttachOpen((v) => !v);
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer disabled:opacity-40"
                        >
                          <Paperclip className="h-5 w-5" strokeWidth={1.5} />
                        </button>
                        <ChatAttachMenu
                          open={attachOpen}
                          onClose={() => setAttachOpen(false)}
                          onPick={onAttachMenuPick}
                          isAr={isAr}
                          compact
                        />
                      </div>
                      <div className="relative mb-0.5">
                        <button
                          type="button"
                          tabIndex={-1}
                          data-chat-emoji-toggle
                          aria-label={isAr ? "رموز تعبيرية" : "Emoji"}
                          aria-expanded={emojiOpen}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setAttachOpen(false);
                            setEmojiOpen((v) => !v);
                          }}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer ${
                            emojiOpen ? "bg-black/5 text-black" : ""
                          }`}
                        >
                          <Smile className="h-5 w-5" strokeWidth={1.5} />
                        </button>
                      </div>
                      <textarea
                        ref={composerRef}
                        value={draft}
                        onChange={(e) => onDraftChange(e.target.value)}
                        onKeyDown={onComposerKeyDown}
                        rows={1}
                        dir="auto"
                        placeholder={
                          pendingAttachment
                            ? isAr
                              ? "أضيفي تعليقاً…"
                              : "Add a caption…"
                            : copy.placeholder
                        }
                        className="chat-composer-input max-h-28 min-w-0 flex-1 resize-none bg-transparent py-1 pe-1 text-[#111B21] outline-none placeholder:text-[#667781] sm:py-1.5"
                      />
                      <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
                        {!hasDraft ? (
                          <button
                            type="button"
                            disabled={sending || !voice.supported}
                            onClick={() => void startVoiceNote()}
                            aria-label={copy.voice}
                            className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer disabled:opacity-40"
                          >
                            <Mic className="h-5 w-5" strokeWidth={1.75} />
                          </button>
                        ) : null}
                        {canSend ? (
                          <button
                            type="button"
                            disabled={sending}
                            onClick={() => void sendMessage()}
                            aria-label={copy.send}
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-white disabled:opacity-35 hover:cursor-pointer"
                          >
                            <Send
                              className={`h-3.5 w-3.5 ${isAr ? "-scale-x-100" : ""}`}
                              strokeWidth={1.75}
                            />
                          </button>
                        ) : null}
                      </div>
                    </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {infoMsg ? (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] xs:items-center xs:p-4 sm:p-4">
          <div className="w-full max-w-xs overflow-hidden rounded-xl border border-[#E8E8E4] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E8E8E4] px-4 py-3">
              <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
                {copy.messageInfo}
              </h3>
              <button
                type="button"
                aria-label={copy.close}
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
                const when = new Date(infoMsg.at).toLocaleString(
                  isAr ? "ar-AE" : "en-AE",
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  },
                );
                return (
                  <>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <MessageStatusTicks status="sent" />
                        <span className="text-[#111B21]">{copy.sent}</span>
                      </div>
                      <span className="shrink-0 tabular-nums text-[#667781] [font-family:var(--font-ui)]">
                        {when}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <MessageStatusTicks status="read" />
                        <span className="text-[#111B21]">{copy.seen}</span>
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

      {confirmWipe ? (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] xs:items-center xs:p-4 sm:p-4">
          <div className="max-h-[min(90dvh,32rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-[#E8E8E4] bg-white p-4 shadow-xl sm:p-5">
            <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
              {confirmWipe === "clear"
                ? copy.clearConfirmTitle
                : copy.deleteAllConfirmTitle}
            </h3>
            <p className="mt-2 text-[12px] leading-relaxed text-[#667781] [font-family:var(--font-body)]">
              {confirmWipe === "clear"
                ? copy.clearConfirmBody
                : copy.deleteAllConfirmBody}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmWipe(null)}
                className="rounded-full border border-[#E8E8E4] px-3.5 py-2 text-[12px] text-black transition hover:border-black hover:cursor-pointer [font-family:var(--font-body)]"
              >
                {copy.cancelSelect}
              </button>
              <button
                type="button"
                onClick={() => void clearChatMessages()}
                className="rounded-full bg-[#B42318] px-3.5 py-2 text-[12px] text-white transition hover:bg-[#912018] hover:cursor-pointer [font-family:var(--font-body)]"
              >
                {confirmWipe === "clear"
                  ? copy.clearConfirmAction
                  : copy.deleteAllConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmDeleteForMe ? (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] xs:items-center xs:p-4">
          <div className="max-h-[min(90dvh,32rem)] w-full max-w-sm overflow-y-auto rounded-xl border border-[#E8E8E4] bg-white p-4 shadow-xl sm:p-5">
            <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
              {copy.deleteForMeTitle}
            </h3>
            <p className="mt-2 text-[12px] leading-relaxed text-[#667781] [font-family:var(--font-body)]">
              {copy.deleteForMeBody}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteForMe(false)}
                className="rounded-full border border-[#E8E8E4] px-3.5 py-2 text-[12px] text-black transition hover:border-black hover:cursor-pointer [font-family:var(--font-body)]"
              >
                {copy.cancelSelect}
              </button>
              <button
                type="button"
                onClick={() => void runDeleteSelected()}
                className="rounded-full bg-[#B42318] px-3.5 py-2 text-[12px] text-white transition hover:bg-[#912018] hover:cursor-pointer [font-family:var(--font-body)]"
              >
                {copy.deleteForMeConfirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {headerPanel === "contact" ? (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/25 p-0 backdrop-blur-[1px] xs:p-3">
          <div className="flex h-full w-full max-w-sm flex-col overflow-hidden rounded-none border border-[#E8E8E4] bg-white shadow-xl xs:rounded-xl">
            <div className="flex items-center justify-between border-b border-[#E8E8E4] px-4 py-3">
              <h3 className="text-[14px] text-black [font-family:var(--font-body)]">
                {copy.contactInfo}
              </h3>
              <button
                type="button"
                aria-label={copy.close}
                onClick={() => setHeaderPanel(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:cursor-pointer"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-8">
              <ChatAvatar
                name={agentName}
                src={session?.agent?.profilePic}
                brand={!session?.agent}
                size="lg"
                online={false}
              />
              <div className="w-full space-y-3 text-center">
                <p className="text-[17px] text-black [font-family:var(--font-display)]">
                  {agentName}
                </p>
                <dl className="space-y-2 text-start text-[12px] [font-family:var(--font-body)]">
                  <div className="rounded-lg bg-[#F7F5F0] px-3 py-2.5">
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-[#8A8A80]">
                      {copy.status}
                    </dt>
                    <dd className="mt-0.5 text-black">
                      {chatLocked
                        ? copy.statusEnded
                        : session?.status === "waiting"
                          ? copy.statusWaiting
                          : copy.statusActive}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {confirmEnd ? (
        <div className="absolute inset-0 z-[60] flex items-end justify-center bg-black/30 p-3 backdrop-blur-[1px] xs:items-center xs:p-4">
          <div className="w-full max-w-sm overflow-hidden rounded-xl border border-[#E8E8E4] bg-white p-4 shadow-xl">
            <h3 className="text-[15px] text-black [font-family:var(--font-body)]">
              {copy.endChatConfirmTitle}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#667781] [font-family:var(--font-body)]">
              {copy.endChatConfirmBody}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className="rounded-full border border-[#E8E8E4] px-3.5 py-2 text-[12px] text-black transition hover:border-black hover:cursor-pointer [font-family:var(--font-body)]"
              >
                {copy.cancelSelect}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmEnd(false);
                  void endChat();
                }}
                className="rounded-full bg-[#B42318] px-3.5 py-2 text-[12px] text-white transition hover:bg-[#912018] hover:cursor-pointer [font-family:var(--font-body)]"
              >
                {copy.endChatConfirmAction}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}
