"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import {
  Search,
  PackageSearch,
  Loader2,
  Banknote,
  Wallet,
  Clock,
  ShoppingBag,
  AlertTriangle,
  Store,
  RefreshCw,
  Ruler,
  Trash2,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import TimeframePills from "@/components/dashboard/TimeframePills";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import RankList from "@/components/dashboard/RankList";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { ConfirmationModal } from "@/components/shared/ConfirmationModal";
import { DASH_PALETTE, withAlpha } from "@/components/dashboard/palette";
import {
  chartTooltip,
  chartLegend,
  chartGridColor,
  formatCompact,
} from "@/components/dashboard/chartDefaults";

interface OrderUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Order {
  _id: string;
  userId: OrderUser | string | null;
  status: string;
  createdAt: string;
  kind?: "custom" | "retail";
  payoutNet?: number;
  payoutPaid?: number;
  payoutPending?: number;
  paymentStatus?: string;
}

interface FabricDashboardData {
  success: boolean;
  currency: string;
  fabricShopId?: string;
  kpis: {
    fabricRevenue: number;
    orderCount: number;
    piecesSold: number;
    activeSkus: number;
    lowStock: number;
    paid?: number;
    pending?: number;
    netDue?: number;
  };
  monthlyData: Array<{ month: string; revenue: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  payout?: {
    netDue: number;
    paid: number;
    pending: number;
    status: "pending" | "approved" | null;
  };
  topFabrics: Array<{ id: string; name: string; value: number; meta?: string }>;
  recentOrders: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    type?: string;
  }>;
  pricingOrders: Order[];
}

interface FabricPayoutRequestSummary {
  _id: string;
  amount: number;
  status: string;
  requestedAt?: string;
  orderCount?: number;
  adminNote?: string;
}

interface FabricPayoutRequestsResponse {
  success: boolean;
  currency: string;
  unpaidAmount: number;
  unpaidOrderCount: number;
  pendingRequest: FabricPayoutRequestSummary | null;
  items: FabricPayoutRequestSummary[];
}

