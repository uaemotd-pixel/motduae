"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: 20,
    ...initialFilters,
  });
  const hasLoadedRef = useRef(false);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

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
    async (
      nextFilters: NotificationFilters,
      append = false,
      mode: "full" | "silent" | "soft" = "full",
    ) => {
      if (!enabled) return;

      if (append) {
        setLoadingMore(true);
      } else if (mode === "full") {
        setLoading(true);
      } else if (mode === "soft") {
        setIsRefreshing(true);
      }
      if (mode !== "silent") {
        setError(null);
      }

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
        hasLoadedRef.current = true;
        await refreshUnreadCount();
      } catch (err: unknown) {
        if (mode !== "silent") {
          setError(err instanceof Error ? err.message : "Failed to load notifications");
        }
        hasLoadedRef.current = true;
      } finally {
        if (append) {
          setLoadingMore(false);
        } else if (mode === "full") {
          setLoading(false);
        } else if (mode === "soft") {
          setIsRefreshing(false);
        }
      }
    },
    [basePath, enabled, refreshUnreadCount],
  );

  const reload = useCallback(async () => {
    await fetchNotifications({ ...filtersRef.current, page: 1 }, false, "silent");
  }, [fetchNotifications]);

  const loadMore = useCallback(async () => {
    if (!pagination?.hasMore || loadingMore) return;
    const nextPage = (pagination.page || 1) + 1;
    const nextFilters = { ...filtersRef.current, page: nextPage };
    setFilters(nextFilters);
    await fetchNotifications(nextFilters, true);
  }, [fetchNotifications, loadingMore, pagination]);

  const goToPage = useCallback(
    async (page: number) => {
      const current = filtersRef.current.page || 1;
      if (page < 1 || page === current) return;
      const nextFilters = { ...filtersRef.current, page };
      setFilters(nextFilters);
      await fetchNotifications(
        nextFilters,
        false,
        hasLoadedRef.current ? "soft" : "full",
      );
    },
    [fetchNotifications],
  );

  const changeLimit = useCallback(
    async (limit: number) => {
      const nextFilters = { ...filtersRef.current, limit, page: 1 };
      setFilters(nextFilters);
      await fetchNotifications(
        nextFilters,
        false,
        hasLoadedRef.current ? "soft" : "full",
      );
    },
    [fetchNotifications],
  );

  const applyFilters = useCallback(
    async (patch: NotificationFilters) => {
      const nextFilters = { ...filtersRef.current, ...patch, page: 1 };
      setFilters(nextFilters);
      // After the first load, keep the current UI mounted so search/filter
      // changes don't swap the list for a skeleton (page "bump").
      await fetchNotifications(
        nextFilters,
        false,
        hasLoadedRef.current ? "soft" : "full",
      );
    },
    [fetchNotifications],
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
    fetchNotifications(filters, false, "full");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // initial load only

  useEffect(() => {
    if (!enabled) return;

    refreshUnreadCount();
    const interval = setInterval(() => {
      refreshUnreadCount();
      if (refreshListOnPoll) {
        fetchNotifications({ ...filtersRef.current, page: 1 }, false, "silent");
      }
    }, pollIntervalMs);

    const onRefresh = () => {
      refreshUnreadCount();
      if (refreshListOnPoll) {
        fetchNotifications({ ...filtersRef.current, page: 1 }, false, "silent");
      }
    };

    const onFocus = () => {
      refreshUnreadCount();
      if (refreshListOnPoll) {
        fetchNotifications({ ...filtersRef.current, page: 1 }, false, "silent");
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
    currentPage: pagination?.page ?? filters.page ?? 1,
    totalPages: pagination?.totalPages ?? 0,
    totalItems: pagination?.total ?? 0,
    pageSize: filters.limit ?? 20,
    unreadCount,
    loading,
    loadingMore,
    isRefreshing,
    error,
    filters,
    reload,
    loadMore,
    goToPage,
    changeLimit,
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
