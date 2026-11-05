"use client";

import { ChevronDown } from "lucide-react";

type ChatJumpToLatestProps = {
  visible: boolean;
  count?: number;
  label?: string;
  onJump: () => void;
  isAr?: boolean;
};

/** Floating control when the thread is scrolled up and new messages arrive. */
export default function ChatJumpToLatest({
  visible,
  count = 0,
  label,
  onJump,
  isAr = false,
}: ChatJumpToLatestProps) {
  if (!visible) return null;

  const text =
    label ||
    (count > 0
      ? isAr
        ? `${count > 99 ? "99+" : count} رسائل جديدة`
        : `${count > 99 ? "99+" : count} new`
      : isAr
        ? "أحدث الرسائل"
        : "Latest");

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3">
      <button
        type="button"
        onClick={onJump}
        className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E4] bg-white px-3 py-1.5 text-[12px] text-[#111B21] shadow-[0_4px_16px_rgba(0,0,0,0.14)] transition hover:bg-[#F7F5F0] hover:cursor-pointer [font-family:var(--font-body)]"
      >
        <ChevronDown className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
        {text}
      </button>
    </div>
  );
}
