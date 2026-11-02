"use client";

import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/media";

const PALETTE = [
  "bg-[#00A884]",
  "bg-[#53BDEB]",
  "bg-[#FF7A59]",
  "bg-[#7C6AF2]",
  "bg-[#E67E22]",
  "bg-[#1ABC9C]",
  "bg-[#E91E63]",
  "bg-[#3498DB]",
];

function initialFromName(name?: string) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return "?";
  // Prefer first letter of first + last word when available.
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  return trimmed.slice(0, 1).toUpperCase();
}

function colorFromName(name?: string) {
  const s = String(name || "x");
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

type ChatAvatarProps = {
  name?: string;
  src?: string | null;
  size?: "sm" | "md" | "lg";
  /** Brand mark (MOTD Care) — white circle with letter, WhatsApp-style contact photo slot. */
  brand?: boolean;
  className?: string;
  online?: boolean;
};

const SIZE = {
  sm: "h-9 w-9 text-[12px]",
  md: "h-10 w-10 text-[13px]",
  lg: "h-12 w-12 text-[15px]",
};

export default function ChatAvatar({
  name,
  src,
  size = "md",
  brand = false,
  className = "",
  online = false,
}: ChatAvatarProps) {
  const [broken, setBroken] = useState(false);
  const url = src ? resolveMediaUrl(src) : "";
  const showImg = Boolean(url) && !broken;
  const dim = SIZE[size];

  useEffect(() => {
    setBroken(false);
  }, [src, url]);

  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${dim} ${className}`}
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={name || "Profile"}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : brand ? (
        <span className="flex h-full w-full items-center justify-center bg-white text-black [font-family:var(--font-display)] tracking-wide">
          M
        </span>
      ) : (
        <span
          className={`flex h-full w-full items-center justify-center font-medium uppercase tracking-wide text-white ${colorFromName(name)}`}
        >
          {initialFromName(name)}
        </span>
      )}
      {online ? (
        <span className="absolute bottom-0 end-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#00A884]" />
      ) : null}
    </span>
  );
}
