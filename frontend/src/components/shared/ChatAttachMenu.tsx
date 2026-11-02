"use client";

import { useEffect, useRef } from "react";
import {
  FileText,
  Headphones,
  Image as ImageIcon,
  Video,
} from "lucide-react";

export type ChatAttachMenuAction =
  | "document"
  | "photos"
  | "video"
  | "audio";

type ChatAttachMenuProps = {
  open: boolean;
  onClose: () => void;
  onPick: (action: ChatAttachMenuAction) => void;
  isAr?: boolean;
  align?: "start" | "end";
  /** Smaller icons/text for compact chat widgets. */
  compact?: boolean;
};

const ITEMS: {
  key: ChatAttachMenuAction;
  labelEn: string;
  labelAr: string;
  Icon: typeof FileText;
  bg: string;
  fg: string;
}[] = [
  {
    key: "document",
    labelEn: "Document",
    labelAr: "مستند",
    Icon: FileText,
    bg: "bg-[#E3F2FD]",
    fg: "text-[#1565C0]",
  },
  {
    key: "photos",
    labelEn: "Photos",
    labelAr: "صور",
    Icon: ImageIcon,
    bg: "bg-[#E8F5E9]",
    fg: "text-[#2E7D32]",
  },
  {
    key: "video",
    labelEn: "Video",
    labelAr: "فيديو",
    Icon: Video,
    bg: "bg-[#FCE4EC]",
    fg: "text-[#C2185B]",
  },
  {
    key: "audio",
    labelEn: "Audio",
    labelAr: "صوت",
    Icon: Headphones,
    bg: "bg-[#FFF3E0]",
    fg: "text-[#EF6C00]",
  },
];

export default function ChatAttachMenu({
  open,
  onClose,
  onPick,
  isAr = false,
  align = "start",
  compact = false,
}: ChatAttachMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="menu"
      className={`absolute bottom-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-[#E8E8E4] bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)] ${
        compact ? "min-w-[10.5rem] rounded-xl" : "min-w-[12.5rem]"
      } ${align === "end" ? "end-0" : "start-0"}`}
    >
      {ITEMS.map(({ key, labelEn, labelAr, Icon, bg, fg }) => (
        <button
          key={key}
          type="button"
          role="menuitem"
          onClick={() => {
            onClose();
            onPick(key);
          }}
          className={`flex w-full items-center text-start transition hover:bg-[#F7F5F0] hover:cursor-pointer ${
            compact ? "gap-2 px-2.5 py-2" : "gap-3 px-3.5 py-2.5"
          }`}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-full ${bg} ${fg} ${
              compact ? "h-8 w-8" : "h-10 w-10"
            }`}
          >
            <Icon
              className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
              strokeWidth={1.75}
            />
          </span>
          <span
            className={`leading-none text-[#111B21] [font-family:var(--font-body)] ${
              compact ? "text-[12px]" : "text-[13.5px]"
            }`}
          >
            {isAr ? labelAr : labelEn}
          </span>
        </button>
      ))}
    </div>
  );
}
