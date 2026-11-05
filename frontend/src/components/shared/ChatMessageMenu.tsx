"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  Copy,
  Forward,
  Info,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Reply,
  Trash2,
  ChevronDown,
  X,
} from "lucide-react";

/** WhatsApp quick row (shown on hover / long-press). */
export const CHAT_REACTION_QUICK = [
  "👍",
  "❤️",
  "😂",
  "😮",
  "😢",
  "🙏",
] as const;

/** Full set opened via the “+” button. */
export const CHAT_REACTION_EMOJIS = [
  ...CHAT_REACTION_QUICK,
  "👏",
  "🔥",
  "✅",
  "🎉",
  "😍",
  "🥰",
  "😊",
  "😁",
  "🤗",
  "🤔",
  "👎",
  "💪",
  "✨",
  "⭐",
  "💯",
  "👀",
  "💔",
  "🥲",
  "😴",
  "🤮",
  "🤬",
  "💀",
  "🤝",
  "💋",
  "🌹",
  "🎂",
] as const;

export type ChatReactionEmoji = (typeof CHAT_REACTION_EMOJIS)[number] | string;

export type ChatMessageReaction = {
  emoji: string;
  byRole: "customer" | "agent";
  at?: string;
};

export type ChatMessageMenuAction =
  | "reply"
  | "edit"
  | "copy"
  | "forward"
  | "delete"
  | "info"
  | "select"
  | "pin"
  | "unpin";

export type ChatPinnedMessagePreview = {
  id: string;
  text?: string;
  caption?: string;
  kind?: string;
  fileName?: string;
  pinnedAt?: string | null;
  senderName?: string;
};

type ChatMessageMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mine: boolean;
  onDark?: boolean;
  canEdit?: boolean;
  canCopy?: boolean;
  /** Admin / fabric handoff into another live thread. */
  canForward?: boolean;
  /** Soft-deleted tombstone — only Delete (for me) is offered. */
  tombstone?: boolean;
  /** Voice-call history badge — delete only (opened via right-click). */
  callBadge?: boolean;
  disabled?: boolean;
  isAr?: boolean;
  /** Dropdown opens toward start/end of the bubble. */
  menuAlign?: "start" | "end";
  /** Hide the chevron; useful when opening only via right-click. */
  hideTrigger?: boolean;
  onAction: (action: ChatMessageMenuAction) => void;
  /** WhatsApp-style quick reactions at the top of the menu. */
  onReact?: (emoji: ChatReactionEmoji) => void;
  myReaction?: string | null;
  /** Show Pin / Unpin in the menu (not for tombstones / call badges). */
  canPin?: boolean;
  isPinned?: boolean;
};

function pinnedPreviewText(msg: ChatPinnedMessagePreview, isAr = false) {
  if (msg.kind === "voice") return isAr ? "رسالة صوتية" : "Voice message";
  if (msg.kind === "image") return isAr ? "صورة" : "Photo";
  if (msg.kind === "file") return msg.fileName || (isAr ? "مستند" : "Document");
  return String(msg.caption || msg.text || "").trim() || (isAr ? "رسالة" : "Message");
}

