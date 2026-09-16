"use client";

import { Scissors, Store, Truck } from "lucide-react";
import type { PartnerKindFilter, PartnerPayoutKind } from "./types";

export function PartnerKindIcon({ kind }: { kind: PartnerPayoutKind }) {
  if (kind === "tailor") return <Scissors className="h-4 w-4" />;
  if (kind === "fabric") return <Store className="h-4 w-4" />;
  return <Truck className="h-4 w-4" />;
}

const KIND_OPTIONS: Array<{ id: PartnerKindFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "tailor", label: "Tailor" },
  { id: "fabric", label: "Fabric" },
  { id: "shipping", label: "Shipping" },
];

export function KindFilterPills({
  value,
  onChange,
}: {
  value: PartnerKindFilter;
  onChange: (next: PartnerKindFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {KIND_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`whitespace-nowrap rounded-full border px-3 py-1 text-[10px] font-medium uppercase tracking-wide transition ${
              active
                ? "border-(--dash-charcoal) bg-(--dash-charcoal) text-white"
                : "border-(--dash-border) bg-white text-(--dash-muted) hover:text-(--dash-ink)"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
