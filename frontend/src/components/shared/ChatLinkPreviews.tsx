"use client";

import {
  ExternalLink,
  Package,
  ShoppingBag,
  Store,
  Palette,
  Sparkles,
  ClipboardList,
} from "lucide-react";
import { extractPreviewLinks, type ChatLinkKind } from "@/lib/chat/chatLinks";

type ChatLinkPreviewsProps = {
  text: string;
  onDark?: boolean;
};

function iconFor(kind: ChatLinkKind) {
  switch (kind) {
    case "ready-made":
      return ShoppingBag;
    case "fabric":
      return Package;
    case "brand":
      return Store;
    case "design":
      return Palette;
    case "addon":
      return Sparkles;
    case "order":
      return ClipboardList;
    default:
      return ExternalLink;
  }
}

/** Compact product / order cards under a bubble when MOTD URLs are present. */
export default function ChatLinkPreviews({
  text,
  onDark = false,
}: ChatLinkPreviewsProps) {
  const links = extractPreviewLinks(text || "");
  if (!links.length) return null;

  return (
    <div className="mt-1.5 flex w-full min-w-[11rem] max-w-[16.5rem] flex-col gap-1.5">
      {links.map((link) => {
        const Icon = iconFor(link.kind);
        return (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`flex items-start gap-2.5 rounded-lg border px-2.5 py-2 transition hover:cursor-pointer ${
              onDark
                ? "border-white/20 bg-black/15 hover:bg-black/25"
                : "border-black/10 bg-white/80 hover:bg-white"
            }`}
          >
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                onDark ? "bg-white/15 text-white" : "bg-[#F0EEE8] text-[#54656F]"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={`block truncate text-[13px] leading-snug [font-family:var(--font-body)] ${
                  onDark ? "text-white" : "text-[#111B21]"
                }`}
              >
                {link.title}
              </span>
              <span
                className={`mt-0.5 block truncate text-[11px] [font-family:var(--font-ui)] ${
                  onDark ? "text-white/65" : "text-[#667781]"
                }`}
              >
                {link.subtitle}
              </span>
            </span>
            <ExternalLink
              className={`mt-1 h-3.5 w-3.5 shrink-0 ${
                onDark ? "text-white/50" : "text-[#8A8A80]"
              }`}
              strokeWidth={1.75}
            />
          </a>
        );
      })}
    </div>
  );
}
