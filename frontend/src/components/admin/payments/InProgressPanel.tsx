"use client";

import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatCurrency, partnerKindLabel, payoutTransactionAmount } from "./helpers";
import PayoutBankCard from "./PayoutBankCard";
import type { PartnerPayoutTransaction } from "./types";

export default function InProgressPanel({
  payouts,
  loading,
  onConfirm,
  onCancel,
}: {
  payouts: PartnerPayoutTransaction[];
  loading: boolean;
  onConfirm: (tx: PartnerPayoutTransaction) => void;
  onCancel: (tx: PartnerPayoutTransaction) => void;
}) {
  return (
    <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
      <div className="mb-4">
        <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
          Payments in progress
        </h3>
        <p className="mt-1 text-xs text-(--dash-muted)">
          This amount is reserved. After the bank transfer, confirm payment with
          the receipt number. Cancel only if the transfer has not been sent.
        </p>
      </div>

      {loading && payouts.length === 0 ? (
        <TableSkeleton rows={3} cols={3} className="rounded-xl border-0" />
      ) : payouts.length === 0 ? (
        <p className="py-8 text-center text-xs text-(--dash-muted)">
          No payments waiting for a bank transfer.
        </p>
      ) : (
        <div className="space-y-3">
          {payouts.map((tx) => (
            <div
              key={tx._id}
              className="flex flex-col gap-3 rounded-xl border border-(--dash-border) bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
            >
              <div>
                <p className="font-medium text-(--dash-ink)">{tx.partnerName}</p>
                <p className="mt-1 text-[11px] text-(--dash-muted)">
                  {partnerKindLabel(tx.partnerKind)} ·{" "}
                  {formatCurrency(payoutTransactionAmount(tx))} ·{" "}
                  {tx.releasedAt ? new Date(tx.releasedAt).toLocaleString() : ""}
                </p>
                {tx.partnerKind !== "shipping" ? (
                  <div className="mt-3">
                    <PayoutBankCard
                      bank={tx.payoutBank}
                      hasPayoutBank={
                        tx.hasPayoutBank ?? Boolean(tx.payoutBank?.iban)
                      }
                    />
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <button
                  type="button"
                  onClick={() => onConfirm(tx)}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl bg-(--dash-charcoal) px-3 py-2 text-xs text-white"
                >
                  Confirm payment
                </button>
                <button
                  type="button"
                  onClick={() => onCancel(tx)}
                  className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border border-(--dash-border) bg-white px-3 py-2 text-xs text-(--dash-ink) hover:text-(--dash-ink)"
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
