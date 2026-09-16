"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import {
  buildNotificationQuery,
  dispatchNotificationRefresh,
  normalizeNotification,
  type NotificationAudience,
  type NotificationFilters,
  type NotificationItem,
  type NotificationPagination,
  NOTIFICATION_REFRESH_EVENT,
} from "@/lib/notifications";

type UseNotificationsOptions = {
  audience: NotificationAudience;
  enabled?: boolean;
  pollIntervalMs?: number;
  initialFilters?: NotificationFilters;
  /** When true, reload the full list on poll interval and window focus (customer panel). */
  refreshListOnPoll?: boolean;
};

export function useNotifications({
  audience,
  enabled = true,
  pollIntervalMs = 30000,
  initialFilters = {},
  refreshListOnPoll = false,
}: UseNotificationsOptions) {
  const basePath =
    audience === "admin" ? "/api/admin/notifications" : "/api/customer/notifications";

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [pagination, setPagination] = useState<NotificationPagination | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  });

  const refreshUnreadCount = useCallback(async () => {
    if (!enabled) return;

    try {
      const data = await api.get<{ success: boolean; count: number }>(
        `${basePath}/unread-count`,
      );
      if (data?.success && typeof data.count === "number") {
        setUnreadCount(data.count);
      }
    } catch {
      // ignore badge errors
    }
  }, [basePath, enabled]);

  const fetchNotifications = useCallback(
    async (nextFilters: NotificationFilters, append = false, silent = false) => {
      if (!enabled) return;

      if (append) {
        setLoadingMore(true);
      } else if (!silent) {
        setLoading(true);
      }
      setError(null);

      try {
        const res = await api.get<{
          success: boolean;
          notifications: Record<string, unknown>[];
          pagination?: NotificationPagination;
        }>(`${basePath}${buildNotificationQuery(nextFilters)}`);

        if (!res?.success) {
          throw new Error("Failed to load notifications");
        }

        const normalized = (res.notifications || [])
          .map((raw) => normalizeNotification(raw))
          .filter((item) => !!item.id);

        setItems((prev) => (append ? [...prev, ...normalized] : normalized));
        setPagination(res.pagination || null);
        await refreshUnreadCount();
      } catch (err: unknown) {
        if (!silent) {
          setError(err instanceof Error ? err.message : "Failed to load notifications");
        }
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [basePath, enabled, refreshUnreadCount],
  );

  const reload = useCallback(async () => {
    await fetchNotifications({ ...filters, page: 1 }, false, true);
  }, [fetchNotifications, filters]);

  const loadMore = useCallback(async () => {
    if (!pagination?.hasMore || loadingMore) return;
    const nextPage = (pagination.page || 1) + 1;
    const nextFilters = { ...filters, page: nextPage };
    setFilters(nextFilters);
    await fetchNotifications(nextFilters, true);
  }, [fetchNotifications, filters, loadingMore, pagination]);

  const applyFilters = useCallback(
    async (patch: NotificationFilters) => {
      const nextFilters = { ...filters, ...patch, page: 1 };
      setFilters(nextFilters);
      await fetchNotifications(nextFilters, false);
    },
    [fetchNotifications, filters],
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      await api.post(`${basePath}/mark-read`, { id: notificationId });
      setItems((prev) =>
        prev.map((item) =>
          item.id === notificationId ? { ...item, read: true } : item,
        ),
      );
      dispatchNotificationRefresh();
      await refreshUnreadCount();
    },
    [basePath, refreshUnreadCount],
  );

  const markAllAsRead = useCallback(async () => {
    await api.post(`${basePath}/mark-all-read`, {});
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    dispatchNotificationRefresh();
    await refreshUnreadCount();
  }, [basePath, refreshUnreadCount]);

  const deleteNotification = useCallback(
    async (notificationId: string) => {
      await api.delete(`${basePath}/${notificationId}`);
      setItems((prev) => prev.filter((item) => item.id !== notificationId));
      dispatchNotificationRefresh();
      await refreshUnreadCount();
    },
    [basePath, refreshUnreadCount],
  );

  const bulkMarkAsRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      if (audience === "admin") {
        await api.post(`${basePath}/bulk-mark-read`, { ids });
      } else {
        await Promise.all(
          ids.map((id) => api.post(`${basePath}/mark-read`, { id })),
        );
      }
      setItems((prev) =>
        prev.map((item) => (ids.includes(item.id) ? { ...item, read: true } : item)),
      );
      dispatchNotificationRefresh();
      await refreshUnreadCount();
    },
    [audience, basePath, refreshUnreadCount],
  );

  const bulkDelete = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      if (audience === "admin") {
        await api.post(`${basePath}/bulk-delete`, { ids });
      } else {
        await Promise.all(ids.map((id) => api.delete(`${basePath}/${id}`)));
      }
      setItems((prev) => prev.filter((item) => !ids.includes(item.id)));
      dispatchNotificationRefresh();
      await refreshUnreadCount();
    },
    [audience, basePath, refreshUnreadCount],
  );

  const fetchPreview = useCallback(
    async (limit = 5) => {
      const res = await api.get<{
        success: boolean;
        notifications: Record<string, unknown>[];
      }>(`${basePath}${buildNotificationQuery({ page: 1, limit, read: "false" })}`);
      if (!res?.success) return [];
      return (res.notifications || [])
        .map((raw) => normalizeNotification(raw))
        .filter((item) => !!item.id);
    },
    [basePath],
  );

  useEffect(() => {
    if (!enabled) return;
    fetchNotifications(filters, false);
  }, [enabled]); // initial load only

  useEffect(() => {
    if (!enabled) return;

    refreshUnreadCount();
    const interval = setInterval(() => {
      refreshUnreadCount();
      if (refreshListOnPoll) {
        fetchNotifications({ ...filters, page: 1 }, false, true);
      }
    }, pollIntervalMs);

    const onRefresh = () => {
      refreshUnreadCount();
      if (refreshListOnPoll) {
        fetchNotifications({ ...filters, page: 1 }, false, true);
      }
    };

    const onFocus = () => {
      refreshUnreadCount();
      if (refreshListOnPoll) {
        fetchNotifications({ ...filters, page: 1 }, false, true);
      }
    };

    window.addEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
      window.removeEventListener("focus", onFocus);
    };
  }, [
    enabled,
    pollIntervalMs,
    refreshUnreadCount,
    refreshListOnPoll,
    fetchNotifications,
    filters,
  ]);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      }),
    [items],
  );

  return {
    items: sortedItems,
    pagination,
    hasMore: Boolean(pagination?.hasMore),
    unreadCount,
    loading,
    loadingMore,
    error,
    filters,
    reload,
    loadMore,
    applyFilters,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkMarkAsRead,
    bulkDelete,
    fetchPreview,
    refreshUnreadCount,
  };
}

export function useNotificationUnreadCount(
  audience: NotificationAudience,
  enabled = true,
  pollIntervalMs = 30000,
) {
  const basePath =
    audience === "admin" ? "/api/admin/notifications" : "/api/customer/notifications";
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const data = await api.get<{ success: boolean; count: number }>(
        `${basePath}/unread-count`,
      );
      if (data?.success && typeof data.count === "number") {
        setCount(data.count);
      }
    } catch {
      // ignore
    }
  }, [basePath, enabled]);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const interval = setInterval(refresh, pollIntervalMs);
    const onRefresh = () => refresh();
    window.addEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener(NOTIFICATION_REFRESH_EVENT, onRefresh);
    };
  }, [enabled, pollIntervalMs, refresh]);

  return { count, refresh };
}
