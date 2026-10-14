"use client";

import type { FabricStoreInfo } from "@/lib/fabrics";

type StoreAttributionProps = {
  store: FabricStoreInfo | null;
  labels: {
    title: string;
  };
};

export default function StoreAttribution({
  store,
  labels,
}: StoreAttributionProps) {
  if (!store) return null;

  return (
    <div className="space-y-3 rounded-sm border border-(--color-border) bg-[#FAFAF8] p-4 sm:p-5">
      <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
        {labels.title}
      </p>
      <p className="[font-family:var(--font-display)] text-lg text-black">
        {store.name}
      </p>
    </div>
  );
}
