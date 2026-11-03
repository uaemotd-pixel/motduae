"use client";

import type { ReactNode, MouseEvent } from "react";
import { Phone, PhoneMissed, PhoneOff } from "lucide-react";
import ChatSearchHighlight from "@/components/shared/ChatSearchHighlight";

export type CallOutcome =
  | "answered"
  | "missed"
  | "rejected"
  | "cancelled"
  | "failed";

/** `center` = successful talk; `start`/`end` = cancel attributed to a side. */
export type CallBubbleAlign = "start" | "end" | "center";

type CallHistoryBubbleProps = {
  text: string;
  callOutcome?: CallOutcome | string | null;
  durationMs?: number;
  /** ISO timestamp of the call event. */
  at?: string;
  locale?: string;
  align?: CallBubbleAlign;
  searchQuery?: string;
  searchActive?: boolean;
  dimmed?: boolean;
  /** Optional leading control (e.g. select checkbox). */
  leading?: ReactNode;
  /** Hidden menu anchor for right-click delete. */
  menu?: ReactNode;
  onContextMenu?: (e: MouseEvent) => void;
};

function formatDuration(ms?: number) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatClock(iso?: string, locale = "en") {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(
      String(locale).toLowerCase().startsWith("ar") ? "ar-AE" : "en-AE",
      { hour: "2-digit", minute: "2-digit" },
    );
  } catch {
    return "";
  }
}

export default function CallHistoryBubble({
  text,
  callOutcome,
  durationMs,
  at,
  locale = "en",
  align = "center",
  searchQuery = "",
  searchActive = false,
  dimmed = false,
  leading,
  menu,
  onContextMenu,
}: CallHistoryBubbleProps) {
  const outcome = String(callOutcome || "");
  const Icon =
    outcome === "missed"
      ? PhoneMissed
      : outcome === "rejected" || outcome === "cancelled" || outcome === "failed"
        ? PhoneOff
        : Phone;

  const isAlert =
    outcome === "missed" || outcome === "rejected" || outcome === "failed";
  const centered = align === "center";
  const mine = align === "end";

  const clock = formatClock(at, locale);
  const talkTime =
    outcome === "answered" && Number(durationMs) > 0
      ? formatDuration(durationMs)
      : null;
  const meta = [
    talkTime && !String(text).includes(talkTime) ? talkTime : null,
    clock,
  ]
    .filter(Boolean)
    .join(" · ");

  const bubble = centered ? (
    <div
      className={`group relative inline-flex max-w-[92%] items-center gap-1.5 rounded-2xl bg-[#FFFFFFCC] px-2.5 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] backdrop-blur-sm sm:gap-2 sm:px-3 sm:py-1.5 ${
        searchActive ? "ring-2 ring-[#FFEB3B] ring-offset-1" : ""
      }`}
      onContextMenu={onContextMenu}
    >
      {menu ? (
        <div className="pointer-events-none absolute start-0 top-0 h-8 w-8">
          {menu}
        </div>
      ) : null}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7 ${
          isAlert
            ? "bg-[#F15C6D]/15 text-[#E0485A]"
            : "bg-[#25D366]/15 text-[#128C7E]"
        }`}
      >
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 text-start">
        <p
          className={`chat-text-call font-medium ${
            isAlert ? "text-[#C62828]" : "text-[#111B21]"
          }`}
        >
          {searchQuery ? (
            <ChatSearchHighlight
              text={text}
              query={searchQuery}
              active={searchActive}
            />
          ) : (
            text
          )}
        </p>
        {meta ? (
          <p className="chat-text-call-meta mt-0.5 text-[#667781]">{meta}</p>
        ) : null}
      </div>
    </div>
  ) : (
    <div
      className={`group relative inline-flex max-w-[min(92%,18rem)] items-center gap-1.5 px-2 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] xs:max-w-[min(88%,20rem)] sm:max-w-[82%] sm:gap-2 sm:px-2.5 ${
        mine
          ? "rounded-[7.5px] rounded-tr-none bg-black/80 text-white"
          : "rounded-[7.5px] rounded-tl-none border border-[#EBEBE8] bg-[#FFFDF9] text-black"
      } ${searchActive ? "ring-2 ring-[#FFEB3B] ring-offset-1" : ""}`}
      onContextMenu={onContextMenu}
    >
      {menu ? (
        <div className="pointer-events-none absolute start-0 top-0 h-8 w-8">
          {menu}
        </div>
      ) : null}
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full sm:h-7 sm:w-7 ${
          mine
            ? isAlert
              ? "bg-[#F15C6D]/25 text-[#FF8A80]"
              : "bg-white/15 text-white"
            : isAlert
              ? "bg-[#F15C6D]/15 text-[#E0485A]"
              : "bg-[#25D366]/15 text-[#128C7E]"
        }`}
      >
        <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 text-start">
        <p
          className={`chat-text-call font-medium ${
            mine
              ? isAlert
                ? "text-[#FF8A80]"
                : "text-white"
              : isAlert
                ? "text-[#C62828]"
                : "text-[#111B21]"
          }`}
        >
          {searchQuery ? (
            <ChatSearchHighlight
              text={text}
              query={searchQuery}
              active={searchActive}
            />
          ) : (
            text
          )}
        </p>
        {meta ? (
          <p
            className={`chat-text-call-meta mt-0.5 ${
              mine ? "text-white/55" : "text-[#667781]"
            }`}
          >
            {meta}
          </p>
        ) : null}
      </div>
    </div>
  );

  return (
    <div
      className={`flex items-center gap-2 py-1 transition-opacity ${
        mine ? "justify-end" : centered ? "justify-center" : "justify-start"
      } ${dimmed ? "opacity-35" : "opacity-100"}`}
    >
      {leading}
      {bubble}
    </div>
  );
}
