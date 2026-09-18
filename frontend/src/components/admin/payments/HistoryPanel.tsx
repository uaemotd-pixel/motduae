"use client";

import { Fragment } from "react";
import { Search } from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { KindFilterPills } from "./KindFilterPills";
import {
  formatCurrency,
  partnerKindLabel,
  payoutLineAmount,
  payoutStatusLabel,
  payoutTransactionAmount,
} from "./helpers";
import PayoutBankCard from "./PayoutBankCard";
import type {
  PartnerKindFilter,
  PartnerPayoutTransaction,
  PayoutOrderLine,
} from "./types";

const HISTORY_LIMIT = 25;

export default function HistoryPanel({
  items,
  total,
  page,
  loading,
  query,
  onQueryChange,
  kind,
  onKindChange,
  onPageChange,
  expandedTxId,
  onToggleExpand,
}: {
  items: PartnerPayoutTransaction[];
  total: number;
  page: number;
  loading: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  kind: PartnerKindFilter;
  onKindChange: (value: PartnerKindFilter) => void;
  onPageChange: (page: number) => void;
  expandedTxId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  const totalPages = Math.max(1, Math.ceil((Number(total) || 0) / HISTORY_LIMIT));
  const canPrev = page > 1;
  const canNext = page < totalPages && items.length > 0;

  return (
    <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            Transaction History
          </h3>
          <p className="mt-1 text-xs text-(--dash-muted)">
            Completed and cancelled payments. Expand a row to see which orders
            were included.
          </p>
        </div>
        <div className="flex w-full max-w-md shrink-0 flex-col gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)" />
            <input
              type="text"
              placeholder="Partner, order, or transfer number"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="w-full rounded-xl border border-(--dash-border) bg-white py-1.5 pl-9 pr-3 text-xs text-(--dash-ink) outline-none transition focus:border-(--dash-gold)"
            />
          </div>
          <KindFilterPills value={kind} onChange={onKindChange} />
        </div>
      </div>

      {loading && items.length === 0 ? (
        <TableSkeleton rows={6} cols={7} className="rounded-xl border-0" />
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-xs text-(--dash-muted)">
          {query.trim().length >= 2
            ? "No payments match this search."
            : "No completed payments yet."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-(--dash-border)">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-(--dash-bg) text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Partner</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Released by</th>
                <th className="px-4 py-3 font-medium text-right">Lines</th>
              </tr>
            </thead>
            <tbody>
              {items.map((tx) => {
                const releasedByName =
                  typeof tx.releasedBy === "object" && tx.releasedBy
                    ? tx.releasedBy.name || tx.releasedBy.email || "Admin"
                    : "Admin";
                const expanded = expandedTxId === tx._id;
                const lines: PayoutOrderLine[] = tx.lines || tx.orders || [];
                return (
                  <Fragment key={tx._id}>
                    <tr className="border-t border-(--dash-border) bg-white">
                      <td className="px-4 py-3 text-xs text-(--dash-ink)">
                        {tx.releasedAt
                          ? new Date(tx.releasedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {partnerKindLabel(tx.partnerKind)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-(--dash-ink)">
                          {tx.partnerName}
                        </p>
                        {tx.bankRef ? (
                          <p className="text-[11px] text-(--dash-muted)">
                            Transfer {tx.bankRef}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-ink)">
                        {lines.length
                          ? lines
                              .map((o) => `#${String(o.orderId).slice(-6)}`)
                              .join(", ")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-(--dash-ink)">
                        {formatCurrency(payoutTransactionAmount(tx))}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-(--dash-border) px-2 py-0.5 text-[10px] uppercase tracking-wide text-(--dash-muted)">
                          {payoutStatusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {releasedByName}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => onToggleExpand(tx._id)}
                          className="text-xs text-(--dash-muted) hover:text-(--dash-ink)"
                        >
                          {expanded ? "Hide" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded ? (
                      <tr className="border-t border-(--dash-border) bg-(--dash-bg)">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="space-y-2">
                            {tx.payoutBank?.iban ? (
                              <PayoutBankCard
                                bank={tx.payoutBank}
                                hasPayoutBank
                              />
                            ) : null}
                            {lines.map((line, index) => (
                              <div
                                key={`${tx._id}-${line.orderId}-${line.amountFils ?? line.amount}-${index}`}
                                className="rounded-lg border border-(--dash-border) bg-white px-3 py-2 text-xs"
                              >
                                Order #{String(line.orderId).slice(-6)} ·{" "}
                                {line.orderType} ·{" "}
                                {formatCurrency(payoutLineAmount(line))}
                                {typeof line.commissionPercent === "number"
                                  ? ` · ${line.commissionPercent}%`
                                  : ""}
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 ? (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-(--dash-muted)">
            Page {page} of {totalPages} · {total} payment
            {total === 1 ? "" : "s"}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canPrev || loading}
              onClick={() => onPageChange(page - 1)}
              className="whitespace-nowrap rounded-xl border border-(--dash-border) bg-white px-3 py-1.5 text-xs text-(--dash-ink) disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!canNext || loading}
              onClick={() => onPageChange(page + 1)}
              className="whitespace-nowrap rounded-xl border border-(--dash-border) bg-white px-3 py-1.5 text-xs text-(--dash-ink) disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export { HISTORY_LIMIT };
