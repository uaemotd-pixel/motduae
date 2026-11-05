"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import { useRouter } from "@/i18n/navigation";
import { getSocket, setSocketNotifyHost } from "@/lib/realtime/socket";
import {
  buildNotificationQuery,
  dispatchNotificationRefresh,
  getMessagePopupsEnabled,
  getNotificationToastHref,
  isLiveChatNotificationType,
  isPageBackgrounded,
  normalizeNotification,
  notificationAlertKey,
  NOTIFICATION_REFRESH_EVENT,
  showChatPopupNotification,
  type NotificationAudience,
  type NotificationItem,
} from "@/lib/notifications";
import {
  dispatchLiveChatWidgetUnread,
  dispatchOpenLiveChat,
  showNotificationToastFromItem,
} from "@/lib/notificationToast";

type SocketPing = {
  audience?: string;
  notification?: {
    id?: string;
    type?: string;
    title?: string;
    message?: string;
    createdAt?: string;
  };
};

function resolveAudience(
  role: string | undefined,
  isAdmin?: boolean,
): {
  audience: NotificationAudience;
  portal: "admin" | "customer" | "fabric" | "tailor";
} | null {
  const r = String(role || "").toLowerCase();
  if (isAdmin || r === "admin" || r === "sub-admin") {
    return { audience: "admin", portal: "admin" };
  }
  if (r === "fabric_store") {
    return { audience: "customer", portal: "fabric" };
  }
  if (r === "tailor") {
    return { audience: "customer", portal: "tailor" };
  }
  if (r === "customer" || r === "user" || !r) {
    return { audience: "customer", portal: "customer" };
  }
  return { audience: "customer", portal: "customer" };
}

/**
 * In-app toast alerts for live-chat messages (top corner only).
 */
export default function NotificationAlertsHost() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const lastKeyRef = useRef<string | null>(null);
  const seededRef = useRef(false);

  const resolved = user ? resolveAudience(user.role, user.isAdmin) : null;
  // Guests with a session can still receive agent-message toasts.
  const enabled = Boolean(isAuthenticated && user && resolved);
  const userKey = user?.id != null ? String(user.id) : "";

  const basePath =
    resolved?.audience === "admin"
      ? "/api/admin/notifications"
      : "/api/customer/notifications";

  useEffect(() => {
    lastKeyRef.current = null;
    seededRef.current = false;
  }, [userKey]);

  const navigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const openFromAlert = useCallback(
    (item: NotificationItem) => {
      if (!resolved) return;
      const href = getNotificationToastHref(item, resolved.portal);
      if (resolved.portal === "customer") {
        dispatchOpenLiveChat();
      }
      navigate(href);
    },
    [navigate, resolved],
  );

  const presentAlert = useCallback(
    (item: NotificationItem) => {
      if (!resolved) return;
      if (!isLiveChatNotificationType(item.type)) {
        dispatchNotificationRefresh();
        return;
      }
      const key = notificationAlertKey(item);
      if (lastKeyRef.current === key) return;
      lastKeyRef.current = key;
      seededRef.current = true;

      if (getMessagePopupsEnabled()) {
        const openAlert = () => openFromAlert(item);
        if (isPageBackgrounded()) {
          // Tab not visible — in-app toast won't be seen; use OS/browser popup.
          showChatPopupNotification({
            title: item.title || "New message",
            body: item.message || "You have a new chat message",
            tag: `motd-live-${item.id || item.type || "chat"}`,
            onClick: openAlert,
            onlyWhenBackgrounded: true,
          });
        } else {
          showNotificationToastFromItem(item, {
            href: getNotificationToastHref(item, resolved.portal),
            onNavigate: openAlert,
          });
        }
      }

      // Customer FAQ FAB: badge (+ soft chime) when away from the live panel.
      if (
        resolved.portal === "customer" &&
        String(item.type || "").toLowerCase() === "live_chat_agent_message"
      ) {
        dispatchLiveChatWidgetUnread({
          messageId: item.id,
          chime: getMessagePopupsEnabled() && !isPageBackgrounded(),
        });
      }

      dispatchNotificationRefresh();
    },
    [openFromAlert, resolved],
  );

  const pollLatest = useCallback(async () => {
    if (!enabled || !resolved) return;
    try {
      const res = await api.get<{
        success: boolean;
        notifications: Record<string, unknown>[];
      }>(
        `${basePath}${buildNotificationQuery({ page: 1, limit: 20, read: "false" })}`,
      );
      if (!res?.success) return;
      const live = (res.notifications || [])
        .map((raw) => normalizeNotification(raw))
        .find((item) => item.id && isLiveChatNotificationType(item.type));
      if (!live) {
        if (!seededRef.current) seededRef.current = true;
        return;
      }
      const key = notificationAlertKey(live);
      if (!seededRef.current) {
        lastKeyRef.current = key;
        seededRef.current = true;
        return;
      }
      if (lastKeyRef.current === key) return;
      presentAlert(live);
    } catch {
      // ignore poll errors
    }
  }, [basePath, enabled, presentAlert, resolved]);

  useEffect(() => {
    if (!enabled) return;
    void pollLatest();
    const interval = window.setInterval(() => {
      void pollLatest();
    }, 12000);
    const onRefresh = () => {
      void pollLatest();
    };
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onRefresh);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onRefresh);
    };
  }, [enabled, pollLatest]);

  useEffect(() => {
    if (!enabled || !resolved || isLoading) return;
    const shouldConnect =
      resolved.portal === "customer" ||
      resolved.portal === "fabric" ||
      resolved.portal === "admin";
    const socket = getSocket();

    const onPing = (payload?: SocketPing) => {
      if (payload?.audience && payload.audience !== resolved.audience) return;
      dispatchNotificationRefresh();
      const n = payload?.notification;
      if (n?.title || n?.message || n?.id) {
        presentAlert(
          normalizeNotification({
            id: n.id,
            type: n.type,
            title: n.title || "New message",
            message: n.message,
            createdAt: n.createdAt,
            read: false,
          }),
        );
        return;
      }
      void pollLatest();
    };

    socket.on("notifications:updated", onPing);

    if (shouldConnect) {
      setSocketNotifyHost(true);
      if (!socket.connected) socket.connect();
    }

    return () => {
      socket.off("notifications:updated", onPing);
      if (shouldConnect) {
        setSocketNotifyHost(false);
        if (!socket.__supportChatEffect && socket.connected) {
          socket.disconnect();
        }
      }
    };
  }, [enabled, isLoading, pollLatest, presentAlert, resolved]);

  return null;
}
