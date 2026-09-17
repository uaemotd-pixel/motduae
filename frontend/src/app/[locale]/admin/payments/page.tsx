"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api/client";
import {
  Activity,
  Store,
  RefreshCw,
  Scissors,
  Wallet,
  Truck,
  Banknote,
  type LucideIcon,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import TimeframePills from "@/components/dashboard/TimeframePills";
import StatCard from "@/components/dashboard/StatCard";
import { type DashAccent } from "@/components/dashboard/palette";
import { TableSkeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";
import PaymentsTabs from "@/components/admin/payments/PaymentsTabs";
import ToPayPanel from "@/components/admin/payments/ToPayPanel";
import InProgressPanel from "@/components/admin/payments/InProgressPanel";
import RequestsPanel from "@/components/admin/payments/RequestsPanel";
import HistoryPanel, {
  HISTORY_LIMIT,
} from "@/components/admin/payments/HistoryPanel";
import PayoutBankCard from "@/components/admin/payments/PayoutBankCard";
import {
  formatCurrency,
  newIdempotencyKey,
  parsePaymentTab,
} from "@/components/admin/payments/helpers";
import type {
  DashboardStats,
  FabricPayoutRequestItem,
  FifoPreview,
  PartnerKindFilter,
  PartnerPayoutTransaction,
  PartnerSettlement,
  PaymentTab,
  PayoutListResponse,
  PayoutStatStatus,
} from "@/components/admin/payments/types";

export default function AdminPaymentsPage() {
  const searchParams = useSearchParams();
  const [tab, setTabState] = useState<PaymentTab>(() =>
    parsePaymentTab(searchParams.get("tab")),
  );

  useEffect(() => {
    const applyTabFromLocation = () => {
      setTabState(
        parsePaymentTab(new URLSearchParams(window.location.search).get("tab")),
      );
    };
    applyTabFromLocation();
    window.addEventListener("popstate", applyTabFromLocation);
    return () => window.removeEventListener("popstate", applyTabFromLocation);
  }, []);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pricingSearch, setPricingSearch] = useState("");
  const [toPayKind, setToPayKind] = useState<PartnerKindFilter>("all");
  const [expandedPartnerKey, setExpandedPartnerKey] = useState<string | null>(
    null,
  );
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [partners, setPartners] = useState<PartnerSettlement[]>([]);
  const [settlementLoading, setSettlementLoading] = useState(true);
  const [processingPayouts, setProcessingPayouts] = useState<
    PartnerPayoutTransaction[]
  >([]);
  const [processingLoading, setProcessingLoading] = useState(true);
  const [historyItems, setHistoryItems] = useState<PartnerPayoutTransaction[]>(
    [],
  );
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyDebounced, setHistoryDebounced] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyKind, setHistoryKind] = useState<PartnerKindFilter>("all");
  const [releasingKey, setReleasingKey] = useState<string | null>(null);
  const [releaseConfirm, setReleaseConfirm] = useState<{
    partner: PartnerSettlement;
    preview: FifoPreview;
    idempotencyKey: string;
  } | null>(null);
  const [pendingRequests, setPendingRequests] = useState<
    FabricPayoutRequestItem[]
  >([]);
  const [reviewedRequests, setReviewedRequests] = useState<
    FabricPayoutRequestItem[]
  >([]);
  const [payoutRequestsPendingCount, setPayoutRequestsPendingCount] =
    useState(0);
  const [requestsLoading, setRequestsLoading] = useState(false);
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

  const setTab = (next: PaymentTab) => {
    setTabState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  };

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

  const fetchProcessingPayouts = async () => {
    try {
      setProcessingLoading(true);
      const data = await api.get<PayoutListResponse>(
        `/api/admin/partner-payouts?status=processing&limit=200&t=${Date.now()}`,
      );
      setProcessingPayouts(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Processing payouts fetch error:", err);
    } finally {
      setProcessingLoading(false);
    }
  };

  const fetchHistoryPayouts = async (
    page = historyPage,
    query = historyDebounced,
    kind = historyKind,
  ) => {
    try {
      setHistoryLoading(true);
      const params = new URLSearchParams();
      params.set("status", "completed,cancelled,failed");
      params.set("page", String(page));
      params.set("limit", String(HISTORY_LIMIT));
      if (query.trim().length >= 2) params.set("q", query.trim());
      if (kind !== "all") params.set("partnerKind", kind);
      params.set("t", String(Date.now()));
      const data = await api.get<PayoutListResponse>(
        `/api/admin/partner-payouts?${params.toString()}`,
      );
      setHistoryItems(Array.isArray(data.items) ? data.items : []);
      setHistoryTotal(Number(data.total) || 0);
    } catch (err) {
      console.error("History payouts fetch error:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const data = await api.get<{
        items?: FabricPayoutRequestItem[];
        pendingCount?: number;
      }>(`/api/admin/payout-requests?status=pending&t=${Date.now()}`);
      setPendingRequests(Array.isArray(data.items) ? data.items : []);
      setPayoutRequestsPendingCount(Number(data.pendingCount) || 0);
    } catch (err) {
      console.error("Pending payout requests fetch error:", err);
    }
  };

  const fetchReviewedRequests = async () => {
    try {
      setRequestsLoading(true);
      const data = await api.get<{ items?: FabricPayoutRequestItem[] }>(
        `/api/admin/payout-requests?status=approved,rejected,cancelled&limit=50&t=${Date.now()}`,
      );
      setReviewedRequests(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error("Reviewed payout requests fetch error:", err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettlement();
    fetchProcessingPayouts();
    void fetchPendingRequests();
  }, []);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setHistoryDebounced(historyQuery.trim());
      setHistoryPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [historyQuery]);

  useEffect(() => {
    if (tab !== "history") return;
    void fetchHistoryPayouts(historyPage, historyDebounced, historyKind);
  }, [tab, historyPage, historyDebounced, historyKind]);

  useEffect(() => {
    if (tab !== "requests") return;
    void fetchReviewedRequests();
  }, [tab]);

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchStats("silent"),
        fetchSettlement(),
        fetchProcessingPayouts(),
        fetchPendingRequests(),
        tab === "requests" ? fetchReviewedRequests() : Promise.resolve(),
        tab === "history"
          ? fetchHistoryPayouts(historyPage, historyDebounced, historyKind)
          : Promise.resolve(),
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
        fetchPendingRequests(),
        fetchReviewedRequests(),
        fetchProcessingPayouts(),
        fetchSettlement(),
      ]);
      toast.success(
        "Request approved. Complete the bank transfer, then mark the payment as paid.",
      );
    } catch (err: any) {
      console.error("Approve payout request error:", err);
      toast.error(
        err?.message || "Unable to approve this request. Please try again.",
      );
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
      await Promise.all([fetchPendingRequests(), fetchReviewedRequests()]);
    } catch (err: any) {
      console.error("Reject payout request error:", err);
      toast.error(
        err?.message || "Unable to decline this request. Please try again.",
      );
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
      await fetchReviewedRequests();
    } catch (err: any) {
      toast.error(
        err?.message || "Unable to delete this request. Please try again.",
      );
    } finally {
      setDeletingRequestId(null);
    }
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

  const payCardContent = (
    totals: { available: number; pending: number; paid: number },
    emptyHint: string,
  ) => {
    if (totals.available <= 0 && totals.pending <= 0 && totals.paid <= 0) {
      return {
        value: 0,
        status: null as PayoutStatStatus | null,
        hint: emptyHint,
      };
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

  const openReleaseConfirm = async (partner: PartnerSettlement) => {
    if (partner.availableFils <= 0 || releasingKey) return;
    if (partner.partnerKind !== "shipping" && !partner.hasPayoutBank) {
      toast.error(
        "This partner has not added a UAE IBAN on their shop profile.",
      );
      return;
    }
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
      toast.error(
        err?.message || "Unable to prepare this payment. Please try again.",
      );
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
        fetchProcessingPayouts(),
        fetchPendingRequests(),
      ]);
      toast.success(
        `Payment of ${formatCurrency(preview.amountAed)} to ${partner.partnerName} is ready for bank transfer.`,
      );
    } catch (err: any) {
      toast.error(
        err?.message || "Unable to release this payment. Please try again.",
      );
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
      await Promise.all([
        fetchProcessingPayouts(),
        fetchSettlement(),
        fetchHistoryPayouts(1, historyDebounced, historyKind),
      ]);
      setHistoryPage(1);
      toast.success("Payment marked as completed.");
    } catch (err: any) {
      toast.error(
        err?.message || "Unable to complete this payment. Please try again.",
      );
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
      await Promise.all([
        fetchProcessingPayouts(),
        fetchSettlement(),
        fetchHistoryPayouts(1, historyDebounced, historyKind),
      ]);
      setHistoryPage(1);
      toast.success(
        "Payment cancelled. The amount has been returned to Ready to pay.",
      );
    } catch (err: any) {
      toast.error(
        err?.message || "Unable to cancel this payment. Please try again.",
      );
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
            ? `Release ${formatCurrency(releaseConfirm.preview.amountAed)} to ${releaseConfirm.partner.partnerName}? Only delivered orders are included. After the bank transfer, mark the payment as completed with the receipt number.`
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
          <div className="mt-4 space-y-3">
            {releaseConfirm.partner.partnerKind !== "shipping" ? (
              <PayoutBankCard
                bank={releaseConfirm.partner.payoutBank}
                hasPayoutBank={releaseConfirm.partner.hasPayoutBank}
              />
            ) : null}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
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
                {releaseConfirm.preview.lines.map((line) => {
                  const productName =
                    releaseConfirm.partner.availableOrders.find(
                      (o) => o.earningId === line.earningId,
                    )?.productName || "";
                  return (
                  <tr key={line.earningId} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <div>#{String(line.orderId).slice(-6)} · {line.orderType}</div>
                      {productName ? (
                        <div className="mt-0.5 text-[11px] text-gray-500">
                          {productName}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-medium">
                      {formatCurrency(line.amountAed)}
                    </td>
                    <td className="px-3 py-2">
                      {formatCurrency(line.remainingAfterAed)}
                    </td>
                    <td className="px-3 py-2">{line.commissionPercent}%</td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
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
        {completeConfirm ? (
          <div className="mt-4 space-y-3">
            {completeConfirm.partnerKind !== "shipping" ? (
              <PayoutBankCard
                bank={completeConfirm.payoutBank}
                hasPayoutBank={
                  completeConfirm.hasPayoutBank ??
                  Boolean(completeConfirm.payoutBank?.iban)
                }
              />
            ) : null}
            <label className="block">
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
          </div>
        ) : null}
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

      <PaymentsTabs
        value={tab}
        onChange={setTab}
        processingCount={processingPayouts.length}
        pendingRequestCount={payoutRequestsPendingCount}
      />

      {tab === "to-pay" ? (
        <ToPayPanel
          partners={partners}
          loading={settlementLoading}
          search={pricingSearch}
          onSearchChange={setPricingSearch}
          kind={toPayKind}
          onKindChange={setToPayKind}
          expandedPartnerKey={expandedPartnerKey}
          onToggleExpand={(key) =>
            setExpandedPartnerKey((current) => (current === key ? null : key))
          }
          releasingKey={releasingKey}
          onRelease={(partner) => void openReleaseConfirm(partner)}
        />
      ) : null}

      {tab === "in-progress" ? (
        <InProgressPanel
          payouts={processingPayouts}
          loading={processingLoading}
          onConfirm={(tx) => {
            setCompleteConfirm(tx);
            setCompleteBankRef("");
            setCompleteKey(newIdempotencyKey());
          }}
          onCancel={setCancelConfirm}
        />
      ) : null}

      {tab === "requests" ? (
        <RequestsPanel
          pending={pendingRequests}
          reviewed={reviewedRequests}
          pendingCount={payoutRequestsPendingCount}
          loading={requestsLoading}
          reviewingRequestId={reviewingRequestId}
          deletingRequestId={deletingRequestId}
          onApprove={setApproveConfirmRequest}
          onDecline={setRejectConfirmRequest}
          onDelete={setDeleteConfirmRequest}
        />
      ) : null}

      {tab === "history" ? (
        <HistoryPanel
          items={historyItems}
          total={historyTotal}
          page={historyPage}
          loading={historyLoading}
          query={historyQuery}
          onQueryChange={setHistoryQuery}
          kind={historyKind}
          onKindChange={(next) => {
            setHistoryKind(next);
            setHistoryPage(1);
          }}
          onPageChange={setHistoryPage}
          expandedTxId={expandedTxId}
          onToggleExpand={(id) =>
            setExpandedTxId((current) => (current === id ? null : id))
          }
        />
      ) : null}
    </div>
  );
}
