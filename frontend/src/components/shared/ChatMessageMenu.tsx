"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckSquare,
  Copy,
  Info,
  Pencil,
  Reply,
  Trash2,
  ChevronDown,
} from "lucide-react";

export type ChatMessageMenuAction =
  | "reply"
  | "edit"
  | "copy"
  | "delete"
  | "info"
  | "select";

type ChatMessageMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mine: boolean;
  onDark?: boolean;
  canEdit?: boolean;
  canCopy?: boolean;
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
};

type MenuCoords = {
  top: number;
  left: number;
};

export default function ChatMessageMenu({
  open,
  onOpenChange,
  mine,
  onDark = false,
  canEdit = false,
  canCopy = true,
  tombstone = false,
  callBadge = false,
  disabled = false,
  isAr = false,
  menuAlign = "end",
  hideTrigger = false,
  onAction,
}: ChatMessageMenuProps) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const [mounted, setMounted] = useState(false);

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
    mine,
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
            key: "copy",
            label: isAr ? "نسخ" : "Copy",
            Icon: Copy,
            show: canCopy,
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
