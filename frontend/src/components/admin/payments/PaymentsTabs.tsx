"use client";

import type { PaymentTab } from "./types";

const TABS: Array<{ id: PaymentTab; label: string }> = [
  { id: "to-pay", label: "To pay" },
  { id: "in-progress", label: "In progress" },
  { id: "requests", label: "Requests" },
  { id: "history", label: "History" },
];

export default function PaymentsTabs({
  value,
  onChange,
  processingCount,
  pendingRequestCount,
}: {
  value: PaymentTab;
  onChange: (tab: PaymentTab) => void;
  processingCount: number;
  pendingRequestCount: number;
}) {
  const badgeFor = (id: PaymentTab) => {
    if (id === "in-progress") return processingCount;
    if (id === "requests") return pendingRequestCount;
    return 0;
  };

  return (
    <div className="flex gap-1 overflow-x-auto border-b border-(--dash-border)">
      {TABS.map((tab) => {
        const active = value === tab.id;
        const badge = badgeFor(tab.id);
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex shrink-0 items-center whitespace-nowrap px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${
              active
                ? "border-b-2 border-(--dash-charcoal) text-(--dash-ink)"
                : "border-b-2 border-transparent text-(--dash-muted) hover:text-(--dash-ink)"
            }`}
          >
            {tab.label}
            {badge > 0 ? (
              <span className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-amber-800">
                {badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
