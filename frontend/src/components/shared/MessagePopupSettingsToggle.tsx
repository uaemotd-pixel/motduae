"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useLocale } from "next-intl";
import toast from "react-hot-toast";
import { SITE_NAME } from "@/lib/seo";
import {
  getMessagePopupsEnabled,
  MESSAGE_POPUPS_CHANGED_EVENT,
  requestDesktopAlertPermission,
  setMessagePopupsEnabled,
} from "@/lib/notifications";

type Variant = "account" | "card";

type MessagePopupSettingsToggleProps = {
  /** account = CustomerSettings row; card = bordered panel for admin/fabric cards */
  variant?: Variant;
};

export default function MessagePopupSettingsToggle({
  variant = "account",
}: MessagePopupSettingsToggleProps) {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [enabled, setEnabled] = useState(true);

  const sync = useCallback(() => {
    setEnabled(getMessagePopupsEnabled());
  }, []);

  useEffect(() => {
    sync();
    const onChange = () => sync();
    window.addEventListener(MESSAGE_POPUPS_CHANGED_EVENT, onChange);
    return () => {
      window.removeEventListener(MESSAGE_POPUPS_CHANGED_EVENT, onChange);
    };
  }, [sync]);

  const fullName = isAr ? "مخوّر اليوم" : "Mukhawar of the Day";
  const title = isAr
    ? `السماح لـ ${SITE_NAME} - ${fullName} بإرسال الإشعارات إليك`
    : `Allow ${SITE_NAME} - ${fullName} to send you notifications`;
  const subtitle = isAr
    ? "تنبيه داخل الموقع أثناء التصفح، وإشعار من المتصفح عندما تكون الصفحة في الخلفية."
    : "In-app toast while you browse, plus a browser notification when this tab is in the background.";

  const handleToggle = () => {
    void (async () => {
      const next = !enabled;
      if (next) {
        const granted = await requestDesktopAlertPermission();
        if (!granted && typeof Notification !== "undefined") {
          toast.error(
            isAr
              ? "فعّلي إذن الإشعارات في المتصفح لاستلام التنبيهات في الخلفية."
              : "Allow browser notifications to get alerts when this tab is in the background.",
          );
        }
      }
      setMessagePopupsEnabled(next);
      setEnabled(next);
      toast.success(
        next
          ? isAr
            ? "تم تفعيل إشعارات الرسائل."
            : "Message notifications turned on."
          : isAr
            ? "تم إيقاف إشعارات الرسائل."
            : "Message notifications turned off.",
      );
    })();
  };

  const switchEl = (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={title}
      onClick={handleToggle}
      dir="ltr"
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition ${
        enabled ? "bg-black" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  if (variant === "card") {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-gray-100 p-2.5 text-gray-700">
            <Bell className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  {isAr ? "إشعارات الرسائل" : "Message notifications"}
                </h2>
                <p className="mt-1 text-sm font-medium text-gray-800">{title}</p>
                <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
              </div>
              {switchEl}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-5">
      <div className="flex items-start sm:items-center gap-3">
        <Bell
          className="w-5 h-5 text-gray-400 shrink-0 mt-0.5 sm:mt-0"
          strokeWidth={1.5}
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-black">
            {isAr ? "إشعارات الرسائل" : "Message notifications"}
          </h3>
          <p className="text-sm text-gray-700 mt-0.5">{title}</p>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>
        {switchEl}
      </div>
    </div>
  );
}