/** Sticky strip of pinned messages at the top of a chat thread. */
export function ChatPinnedMessagesBar({
  messages,
  isAr = false,
  onJump,
  onUnpin,
}: {
  messages: ChatPinnedMessagePreview[];
  isAr?: boolean;
  onJump: (id: string) => void;
  onUnpin?: (id: string) => void;
}) {
  const pinned = messages
    .filter((m) => Boolean(m.pinnedAt))
    .sort((a, b) => {
      const ta = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0;
      const tb = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0;
      return tb - ta;
    });
  if (!pinned.length) return null;

  return (
    <div className="sticky top-0 z-20 -mx-2.5 mb-2 space-y-1 border-b border-[#E8E8E4] bg-[#F7F5F0]/95 px-2.5 py-1.5 backdrop-blur-sm xs:-mx-3 xs:px-3 sm:-mx-3.5 sm:px-3.5">
      {pinned.map((msg) => {
        const preview = pinnedPreviewText(msg, isAr);
        return (
          <div
            key={msg.id}
            className="flex items-stretch gap-1 rounded-lg border border-[#E8E8E4] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
          >
            <button
              type="button"
              onClick={() => onJump(msg.id)}
              className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-start transition hover:cursor-pointer hover:bg-[#F7F5F0]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#FFF8E7] text-[#B8922A]">
                <Pin className="h-3.5 w-3.5" strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-medium uppercase tracking-[0.12em] text-[#8A8A80] [font-family:var(--font-ui)]">
                  {isAr ? "مثبّتة" : "Pinned"}
                  {msg.senderName ? ` · ${msg.senderName}` : ""}
                </span>
                <span className="mt-0.5 block truncate text-[12.5px] text-[#111B21] [font-family:var(--font-body)]">
                  {preview}
                </span>
              </span>
            </button>
            {onUnpin ? (
              <button
                type="button"
                aria-label={isAr ? "إلغاء التثبيت" : "Unpin"}
                title={isAr ? "إلغاء التثبيت" : "Unpin"}
                onClick={(e) => {
                  e.stopPropagation();
                  onUnpin(msg.id);
                }}
                className="flex w-8 shrink-0 items-center justify-center text-[#8A8A80] transition hover:cursor-pointer hover:bg-[#FFF5F5] hover:text-[#E53935]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

type MenuCoords = {
  top: number;
  left: number;
};

const LONG_PRESS_MS = 420;
const MOVE_CANCEL_PX = 12;

/** WhatsApp-style reaction tray: hover / long-press → quick emojis + “+”. */
export function ChatReactionBar({
  myReaction,
  onReact,
  align = "end",
  isAr = false,
  disabled = false,
}: {
  myReaction?: string | null;
  onReact: (emoji: ChatReactionEmoji) => void;
  align?: "start" | "end";
  isAr?: boolean;
  disabled?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trayRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number | null>(null);
  const startPos = useRef<{ x: number; y: number } | null>(null);
  const didLongPress = useRef(false);
  const pinnedRef = useRef(false);
  const [pinned, setPinned] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    pinnedRef.current = pinned;
  }, [pinned]);

  const clearLongPress = () => {
    if (longPressTimer.current != null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    startPos.current = null;
  };

  const closeTray = () => {
    setPinned(false);
    setExpanded(false);
  };

  const pick = (emoji: string) => {
    onReact(emoji);
    closeTray();
  };

  const removeMine = () => {
    if (!myReaction) return;
    onReact(myReaction);
    closeTray();
  };

  // Long-press / hold on the parent message bubble (WhatsApp thumb hold).
  useEffect(() => {
    if (disabled) return;
    const bubble = wrapRef.current?.parentElement;
    if (!bubble) return;

    const onPointerDown = (e: PointerEvent) => {
      if (disabled) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button,a,input,textarea,[role='menu']")) return;
      didLongPress.current = false;
      startPos.current = { x: e.clientX, y: e.clientY };
      clearLongPress();
      longPressTimer.current = window.setTimeout(() => {
        didLongPress.current = true;
        setPinned(true);
        setExpanded(false);
        try {
          navigator.vibrate?.(10);
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!startPos.current || longPressTimer.current == null) return;
      const dx = Math.abs(e.clientX - startPos.current.x);
      const dy = Math.abs(e.clientY - startPos.current.y);
      if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) clearLongPress();
    };

    const onPointerEnd = () => clearLongPress();

    const onClickCapture = (e: MouseEvent) => {
      if (!didLongPress.current) return;
      e.preventDefault();
      e.stopPropagation();
      didLongPress.current = false;
    };

    const onContextMenuCapture = (e: Event) => {
      // Thumb-hold owns the gesture — don't open the ⋮ message menu.
      if (!didLongPress.current && !pinnedRef.current) return;
      e.preventDefault();
      e.stopPropagation();
    };

    bubble.addEventListener("pointerdown", onPointerDown);
    bubble.addEventListener("pointermove", onPointerMove);
    bubble.addEventListener("pointerup", onPointerEnd);
    bubble.addEventListener("pointercancel", onPointerEnd);
    bubble.addEventListener("pointerleave", onPointerEnd);
    bubble.addEventListener("click", onClickCapture, true);
    bubble.addEventListener("contextmenu", onContextMenuCapture, true);
    return () => {
      clearLongPress();
      bubble.removeEventListener("pointerdown", onPointerDown);
      bubble.removeEventListener("pointermove", onPointerMove);
      bubble.removeEventListener("pointerup", onPointerEnd);
      bubble.removeEventListener("pointercancel", onPointerEnd);
      bubble.removeEventListener("pointerleave", onPointerEnd);
      bubble.removeEventListener("click", onClickCapture, true);
      bubble.removeEventListener("contextmenu", onContextMenuCapture, true);
    };
  }, [disabled]);

  // Click outside closes a pinned / expanded tray.
  useEffect(() => {
    if (!pinned && !expanded) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (trayRef.current?.contains(t)) return;
      closeTray();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeTray();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [pinned, expanded]);

  if (disabled) return null;

  const edge =
    align === "end"
      ? isAr
        ? "start-0"
        : "end-0"
      : isAr
        ? "end-0"
        : "start-0";

  const forceOpen = pinned || expanded;

  return (
    <div
      ref={wrapRef}
      className={`absolute -top-4 z-30 ${edge} ${
        forceOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0 transition-opacity sm:group-hover:pointer-events-auto sm:group-hover:opacity-100"
      }`}
    >
      <div
        ref={trayRef}
        className={`origin-bottom ${
          align === "end" ? (isAr ? "origin-bottom-left" : "origin-bottom-right") : isAr ? "origin-bottom-right" : "origin-bottom-left"
        }`}
      >
        {expanded ? (
          <div className="w-[min(14rem,calc(100vw-2rem))] rounded-xl border border-[#E8E8E4] bg-white p-1.5 shadow-[0_8px_28px_rgba(11,20,26,0.2)]">
            <div className="grid grid-cols-8 gap-0">
              {CHAT_REACTION_EMOJIS.map((emoji) => {
                const active = myReaction === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    aria-label={emoji}
                    aria-pressed={active}
                    title={active ? (isAr ? "إزالة" : "Remove") : emoji}
                    onClick={(e) => {
                      e.stopPropagation();
                      pick(emoji);
                    }}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] leading-none transition hover:cursor-pointer hover:bg-[#F0F2F5] ${
                      active ? "bg-[#E7FCE3] ring-1 ring-[#25D366]/40" : ""
                    }`}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
            {myReaction ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeMine();
                }}
                className="mt-1 flex w-full items-center justify-center rounded-md py-1 text-[11px] font-medium text-[#E53935] transition hover:cursor-pointer hover:bg-[#FFF5F5] [font-family:var(--font-body)]"
              >
                {isAr ? "إزالة التفاعل" : "Remove reaction"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-px rounded-full border border-[#E8E8E4] bg-white px-0.5 py-0.5 shadow-[0_4px_16px_rgba(11,20,26,0.16)]">
            {CHAT_REACTION_QUICK.map((emoji) => {
              const active = myReaction === emoji;
              return (
                <button
                  key={emoji}
                  type="button"
                  aria-label={
                    active
                      ? isAr
                        ? `إزالة ${emoji}`
                        : `Remove ${emoji}`
                      : emoji
                  }
                  aria-pressed={active}
                  title={active ? (isAr ? "إزالة" : "Remove") : emoji}
                  onClick={(e) => {
                    e.stopPropagation();
                    pick(emoji);
                  }}
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[13px] leading-none transition hover:cursor-pointer hover:bg-[#F0F2F5] ${
                    active ? "scale-105 bg-[#E7FCE3]" : ""
                  }`}
                >
                  {emoji}
                </button>
              );
            })}
            <button
              type="button"
              aria-label={isAr ? "المزيد من التفاعلات" : "More reactions"}
              title={isAr ? "المزيد" : "More"}
              onClick={(e) => {
                e.stopPropagation();
                setPinned(true);
                setExpanded(true);
              }}
              className="mx-px flex h-5 w-5 items-center justify-center rounded-full bg-[#F0F2F5] text-[#54656F] transition hover:cursor-pointer hover:bg-[#E5E7EB] hover:text-[#111B21]"
            >
              <Plus className="h-3 w-3" strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Aggregated reaction chips under a bubble (WhatsApp-style). */
export function ChatReactionChips({
  reactions,
  myRole,
  mine,
  onToggle,
  disabled = false,
}: {
  reactions: ChatMessageReaction[];
  myRole: "customer" | "agent";
  mine: boolean;
  onToggle?: (emoji: ChatReactionEmoji) => void;
  disabled?: boolean;
}) {
  if (!reactions?.length) return null;

  const order = CHAT_REACTION_EMOJIS as readonly string[];
  const unique = Array.from(new Set(reactions.map((r) => r.emoji))).sort(
    (a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    },
  );

  const grouped = unique.map((emoji) => {
    const who = reactions.filter((r) => r.emoji === emoji);
    return {
      emoji,
      count: who.length,
      mine: who.some((r) => r.byRole === myRole),
    };
  });

  if (!grouped.length) return null;

  return (
    <div
      className={`absolute -bottom-2.5 z-10 flex max-w-full flex-wrap gap-0.5 ${
        mine ? "end-1" : "start-1"
      }`}
    >
      {grouped.map((g) => {
        const clickable = !disabled && Boolean(onToggle);
        return (
          <button
            key={g.emoji}
            type="button"
            disabled={!clickable}
            title={
              g.mine
                ? "Remove reaction"
                : clickable
                  ? `React with ${g.emoji}`
                  : g.emoji
            }
            onClick={(e) => {
              e.stopPropagation();
              if (clickable) onToggle?.(g.emoji);
            }}
            className={`inline-flex items-center gap-px rounded-full bg-white text-[11px] leading-none shadow-[0_1px_2px_rgba(0,0,0,0.1)] ${
              clickable ? "hover:cursor-pointer hover:opacity-90" : ""
            }`}
          >
            <span className="text-[12px] leading-none">{g.emoji}</span>
            {g.count > 1 ? (
              <span className="pe-0.5 tabular-nums text-[10px] text-[#667781]">
                {g.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export default function ChatMessageMenu({
  open,
  onOpenChange,
  mine,
  onDark = false,
  canEdit = false,
  canCopy = true,
  canForward = false,
  tombstone = false,
  callBadge = false,
  disabled = false,
  isAr = false,
  menuAlign = "end",
  hideTrigger = false,
  onAction,
  onReact,
  myReaction = null,
  canPin = true,
  isPinned = false,
}: ChatMessageMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [mounted, setMounted] = useState(false);
  const showReactions = Boolean(onReact) && !tombstone && !callBadge;
  const showPin = Boolean(canPin) && !tombstone && !callBadge;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) {
        return;
      }
      onOpenChange(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }

    const place = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const menuEl = menuRef.current;
      const menuH = menuEl?.offsetHeight || 220;
      const menuW = menuEl?.offsetWidth || 168;
      const gap = 4;
      const pad = 8;

      const spaceBelow = window.innerHeight - rect.bottom - pad;
      const spaceAbove = rect.top - pad;
      const openUp =
        spaceBelow < menuH + gap && spaceAbove > spaceBelow;

      let top = openUp
        ? rect.top - menuH - gap
        : hideTrigger
          ? rect.top
          : rect.bottom + gap;

      // Prefer aligning to the bubble edge the menu belongs to.
      const alignEnd = menuAlign === "end";
      let left = alignEnd ? rect.right - menuW : rect.left;
      if (isAr) {
        left = alignEnd ? rect.left : rect.right - menuW;
      }

      top = Math.max(
        pad,
        Math.min(top, window.innerHeight - menuH - pad),
      );
      left = Math.max(
        pad,
        Math.min(left, window.innerWidth - menuW - pad),
      );

      setCoords({ top, left });
    };

    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    // Capture scroll from the chat thread (overflow containers).
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [
    open,
    hideTrigger,
    menuAlign,
    isAr,
    tombstone,
    callBadge,
    canEdit,
    canCopy,
    canForward,
    mine,
    showReactions,
    myReaction,
    showPin,
    isPinned,
  ]);

  if (disabled) return null;

  const items: {
    key: ChatMessageMenuAction;
    label: string;
    Icon: typeof Reply;
    tone?: "danger";
    show: boolean;
  }[] = tombstone
    ? [
        {
          key: "delete",
          label: isAr ? "حذف لديّ" : "Delete for me",
          Icon: Trash2,
          tone: "danger",
          show: true,
        },
      ]
    : callBadge
      ? [
          {
            key: "delete",
            label: isAr ? "حذف" : "Delete",
            Icon: Trash2,
            tone: "danger",
            show: true,
          },
        ]
      : [
          {
            key: "reply",
            label: isAr ? "رد" : "Reply",
            Icon: Reply,
            show: true,
          },
          {
            key: isPinned ? "unpin" : "pin",
            label: isPinned
              ? isAr
                ? "إلغاء التثبيت"
                : "Unpin"
              : isAr
                ? "تثبيت"
                : "Pin",
            Icon: isPinned ? PinOff : Pin,
            show: showPin,
          },
          {
            key: "copy",
            label: isAr ? "نسخ" : "Copy",
            Icon: Copy,
            show: canCopy,
          },
          {
            key: "forward",
            label: isAr ? "إعادة توجيه" : "Forward",
            Icon: Forward,
            show: canForward,
          },
          {
            key: "edit",
            label: isAr ? "تعديل" : "Edit",
            Icon: Pencil,
            show: Boolean(canEdit && mine),
          },
          {
            key: "info",
            label: isAr ? "معلومات" : "Info",
            Icon: Info,
            show: mine,
          },
          {
            key: "select",
            label: isAr ? "تحديد" : "Select",
            Icon: CheckSquare,
            show: true,
          },
          {
            key: "delete",
            label: isAr ? "حذف" : "Delete",
            Icon: Trash2,
            tone: "danger",
            show: true,
          },
        ];

  const menu =
    open && mounted
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={
              coords
                ? {
                    position: "fixed",
                    top: coords.top,
                    left: coords.left,
                    visibility: "visible",
                  }
                : {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    visibility: "hidden",
                  }
            }
            className="z-[400] w-max overflow-hidden rounded-lg border border-[#E8E8E4] bg-white shadow-[0_8px_28px_rgba(11,20,26,0.18)]"
          >
            {showReactions && onReact ? (
              <div className="border-b border-[#F0F2F5] px-2 py-1.5">
                <div className="flex items-center justify-center gap-0.5">
                  {CHAT_REACTION_QUICK.map((emoji) => {
                    const active = myReaction === emoji;
                    return (
                      <button
                        key={emoji}
                        type="button"
                        role="menuitem"
                        aria-label={
                          active
                            ? isAr
                              ? `إزالة ${emoji}`
                              : `Remove ${emoji}`
                            : emoji
                        }
                        aria-pressed={active}
                        title={active ? (isAr ? "إزالة" : "Remove") : emoji}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChange(false);
                          onReact(emoji);
                        }}
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-[14px] leading-none transition hover:cursor-pointer hover:bg-[#F0F2F5] ${
                          active ? "bg-[#E7FCE3] scale-105" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    );
                  })}
                </div>
                {myReaction ? (
                  <button
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChange(false);
                      onReact(myReaction);
                    }}
                    className="mt-1 flex w-full items-center justify-center rounded-md py-1 text-[12px] font-medium text-[#E53935] transition hover:cursor-pointer hover:bg-[#FFF5F5] [font-family:var(--font-body)]"
                  >
                    {isAr ? "إزالة التفاعل" : "Remove reaction"}
                  </button>
                ) : null}
              </div>
            ) : null}
            {items
              .filter((item) => item.show)
              .map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="menuitem"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenChange(false);
                      onAction(item.key);
                    }}
                    className={`flex w-full items-center gap-2.5 whitespace-nowrap px-3 py-2 text-start text-[13px] transition hover:cursor-pointer hover:bg-[#F5F6F6] [font-family:var(--font-body)] ${
                      item.tone === "danger"
                        ? "text-[#E53935]"
                        : "text-[#111B21]"
                    }`}
                  >
                    <Icon
                      className="h-4 w-4 shrink-0 opacity-80"
                      strokeWidth={1.75}
                    />
                    {item.label}
                  </button>
                );
              })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={anchorRef}
      className={
        hideTrigger
          ? "pointer-events-none absolute start-0 top-0 h-8 w-8"
          : "relative shrink-0"
      }
    >
      {!hideTrigger ? (
        <button
          type="button"
          aria-label={isAr ? "خيارات الرسالة" : "Message options"}
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            onOpenChange(!open);
          }}
          className={`flex h-5 w-5 items-center justify-center rounded-full transition hover:cursor-pointer ${
            onDark
              ? "text-white/70 hover:bg-white/10 hover:text-white"
              : "text-[#667781] hover:bg-black/5 hover:text-[#111B21]"
          } ${open ? (onDark ? "bg-white/10 text-white" : "bg-black/5 text-[#111B21]") : ""}`}
        >
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      ) : null}
      {menu}
    </div>
  );
}
