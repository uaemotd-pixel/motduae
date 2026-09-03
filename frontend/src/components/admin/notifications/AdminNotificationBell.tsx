"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  useNotificationUnreadCount,
  useNotifications,
} from "@/hooks/useNotifications";
import { getNotificationTypeLabel } from "@/lib/notifications";

export default function AdminNotificationBell() {
  const tn = useTranslations("Admin.Notifications");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<
    Array<{ id: string; title: string; type: string; createdAt?: string }>
  >([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { count } = useNotificationUnreadCount("admin", true, 30000);
  const { fetchPreview } = useNotifications({
    audience: "admin",
    enabled: false,
  });

  useEffect(() => {
    if (!open) return;

    const load = async () => {
      setLoadingPreview(true);
      try {
        const items = await fetchPreview(5);
        setPreview(items);
      } finally {
        setLoadingPreview(false);
      }
    };
    load();
  }, [open, fetchPreview, count]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full border border-gray-200 bg-white p-2 shadow-sm transition hover:bg-gray-50"
        aria-label={tn("bellLabel")}
      >
        <Bell className="w-4 h-4 text-gray-700" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-semibold flex items-center justify-center">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 max-w-[calc(100vw-24px)] sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">{tn("previewTitle")}</p>
              <p className="text-xs text-gray-500">
                {tn("previewSubtitle", { count })}
              </p>
            </div>
            <Link
              href="/admin/notifications"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
              onClick={() => setOpen(false)}
            >
              {tn("viewAll")}
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingPreview ? (
              <div className="p-6 flex items-center justify-center text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : preview.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{tn("previewEmpty")}</p>
            ) : (
              preview.map((item) => (
                <Link
                  key={item.id}
                  href="/admin/notifications"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition"
                >
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    {getNotificationTypeLabel(item.type)}
                  </p>
                  <p className="text-sm font-medium text-black truncate">
                    {item.title}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
