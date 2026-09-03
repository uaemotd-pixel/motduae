"use client";

import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export type CustomOrderNoticeTone = "error" | "warning" | "info" | "success";

const toneStyles: Record<
  CustomOrderNoticeTone,
  {
    wrap: string;
    icon: string;
    title: string;
    body: string;
    Icon: typeof AlertCircle;
  }
> = {
  error: {
    wrap: "border-rose-200/90 bg-linear-to-br from-rose-50 via-white to-rose-50/40 shadow-[0_8px_30px_rgba(225,29,72,0.08)]",
    icon: "bg-rose-100 text-rose-700 ring-rose-200/80",
    title: "text-rose-950",
    body: "text-rose-800/90",
    Icon: AlertCircle,
  },
  warning: {
    wrap: "border-amber-200/90 bg-linear-to-br from-amber-50 via-white to-amber-50/30 shadow-[0_8px_30px_rgba(217,119,6,0.08)]",
    icon: "bg-amber-100 text-amber-800 ring-amber-200/80",
    title: "text-amber-950",
    body: "text-amber-900/90",
    Icon: AlertTriangle,
  },
  info: {
    wrap: "border-stone-200 bg-linear-to-br from-stone-50 via-white to-stone-50/40 shadow-[0_8px_24px_rgba(28,25,23,0.05)]",
    icon: "bg-stone-100 text-stone-700 ring-stone-200/80",
    title: "text-stone-900",
    body: "text-stone-700",
    Icon: Info,
  },
  success: {
    wrap: "border-emerald-200/90 bg-linear-to-br from-emerald-50 via-white to-emerald-50/30 shadow-[0_8px_30px_rgba(16,185,129,0.08)]",
    icon: "bg-emerald-100 text-emerald-700 ring-emerald-200/80",
    title: "text-emerald-950",
    body: "text-emerald-900/90",
    Icon: CheckCircle2,
  },
};

type CustomOrderNoticeProps = {
  tone: CustomOrderNoticeTone;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
};

export default function CustomOrderNotice({
  tone,
  title,
  description,
  action,
  className = "",
}: CustomOrderNoticeProps) {
  const styles = toneStyles[tone];
  const Icon = styles.Icon;

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-xl border p-4 sm:p-5 animate-in fade-in slide-in-from-bottom-2 duration-300 ${styles.wrap} ${className}`}
    >
      <div
        className="pointer-events-none absolute inset-y-0 start-0 w-1 bg-current opacity-20"
        aria-hidden
      />
      <div className="flex gap-3 sm:gap-4">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ${styles.icon}`}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className={`[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.22em] ${styles.title}`}
          >
            {title}
          </p>
          <p
            className={`mt-1.5 [font-family:var(--font-body)] text-[13px] leading-relaxed sm:text-[14px] ${styles.body}`}
          >
            {description}
          </p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}

type FabricRequirementBadgeProps = {
  label: string;
  value: string;
  hint?: string;
};

export function FabricRequirementBadge({
  label,
  value,
  hint,
}: FabricRequirementBadgeProps) {
  return (
    <div className="inline-flex flex-col gap-1 rounded-lg border border-amber-200/80 bg-linear-to-r from-amber-50/90 to-white px-3 py-2.5 shadow-[0_4px_18px_rgba(217,119,6,0.06)]">
      <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.24em] text-amber-800/80">
        {label}
      </span>
      <span className="[font-family:var(--font-display)] text-[20px] leading-none text-amber-950">
        {value}
      </span>
      {hint ? (
        <span className="[font-family:var(--font-body)] text-[11px] text-amber-900/70">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
