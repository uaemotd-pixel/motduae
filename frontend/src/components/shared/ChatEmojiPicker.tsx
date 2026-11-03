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

/** Emojibase group indexes (skip 2 = Component). */
const CATEGORY_INDEX: Record<CategoryTabKey, number> = {
  smileys: 0,
  people: 1,
  animals: 3,
  food: 4,
  travel: 5,
  activities: 6,
  objects: 7,
  symbols: 8,
};

const CATEGORY_TABS: ReadonlyArray<{
  key: CategoryTabKey;
  emoji: string;
  labelEn: string;
  labelAr: string;
}> = [
  {
    key: "smileys",
    emoji: "😊",
    labelEn: "Smileys & Emotion",
    labelAr: "الوجوه والمشاعر",
  },
  {
    key: "people",
    emoji: "👋",
    labelEn: "People & Body",
    labelAr: "الناس والجسد",
  },
  {
    key: "animals",
    emoji: "🐱",
    labelEn: "Animals & Nature",
    labelAr: "الحيوانات والطبيعة",
  },
  {
    key: "food",
    emoji: "🍔",
    labelEn: "Food & Drink",
    labelAr: "الطعام والشراب",
  },
  {
    key: "travel",
    emoji: "✈️",
    labelEn: "Travel & Places",
    labelAr: "السفر والأماكن",
  },
  {
    key: "activities",
    emoji: "⚽",
    labelEn: "Activities",
    labelAr: "الأنشطة",
  },
  {
    key: "objects",
    emoji: "💡",
    labelEn: "Objects",
    labelAr: "الأشياء",
  },
  {
    key: "symbols",
    emoji: "❤️",
    labelEn: "Symbols",
    labelAr: "الرموز",
  },
];

const ENABLED_CATEGORY_INDEXES = new Set(
  CATEGORY_TABS.map((t) => CATEGORY_INDEX[t.key]),
);

const LABEL_BY_INDEX = Object.fromEntries(
  CATEGORY_TABS.map((t) => [CATEGORY_INDEX[t.key], t]),
) as Record<number, (typeof CATEGORY_TABS)[number]>;

const FrimousseGrid = dynamic(
  () =>
    import("frimousse").then(({ EmojiPicker, defaultEmojiDataResolver }) => {
      function EmojiGrid({
        isAr,
        onPick,
        categoryIndex,
      }: {
        isAr: boolean;
        onPick?: (emoji: string) => void;
        categoryIndex: number;
      }) {
        return (
          <EmojiPicker.Root
            key={categoryIndex}
            className="flex h-full min-h-0 w-full flex-col overflow-hidden"
            columns={8}
            locale="en"
            resolveEmojiData={async (locale, options) => {
              const data = await defaultEmojiDataResolver(locale, options);
              return {
                ...data,
                categories: data.categories.filter(
                  (c) =>
                    ENABLED_CATEGORY_INDEXES.has(c.index) &&
                    c.index === categoryIndex,
                ),
                emojis: data.emojis.filter(
                  (e) =>
                    ENABLED_CATEGORY_INDEXES.has(e.category) &&
                    e.category === categoryIndex,
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
                    CategoryHeader: ({ category, ...props }) => {
                      const meta = LABEL_BY_INDEX[categoryIndex];
                      const title =
                        (isAr ? meta?.labelAr : meta?.labelEn) ||
                        category.label;
                      return (
                        <div
                          {...props}
                          className="bg-[#F7F8FA] px-3 pb-1 pt-2.5 text-[12px] font-medium capitalize text-[#667781] [font-family:var(--font-body)]"
                        >
                          {title}
                        </div>
                      );
                    },
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
      return EmojiGrid;
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
        <FrimousseGrid
          isAr={isAr}
          onPick={onPick}
          categoryIndex={CATEGORY_INDEX[activeTab]}
        />
      </div>

      <div className="flex shrink-0 items-center justify-around gap-0.5 border-t border-[#E9EDEF] bg-white px-1 py-1.5">
        {CATEGORY_TABS.map((tab) => {
          const selected = activeTab === tab.key;
          const label = isAr ? tab.labelAr : tab.labelEn;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              title={label}
              aria-label={label}
              aria-pressed={selected}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-[18px] transition hover:cursor-pointer ${
                selected ? "bg-[#E9EDEF]" : "hover:bg-[#F0F2F5]"
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
