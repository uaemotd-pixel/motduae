"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { DASH_ACCENTS, type DashAccent } from "./palette";

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  subValue?: string;
  trend?: number;
  /** Optional status / meta pill (e.g. pending / approved) */
  badge?: ReactNode;
  delay?: number;
  compact?: boolean;
  accent?: DashAccent;
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  subValue,
  trend,
  badge,
  delay = 0,
  compact = false,
  accent = "ink",
}: StatCardProps) {
  const trendUp = typeof trend === "number" ? trend >= 0 : undefined;
  const tone = DASH_ACCENTS[accent] ?? DASH_ACCENTS.ink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={`group relative flex h-full overflow-hidden rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 ${
        compact ? "p-3 sm:p-3.5" : "p-4 sm:p-5"
      }`}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = tone.shadow;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = "";
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-90"
        style={{
          background: `linear-gradient(145deg, ${tone.soft} 0%, transparent 58%)`,
        }}
      />
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ backgroundColor: tone.hex }}
      />
      <div className="relative flex w-full items-start justify-between gap-2 pl-2">
        <div className="flex min-w-0 flex-1 flex-col">
          <p
            className="[font-family:var(--font-ui)] text-[10px] uppercase leading-4 tracking-[0.18em] text-(--dash-muted)"
            title={label}
          >
            {label}
          </p>
          <p
            className={`mt-2 font-light leading-snug text-(--dash-ink) ${
              compact
                ? "truncate whitespace-nowrap text-[13px] tabular-nums sm:text-sm"
                : "wrap-break-word text-2xl"
            }`}
            title={value}
          >
            {value}
          </p>
          <p
            className={`mt-1 line-clamp-2 text-xs leading-snug text-(--dash-muted) ${
              compact ? "min-h-8" : "min-h-10"
            }`}
            title={subValue}
          >
            {subValue || "\u00A0"}
          </p>
          <div
            className={`flex min-h-5 items-center ${compact ? "mt-1" : "mt-2"}`}
          >
            {typeof trend === "number" ? (
              <div
                className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                  trendUp
                    ? "bg-(--dash-success)/12 text-(--dash-success)"
                    : "bg-(--dash-danger)/12 text-(--dash-danger)"
                }`}
              >
                {trendUp ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {Math.abs(trend).toFixed(1)}%
              </div>
            ) : badge ? (
              badge
            ) : null}
          </div>
        </div>
        <div
          className={`flex shrink-0 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110 ${
            compact ? "h-8 w-8" : "h-9 w-9"
          }`}
          style={{ backgroundColor: tone.soft, color: tone.hex }}
        >
          <Icon
            className={compact ? "h-3.5 w-3.5" : "h-4 w-4"}
            strokeWidth={1.75}
          />
        </div>
      </div>
    </motion.div>
  );
}