export default function FabricDashboardPage() {
  const t = useTranslations("FabricPortal.dashboard");
  const { user } = useAuth();
  const params = useParams();
  const locale = (params.locale as Locale) || "en";

  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [data, setData] = useState<FabricDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [unpaidAmount, setUnpaidAmount] = useState(0);
  const [unpaidOrderCount, setUnpaidOrderCount] = useState(0);
  const [pendingRequest, setPendingRequest] =
    useState<FabricPayoutRequestSummary | null>(null);
  const [requestHistory, setRequestHistory] = useState<
    FabricPayoutRequestSummary[]
  >([]);
  const [showRequestConfirm, setShowRequestConfirm] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);
  const [deleteConfirmRequest, setDeleteConfirmRequest] =
    useState<FabricPayoutRequestSummary | null>(null);
  const [deletingRequestId, setDeletingRequestId] = useState<string | null>(
    null,
  );

  const revenueChartRef = useRef<Chart | null>(null);
  const statusChartRef = useRef<Chart | null>(null);

  const fetchPayoutRequests = async () => {
    try {
      const res = await api.get<FabricPayoutRequestsResponse>(
        `/api/fabric/payout-requests?t=${Date.now()}`,
      );
      setUnpaidAmount(Number(res.unpaidAmount) || 0);
      setUnpaidOrderCount(Number(res.unpaidOrderCount) || 0);
      setPendingRequest(res.pendingRequest || null);
      setRequestHistory(Array.isArray(res.items) ? res.items : []);
    } catch (err) {
      console.error("Fabric payout requests error:", err);
    }
  };

  const fetchDashboard = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);
      const [dash] = await Promise.all([
        api.get<FabricDashboardData>(
          `/api/fabric/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
        ),
        fetchPayoutRequests(),
      ]);
      setData(dash);
    } catch (err) {
      console.error("Fabric dashboard error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const submitPayoutRequest = async () => {
    if (isRequesting) return;
    try {
      setIsRequesting(true);
      setRequestError(null);
      setRequestSuccess(null);
      await api.post("/api/fabric/payout-requests", {});
      setShowRequestConfirm(false);
      setRequestSuccess(t("requestPayoutSuccess"));
      await fetchPayoutRequests();
      await fetchDashboard(true);
    } catch (err: any) {
      setRequestError(
        err?.message || err?.data?.message || t("requestPayoutError"),
      );
      setShowRequestConfirm(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const deletePayoutRequest = async (request: FabricPayoutRequestSummary) => {
    if (!request?._id || deletingRequestId) return;
    try {
      setDeletingRequestId(request._id);
      await api.delete(`/api/fabric/payout-requests/${request._id}`);
      setDeleteConfirmRequest(null);
      await fetchPayoutRequests();
    } catch (err: any) {
      setRequestError(
        err?.message || err?.data?.message || t("requestHistoryDeleteError"),
      );
      setDeleteConfirmRequest(null);
    } finally {
      setDeletingRequestId(null);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeframe]);

  const formatCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat(
      locale === "ar" ? "ar-AE" : "en-AE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(amount);
    return `AED ${formatted}`;
  };

  const formatKpiCurrency = (amount: number) => {
    const formatted = new Intl.NumberFormat(
      locale === "ar" ? "ar-AE" : "en-AE",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    ).format(amount);
    return `AED ${formatted}`;
  };

  /** Server sends net payout only — never reconstruct gross/commission in the browser. */
  const getFabricPayout = (order: Order) =>
    typeof order.payoutNet === "number" && Number.isFinite(order.payoutNet)
      ? order.payoutNet
      : 0;

  const readPartnerName = (
    value: { name?: string } | string | null | undefined,
    fallback: string,
  ): string => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value.name || fallback;
  };

  const formatOrderDateLocal = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(
      locale === "ar" ? "ar-AE" : "en-US",
      { year: "numeric", month: "short", day: "numeric" },
    );
  };

  const pricingOrders = data?.pricingOrders || [];
  const filteredPricingOrders = useMemo(() => {
    return pricingOrders.filter((order) => {
      if (getFabricPayout(order) <= 0) return false;

      if (!pricingSearch.trim()) return true;
      const term = pricingSearch.toLowerCase();
      const customerName = readPartnerName(
        order.userId && typeof order.userId === "object" ? order.userId : null,
        "",
      ).toLowerCase();
      const customerEmail = (
        order.userId && typeof order.userId === "object"
          ? order.userId.email || ""
          : ""
      ).toLowerCase();
      return (
        customerName.includes(term) ||
        customerEmail.includes(term) ||
        order._id.toLowerCase().includes(term)
      );
    });
  }, [pricingOrders, pricingSearch]);

  useEffect(() => {
    if (!data) return;

    revenueChartRef.current?.destroy();
    statusChartRef.current?.destroy();
    revenueChartRef.current = null;
    statusChartRef.current = null;

    const revenueCanvas = document.getElementById(
      "fabric-revenue-chart",
    ) as HTMLCanvasElement | null;
    const statusCanvas = document.getElementById(
      "fabric-status-chart",
    ) as HTMLCanvasElement | null;
    if (!revenueCanvas || !statusCanvas) return;

    const monthly = data.monthlyData || [];
    const revenueConfig: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: monthly.map((d) => d.month),
        datasets: [
          {
            label: t("chartPayoutLabel"),
            data: monthly.map((d) => d.revenue || 0),
            borderColor: DASH_PALETTE.charcoal,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart;
              if (!chartArea) return "transparent";
              const g = c.createLinearGradient(
                0,
                chartArea.top,
                0,
                chartArea.bottom,
              );
              g.addColorStop(0, withAlpha(DASH_PALETTE.charcoal, 0.22));
              g.addColorStop(0.55, withAlpha(DASH_PALETTE.teal, 0.08));
              g.addColorStop(1, withAlpha(DASH_PALETTE.charcoal, 0));
              return g;
            },
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: DASH_PALETTE.surface,
            pointBorderColor: DASH_PALETTE.charcoal,
            pointBorderWidth: 2,
            pointHoverBackgroundColor: DASH_PALETTE.surface,
            pointHoverBorderColor: DASH_PALETTE.teal,
            pointHoverBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            ...chartTooltip,
            callbacks: {
              label: (ctx) => formatCurrency(Number(ctx.parsed.y)),
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: DASH_PALETTE.muted, font: { size: 11 } },
            border: { color: DASH_PALETTE.sandDeep },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: DASH_PALETTE.muted,
              font: { size: 11 },
              callback: (v) => formatCompact(Number(v)),
            },
            grid: { color: chartGridColor },
            border: { color: DASH_PALETTE.sandDeep },
          },
        },
      },
    };

    const status = data.statusBreakdown || [];
    const statusConfig: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: status.map((s) => s.status.replace(/_/g, " ")),
        datasets: [
          {
            data: status.map((s) => s.count),
            backgroundColor: status.map(
              (_, i) =>
                DASH_PALETTE.seriesMuted[i % DASH_PALETTE.seriesMuted.length],
            ),
            hoverBackgroundColor: status.map((_, i) => {
              const base =
                DASH_PALETTE.seriesMuted[i % DASH_PALETTE.seriesMuted.length];
              return i === 3 ? DASH_PALETTE.teal : base;
            }),
            borderColor: DASH_PALETTE.surface,
            borderWidth: 2,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "64%",
        plugins: {
          legend: { position: "bottom", labels: chartLegend.labels },
          tooltip: chartTooltip,
        },
      },
    };

    revenueChartRef.current = new Chart(revenueCanvas, revenueConfig);
    statusChartRef.current = new Chart(statusCanvas, statusConfig);

    return () => {
      revenueChartRef.current?.destroy();
      statusChartRef.current?.destroy();
      revenueChartRef.current = null;
      statusChartRef.current = null;
    };
  }, [data, t, locale]);

  if (loading) return <DashboardSkeleton kpiCount={6} />;

  const kpis = data?.kpis || {
    fabricRevenue: 0,
    orderCount: 0,
    piecesSold: 0,
    activeSkus: 0,
    lowStock: 0,
    paid: 0,
    pending: 0,
    netDue: 0,
  };
  const payoutPaid = data?.payout?.paid ?? kpis.paid ?? 0;
  const payoutPending = data?.payout?.pending ?? kpis.pending ?? 0;
  const totalEarnings =
    data?.payout?.netDue ?? kpis.netDue ?? payoutPaid + payoutPending;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <ConfirmationModal
        isOpen={showRequestConfirm}
        title={t("requestPayoutTitle")}
        message={t("requestPayoutConfirm", {
          amount: formatKpiCurrency(unpaidAmount),
          count: unpaidOrderCount,
        })}
        confirmLabel={
          isRequesting ? t("requestPayoutSubmitting") : t("requestPayoutCta")
        }
        cancelLabel={t("requestPayoutCancel")}
        onConfirm={() => {
          void submitPayoutRequest();
        }}
        onCancel={() => {
          if (!isRequesting) setShowRequestConfirm(false);
        }}
        isLoading={isRequesting}
      />

      <ConfirmationModal
        isOpen={!!deleteConfirmRequest}
        title={t("requestHistoryDeleteTitle")}
        message={
          deleteConfirmRequest
            ? t("requestHistoryDeleteConfirm", {
                amount: formatKpiCurrency(
                  Number(deleteConfirmRequest.amount) || 0,
                ),
                status: deleteConfirmRequest.status,
              })
            : ""
        }
        confirmLabel={
          deletingRequestId
            ? t("requestHistoryDeleting")
            : t("requestHistoryDeleteCta")
        }
        cancelLabel={t("requestPayoutCancel")}
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
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--dash-muted) mb-2">
            {t("eyebrow")}
          </p>
          <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] text-(--dash-ink)">
            {t("title", { name: user?.name || "" })}
          </h1>
          <p className="mt-2 [font-family:var(--font-body)] text-[14px] text-(--dash-muted)">
            {t("description")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TimeframePills
            value={timeframe}
            onChange={setTimeframe}
            labels={{
              week: t("week"),
              month: t("month"),
              year: t("year"),
            }}
          />
          <button
            type="button"
            onClick={() => fetchDashboard(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-3 py-2 text-xs text-(--dash-ink)"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={Banknote}
          label={t("kpiTotalEarnings")}
          value={formatKpiCurrency(totalEarnings)}
          subValue={t("kpiTotalEarningsSub")}
          compact
          delay={0}
          accent="ink"
        />
        <StatCard
          icon={Wallet}
          label={t("kpiPaid")}
          value={formatKpiCurrency(payoutPaid)}
          subValue={
            totalEarnings > 0 && payoutPending <= 0
              ? t("kpiPaidInFull")
              : t("kpiPaidSub")
          }
          compact
          delay={0.05}
          accent="teal"
        />
        <StatCard
          icon={Clock}
          label={t("kpiPending")}
          value={formatKpiCurrency(payoutPending)}
          subValue={
            payoutPending > 0 ? t("kpiPendingSub") : t("kpiPendingNone")
          }
          compact
          delay={0.1}
          accent="amber"
        />
        <StatCard
          icon={ShoppingBag}
          label={t("kpiOrders")}
          value={String(kpis.orderCount)}
          compact
          delay={0.15}
          accent="indigo"
        />
        <StatCard
          icon={Ruler}
          label={t("kpiSkus")}
          value={String(kpis.activeSkus)}
          subValue={
            kpis.piecesSold
              ? `${kpis.piecesSold} ${t("piecesSold")}`
              : undefined
          }
          compact
          delay={0.2}
          accent="sky"
        />
        <StatCard
          icon={AlertTriangle}
          label={t("kpiLowStock")}
          value={String(kpis.lowStock)}
          compact
          delay={0.25}
          accent="rose"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Link
            href="/fabric/shop"
            className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-4 py-2.5 text-sm text-(--dash-ink) transition hover:border-(--dash-gold)"
          >
            <Store className="h-4 w-4 text-(--dash-gold)" />
            {t("shopCardTitle")}
          </Link>
          <Link
            href="/fabric/fabrics"
            className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-4 py-2.5 text-sm text-(--dash-ink) transition hover:border-(--dash-gold)"
          >
            <Ruler className="h-4 w-4 text-(--dash-gold)" />
            {t("fabricsCardTitle")}
          </Link>
        </div>
        <button
          type="button"
          disabled={
            isRequesting ||
            !!pendingRequest ||
            unpaidAmount <= 0 ||
            unpaidOrderCount <= 0
          }
          onClick={() => {
            setRequestError(null);
            setRequestSuccess(null);
            setShowRequestConfirm(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-(--dash-charcoal) px-4 py-2.5 text-sm text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Banknote className="h-4 w-4" />
          {pendingRequest ? t("requestPayoutPending") : t("requestPayoutCta")}
        </button>
      </div>

      {(requestError || requestSuccess || pendingRequest || unpaidAmount > 0) && (
        <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) px-4 py-3 text-sm">
          {requestError ? (
            <p className="text-rose-700">{requestError}</p>
          ) : null}
          {requestSuccess ? (
            <p className="text-emerald-700">{requestSuccess}</p>
          ) : null}
          {pendingRequest ? (
            <p className="text-(--dash-muted)">
              {t("requestPayoutPendingDetail", {
                amount: formatKpiCurrency(Number(pendingRequest.amount) || 0),
                date: pendingRequest.requestedAt
                  ? formatOrderDateLocal(pendingRequest.requestedAt)
                  : "—",
              })}
            </p>
          ) : unpaidAmount > 0 ? (
            <p className="text-(--dash-muted)">
              {t("requestPayoutAvailable", {
                amount: formatKpiCurrency(unpaidAmount),
                count: unpaidOrderCount,
              })}
            </p>
          ) : null}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={t("chartRevenue")}
          subtitle={t("chartRevenueSub")}
          className="lg:col-span-2"
          delay={0.1}
          accent="ink"
        >
          <div className="h-64">
            <canvas id="fabric-revenue-chart" />
          </div>
        </ChartCard>
        <ChartCard title={t("chartStatus")} delay={0.15} accent="teal">
          <div className="mx-auto h-64 max-w-60">
            <canvas id="fabric-status-chart" />
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RankList
          title={t("topFabrics")}
          items={data?.topFabrics || []}
          formatValue={formatCurrency}
          delay={0.12}
        />
        <div className="lg:col-span-2">
          <ActivityFeed
            items={data?.recentOrders || []}
            formatCurrency={formatCurrency}
            title={t("recentActivity")}
            emptyLabel={t("noRecent")}
          />
        </div>
      </div>

      <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink) flex items-center gap-2">
              <Banknote className="h-4 w-4" strokeWidth={1.5} />
              {t("pricingTitle")}
            </h3>
            <p className="mt-1 text-xs text-(--dash-muted)">
              {t("pricingDesc")}
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-(--dash-muted)" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full rounded-xl border border-(--dash-border) bg-white py-1.5 pl-9 pr-3 text-xs text-(--dash-ink) outline-none focus:border-(--dash-gold)"
            />
          </div>
        </div>

        {!data ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-(--dash-charcoal)" />
          </div>
        ) : filteredPricingOrders.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <PackageSearch
              className="mb-3 h-12 w-12 text-(--dash-border)"
              strokeWidth={1}
            />
            <p className="text-xs text-(--dash-muted)">{t("noOrders")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-(--dash-muted)">
              <thead className="border-b border-(--dash-border) text-[9px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">{t("colOrder")}</th>
                  <th className="px-3 py-2">{t("colDate")}</th>
                  <th className="px-3 py-2 text-right">{t("colYourPayout")}</th>
                  <th className="px-3 py-2">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPricingOrders.map((order) => {
                  const statusLabel = (
                    order.paymentStatus ||
                    order.status ||
                    ""
                  ).replace(/_/g, " ");
                  return (
                    <tr
                      key={order._id}
                      className="border-b border-(--dash-border) hover:bg-(--dash-bg)"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-(--dash-ink)">
                          #{order._id.slice(-6)}
                        </p>
                        <p className="text-[10px]">
                          {readPartnerName(
                            order.userId && typeof order.userId === "object"
                              ? order.userId
                              : null,
                            "—",
                          )}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {formatOrderDateLocal(order.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-(--dash-ink)">
                        {formatCurrency(getFabricPayout(order))}
                      </td>
                      <td className="px-3 py-2.5 capitalize">
                        <span className="rounded-md bg-(--dash-bg) px-2 py-0.5 text-[10px] text-(--dash-ink)">
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {requestHistory.filter((item) => item.status !== "pending").length > 0 ? (
        <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
          <div className="mb-4">
            <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
              {t("requestHistoryTitle")}
            </h3>
            <p className="mt-1 text-xs text-(--dash-muted)">
              {t("requestHistoryDesc")}
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border border-(--dash-border)">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-(--dash-bg) text-[10px] uppercase tracking-[0.16em] text-(--dash-muted)">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("colDate")}</th>
                  <th className="px-4 py-3 font-medium">{t("colYourPayout")}</th>
                  <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                  <th className="px-4 py-3 font-medium text-right">
                    {t("requestHistoryActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {requestHistory
                  .filter((item) => item.status !== "pending")
                  .map((item) => {
                    const isDeleting = deletingRequestId === item._id;
                    return (
                      <tr
                        key={item._id}
                        className="border-t border-(--dash-border) bg-white"
                      >
                        <td className="px-4 py-3 text-xs text-(--dash-ink)">
                          {item.requestedAt
                            ? formatOrderDateLocal(item.requestedAt)
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-(--dash-ink)">
                          {formatKpiCurrency(Number(item.amount) || 0)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                              item.status === "approved"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                : "border-rose-200 bg-rose-50 text-rose-800"
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            type="button"
                            title={t("requestHistoryDeleteCta")}
                            aria-label={t("requestHistoryDeleteCta")}
                            disabled={!!deletingRequestId}
                            onClick={() => setDeleteConfirmRequest(item)}
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
        </div>
      ) : null}
    </div>
  );
}
