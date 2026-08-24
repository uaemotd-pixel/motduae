"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  delay?: number;
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  delay = 0,
}: StatCardProps) {
  const trendUp = typeof trend === "number" ? trend >= 0 : undefined;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="relative flex h-full overflow-hidden rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--dash-gold)]" />
      <div className="flex w-full items-start justify-between gap-2 pl-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <p
            className="[font-family:var(--font-ui)] text-[10px] uppercase leading-4 tracking-[0.18em] text-[var(--dash-muted)]"
            title={label}
          >
            {label}
          </p>
          <p
            className="mt-2 break-words text-2xl font-light leading-snug text-[var(--dash-ink)]"
            title={value}
          >
            {value}
          </p>
          <p
            className="mt-1 line-clamp-2 min-h-[2.5rem] text-xs leading-snug text-[var(--dash-muted)]"
            title={subValue}
          >
            {subValue || "\u00A0"}
          </p>
          <div className="mt-2 flex min-h-[1.25rem] items-center">
            {typeof trend === "number" ? (
              <div
                className={`inline-flex items-center gap-1 text-xs font-medium ${
                  trendUp
                    ? "text-[var(--dash-success)]"
                    : "text-[var(--dash-danger)]"
                }`}
              >
                {trendUp ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </div>
            ) : null}
          </div>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-charcoal)] text-white">
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
}
