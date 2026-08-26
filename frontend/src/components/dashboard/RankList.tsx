"use client";

import { motion } from "framer-motion";
import { DASH_ACCENTS, type DashAccent } from "./palette";

export type RankItem = {
  id: string;
  name: string;
  value: number;
  meta?: string;
};

type RankListProps = {
  title: string;
  items: RankItem[];
  formatValue: (n: number) => string;
  emptyLabel?: string;
  delay?: number;
  accent?: DashAccent;
};

export default function RankList({
  title,
  items,
  formatValue,
  emptyLabel = "No data yet",
  delay = 0,
  accent = "ink",
}: RankListProps) {
  const max = Math.max(...items.map((i) => i.value), 1);
  const tone = DASH_ACCENTS[accent] ?? DASH_ACCENTS.ink;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
      className="relative overflow-hidden rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6"
    >
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{
          background: `linear-gradient(90deg, ${tone.hex}, ${tone.soft})`,
        }}
      />
      <h3 className="[font-family:var(--font-display)] mb-4 flex items-center gap-2 text-lg text-[var(--dash-ink)]">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ backgroundColor: tone.hex }}
        />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--dash-muted)]">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li key={item.id || idx}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center truncate text-[var(--dash-ink)]">
                  <span
                    className="mr-2 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: tone.soft, color: tone.hex }}
                  >
                    {idx + 1}
                  </span>
                  {item.name}
                </span>
                <span className="shrink-0 font-medium text-[var(--dash-ink)]">
                  {formatValue(item.value)}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--dash-border)]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.max(4, (item.value / max) * 100)}%`,
                    background: `linear-gradient(90deg, ${tone.hex}, ${tone.hex}cc)`,
                  }}
                />
              </div>
              {item.meta && (
                <p className="mt-0.5 text-[10px] text-[var(--dash-muted)]">
                  {item.meta}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
