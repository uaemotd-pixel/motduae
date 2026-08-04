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
  const isLongValue = value.length > 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="absolute inset-y-0 left-0 w-1 bg-[var(--dash-gold)]" />
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="min-w-0 flex-1">
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
            {label}
          </p>
          <p
            className={`mt-2 font-light leading-snug break-words text-[var(--dash-ink)] ${
              isLongValue
                ? "text-base sm:text-lg xl:text-xl"
                : "text-2xl sm:text-[28px]"
            }`}
            title={value}
          >
            {value}
          </p>
          {subValue && (
            <p className="mt-1 text-xs leading-snug break-words text-[var(--dash-muted)]">
              {subValue}
            </p>
          )}
          {typeof trend === "number" && (
            <div
              className={`mt-2 inline-flex items-center gap-1 text-xs font-medium ${
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
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--dash-charcoal)] text-[var(--dash-gold)]">
          <Icon className="h-4 w-4" strokeWidth={1.5} />
        </div>
      </div>
    </motion.div>
  );
}
