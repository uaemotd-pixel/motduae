"use client";

import { Check, CheckCheck } from "lucide-react";

export type MessageDeliveryStatus = "sent" | "delivered" | "read";

type MessageStatusTicksProps = {
  status?: MessageDeliveryStatus | string;
  /** Use light ticks on dark bubbles (agent/admin outgoing on black). */
  onDark?: boolean;
  className?: string;
};

/**
 * WhatsApp-style ticks:
 * - sent: single gray (not received yet)
 * - delivered: double gray (received, unread)
 * - read: double blue
 */
export default function MessageStatusTicks({
  status = "sent",
  onDark = false,
  className = "",
}: MessageStatusTicksProps) {
  const normalized =
    status === "read" || status === "delivered" || status === "sent"
      ? status
      : "sent";

  const gray = onDark ? "text-white/55" : "text-[#8A8A80]";
  const blue = "text-[#53BDEB]";

  if (normalized === "sent") {
    return (
      <Check
        className={`h-3.5 w-3.5 shrink-0 ${gray} ${className}`}
        strokeWidth={2}
        aria-label="Sent"
      />
    );
  }

  return (
    <CheckCheck
      className={`h-3.5 w-3.5 shrink-0 ${
        normalized === "read" ? blue : gray
      } ${className}`}
      strokeWidth={2}
      aria-label={normalized === "read" ? "Read" : "Delivered"}
    />
  );
}
