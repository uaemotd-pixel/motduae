"use client";

import { splitHighlightSegments } from "@/lib/chat/threadSearch";

type ChatSearchHighlightProps = {
  text: string;
  query: string;
  /** Stronger mark when this is the active jump target. */
  active?: boolean;
  className?: string;
};

export default function ChatSearchHighlight({
  text,
  query,
  active = false,
  className = "",
}: ChatSearchHighlightProps) {
  const q = query.trim();
  if (!q) {
    return <span className={className}>{text}</span>;
  }

  const segments = splitHighlightSegments(text, q);
  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.match ? (
          <mark
            key={`${i}-${seg.text.slice(0, 12)}`}
            className={`rounded-[2px] px-0.5 ${
              active
                ? "bg-[#FFEB3B] text-black"
                : "bg-[#FFF59D] text-inherit"
            }`}
          >
            {seg.text}
          </mark>
        ) : (
          <span key={`${i}-${seg.text.slice(0, 12)}`}>{seg.text}</span>
        ),
      )}
    </span>
  );
}
