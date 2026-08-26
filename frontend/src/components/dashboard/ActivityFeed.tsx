"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";

export type ActivityItem = {
  id: string;
  type?: string;
  amount: number;
  status: string;
  date: string;
};

type ActivityFeedProps = {
  items: ActivityItem[];
  formatCurrency: (n: number) => string;
  title?: string;
  emptyLabel?: string;
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ");
}

export default function ActivityFeed({
  items,
  formatCurrency,
  title = "Recent Activity",
  emptyLabel = "No recent orders",
}: ActivityFeedProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
      className="rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6"
    >
      <h3 className="[font-family:var(--font-display)] mb-4 text-lg text-[var(--dash-ink)]">
        {title}
      </h3>
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Package className="mb-2 h-8 w-8 text-[var(--dash-border)]" strokeWidth={1} />
          <p className="text-xs text-[var(--dash-muted)]">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="space-y-0">
          {items.map((item, i) => (
            <li
              key={`${item.id}-${i}`}
              className="flex items-center gap-3 border-b border-[var(--dash-border)] py-3 last:border-0"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                <div className="h-2 w-2 rounded-full bg-black" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-[var(--dash-ink)]">
                  {item.type
                    ? `${item.type.charAt(0).toUpperCase()}${item.type.slice(1)} order`
                    : "Order"}{" "}
                  <span className="text-[var(--dash-muted)]">
                    #{item.id.slice(-6)}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] capitalize text-[var(--dash-muted)]">
                  {formatStatus(item.status)}
                  {item.date
                    ? ` · ${new Date(item.date).toLocaleDateString()}`
                    : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-medium text-[var(--dash-ink)]">
                {formatCurrency(item.amount)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
