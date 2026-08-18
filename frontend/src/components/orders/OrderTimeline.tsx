"use client";

import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import {
  formatOrderDateTime,
  getCustomOrderTimelineStatuses,
  getHistoryEntryForStatus,
  type CustomOrderStatus,
  type CustomOrderStatusHistoryEntry,
} from "@/lib/customOrders";

type OrderTimelineProps = {
  currentStatus: CustomOrderStatus;
  statusHistory: CustomOrderStatusHistoryEntry[];
  locale: Locale;
  hasReturnItems?: boolean;
};

function getStatusTone(
  status: CustomOrderStatus,
  isActive: boolean,
  isCurrent: boolean,
  isPending: boolean,
) {
  if (isPending) {
    return {
      dot: "bg-(--color-border)",
      text: "text-(--color-grey-muted)",
      line: "bg-(--color-border)",
      content: "opacity-50",
    };
  }

  if (status === "return_rejected" && isActive) {
    return {
      dot: isCurrent ? "bg-red-500 ring-3 ring-red-200" : "bg-red-500",
      text: "text-red-600",
      line: "bg-red-400",
      content: "",
    };
  }

  if (status === "refund_processed" && isActive) {
    return {
      dot: isCurrent ? "bg-green-500 ring-3 ring-green-200" : "bg-green-500",
      text: "text-green-600",
      line: "bg-green-400",
      content: "",
    };
  }

  return {
    dot: isCurrent ? "bg-black ring-3 sm:ring-4 ring-black/15" : "bg-black",
    text: isCurrent ? "text-black" : "text-(--color-grey-muted)",
    line: "bg-black",
    content: "",
  };
}

export default function OrderTimeline({
  currentStatus,
  statusHistory,
  locale,
  hasReturnItems = false,
}: OrderTimelineProps) {
  const t = useTranslations("OrdersPage.timeline");
  const displayedStatuses = getCustomOrderTimelineStatuses(
    currentStatus,
    statusHistory,
    hasReturnItems,
  );
  const currentIndex = displayedStatuses.indexOf(currentStatus);

  return (
    <ol className="space-y-0" aria-label={t("ariaLabel")}>
      {displayedStatuses.map((status, index) => {
        const historyEntry = getHistoryEntryForStatus(statusHistory, status);
        const isCurrent = status === currentStatus;
        const isComplete =
          !isCurrent && (currentIndex === -1 ? Boolean(historyEntry) : index < currentIndex);
        const isPending =
          !isCurrent && (currentIndex === -1 ? !historyEntry : index > currentIndex);
        const tone = getStatusTone(
          status,
          isComplete || isCurrent,
          isCurrent,
          isPending,
        );

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
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shrink-0 mt-1.5 ${tone.dot}`}
                aria-hidden
              />
              {index < displayedStatuses.length - 1 && (
                <span
                  className={`w-px flex-1 min-h-4 sm:min-h-6 ${
                    isPending ? "bg-(--color-border)" : tone.line
                  }`}
                  aria-hidden
                />
              )}
            </div>

            <div className={`pb-4 sm:pb-6 ${tone.content}`}>
              <p
                className={`[font-family:var(--font-ui)] text-[10px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.18em] ${tone.text}`}
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
