"use client";

import { useEffect, useRef } from "react";
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
  disabled?: boolean;
  isAr?: boolean;
  /** Dropdown opens toward start/end of the bubble. */
  menuAlign?: "start" | "end";
  /** Hide the chevron; useful when opening only via right-click. */
  hideTrigger?: boolean;
  onAction: (action: ChatMessageMenuAction) => void;
};

export default function ChatMessageMenu({
  open,
  onOpenChange,
  mine,
  onDark = false,
  canEdit = false,
  canCopy = true,
  tombstone = false,
  disabled = false,
  isAr = false,
  menuAlign = "end",
  hideTrigger = false,
  onAction,
}: ChatMessageMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onOpenChange(false);
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

  return (
    <div ref={ref} className="relative shrink-0">
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

      {open ? (
        <div
          role="menu"
          className={`absolute z-30 w-max overflow-hidden rounded-lg border border-[#E8E8E4] bg-white shadow-[0_8px_28px_rgba(11,20,26,0.18)] ${
            hideTrigger ? "top-0" : "top-[calc(100%+4px)]"
          } ${menuAlign === "end" ? "end-0" : "start-0"}`}
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
                    item.tone === "danger" ? "text-[#E53935]" : "text-[#111B21]"
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
        </div>
      ) : null}
    </div>
  );
}
