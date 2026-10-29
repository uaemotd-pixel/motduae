"use client";

import type { RefObject } from "react";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

type ChatThreadSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  matchCount: number;
  /** 0-based active match index; ignored when matchCount is 0. */
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  isAr?: boolean;
  placeholder?: string;
};

export default function ChatThreadSearchBar({
  value,
  onChange,
  onClose,
  inputRef,
  matchCount,
  activeIndex,
  onPrev,
  onNext,
  isAr = false,
  placeholder,
}: ChatThreadSearchBarProps) {
  const q = value.trim();
  const hasQuery = q.length > 0;
  const label =
    placeholder || (isAr ? "ابحث في الرسائل" : "Search messages");
  const countLabel = !hasQuery
    ? ""
    : matchCount === 0
      ? isAr
        ? "لا نتائج"
        : "No results"
      : isAr
        ? `${activeIndex + 1} من ${matchCount}`
        : `${activeIndex + 1} of ${matchCount}`;

  return (
    <div className="relative z-[1] flex shrink-0 items-center gap-1.5 border-b border-[#E8E8E4] bg-white px-2 py-2 sm:gap-2 sm:px-4">
      <Search
        className="ms-1 h-4 w-4 shrink-0 text-[#667781]"
        strokeWidth={1.75}
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
        }}
        placeholder={label}
        className="min-w-0 flex-1 bg-transparent text-[13px] text-black outline-none placeholder:text-[#8A8A80] [font-family:var(--font-body)] sm:text-[14px]"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
      />
      {hasQuery ? (
        <span
          className={`shrink-0 tabular-nums [font-family:var(--font-ui)] text-[11px] sm:text-[12px] ${
            matchCount === 0 ? "text-[#B42318]" : "text-[#667781]"
          }`}
        >
          {countLabel}
        </span>
      ) : null}
      <button
        type="button"
        aria-label={isAr ? "النتيجة السابقة" : "Previous result"}
        disabled={!hasQuery || matchCount === 0}
        onClick={onPrev}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:text-black hover:cursor-pointer disabled:opacity-35 disabled:hover:cursor-not-allowed"
      >
        <ChevronUp className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label={isAr ? "النتيجة التالية" : "Next result"}
        disabled={!hasQuery || matchCount === 0}
        onClick={onNext}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:text-black hover:cursor-pointer disabled:opacity-35 disabled:hover:cursor-not-allowed"
      >
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
      </button>
      <button
        type="button"
        aria-label={isAr ? "إغلاق البحث" : "Close search"}
        onClick={onClose}
        className="flex h-8 w-8 items-center justify-center rounded-full text-[#54656F] transition hover:bg-black/5 hover:text-black hover:cursor-pointer"
      >
        <X className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
