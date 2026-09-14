"use client";

import { useMemo } from "react";
import {
  ChevronDown,
  Mail,
  MapPin,
  PackageSearch,
  Phone,
  Search,
} from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { KindFilterPills, PartnerKindIcon } from "./KindFilterPills";
import { formatCurrency, partnerKindLabel } from "./helpers";
import type { PartnerKindFilter, PartnerSettlement } from "./types";

export default function ToPayPanel({
  partners,
  loading,
  search,
  onSearchChange,
  kind,
  onKindChange,
  expandedPartnerKey,
  onToggleExpand,
  releasingKey,
  onRelease,
}: {
  partners: PartnerSettlement[];
  loading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  kind: PartnerKindFilter;
  onKindChange: (value: PartnerKindFilter) => void;
  expandedPartnerKey: string | null;
  onToggleExpand: (key: string) => void;
  releasingKey: string | null;
  onRelease: (partner: PartnerSettlement) => void;
}) {
  const partnerRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return partners
      .filter(
        (row) => (row.availableFils || 0) > 0 || (row.pendingFils || 0) > 0,
      )
      .filter((row) => kind === "all" || row.partnerKind === kind)
      .filter((row) => {
        if (!term) return true;
        const hay = [
          row.partnerName,
          row.payeeName,
          partnerKindLabel(row.partnerKind),
          ...row.availableOrders.map((o) => o.orderId),
          ...row.pendingOrders.map((o) => o.orderId),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(term);
      })
      .sort((a, b) => (b.availableAed || 0) - (a.availableAed || 0));
  }, [partners, search, kind]);

  const visibleTotals = useMemo(
    () =>
      partnerRows.reduce(
        (acc, row) => {
          acc.available += row.availableAed || 0;
          acc.pending += row.pendingAed || 0;
          return acc;
        },
        { available: 0, pending: 0 },
      ),
    [partnerRows],
  );

  return (
    <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            Collective amount Admin must pay
          </h3>
          <p className="mt-1 max-w-2xl text-xs text-(--dash-muted)">
            Ready to pay is for delivered orders. Awaiting delivery is paid by
            the customer but cannot be released until the order is delivered.
          </p>
        </div>
        <div className="flex w-full max-w-md shrink-0 flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)" />
            <input
              type="text"
              placeholder="Search partner or order..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full rounded-xl border border-(--dash-border) bg-white py-1.5 pl-9 pr-3 text-xs text-(--dash-ink) outline-none transition focus:border-(--dash-gold)"
            />
          </div>
          <KindFilterPills value={kind} onChange={onKindChange} />
        </div>
      </div>

      {loading && partnerRows.length === 0 ? (
        <TableSkeleton rows={5} cols={4} className="rounded-xl border-0" />
      ) : partnerRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <PackageSearch
            className="mb-3 h-12 w-12 text-(--dash-border)"
            strokeWidth={1}
          />
          <p className="text-xs text-(--dash-muted)">
            No partner amounts are waiting to be paid.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {partnerRows.map((row) => {
            const key = `${row.partnerKind}:${row.partnerId}`;
            const expanded = expandedPartnerKey === key;
            return (
              <div
                key={key}
                className="rounded-xl border border-(--dash-border) bg-white"
              >
                <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-(--dash-muted)">
                        <PartnerKindIcon kind={row.partnerKind} />
                        {partnerKindLabel(row.partnerKind)}
                      </span>
                      <p className="font-medium text-(--dash-ink)">
                        {row.partnerName}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                          Ready to pay
                        </p>
                        <p className="mt-1 text-sm font-medium text-(--dash-ink)">
                          {formatCurrency(row.availableAed)}
                        </p>
                        <p className="text-[11px] text-(--dash-muted)">
                          {row.availableOrders.length}{" "}
                          {row.availableOrders.length === 1 ? "order" : "orders"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-(--dash-border) bg-(--dash-bg) px-3 py-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                          Awaiting delivery
                        </p>
                        <p className="mt-1 text-sm font-medium text-(--dash-ink)">
                          {formatCurrency(row.pendingAed)}
                        </p>
                        <p className="text-[11px] text-(--dash-muted)">
                          {row.pendingOrders.length}{" "}
                          {row.pendingOrders.length === 1 ? "order" : "orders"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      disabled={!!releasingKey || row.availableFils <= 0}
                      onClick={() => onRelease(row)}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg bg-(--dash-charcoal) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                    >
                      Release {formatCurrency(row.availableAed)}
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleExpand(key)}
                      aria-expanded={expanded}
                      className="inline-flex items-center justify-center gap-1.5 text-xs text-(--dash-muted) transition hover:text-(--dash-ink)"
                    >
                      {expanded ? "Hide orders" : "View orders"}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="space-y-3 border-t border-(--dash-border) bg-(--dash-bg) p-4">
                    <div className="grid grid-cols-1 gap-2 text-[11px] text-(--dash-muted) sm:grid-cols-3">
                      {row.contact ? (
                        <p className="flex items-center gap-1.5">
                          <Phone className="h-3 w-3 shrink-0" />
                          {row.contact}
                        </p>
                      ) : null}
                      {row.email ? (
                        <p className="flex items-center gap-1.5">
                          <Mail className="h-3 w-3 shrink-0" />
                          {row.email}
                        </p>
                      ) : null}
                      {row.city || row.location ? (
                        <p className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {[row.location, row.city].filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                      {row.pickup ? (
                        <p className="sm:col-span-3">Pickup: {row.pickup}</p>
                      ) : null}
                    </div>

                    {row.availableOrders.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                          Ready to pay
                        </p>
                        {row.availableOrders.map((orderLine) => (
                          <div
                            key={`${key}-ready-${orderLine.earningId}`}
                            className="rounded-lg border border-(--dash-border) bg-white p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-medium text-(--dash-ink)">
                                Order #{orderLine.orderId.slice(-6)}
                                <span className="ml-2 rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] font-normal capitalize text-(--dash-ink)">
                                  {orderLine.orderType}
                                </span>
                              </p>
                              <p className="text-base font-medium text-(--dash-ink)">
                                {formatCurrency(orderLine.remainingAed)}
                              </p>
                            </div>
                            <p className="mt-2 text-[11px] text-(--dash-muted)">
                              Gross {formatCurrency(orderLine.grossAed)} − MOTD{" "}
                              {formatCurrency(orderLine.commissionAed)} (
                              {orderLine.commissionPercent}%) ={" "}
                              {formatCurrency(orderLine.netAed)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {row.pendingOrders.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                          Awaiting delivery
                        </p>
                        {row.pendingOrders.map((orderLine) => (
                          <div
                            key={`${key}-wait-${orderLine.earningId}`}
                            className="rounded-lg border border-dashed border-(--dash-border) bg-white p-3"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="text-sm font-medium text-(--dash-ink)">
                                Order #{orderLine.orderId.slice(-6)}
                                <span className="ml-2 rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] font-normal capitalize text-(--dash-ink)">
                                  {orderLine.orderType}
                                </span>
                              </p>
                              <p className="text-base font-medium text-(--dash-ink)">
                                {formatCurrency(orderLine.remainingAed)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-sm text-(--dash-ink)">
        Ready to pay{" "}
        <span className="font-medium">
          {formatCurrency(visibleTotals.available)}
        </span>
        <span className="text-(--dash-muted)">
          {" "}
          · Awaiting delivery {formatCurrency(visibleTotals.pending)}
        </span>
      </p>
    </div>
  );
}
