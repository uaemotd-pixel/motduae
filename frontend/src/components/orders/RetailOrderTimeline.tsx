"use client";

import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import {
  formatOrderDateTime,
  type CustomOrderStatusHistoryEntry,
} from "@/lib/customOrders";

export const RETAIL_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
] as const;

export type RetailOrderStatus = (typeof RETAIL_ORDER_STATUSES)[number];

type RetailOrderTimelineProps = {
  currentStatus: string;
  statusHistory: CustomOrderStatusHistoryEntry[];
  locale: Locale;
};

function getRetailTimelineStatuses(currentStatus: string): string[] {
  if (currentStatus === "cancelled") {
    return ["pending", "confirmed", "cancelled"];
  }
  return [...RETAIL_ORDER_STATUSES];
}

function getHistoryEntryForStatus(
  history: CustomOrderStatusHistoryEntry[],
  status: string,
): CustomOrderStatusHistoryEntry | undefined {
  return history.find((entry) => entry.status === status);
}

export default function RetailOrderTimeline({
  currentStatus,
  statusHistory,
  locale,
}: RetailOrderTimelineProps) {
  const tTimeline = useTranslations("OrdersPage.timeline");
  const tRetail = useTranslations("OrdersPage.retail.statuses");
  const displayedStatuses = getRetailTimelineStatuses(currentStatus);
  const currentIndex = displayedStatuses.indexOf(currentStatus);

  return (
    <ol className="space-y-0" aria-label={tTimeline("ariaLabelRetail")}>
      {displayedStatuses.map((status, index) => {
        const historyEntry = getHistoryEntryForStatus(statusHistory, status);
        const isCurrent = status === currentStatus;
        const isComplete =
          !isCurrent &&
          (currentIndex === -1 ? Boolean(historyEntry) : index < currentIndex);
        const isPending =
          !isCurrent && (currentIndex === -1 ? !historyEntry : index > currentIndex);

        let subtitle = tTimeline("pending");
        if (historyEntry) {
          subtitle = formatOrderDateTime(historyEntry.changedAt, locale);
          if (historyEntry.note?.trim()) {
            subtitle = `${subtitle} — ${historyEntry.note.trim()}`;
          }
        } else if (isCurrent) {
          subtitle = tTimeline("inProgress");
        }

        const dotClass = isPending
          ? "bg-(--color-border)"
          : status === "cancelled" && isCurrent
            ? "bg-red-500 ring-3 ring-red-200"
            : isCurrent
              ? "bg-black ring-3 sm:ring-4 ring-black/15"
              : "bg-black";

        const textClass = isPending
          ? "text-(--color-grey-muted) opacity-50"
          : status === "cancelled" && isCurrent
            ? "text-red-600"
            : isCurrent
              ? "text-black"
              : "text-(--color-grey-muted)";

        return (
          <li key={status} className="flex gap-3 sm:gap-4">
            <div className="flex flex-col items-center">
              <span
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 mt-1.5 ${dotClass}`}
                aria-hidden
              />
              {index < displayedStatuses.length - 1 && (
                <span
                  className={`w-px flex-1 min-h-4 sm:min-h-6 ${
                    isPending ? "bg-(--color-border)" : "bg-black"
                  }`}
                  aria-hidden
                />
              )}
            </div>

            <div className={`pb-4 sm:pb-6 ${isPending ? "opacity-50" : ""}`}>
              <p
                className={`[font-family:var(--font-ui)] text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] ${textClass}`}
              >
                {tRetail(status, { defaultValue: status })}
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
