"use client";

import { useMemo, useState } from "react";
import { Check, Search, Trash2, X } from "lucide-react";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, partnerKindLabel, payoutStatusLabel } from "./helpers";
import PayoutBankCard from "./PayoutBankCard";
import type { FabricPayoutRequestItem } from "./types";

export default function RequestsPanel({
  pending,
  reviewed,
  pendingCount,
  loading,
  reviewingRequestId,
  deletingRequestId,
  onApprove,
  onDecline,
  onDelete,
}: {
  pending: FabricPayoutRequestItem[];
  reviewed: FabricPayoutRequestItem[];
  pendingCount: number;
  loading: boolean;
  reviewingRequestId: string | null;
  deletingRequestId: string | null;
  onApprove: (request: FabricPayoutRequestItem) => void;
  onDecline: (request: FabricPayoutRequestItem) => void;
  onDelete: (request: FabricPayoutRequestItem) => void;
}) {
  const [reviewedSearch, setReviewedSearch] = useState("");

  const reviewedRows = useMemo(() => {
    const term = reviewedSearch.trim().toLowerCase();
    const rows = [...reviewed].sort((a, b) => {
      const aTime = new Date(a.reviewedAt || a.requestedAt || 0).getTime();
      const bTime = new Date(b.reviewedAt || b.requestedAt || 0).getTime();
      return bTime - aTime;
    });
    if (!term) return rows;
    return rows.filter((row) =>
      `${row.partnerName} ${row.payeeName || ""}`.toLowerCase().includes(term),
    );
  }, [reviewed, reviewedSearch]);

  return (
    <div className="space-y-6">
      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
              Partner payout requests
            </h3>
            <p className="mt-1 text-xs text-(--dash-muted)">
              Pending requests from fabric stores and tailors. Approving pays
              the amount currently ready for delivered orders, which may be less
              than requested if some orders are still awaiting delivery.
            </p>
          </div>
          {pendingCount > 0 ? (
            <span className="rounded-full border border-(--dash-border) bg-(--dash-bg) px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-(--dash-muted)">
              {pendingCount} pending
            </span>
          ) : null}
        </div>

        {loading && pending.length === 0 ? (
          <TableSkeleton rows={3} cols={3} className="rounded-xl border-0" />
        ) : pending.length === 0 ? (
          <p className="py-8 text-center text-xs text-(--dash-muted)">
            No pending payout requests.
          </p>
        ) : (
          <div className="space-y-3">
            {pending.map((request) => {
              const orderCount = Array.isArray(request.orders)
                ? request.orders.length
                : 0;
              const isBusy = reviewingRequestId === request._id;
              return (
                <div
                  key={request._id}
                  className="flex flex-col gap-3 rounded-xl border border-(--dash-border) bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div>
                    <p className="font-medium text-(--dash-ink)">
                      {request.partnerName}
                    </p>
                    <p className="mt-1 text-[11px] text-(--dash-muted)">
                      {partnerKindLabel(request.partnerKind)} ·{" "}
                      {formatCurrency(Number(request.amount) || 0)} ·{" "}
                      {orderCount} order{orderCount === 1 ? "" : "s"}
                    </p>
                    {request.note ? (
                      <p className="mt-1 text-[11px] text-(--dash-muted)">
                        Note: {request.note}
                      </p>
                    ) : null}
                    {request.partnerKind !== "shipping" ? (
                      <div className="mt-3 max-w-md">
                        <PayoutBankCard
                          bank={request.payoutBank}
                          hasPayoutBank={request.hasPayoutBank}
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      disabled={
                        !!reviewingRequestId || request.hasPayoutBank === false
                      }
                      onClick={() => onApprove(request)}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-(--dash-charcoal) px-3 py-2 text-xs text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isBusy ? "Working…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      disabled={!!reviewingRequestId}
                      onClick={() => onDecline(request)}
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-(--dash-border) bg-white px-3 py-2 text-xs text-(--dash-ink) transition hover:bg-(--dash-bg) disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
              Request History
            </h3>
            <p className="mt-1 text-xs text-(--dash-muted)">
              Approved and declined partner payout requests. Delete removes the
              record from this list only.
            </p>
          </div>
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)" />
            <input
              type="text"
              placeholder="Search partner name..."
              value={reviewedSearch}
              onChange={(e) => setReviewedSearch(e.target.value)}
              className="w-full rounded-xl border border-(--dash-border) bg-white py-1.5 pl-9 pr-3 text-xs text-(--dash-ink) outline-none transition focus:border-(--dash-gold)"
            />
          </div>
        </div>

        {loading && reviewed.length === 0 ? (
          <TableSkeleton rows={4} cols={6} className="rounded-xl border-0" />
        ) : reviewedRows.length === 0 ? (
          <p className="py-8 text-center text-xs text-(--dash-muted)">
            No reviewed payout requests yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-(--dash-border)">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-(--dash-bg) text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                <tr>
                  <th className="px-4 py-3 font-medium">Requested</th>
                  <th className="px-4 py-3 font-medium">Reviewed</th>
                  <th className="px-4 py-3 font-medium">Partner</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Orders</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewedRows.map((request) => {
                  const orderCount = Array.isArray(request.orders)
                    ? request.orders.length
                    : 0;
                  const isDeleting = deletingRequestId === request._id;
                  return (
                    <tr
                      key={request._id}
                      className="border-t border-(--dash-border) bg-white"
                    >
                      <td className="px-4 py-3 text-xs text-(--dash-ink)">
                        {request.requestedAt
                          ? new Date(request.requestedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {request.reviewedAt
                          ? new Date(request.reviewedAt).toLocaleString()
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {partnerKindLabel(request.partnerKind)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-(--dash-ink)">
                          {request.partnerName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs text-(--dash-muted)">
                        {orderCount}
                      </td>
                      <td className="px-4 py-3 font-medium text-(--dash-ink)">
                        {formatCurrency(Number(request.amount) || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full border border-(--dash-border) px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-(--dash-muted)">
                          {payoutStatusLabel(request.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          title="Delete request"
                          aria-label={`Delete request for ${request.partnerName}`}
                          disabled={!!deletingRequestId}
                          onClick={() => onDelete(request)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2
                            className={`h-4 w-4 ${isDeleting ? "animate-pulse" : ""}`}
                          />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
