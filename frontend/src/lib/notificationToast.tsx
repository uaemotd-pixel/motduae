"use client";

import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Bell, MessageCircle, X } from "lucide-react";
import {
  isLiveChatNotificationType,
  type NotificationItem,
} from "@/lib/notifications";

export const OPEN_LIVE_CHAT_EVENT = "motd-open-live-chat";
/** Fired when an agent reply lands while the customer FAQ/live widget is away. */
export const LIVE_CHAT_WIDGET_UNREAD_EVENT = "motd-live-chat-widget-unread";

export function dispatchOpenLiveChat() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_LIVE_CHAT_EVENT));
}

export function dispatchLiveChatWidgetUnread(detail?: {
  messageId?: string;
  chime?: boolean;
}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(LIVE_CHAT_WIDGET_UNREAD_EVENT, { detail: detail || {} }),
  );
}

/** Soft two-tone chime (Web Audio — no asset file). */
export function playSoftChatChime() {
  if (typeof window === "undefined") return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.07, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    const a = ctx.createOscillator();
    a.type = "sine";
    a.frequency.setValueAtTime(784, now);
    a.connect(gain);
    a.start(now);
    a.stop(now + 0.16);

    const b = ctx.createOscillator();
    b.type = "sine";
    b.frequency.setValueAtTime(1046.5, now + 0.11);
    b.connect(gain);
    b.start(now + 0.11);
    b.stop(now + 0.4);

    window.setTimeout(() => {
      void ctx.close();
    }, 600);
  } catch {
    /* autoplay / unsupported — ignore */
  }
}

type ShowNotificationToastOptions = {
  id?: string;
  title: string;
  message?: string;
  type?: string;
  href?: string;
  onNavigate?: (href: string) => void;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/**
 * MOTD-themed in-app toast for live chat (and similar) alerts.
 * Smooth spring enter / ease-out exit; click opens the related chat.
 */
export function showNotificationToast({
  id,
  title,
  message,
  type,
  href,
  onNavigate,
}: ShowNotificationToastOptions) {
  const isChat = isLiveChatNotificationType(type);
  const Icon = isChat ? MessageCircle : Bell;

  toast.custom(
    (t) => (
      <motion.div
        layout
        initial={{ opacity: 0, y: -18, scale: 0.94, filter: "blur(4px)" }}
        animate={
          t.visible
            ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, y: -10, scale: 0.97, filter: "blur(3px)" }
        }
        transition={
          t.visible
            ? { type: "spring", stiffness: 460, damping: 28, mass: 0.85 }
            : { duration: 0.28, ease: EASE_OUT }
        }
        className="pointer-events-auto"
      >
        <div
          role="status"
          className="relative flex w-[min(360px,calc(100vw-24px))] items-start gap-3 overflow-hidden rounded-2xl border border-[#E8E8E4] bg-[#FFFDF9] px-3.5 py-3 pe-10 text-start shadow-[0_12px_32px_rgba(28,43,36,0.12)]"
          style={{ fontFamily: "var(--font-body)" }}
        >
          {/* Warm MOTD accent wash */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-[#1c2b24] via-[#3d4f45] to-[#E8B89A]"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute -end-6 -top-8 h-24 w-24 rounded-full bg-[#E8B89A]/18 blur-2xl"
          />

          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 520,
              damping: 22,
              delay: 0.06,
            }}
            className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1c2b24] text-[#F3EBE1] shadow-[0_4px_12px_rgba(28,43,36,0.28)]"
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[#E8B89A]/50"
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 1.45, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeOut", delay: 0.12 }}
            />
          </motion.span>

          <button
            type="button"
            onClick={() => {
              toast.dismiss(t.id);
              if (isChat) dispatchOpenLiveChat();
              if (href && onNavigate) onNavigate(href);
            }}
            className="relative min-w-0 flex-1 pt-0.5 text-start hover:cursor-pointer"
          >
            <span className="block text-[10px] font-medium uppercase tracking-[0.16em] text-[#8A8A80] [font-family:var(--font-ui)]">
              MOTD
            </span>
            <span className="mt-0.5 block text-[13.5px] font-medium leading-snug tracking-tight text-[#1c2b24] [font-family:var(--font-display)]">
              {title}
            </span>
            {message ? (
              <span className="mt-1 block text-[12.5px] leading-snug text-[#5c5348] line-clamp-2">
                {message}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              toast.dismiss(t.id);
            }}
            className="absolute end-2 top-2 rounded-full p-1.5 text-[#8A8A80] transition hover:bg-[#1c2b24]/6 hover:text-[#1c2b24] hover:cursor-pointer"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      </motion.div>
    ),
    {
      duration: 5200,
      id: id
        ? `motd-notif-${id}`
        : `motd-notif-${type || "generic"}-${Date.now()}`,
    },
  );
}

export function showNotificationToastFromItem(
  item: Pick<NotificationItem, "id" | "title" | "message" | "type" | "createdAt">,
  opts: { href?: string; onNavigate?: (href: string) => void },
) {
  showNotificationToast({
    id: item.id
      ? `${item.id}-${item.createdAt || ""}`
      : undefined,
    title: item.title || "New notification",
    message: item.message,
    type: item.type,
    href: opts.href,
    onNavigate: opts.onNavigate,
  });
}
