"use client";

export default function DashboardSkeleton({
  kpiCount = 6,
}: {
  kpiCount?: number;
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-[var(--dash-border)]" />
        <div className="h-10 w-40 animate-pulse rounded-xl bg-[var(--dash-border)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {[...Array(kpiCount)].map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div
            key={i}
            className="h-80 animate-pulse rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)]"
          />
        ))}
      </div>
    </div>
  );
}
