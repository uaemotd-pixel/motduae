"use client";

import { CheckCheck } from "lucide-react";

export type MessageDeliveryStatus = "sent" | "delivered" | "read";

type MessageStatusTicksProps = {
  status?: MessageDeliveryStatus | string;
  /** Use light ticks on dark bubbles (agent/admin outgoing on black). */
  onDark?: boolean;
  className?: string;
};

/**
 * WhatsApp-style ticks (as used in MOTD chat info):
 * - sent / delivered: double gray
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
  const isRead = normalized === "read";

  return (
    <CheckCheck
      className={`h-3.5 w-3.5 shrink-0 ${isRead ? blue : gray} ${className}`}
      strokeWidth={2}
      aria-label={isRead ? "Read" : normalized === "delivered" ? "Delivered" : "Sent"}
    />
  );
}
