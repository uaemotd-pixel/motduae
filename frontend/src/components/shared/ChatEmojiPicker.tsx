"use client";

import dynamic from "next/dynamic";
import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type ChatEmojiPickerProps = {
  open: boolean;
  onClose: () => void;
  onPick?: (emoji: string) => void;
  isAr?: boolean;
};

type CategoryTabKey =
  | "smileys"
  | "people"
  | "animals"
  | "food"
  | "travel"
  | "activities"
  | "objects"
  | "symbols";

/**
 * Emojibase group indexes enabled in the picker.
 * 0 = Smileys & Emotion. Add more indexes later to unlock other categories.
 */
const ENABLED_CATEGORY_INDEXES = new Set([0]);

const CATEGORY_TABS: ReadonlyArray<{
  key: CategoryTabKey;
  emoji: string;
  enabled: boolean;
}> = [
  { key: "smileys", emoji: "😊", enabled: true },
  { key: "people", emoji: "👋", enabled: false },
  { key: "animals", emoji: "🐱", enabled: false },
  { key: "food", emoji: "🍔", enabled: false },
  { key: "travel", emoji: "✈️", enabled: false },
  { key: "activities", emoji: "⚽", enabled: false },
  { key: "objects", emoji: "💡", enabled: false },
  { key: "symbols", emoji: "❤️", enabled: false },
];

const FrimousseSmileys = dynamic(
  () =>
    import("frimousse").then(({ EmojiPicker, defaultEmojiDataResolver }) => {
      function SmileysGrid({
        isAr,
        onPick,
      }: {
        isAr: boolean;
        onPick?: (emoji: string) => void;
      }) {
        return (
          <EmojiPicker.Root
            className="flex h-full min-h-0 w-full flex-col overflow-hidden"
            columns={8}
            locale="en"
            resolveEmojiData={async (locale, options) => {
              const data = await defaultEmojiDataResolver(locale, options);
              return {
                ...data,
                categories: data.categories.filter((c) =>
                  ENABLED_CATEGORY_INDEXES.has(c.index),
                ),
                emojis: data.emojis.filter((e) =>
                  ENABLED_CATEGORY_INDEXES.has(e.category),
                ),
              };
            }}
            onEmojiSelect={({ emoji }) => onPick?.(emoji)}
          >
            <div className="shrink-0 border-b border-[#E9EDEF] bg-white px-2.5 pb-2 pt-2.5">
              <EmojiPicker.Search
                className="w-full appearance-none rounded-lg bg-[#F0F2F5] px-3 py-2 text-[14px] text-[#111B21] outline-none placeholder:text-[#667781] [font-family:var(--font-body)]"
                placeholder={isAr ? "بحث عن رمز تعبيري" : "Search emoji"}
                autoFocus
              />
            </div>
            {/*
              Frimousse Viewport forces position:relative + intrinsic content height,
              so it grows with the list and never scrolls. Pin it to this box via
              inline style (wins over Frimousse defaults) to create a real scrollport.
            */}
            <div className="relative min-h-0 flex-1 basis-0 overflow-hidden">
              <EmojiPicker.Viewport
                className="outline-hidden"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  maxHeight: "100%",
                }}
                onWheel={(e) => {
                  e.stopPropagation();
                }}
              >
                <EmojiPicker.Loading className="absolute inset-0 flex items-center justify-center text-[13px] text-[#667781] [font-family:var(--font-body)]">
                  {isAr ? "جاري التحميل…" : "Loading…"}
                </EmojiPicker.Loading>
                <EmojiPicker.Empty className="absolute inset-0 flex items-center justify-center text-[13px] text-[#667781] [font-family:var(--font-body)]">
                  {isAr ? "لا توجد نتائج" : "No emoji found"}
                </EmojiPicker.Empty>
                <EmojiPicker.List
                  className="w-full select-none pb-2"
                  components={{
                    CategoryHeader: ({ category, ...props }) => (
                      <div
                        {...props}
                        className="bg-[#F7F8FA] px-3 pb-1 pt-2.5 text-[12px] font-medium capitalize text-[#667781] [font-family:var(--font-body)]"
                      >
                        {isAr ? "الوجوه والمشاعر" : category.label}
                      </div>
                    ),
                    Row: ({ children, ...props }) => (
                      <div {...props} className="box-border w-full px-1">
                        {children}
                      </div>
                    ),
                    Emoji: ({ emoji, ...props }) => (
                      <button
                        {...props}
                        type="button"
                        className="box-border flex h-10 items-center justify-center rounded-md text-[22px] leading-none transition data-[active]:bg-[#E9EDEF] hover:cursor-pointer hover:bg-[#E9EDEF] sm:h-11 sm:text-[24px]"
                        style={{
                          ...props.style,
                          width: "calc(100% / var(--frimousse-list-columns))",
                        }}
                      >
                        {emoji.emoji}
                      </button>
                    ),
                  }}
                />
              </EmojiPicker.Viewport>
            </div>
          </EmojiPicker.Root>
        );
      }
      return SmileysGrid;
    }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center gap-2 text-[13px] text-[#667781] [font-family:var(--font-body)]">
        <Smile className="h-4 w-4 animate-pulse" strokeWidth={1.5} />
        Loading…
      </div>
    ),
  },
);

