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
  | "symbols"
  | "flags";

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
  flags: 9,
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
    emoji: "💯",
    labelEn: "Symbols",
    labelAr: "الرموز",
  },
  {
    key: "flags",
    emoji: "🏳️",
    labelEn: "Flags",
    labelAr: "الأعلام",
  },
];

const ENABLED_CATEGORY_INDEXES = new Set(
  CATEGORY_TABS.map((t) => CATEGORY_INDEX[t.key]),
);

/** Compact panel width so 8 columns stay tight on large desktops. */
const PANEL_MAX_WIDTH_PX = 340;
const EMOJI_COLUMNS = 8;

function categoryHeaderId(key: CategoryTabKey) {
  return `motd-emoji-cat-${key}`;
}

/** Frimousse CategoryHeader only receives `{ label }` — match our tab by EN label. */
function tabKeyFromFrimousseLabel(label: string): CategoryTabKey | null {
  const normalized = label.trim().toLowerCase();
  const exact = CATEGORY_TABS.find(
    (t) => t.labelEn.toLowerCase() === normalized,
  );
  if (exact) return exact.key;
  // Emojibase wording can differ slightly ("Smileys & emotion" vs our title case).
  return (
    CATEGORY_TABS.find((t) => normalized.startsWith(t.key))?.key ?? null
  );
}

const FrimousseGrid = dynamic(
  () =>
    import("frimousse").then(({ EmojiPicker, defaultEmojiDataResolver }) => {
      function EmojiGrid({
        isAr,
        onPick,
        autoFocusSearch,
      }: {
        isAr: boolean;
        onPick?: (emoji: string) => void;
        autoFocusSearch: boolean;
      }) {
        return (
          <EmojiPicker.Root
            className="flex h-full min-h-0 w-full flex-col overflow-hidden"
            columns={EMOJI_COLUMNS}
            locale="en"
            resolveEmojiData={async (locale, options) => {
              const data = await defaultEmojiDataResolver(locale, options);
              // Keep every enabled category so search works across the full set.
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
                autoFocus={autoFocusSearch}
                onKeyDown={(e) => {
                  // Never let Enter submit a parent <form> (admin/fabric composers).
                  if (e.key === "Enter") {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
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
                      const key = tabKeyFromFrimousseLabel(category.label);
                      const meta = key
                        ? CATEGORY_TABS.find((t) => t.key === key)
                        : undefined;
                      const title =
                        (isAr ? meta?.labelAr : meta?.labelEn) ||
                        category.label;
                      return (
                        <div
                          {...props}
                          id={key ? categoryHeaderId(key) : undefined}
                          data-emoji-category={key ?? undefined}
                          className="bg-[#F7F8FA] px-2.5 pb-1 pt-2 text-[11px] font-medium capitalize text-[#667781] [font-family:var(--font-body)]"
                        >
                          {title}
                        </div>
                      );
                    },
                    Row: ({ children, ...props }) => (
                      <div {...props} className="box-border flex w-full px-1">
                        {children}
                      </div>
                    ),
                    Emoji: ({ emoji, ...props }) => (
                      <button
                        {...props}
                        type="button"
                        className="box-border flex h-9 shrink-0 items-center justify-center rounded-md text-[20px] leading-none transition data-[active]:bg-[#E9EDEF] hover:cursor-pointer hover:bg-[#E9EDEF] sm:h-10 sm:text-[22px]"
                        style={{
                          ...props.style,
                          // Fraction of the capped panel width — not the full chat composer.
                          width: `calc(100% / ${EMOJI_COLUMNS})`,
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
  const [autoFocusSearch, setAutoFocusSearch] = useState(false);

  useEffect(() => {
    if (!open) return;
    setActiveTab("smileys");
    // Autofocus search only on fine pointers — mobile keyboard fights the picker.
    const fine =
      typeof window !== "undefined" &&
      window.matchMedia("(pointer: fine)").matches;
    setAutoFocusSearch(fine);
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

  const jumpToCategory = (key: CategoryTabKey) => {
    setActiveTab(key);
    // Frimousse virtualizes rows but keeps every category shell in the DOM
    // (absolute-positioned). Scroll the viewport to that shell —
    // scrollIntoView is unreliable with sticky headers + nested overflow.
    window.requestAnimationFrame(() => {
      const root = ref.current;
      if (!root) return;
      const viewport = root.querySelector(
        "[frimousse-viewport]",
      ) as HTMLElement | null;
      const header = root.querySelector(
        `[data-emoji-category="${key}"]`,
      ) as HTMLElement | null;
      if (!viewport || !header) return;
      const shell =
        (header.closest("[frimousse-category]") as HTMLElement | null) ??
        header;
      const top =
        shell.getBoundingClientRect().top -
        viewport.getBoundingClientRect().top +
        viewport.scrollTop;
      viewport.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  };

  if (!open) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={isAr ? "الرموز التعبيرية" : "Emoji"}
      dir="ltr"
      onWheel={(e) => e.stopPropagation()}
      style={{ width: `min(100%, ${PANEL_MAX_WIDTH_PX}px)` }}
      className="absolute start-0 bottom-full z-40 mb-2 flex h-[min(42dvh,20rem)] max-h-[20rem] flex-col overflow-hidden rounded-xl border border-[#E9EDEF] bg-[#F7F8FA] shadow-[0_8px_30px_rgba(11,20,26,0.18)]"
    >
      <div className="min-h-0 flex-1 basis-0 overflow-hidden">
        <FrimousseGrid
          isAr={isAr}
          onPick={onPick}
          autoFocusSearch={autoFocusSearch}
        />
      </div>

      <div
        className="flex shrink-0 items-center justify-between gap-0.5 overflow-x-auto border-t border-[#E9EDEF] bg-white px-1 py-1.5"
        dir="ltr"
      >
        {CATEGORY_TABS.map((tab) => {
          const selected = activeTab === tab.key;
          const label = isAr ? tab.labelAr : tab.labelEn;
          return (
            <button
              key={tab.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => jumpToCategory(tab.key)}
              title={label}
              aria-label={label}
              aria-pressed={selected}
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[16px] transition hover:cursor-pointer ${
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
