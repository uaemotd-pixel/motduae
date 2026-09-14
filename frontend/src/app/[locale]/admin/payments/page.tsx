"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api/client";
import {
  Activity,
  Store,
  RefreshCw,
  Search,
  PackageSearch,
  Scissors,
  Wallet,
  Truck,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
  Banknote,
  Trash2,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import TimeframePills from "@/components/dashboard/TimeframePills";
import StatCard from "@/components/dashboard/StatCard";
import { type DashAccent } from "@/components/dashboard/palette";
import { TableSkeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

type PartnerPayoutKind = "tailor" | "fabric" | "shipping";

interface SettlementOrderLine {
  earningId: string;
  orderId: string;
  orderType: string;
  remainingFils: number;
  remainingAed: number;
  amount: number;
  netFils: number;
  netAed: number;
  grossFils: number;
  grossAed: number;
  commissionFils: number;
  commissionAed: number;
  commissionPercent: number;
  availableAt?: string | null;
  status: string;
}

interface PartnerSettlement {
  partnerId: string;
  partnerKind: PartnerPayoutKind;
  partnerName: string;
  payeeName?: string;
  availableFils: number;
  availableAed: number;
  pendingFils: number;
  pendingAed: number;
  processingFils: number;
  processingAed: number;
  paidFils: number;
  paidAed: number;
  availableOrders: SettlementOrderLine[];
  pendingOrders: SettlementOrderLine[];
  contact?: string;
  email?: string;
  city?: string;
  location?: string;
  pickup?: string;
}

interface PayoutOrderLine {
  earningId?: string;
  orderId: string;
  orderType: string;
  amount: number;
  amountFils?: number;
  amountAed?: number;
  commissionPercent?: number;
}

interface PayoutLine extends PayoutOrderLine {
  earningId: string;
  amountFils: number;
  amountAed: number;
  commissionPercent: number;
}

interface PartnerPayoutTransaction {
  _id: string;
  partnerId: string;
  partnerKind: PartnerPayoutKind;
  partnerName: string;
  payeeName?: string;
  amount: number;
  amountAed?: number;
  amountFils?: number;
  currency?: string;
  status?: string;
  bankRef?: string;
  note?: string;
  releasedAt: string;
  releasedBy?: { _id?: string; name?: string; email?: string } | string;
  lines?: PayoutLine[];
  orders?: PayoutOrderLine[];
}

interface FifoPreview {
  amountFils: number;
  amountAed: number;
  lines: Array<{
    earningId: string;
    orderId: string;
    orderType: string;
    amountFils: number;
    amountAed: number;
    remainingAfterFils: number;
    remainingAfterAed: number;
    commissionPercent: number;
  }>;
}

interface DashboardStats {
  currency: string;
  retail?: { orderCount: number; revenue: number; growth?: number };
  custom?: { orderCount: number; revenue: number; growth?: number };
  partnerShares?: {
    tailor?: { net?: number; commission?: number };
    fabricStore?: { net?: number; commission?: number };
    motdKeeps?: number;
    motdEarnings?: number;
  };
}

type PayoutStatStatus = "pending" | "approved";

interface FabricPayoutRequestItem {
  _id: string;
  partnerKey: string;
  partnerKind: PartnerPayoutKind;
  partnerId?: string;
  partnerName: string;
  payeeName?: string;
  amount: number;
  currency?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  note?: string;
  adminNote?: string;
  requestedAt?: string;
  reviewedAt?: string;
  orders?: Array<{
    orderId: string;
    orderType: string;
    amount: number;
  }>;
  requestedBy?: { _id?: string; name?: string; email?: string } | string;
}

function payoutLineAmount(line: PayoutOrderLine) {
  return Number(line.amountAed ?? line.amount) || 0;
}

function newIdempotencyKey() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `payout-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pricingSearch, setPricingSearch] = useState("");
  const [expandedPartnerKey, setExpandedPartnerKey] = useState<string | null>(
    null,
  );
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerSettlement[]>([]);
  const [settlementLoading, setSettlementLoading] = useState(true);
  const [transactions, setTransactions] = useState<PartnerPayoutTransaction[]>(
    [],
  );
  const [releasingKey, setReleasingKey] = useState<string | null>(null);
  const [releaseConfirm, setReleaseConfirm] = useState<{
    partner: PartnerSettlement;
    preview: FifoPreview;
    idempotencyKey: string;
  } | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<
    FabricPayoutRequestItem[]
  >([]);
  const [payoutRequestsPendingCount, setPayoutRequestsPendingCount] =
    useState(0);
  const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(
    null,
  );
  const [approveConfirmRequest, setApproveConfirmRequest] =
    useState<FabricPayoutRequestItem | null>(null);
  const [rejectConfirmRequest, setRejectConfirmRequest] =
    useState<FabricPayoutRequestItem | null>(null);
  const [deleteConfirmRequest, setDeleteConfirmRequest] =
    useState<FabricPayoutRequestItem | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null,
  );
  const [completeConfirm, setCompleteConfirm] =
    useState<PartnerPayoutTransaction | null>(null);
  const [completeBankRef, setCompleteBankRef] = useState("");
  const [completeKey, setCompleteKey] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [cancelConfirm, setCancelConfirm] =
    useState<PartnerPayoutTransaction | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchStats = async (
    mode: "initial" | "refresh" | "silent" = "initial",
  ) => {
    try {
      if (mode === "refresh") setIsRefreshing(true);
      else if (mode === "initial") setLoading(true);
      const data = await api.get<DashboardStats>(
        `/api/admin/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
      );
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error("Payments fetch error:", err);
      setError(err.message || "Failed to load payments data");
    } finally {
      if (mode === "initial") setLoading(false);
      if (mode === "refresh") setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats("initial");
  }, [timeframe]);

  const fetchSettlement = async () => {
    try {
      setSettlementLoading(true);
      const data = await api.get<{ partners?: PartnerSettlement[] }>(
        `/api/admin/partner-settlement?t=${Date.now()}`,
      );
      setPartners(Array.isArray(data.partners) ? data.partners : []);
    } catch (err) {
      console.error("Settlement fetch error:", err);
    } finally {
      setSettlementLoading(false);
    }
  };

  const fetchPartnerPayouts = async () => {
    try {
      const data = await api.get<{ items?: PartnerPayoutTransaction[] }>(
        "/api/admin/partner-payouts",
      );
      setTransactions(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Partner payouts fetch error:", err);
    }
  };

  const fetchPayoutRequests = async () => {
    try {
      const data = await api.get<{
        items?: FabricPayoutRequestItem[];
        pendingCount?: number;
      }>("/api/admin/payout-requests");
      setPayoutRequests(Array.isArray(data.items) ? data.items : []);
      setPayoutRequestsPendingCount(Number(data.pendingCount) || 0);
    } catch (err) {
      console.error("Payout requests fetch error:", err);
    }
  };

  useEffect(() => {
    fetchSettlement();
    fetchPartnerPayouts();
    fetchPayoutRequests();
  }, []);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchStats("silent"),
        fetchSettlement(),
        fetchPartnerPayouts(),
        fetchPayoutRequests(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const approvePayoutRequest = async (request: FabricPayoutRequestItem) => {
    if (!request?._id || reviewingRequestId) return;
    try {
      setReviewingRequestId(request._id);
      await api.post(
        `/api/admin/payout-requests/${request._id}/approve`,
        {},
        { "Idempotency-Key": `payout:request:${request._id}` },
      );
      setApproveConfirmRequest(null);
      await Promise.all([
        fetchPayoutRequests(),
        fetchPartnerPayouts(),
        fetchSettlement(),
      ]);
      toast.success("Request approved. Complete the bank transfer, then mark the payment as paid.");
    } catch (err: any) {
      console.error("Approve payout request error:", err);
      toast.error(err?.message || "Unable to approve this request. Please try again.");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const rejectPayoutRequest = async (request: FabricPayoutRequestItem) => {
    if (!request?._id || reviewingRequestId) return;
    try {
      setReviewingRequestId(request._id);
      await api.post(`/api/admin/payout-requests/${request._id}/reject`, {
        adminNote: "Declined by admin",
      });
      setRejectConfirmRequest(null);
      await fetchPayoutRequests();
    } catch (err: any) {
      console.error("Reject payout request error:", err);
      toast.error(err?.message || "Unable to decline this request. Please try again.");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const deletePayoutRequest = async (request: FabricPayoutRequestItem) => {
    if (!request?._id || deletingRequestId) return;
    try {
      setDeletingRequestId(request._id);
      await api.delete(`/api/admin/payout-requests/${request._id}`);
      setDeleteConfirmRequest(null);
      await fetchPayoutRequests();
    } catch (err: any) {
      toast.error(err?.message || "Unable to delete this request. Please try again.");
    } finally {
      setDeletingRequestId(null);
    }
  };

  const partnerKindLabel = (kind: PartnerPayoutKind) =>
    kind === "tailor"
      ? "Tailor"
      : kind === "fabric"
        ? "Fabric store"
        : "Shipping company";

  const payoutStatusLabel = (status?: string) => {
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
  };

  const formatCurrency = (value: number) => {
    const amount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
    return `AED ${amount}`;
  };

  const kindTotals = useMemo(() => {
    const empty = { available: 0, pending: 0, paid: 0, processing: 0 };
    const totals = {
      tailor: { ...empty },
      fabric: { ...empty },
      shipping: { ...empty },
    };
    for (const row of partners) {
      const bucket = totals[row.partnerKind];
      if (!bucket) continue;
      bucket.available += row.availableAed || 0;
      bucket.pending += row.pendingAed || 0;
      bucket.paid += row.paidAed || 0;
      bucket.processing += row.processingAed || 0;
    }
    return totals;
  }, [partners]);

  const partnerRows = useMemo(() => {
    const term = pricingSearch.trim().toLowerCase();
    return partners
      .filter(
        (row) =>
          (row.availableFils || 0) > 0 || (row.pendingFils || 0) > 0,
      )
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
      });
  }, [partners, pricingSearch]);

  const processingPayouts = useMemo(
    () => transactions.filter((tx) => tx.status === "processing"),
    [transactions],
  );

  const historyPayouts = useMemo(
    () => transactions.filter((tx) => tx.status !== "processing"),
    [transactions],
  );

  const payCardContent = (
    totals: { available: number; pending: number; paid: number },
    emptyHint: string,
  ) => {
    if (totals.available <= 0 && totals.pending <= 0 && totals.paid <= 0) {
      return { value: 0, status: null as PayoutStatStatus | null, hint: emptyHint };
    }
    if (totals.available <= 0) {
      return {
        value: totals.paid,
        status: "approved" as PayoutStatStatus,
        hint:
          totals.pending > 0
            ? `Awaiting delivery ${formatCurrency(totals.pending)}`
            : `Paid in full · ${formatCurrency(totals.paid)}`,
      };
    }
    return {
      value: totals.available,
      status: "pending" as PayoutStatStatus,
      hint:
        totals.pending > 0
          ? `Ready to pay · Awaiting delivery ${formatCurrency(totals.pending)}`
          : `Ready to pay · Paid ${formatCurrency(totals.paid)}`,
    };
  };

  const statusBadgeClass = (status: PayoutStatStatus) =>
    status === "pending"
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  const PartnerIcon = ({ kind }: { kind: PartnerPayoutKind }) =>
    kind === "tailor" ? (
      <Scissors className="h-4 w-4" />
    ) : kind === "fabric" ? (
      <Store className="h-4 w-4" />
    ) : (
      <Truck className="h-4 w-4" />
    );

  const openReleaseConfirm = async (partner: PartnerSettlement) => {
    if (partner.availableFils <= 0 || releasingKey) return;
    try {
      const preview = await api.post<FifoPreview>(
        "/api/admin/partner-payouts/preview",
        {
          partnerId: partner.partnerId,
          partnerKind: partner.partnerKind,
          amountFils: partner.availableFils,
        },
      );
      setReleaseConfirm({
        partner,
        preview,
        idempotencyKey: newIdempotencyKey(),
      });
    } catch (err: any) {
      toast.error(err?.message || "Unable to prepare this payment. Please try again.");
    }
  };

  const releasePartnerPayment = async () => {
    if (!releaseConfirm || releasingKey) return;
    const { partner, preview, idempotencyKey } = releaseConfirm;
    try {
      setReleasingKey(`${partner.partnerKind}:${partner.partnerId}`);
      await api.post(
        "/api/admin/partner-payouts",
        {
          partnerId: partner.partnerId,
          partnerKind: partner.partnerKind,
          amountFils: preview.amountFils,
        },
        { "Idempotency-Key": idempotencyKey },
      );
      setReleaseConfirm(null);
      await Promise.all([
        fetchSettlement(),
        fetchPartnerPayouts(),
        fetchPayoutRequests(),
      ]);
      toast.success(
        `Payment of ${formatCurrency(preview.amountAed)} to ${partner.partnerName} is ready for bank transfer.`,
      );
    } catch (err: any) {
      toast.error(err?.message || "Unable to release this payment. Please try again.");
    } finally {
      setReleasingKey(null);
    }
  };

  const completePayout = async () => {
    if (!completeConfirm || completingId) return;
    const bankRef = completeBankRef.trim();
    if (!bankRef) {
      toast.error("A bank transfer number is required.");
      return;
    }
    try {
      setCompletingId(completeConfirm._id);
      await api.post(
        `/api/admin/partner-payouts/${completeConfirm._id}/complete`,
        { bankRef },
        { "Idempotency-Key": completeKey || newIdempotencyKey() },
      );
      setCompleteConfirm(null);
      setCompleteBankRef("");
      await fetchPartnerPayouts();
      toast.success("Payment marked as completed.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to complete this payment. Please try again.");
    } finally {
      setCompletingId(null);
    }
  };

  const cancelPayout = async () => {
    if (!cancelConfirm || cancellingId) return;
    try {
      setCancellingId(cancelConfirm._id);
      await api.post(
        `/api/admin/partner-payouts/${cancelConfirm._id}/cancel`,
        {},
        { "Idempotency-Key": newIdempotencyKey() },
      );
      setCancelConfirm(null);
      await Promise.all([fetchPartnerPayouts(), fetchSettlement()]);
      toast.success("Payment cancelled. The amount has been returned to Ready to pay.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to cancel this payment. Please try again.");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <p className="text-sm text-(--dash-muted)">Loading payments…</p>
        <TableSkeleton rows={8} cols={7} className="rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-8 text-center shadow-sm">
          <Activity className="mx-auto mb-4 h-12 w-12 text-(--dash-muted)" />
          <p className="text-xl text-(--dash-ink)">Unable to load payments</p>
          <p className="mt-2 text-sm text-(--dash-muted)">{error}</p>
          <button
            type="button"
            onClick={() => fetchStats("initial")}
            className="mt-6 rounded-xl bg-(--dash-charcoal) px-6 py-2 text-sm text-white transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const tailorPayCard = payCardContent(kindTotals.tailor, "No tailor deals yet");
  const fabricPayCard = payCardContent(kindTotals.fabric, "No fabric deals yet");
  const shipaaPayCard = payCardContent(
    kindTotals.shipping,
    "No shipping deals yet",
  );

  const totalEarnings =
    (Number(stats.retail?.revenue) || 0) + (Number(stats.custom?.revenue) || 0);
  const motdProfit =
    Number(stats.partnerShares?.motdKeeps) ||
    Number(stats.partnerShares?.motdEarnings) ||
    0;

  const summaryCards: Array<{
    key: string;
    label: string;
    value: number;
    status: PayoutStatStatus | null;
    icon: LucideIcon;
    hint: string;
    accent: DashAccent;
    delay: number;
  }> = [
    {
      key: "total-earnings",
      label: "Total Earnings",
      value: totalEarnings,
      status: null,
      icon: Banknote,
      hint: "Order revenue this timeframe",
      accent: "ink",
      delay: 0,
    },
    {
      key: "motd-profit",
      label: "MOTD Profit",
      value: motdProfit,
      status: null,
      icon: Wallet,
      hint: "Commission + MOTD-owned catalog profit",
      accent: "teal",
      delay: 0.05,
    },
    {
      key: "pay-tailors",
      label: "Pay to Tailors",
      value: tailorPayCard.value,
      status: tailorPayCard.status,
      icon: Scissors,
      hint: tailorPayCard.hint,
      accent: "indigo",
      delay: 0.1,
    },
    {
      key: "pay-fabrics",
      label: "Pay To Fabrics",
      value: fabricPayCard.value,
      status: fabricPayCard.status,
      icon: Store,
      hint: fabricPayCard.hint,
      accent: "sky",
      delay: 0.15,
    },
    {
      key: "pay-shipaa",
      label: "Pay to Shipaa",
      value: shipaaPayCard.value,
      status: shipaaPayCard.status,
      icon: Truck,
      hint: shipaaPayCard.hint,
      accent: "amber",
      delay: 0.2,
    },
  ];

  return (
    <div className="space-y-6">
      <ConfirmationModal
        isOpen={!!releaseConfirm}
        title="Release payment"
        message={
          releaseConfirm
            ? `Release ${formatCurrency(releaseConfirm.preview.amountAed)} to ${releaseConfirm.partner.partnerName}? Only delivered orders are included, oldest first. After the bank transfer, mark the payment as completed with the receipt number.`
            : ""
        }
        confirmLabel={releasingKey ? "Releasing…" : "Release payment"}
        cancelLabel="Cancel"
        onConfirm={() => {
          void releasePartnerPayment();
        }}
        onCancel={() => {
          if (!releasingKey) setReleaseConfirm(null);
        }}
        isLoading={!!releasingKey}
      >
        {releaseConfirm ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 text-[10px] uppercase tracking-[0.16em] text-gray-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Order</th>
                  <th className="px-3 py-2 font-medium">This payment</th>
                  <th className="px-3 py-2 font-medium">Remaining</th>
                  <th className="px-3 py-2 font-medium">Commission</th>
                </tr>
              </thead>
              <tbody>
                {releaseConfirm.preview.lines.map((line) => (
                  <tr key={line.earningId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      #{String(line.orderId).slice(-6)} · {line.orderType}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatCurrency(line.amountAed)}
                    </td>
                    <td className="px-3 py-2">
                      {formatCurrency(line.remainingAfterAed)}
                    </td>
                    <td className="px-3 py-2">{line.commissionPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={!!completeConfirm}
        title="Confirm payment"
        message={
          completeConfirm
            ? `Confirm that ${formatCurrency(Number(completeConfirm.amountAed ?? completeConfirm.amount) || 0)} has been transferred to ${completeConfirm.partnerName}. Enter the bank transfer number from the receipt.`
            : ""
        }
        confirmLabel={completingId ? "Saving…" : "Confirm payment"}
        cancelLabel="Cancel"
        onConfirm={() => {
          void completePayout();
        }}
        onCancel={() => {
          if (!completingId) {
            setCompleteConfirm(null);
            setCompleteBankRef("");
          }
        }}
        isLoading={!!completingId}
      >
        <label className="mt-4 block">
          <span className="text-[10px] uppercase tracking-[0.16em] text-gray-500">
            Transfer number
          </span>
          <input
            type="text"
            value={completeBankRef}
            onChange={(e) => setCompleteBankRef(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-black"
            placeholder="Bank transfer / receipt number"
          />
        </label>
      </ConfirmationModal>

      <ConfirmationModal
        isOpen={!!cancelConfirm}
        title="Cancel payment"
        message={
          cancelConfirm
            ? `Cancel the ${formatCurrency(Number(cancelConfirm.amountAed ?? cancelConfirm.amount) || 0)} payment to ${cancelConfirm.partnerName}? Use this only if the bank transfer has not been sent. The amount will return to Ready to pay.`
            : ""
        }
        confirmLabel={cancellingId ? "Cancelling…" : "Cancel payment"}
        cancelLabel="Keep payment"
        onConfirm={() => {
          void cancelPayout();
        }}
        onCancel={() => {
          if (!cancellingId) setCancelConfirm(null);
        }}
        isLoading={!!cancellingId}
        isDanger
      />

      <ConfirmationModal
        isOpen={!!approveConfirmRequest}
        title="Approve request"
        message={
          approveConfirmRequest
            ? `Approve the request from ${approveConfirmRequest.partnerName}? MOTD will pay the amount currently ready for delivered orders. This may be less than ${formatCurrency(Number(approveConfirmRequest.amount) || 0)} if some orders are still awaiting delivery.`
            : ""
        }
        confirmLabel={reviewingRequestId ? "Approving…" : "Approve request"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (approveConfirmRequest)
            void approvePayoutRequest(approveConfirmRequest);
        }}
        onCancel={() => {
          if (!reviewingRequestId) setApproveConfirmRequest(null);
        }}
        isLoading={!!reviewingRequestId}
      />

      <ConfirmationModal
        isOpen={!!rejectConfirmRequest}
        title="Decline request"
        message={
          rejectConfirmRequest
            ? `Decline the ${formatCurrency(Number(rejectConfirmRequest.amount) || 0)} request from ${rejectConfirmRequest.partnerName}? They may submit a new request later.`
            : ""
        }
        confirmLabel={reviewingRequestId ? "Declining…" : "Decline request"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (rejectConfirmRequest)
            void rejectPayoutRequest(rejectConfirmRequest);
        }}
        onCancel={() => {
          if (!reviewingRequestId) setRejectConfirmRequest(null);
        }}
        isLoading={!!reviewingRequestId}
        isDanger
      />

      <ConfirmationModal
        isOpen={!!deleteConfirmRequest}
        title="Delete request"
        message={
          deleteConfirmRequest
            ? `Delete the ${formatCurrency(Number(deleteConfirmRequest.amount) || 0)} request from ${deleteConfirmRequest.partnerName}? This does not change any payments.`
            : ""
        }
        confirmLabel={deletingRequestId ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (deleteConfirmRequest)
            void deletePayoutRequest(deleteConfirmRequest);
        }}
        onCancel={() => {
          if (!deletingRequestId) setDeleteConfirmRequest(null);
        }}
        isLoading={!!deletingRequestId}
        isDanger
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--dash-muted)">
            Finance
          </p>
          <h1 className="[font-family:var(--font-display)] mt-1 text-3xl text-(--dash-ink) sm:text-4xl">
            Payments
          </h1>
          <p className="mt-1 max-w-xl text-sm text-(--dash-muted)">
            Payments may be released only after an order is delivered. Amounts
            awaiting delivery remain visible but cannot be paid yet.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocaleSwitcher />
          <TimeframePills value={timeframe} onChange={setTimeframe} />
          <button
            type="button"
            onClick={() => refreshAll()}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-3 py-2 text-xs text-(--dash-ink) transition hover:border-(--dash-gold)"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {summaryCards.map((card) => (
          <StatCard
            key={card.key}
            icon={card.icon}
            label={card.label}
            value={formatCurrency(card.value)}
            subValue={card.hint}
            compact
            delay={card.delay}
            accent={card.accent}
            badge={
              card.status ? (
                <span
                  className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${statusBadgeClass(card.status)}`}
                >
                  {card.status}
                </span>
              ) : undefined
            }
          />
        ))}
      </div>

      {payoutRequestsPendingCount > 0 ? (
        <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
                Partner payout requests
              </h3>
              <p className="mt-1 text-xs text-(--dash-muted)">
                Pending requests from fabric stores and tailors. Approving pays
                the amount currently ready for delivered orders, which may be
                less than requested if some orders are still awaiting delivery.
              </p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-amber-800">
              {payoutRequestsPendingCount} pending
            </span>
          </div>
          <div className="space-y-3">
            {payoutRequests
              .filter((r) => r.status === "pending")
              .map((request) => {
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
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!!reviewingRequestId}
                        onClick={() => setApproveConfirmRequest(request)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-(--dash-charcoal) px-3 py-2 text-xs text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {isBusy ? "Working…" : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={!!reviewingRequestId}
                        onClick={() => setRejectConfirmRequest(request)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        <X className="h-3.5 w-3.5" />
                        Decline
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ) : null}

      {processingPayouts.length > 0 ? (
        <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
              Payments in progress
            </h3>
            <p className="mt-1 text-xs text-(--dash-muted)">
              This amount is reserved. After the bank transfer, confirm payment
              with the receipt number. Cancel only if the transfer has not been
              sent.
            </p>
          </div>
          <div className="space-y-3">
            {processingPayouts.map((tx) => (
              <div
                key={tx._id}
                className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div>
                  <p className="font-medium text-(--dash-ink)">
                    {tx.partnerName}
                  </p>
                  <p className="mt-1 text-[11px] text-(--dash-muted)">
                    {partnerKindLabel(tx.partnerKind)} ·{" "}
                    {formatCurrency(Number(tx.amountAed ?? tx.amount) || 0)} ·{" "}
                    {tx.releasedAt
                      ? new Date(tx.releasedAt).toLocaleString()
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCompleteConfirm(tx);
                      setCompleteBankRef("");
                      setCompleteKey(newIdempotencyKey());
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-(--dash-charcoal) px-3 py-2 text-xs text-white"
                  >
                    Confirm payment
                  </button>
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(tx)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs text-rose-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

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
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)" />
            <input
              type="text"
              placeholder="Search partner or order..."
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full rounded-xl border border-(--dash-border) bg-white py-1.5 pl-9 pr-3 text-xs text-(--dash-ink) outline-none transition focus:border-(--dash-gold)"
            />
          </div>
        </div>

        {settlementLoading && partnerRows.length === 0 ? (
          <TableSkeleton rows={5} cols={4} className="rounded-xl border-0" />
        ) : partnerRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageSearch
              className="mb-3 h-12 w-12 text-(--dash-border)"
              strokeWidth={1}
            />
            <p className="text-xs text-(--dash-muted)">
              No partner amounts are waiting to be paid. Released payments appear
              in Transaction History below.
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
                          <PartnerIcon kind={row.partnerKind} />
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
                            {row.availableOrders.length} order
                            {row.availableOrders.length === 1 ? "" : "s"}
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
                            {row.pendingOrders.length} order
                            {row.pendingOrders.length === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={!!releasingKey || row.availableFils <= 0}
                        onClick={() => void openReleaseConfirm(row)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-(--dash-charcoal) px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60"
                      >
                        Release {formatCurrency(row.availableAed)}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPartnerKey(expanded ? null : key)
                        }
                        aria-expanded={expanded}
                        className="inline-flex items-center gap-1.5 text-xs text-(--dash-muted) transition hover:text-(--dash-ink)"
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
                            {[row.location, row.city]
                              .filter(Boolean)
                              .join(", ")}
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
                                Gross {formatCurrency(orderLine.grossAed)} −
                                MOTD {formatCurrency(orderLine.commissionAed)} (
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
            {formatCurrency(
              kindTotals.tailor.available +
                kindTotals.fabric.available +
                kindTotals.shipping.available,
            )}
          </span>
          <span className="text-(--dash-muted)">
            {" "}
            · Awaiting delivery{" "}
            {formatCurrency(
              kindTotals.tailor.pending +
                kindTotals.fabric.pending +
                kindTotals.shipping.pending,
            )}
          </span>
        </p>
      </div>

      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            Transaction History
          </h3>
          <p className="mt-1 text-xs text-(--dash-muted)">
            Completed and cancelled payments. Expand a row to see which orders
            were included.
          </p>
        </div>

        {historyPayouts.length === 0 ? (
          <p className="py-8 text-center text-xs text-(--dash-muted)">
            No payment releases yet.
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
                {historyPayouts.map((tx) => {
                  const releasedByName =
                    typeof tx.releasedBy === "object" && tx.releasedBy
                      ? tx.releasedBy.name || tx.releasedBy.email || "Admin"
                      : "Admin";
                  const expanded = expandedTxId === tx._id;
                  const lines: PayoutOrderLine[] = tx.lines || tx.orders || [];
                  return (
                    <Fragment key={tx._id}>
                      <tr
                        key={tx._id}
                        className="border-t border-(--dash-border) bg-white"
                      >
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
                          {formatCurrency(
                            Number(tx.amountAed ?? tx.amount) || 0,
                          )}
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
                            onClick={() =>
                              setExpandedTxId(expanded ? null : tx._id)
                            }
                            className="text-xs text-(--dash-muted) hover:text-(--dash-ink)"
                          >
                            {expanded ? "Hide" : "View"}
                          </button>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr
                          key={`${tx._id}-lines`}
                          className="border-t border-(--dash-border) bg-(--dash-bg)"
                        >
                          <td colSpan={8} className="px-4 py-3">
                            <div className="space-y-2">
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
      </div>

      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            Request History
          </h3>
          <p className="mt-1 text-xs text-(--dash-muted)">
            Approved and declined partner payout requests. Delete removes the
            record from this list only.
          </p>
        </div>

        {payoutRequests.filter((r) => r.status !== "pending").length === 0 ? (
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
                {payoutRequests
                  .filter((r) => r.status !== "pending")
                  .map((request) => {
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
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              request.status === "approved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                          >
                            {payoutStatusLabel(request.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title="Delete request"
                            aria-label={`Delete request for ${request.partnerName}`}
                            disabled={!!deletingRequestId}
                            onClick={() => setDeleteConfirmRequest(request)}
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
