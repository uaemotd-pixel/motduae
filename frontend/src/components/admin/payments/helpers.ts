import type { PartnerPayoutKind, PayoutOrderLine } from "./types";

export function parsePaymentTab(value: string | null): "to-pay" | "in-progress" | "requests" | "history" {
  if (value === "in-progress" || value === "requests" || value === "history") {
    return value;
  }
  return "to-pay";
}

export function payoutLineAmount(line: PayoutOrderLine) {
  return Number(line.amountAed ?? line.amount) || 0;
}

export function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `payout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function partnerKindLabel(kind: PartnerPayoutKind) {
  return kind === "tailor"
    ? "Tailor"
    : kind === "fabric"
      ? "Fabric store"
      : "Shipping company";
}

export function payoutStatusLabel(status?: string) {
  switch (status) {
    case "processing":
      return "In progress";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "failed":
      return "Failed";
    case "approved":
      return "Approved";
    case "rejected":
      return "Declined";
    case "pending":
      return "Pending";
    default:
      return status || "Completed";
  }
}

export function formatCurrency(value: number) {
  const amount = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `AED ${amount}`;
}

export function payoutTransactionAmount(tx: {
  amount: number;
  amountAed?: number;
}) {
  return Number(tx.amountAed ?? tx.amount) || 0;
}
