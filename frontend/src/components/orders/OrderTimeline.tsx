"use client";

import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import {
  CUSTOM_ORDER_STATUSES,
  formatOrderDateTime,
  getCustomOrderStatusIndex,
  getHistoryEntryForStatus,
  type CustomOrderStatus,
  type CustomOrderStatusHistoryEntry,
} from "@/lib/customOrders";

type OrderTimelineProps = {
  currentStatus: CustomOrderStatus;
  statusHistory: CustomOrderStatusHistoryEntry[];
  locale: Locale;
};  

export default function OrderTimeline({
  currentStatus,
  statusHistory,
  locale,
}: OrderTimelineProps) {
  const t = useTranslations("OrdersPage.timeline");
  const currentIndex = getCustomOrderStatusIndex(currentStatus);

  return (
    <ol className="space-y-0" aria-label={t("ariaLabel")}>
      {CUSTOM_ORDER_STATUSES.map((status, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isPending = index > currentIndex;
        const historyEntry = getHistoryEntryForStatus(statusHistory, status);

        let subtitle = t("pending");
        if (historyEntry) {
          subtitle = formatOrderDateTime(historyEntry.changedAt, locale);
          if (historyEntry.note?.trim()) {
            subtitle = `${subtitle} — ${historyEntry.note.trim()}`;
          }
        } else if (isCurrent) {
          subtitle = t("inProgress");
        }

        return (
          <li key={status} className="flex gap-3 sm:gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 mt-1.5 ${
                  isComplete
                    ? "bg-black"
                    : isCurrent
                      ? "bg-black ring-3 sm:ring-4 ring-black/15"
                      : "bg-(--color-border)"
                }`}
                aria-hidden
              />
              {index < CUSTOM_ORDER_STATUSES.length - 1 && (
                <span
                  className={`w-px flex-1 min-h-4 sm:min-h-6 ${
                    isComplete ? "bg-black" : "bg-(--color-border)"
                  }`}
                  aria-hidden
                />
              )}
            </div>

            <div className={`pb-4 sm:pb-6 ${isPending ? "opacity-50" : ""}`}>
              <p
                className={`[font-family:var(--font-ui)] text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] ${
                  isCurrent ? "text-black" : "text-(--color-grey-muted)"
                }`}
              >
                {t(`statuses.${status}.title`)}
              </p>
              <p className="[font-family:var(--font-body)] text-xs sm:text-[13px] text-(--color-grey-muted) mt-0.5 sm:mt-1">
                {subtitle}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
