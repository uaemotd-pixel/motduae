"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { DASH_ACCENTS, type DashAccent } from "./palette";

type ChartCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  action?: ReactNode;
  accent?: DashAccent;
};

export default function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  delay = 0,
  action,
  accent = "ink",
}: ChartCardProps) {
  const tone = DASH_ACCENTS[accent] ?? DASH_ACCENTS.ink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className={`relative overflow-hidden rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${tone.hex}, ${tone.soft})`,
        }}
      />
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="[font-family:var(--font-display)] flex items-center gap-2 text-lg text-[var(--dash-ink)]">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: tone.hex }}
            />
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1 text-xs text-[var(--dash-muted)]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}
