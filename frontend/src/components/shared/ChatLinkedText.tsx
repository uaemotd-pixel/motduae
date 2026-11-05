"use client";

import { Fragment } from "react";
import { splitTextWithLinks } from "@/lib/chat/chatLinks";
import { splitHighlightSegments } from "@/lib/chat/threadSearch";

type ChatLinkedTextProps = {
  text: string;
  query?: string;
  active?: boolean;
  onDark?: boolean;
  className?: string;
};

function HighlightedPlain({
  text,
  query,
  active,
}: {
  text: string;
  query: string;
  active: boolean;
}) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  return (
    <>
      {splitHighlightSegments(text, q).map((seg, i) =>
        seg.match ? (
          <mark
            key={`${i}-${seg.text.slice(0, 12)}`}
            className={`rounded-[2px] px-0.5 ${
              active ? "bg-[#FFEB3B] text-black" : "bg-[#FFF59D] text-inherit"
            }`}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={`${i}-${seg.text.slice(0, 12)}`}>{seg.text}</span>
        ),
      )}
    </>
  );
}

/** Renders message text with clickable URLs (and optional search highlight). */
export default function ChatLinkedText({
  text,
  query = "",
  active = false,
  onDark = false,
  className = "",
}: ChatLinkedTextProps) {
  const segments = splitTextWithLinks(text || "");
  const linkClass = onDark
    ? "underline decoration-white/50 underline-offset-2 hover:decoration-white"
    : "text-[#027EB5] underline decoration-[#027EB5]/40 underline-offset-2 hover:decoration-[#027EB5]";

  return (
    <span className={className}>
      {segments.map((seg, i) => {
        if (seg.type === "link") {
          return (
            <a
              key={`l-${i}`}
              href={seg.href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClass}
              onClick={(e) => e.stopPropagation()}
            >
              <HighlightedPlain
                text={seg.value}
                query={query}
                active={active}
              />
            </a>
          );
        }
        return (
          <Fragment key={`t-${i}`}>
            <HighlightedPlain text={seg.value} query={query} active={active} />
          </Fragment>
        );
      })}
    </span>
  );
}
