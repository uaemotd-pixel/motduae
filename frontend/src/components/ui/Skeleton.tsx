import type { HTMLAttributes } from "react";

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  className?: string;
};

function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Base shimmer block — use for any placeholder shape. */
export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={cx(
        "animate-pulse rounded-sm bg-[#E8E4DC]",
        className,
      )}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={cx("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cx(
            "h-3",
            i === lines - 1 && lines > 1 ? "w-2/3" : "w-full",
          )}
        />
      ))}
    </div>
  );
}

export function PageHeaderSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div className={cx("mb-8 space-y-3", className)}>
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="border border-[#E4E0D8] bg-white overflow-hidden">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 8,
  columnsClassName = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  className = "",
}: {
  count?: number;
  columnsClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cx("grid gap-6", columnsClassName, className)}
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** Home carousel/grid section placeholder — matches title + chips + cards layout. */
export function HomeSectionSkeleton({
  showFilters = true,
  cardCount = 4,
  className = "",
}: {
  showFilters?: boolean;
  cardCount?: number;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 xs:mb-10 sm:mb-12 gap-4">
        <div className="space-y-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-56 sm:w-72 max-w-full" />
        </div>
        <Skeleton className="h-3 w-36 shrink-0" />
      </div>

      {showFilters && (
        <div className="flex gap-2 sm:gap-3 mb-8 sm:mb-10 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 shrink-0" />
          ))}
        </div>
      )}

      <ProductGridSkeleton
        count={cardCount}
        columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      />
    </div>
  );
}

export function ListingPageSkeleton({
  showSidebar = true,
  cardCount = 8,
}: {
  showSidebar?: boolean;
  cardCount?: number;
}) {
  return (
    <div
      className="flex flex-col lg:flex-row min-h-[60vh]"
      role="status"
      aria-label="Loading"
    >
      {showSidebar && (
        <aside className="hidden lg:block w-80 shrink-0 border-r border-[#E4E0D8] p-8 space-y-6">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </aside>
      )}
      <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-28" />
        </div>
        <ProductGridSkeleton count={cardCount} />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
      role="status"
      aria-label="Loading"
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        <Skeleton className="aspect-4/5 w-full rounded-none" />
        <div className="space-y-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <SkeletonText lines={4} />
          <Skeleton className="h-12 w-40" />
          <div className="grid grid-cols-3 gap-3 pt-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div
      className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6"
      role="status"
      aria-label="Loading"
    >
      <PageHeaderSkeleton />
      <div className="border border-[#E4E0D8] bg-[#FDFAF5] p-6 space-y-5">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-11 w-full" />
          </div>
        ))}
        <Skeleton className="h-11 w-36 mt-4" />
      </div>
    </div>
  );
}

export function TableSkeleton({
  rows = 6,
  cols = 4,
  className = "",
}: {
  rows?: number;
  cols?: number;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "border border-[#E4E0D8] bg-white overflow-hidden",
        className,
      )}
      role="status"
      aria-label="Loading"
    >
      <div className="grid gap-3 p-4 border-b border-[#E4E0D8] bg-[#FDFAF5]"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-20" />
        ))}
      </div>
      <div className="divide-y divide-[#E4E0D8]">
        {Array.from({ length: rows }).map((_, row) => (
          <div
            key={row}
            className="grid gap-3 p-4 items-center"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: cols }).map((_, col) => (
              <Skeleton
                key={col}
                className={cx("h-3", col === 0 ? "w-3/4" : "w-1/2")}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CustomOrderStepSkeleton() {
  return (
    <div
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
      role="status"
      aria-label="Loading"
    >
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="border border-(--color-border) bg-white overflow-hidden"
          >
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between pt-6 border-t border-(--color-border) max-w-2xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-11 w-44" />
      </div>
    </div>
  );
}

export function AccountPanelSkeleton() {
  return (
    <div
      className="bg-white rounded-2xl p-6 sm:p-8 space-y-6"
      role="status"
      aria-label="Loading"
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardPanelSkeleton({
  kpiCount = 6,
}: {
  kpiCount?: number;
}) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-8 w-48 bg-[var(--dash-border)]" />
        <Skeleton className="h-10 w-40 rounded-xl bg-[var(--dash-border)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: kpiCount }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-28 rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)]"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-80 rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)]" />
        <Skeleton className="h-80 rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)]" />
      </div>
    </div>
  );
}

export function SectionLoadingSkeleton({
  variant = "page",
}: {
  variant?:
    | "page"
    | "listing"
    | "detail"
    | "form"
    | "table"
    | "custom-order"
    | "account"
    | "dashboard";
}) {
  switch (variant) {
    case "listing":
      return <ListingPageSkeleton />;
    case "detail":
      return <DetailPageSkeleton />;
    case "form":
      return <FormPageSkeleton />;
    case "table":
      return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-6">
          <PageHeaderSkeleton />
          <TableSkeleton />
        </div>
      );
    case "custom-order":
      return <CustomOrderStepSkeleton />;
    case "account":
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <AccountPanelSkeleton />
        </div>
      );
    case "dashboard":
      return (
        <div className="p-4 sm:p-6 lg:p-8">
          <DashboardPanelSkeleton />
        </div>
      );
    default:
      return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
          <PageHeaderSkeleton />
          <ProductGridSkeleton count={6} columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" />
        </div>
      );
  }
}