export default function ChatEmojiPicker({
  open,
  onClose,
  onPick,
  isAr = false,
}: ChatEmojiPickerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<CategoryTabKey>("smileys");

  useEffect(() => {
    if (open) setActiveTab("smileys");
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (ref.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest("[data-chat-emoji-toggle]")
      ) {
        return;
      }
      onClose();
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
      role="dialog"
      aria-label={isAr ? "الرموز التعبيرية" : "Emoji"}
      onWheel={(e) => e.stopPropagation()}
      className="absolute inset-x-0 bottom-full z-40 mb-2 flex h-[min(46vh,22rem)] flex-col overflow-hidden rounded-xl border border-[#E9EDEF] bg-[#F7F8FA] shadow-[0_8px_30px_rgba(11,20,26,0.18)]"
    >
      <div className="min-h-0 flex-1 basis-0 overflow-hidden">
        {activeTab === "smileys" ? (
          <FrimousseSmileys isAr={isAr} onPick={onPick} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="text-[28px]" aria-hidden>
              {CATEGORY_TABS.find((t) => t.key === activeTab)?.emoji ?? "✨"}
            </span>
            <p className="text-[14px] font-medium text-[#111B21] [font-family:var(--font-body)]">
              {isAr ? "في تحديث قادم" : "Coming in a future update"}
            </p>
            <p className="max-w-[16rem] text-[12px] leading-snug text-[#667781] [font-family:var(--font-body)]">
              {isAr
                ? "حالياً تتوفر الوجوه والمشاعر فقط. باقي الفئات قريباً."
                : "Only Smileys & Emotion are available for now. More categories soon."}
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("smileys")}
              className="mt-1 rounded-full bg-black px-3.5 py-1.5 text-[11px] text-white transition hover:cursor-pointer hover:bg-[#1a1a1a] [font-family:var(--font-body)]"
            >
              {isAr ? "العودة للوجوه" : "Back to Smileys"}
            </button>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-around gap-0.5 border-t border-[#E9EDEF] bg-white px-1 py-1.5">
        {CATEGORY_TABS.map((tab) => {
          const selected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              title={
                tab.enabled
                  ? isAr
                    ? "الوجوه والمشاعر"
                    : "Smileys & Emotion"
                  : isAr
                    ? "تحديث قادم"
                    : "Future update"
              }
              aria-label={
                tab.enabled
                  ? isAr
                    ? "الوجوه والمشاعر"
                    : "Smileys & Emotion"
                  : isAr
                    ? "تحديث قادم"
                    : "Future update"
              }
              aria-pressed={selected}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[18px] transition hover:cursor-pointer ${
                selected
                  ? "bg-[#E9EDEF]"
                  : tab.enabled
                    ? "hover:bg-[#F0F2F5]"
                    : "opacity-55 hover:bg-[#F0F2F5]"
              }`}
            >
              <span aria-hidden>{tab.emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
