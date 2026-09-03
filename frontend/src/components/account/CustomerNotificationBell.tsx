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

export default function CustomerNotificationBell() {
  const t = useTranslations("Account.Notifications");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<
    Array<{ id: string; title: string; type: string; createdAt?: string }>
  >([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { count } = useNotificationUnreadCount("customer", true, 30000);
  const { fetchPreview } = useNotifications({
    audience: "customer",
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
        className="hidden lg:flex p-1.5 lg:p-2 hover:opacity-50 transition items-center justify-center relative"
        aria-label={t("bellLabel")}
      >
        <div className="relative">
          <Bell className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
          {count > 0 && (
            <span className="absolute -top-2.5 -right-1 w-4 h-4 lg:w-4 lg:h-4 bg-black text-white text-[9px] lg:text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 rtl:right-auto rtl:left-0 mt-2 w-80 max-w-[calc(100vw-24px)] sm:w-96 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-black">{t("previewTitle")}</p>
              <p className="text-xs text-gray-500">
                {t("previewSubtitle", { count })}
              </p>
            </div>
            <Link
              href="/account?tab=notifications"
              className="text-xs font-medium text-black hover:opacity-70"
              onClick={() => setOpen(false)}
            >
              {t("viewAll")}
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loadingPreview ? (
              <div className="p-6 flex items-center justify-center text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            ) : preview.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">{t("previewEmpty")}</p>
            ) : (
              preview.map((item) => (
                <Link
                  key={item.id}
                  href="/account?tab=notifications"
                  onClick={() => setOpen(false)}
                  className="block px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition"
                >
                  <p className="text-[11px] uppercase tracking-wide text-gray-400">
                    {getNotificationTypeLabel(item.type, (key) => t(`types.${key}`))}
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
