"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { api, type ApiError } from "@/lib/api/client";
import toast from "react-hot-toast";
import { Bell, Loader2, ChevronDown, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type CustomerNotificationItem = {
  id: string;
  type: string;
  title: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
  orderId?: string;
  order_id?: string;
};

function getApiErrMessage(err: unknown, fallback: string) {
  const msg = (err as ApiError)?.message;
  if (msg) return msg;
  return err instanceof Error ? err.message : fallback;
}

export default function CustomerNotificationPage() {
  const t = useTranslations("Account");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CustomerNotificationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<{
          success: boolean;
          notifications: any[];
        }>("/api/customer/notifications");

        if (!res?.success) {
          throw new Error("Failed to load notifications");
        }

        const normalized: CustomerNotificationItem[] = (
          res.notifications || []
        ).map((raw) => {
          const id = raw?.id ?? raw?._id;
          return {
            ...(raw || {}),
            id: typeof id === "string" ? id : "",
            orderId:
              typeof raw?.orderId === "string"
                ? raw.orderId
                : typeof raw?.order_id === "string"
                  ? raw.order_id
                  : undefined,
            order_id:
              typeof raw?.order_id === "string" ? raw.order_id : undefined,
          };
        });

        setItems(normalized.filter((x) => !!x.id));
      } catch (err: unknown) {
        setError(getApiErrMessage(err, t("loading") || "Failed to load"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [t]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Notifications
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Updates about your orders and returns.
          </p>
        </div>
        <div className="flex items-center gap-2 text-gray-500">
          <Bell className="w-4 h-4" />
          <span className="text-sm">{sortedItems.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-16 shadow-sm">
          <Bell className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 max-w-md">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((n) => (
            <div
              key={n.id}
              className={
                "w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md " +
                (n.read ? "opacity-70" : "")
              }
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs uppercase tracking-wider text-gray-400">
                    {n.type || "notification"}
                  </div>
                  <div className="text-base font-medium text-black truncate">
                    {n.title}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Delete notification"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (!n.id) {
                        toast.error("Invalid notification id");
                        return;
                      }

                      try {
                        await api.delete(`/api/customer/notifications/${n.id}`);
                        setItems((prev) => prev.filter((x) => x.id !== n.id));
                      } catch (err: unknown) {
                        toast.error(
                          getApiErrMessage(
                            err,
                            "Failed to delete notification",
                          ),
                        );
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    aria-label="Toggle notification details"
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      if (!n.id) return;

                      // mark as read
                      try {
                        if (!n.read) {
                          await api.post(
                            "/api/customer/notifications/mark-read",
                            {
                              id: n.id,
                            },
                          );
                          setItems((prev) =>
                            prev.map((it) =>
                              it.id === n.id ? { ...it, read: true } : it,
                            ),
                          );
                        }
                      } catch {
                        // ignore read errors
                      }

                      setExpandedId((cur) => (cur === n.id ? null : n.id));
                    }}
                  >
                    <ChevronDown
                      className={
                        "w-4 h-4 transition-transform " +
                        (expandedId === n.id ? "rotate-180" : "rotate-0")
                      }
                    />
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === n.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3 text-sm text-gray-700"
                  >
                    {n.message ? <p className="pb-2">{n.message}</p> : null}
                    {n.orderId || n.order_id ? (
                      <p className="text-xs text-gray-500">
                        Order: {n.orderId || n.order_id}
                      </p>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
