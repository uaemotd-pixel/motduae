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
  Coins,
  ShoppingBag,
  Scissors,
  Activity,
  Store,
  RefreshCw,
} from "lucide-react";
import type { Locale } from "@/i18n/routing";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import TimeframePills from "@/components/dashboard/TimeframePills";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
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

interface CustomOrderItemPricing {
  designBase: number;
  fabricMeters: number;
  fabricPricePerMeter: number;
  fabricCost: number;
  tailoringFee: number;
  deliveryFee: number;
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
}

interface CustomOrderItem {
  designSnapshot: { name: string; nameAr?: string };
  tailorShopId: { _id: string; name: string; nameAr?: string } | string;
  pricing?: CustomOrderItemPricing;
}

interface Order {
  _id: string;
  userId: OrderUser | string;
  tailorShopId: { _id: string; name: string } | string;
  status: string;
  createdAt: string;
  pricing: {
    total: number;
    currency: string;
    tailoringFee: number;
    designBase: number;
  };
  items?: CustomOrderItem[];
  payoutNet?: number;
  payoutPaid?: number;
  payoutPending?: number;
  paymentStatus?: string;
}

interface TailorDashboardData {
  success: boolean;
  currency: string;
  tailorShopId?: string | null;
  tailoringFeeEnabled?: boolean;
  kpis: {
    tailorRevenue: number;
    orderCount: number;
    activeDesigns: number;
    inProgress: number;
    paid?: number;
    pending?: number;
    netDue?: number;
  };
  monthlyData: Array<{
    month: string;
    revenue: number;
  }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  payout?: {
    netDue: number;
    paid: number;
    pending: number;
    status: "pending" | "approved" | null;
  };
  recentOrders: Array<{
    id: string;
    amount: number;
    status: string;
    date: string;
    type?: string;
  }>;
  pricingOrders: Order[];
}

export default function TailorDashboardPage() {
  const t = useTranslations("TailorPortal.dashboard");
  const { user } = useAuth();
  const params = useParams();
  const locale = (params.locale as Locale) || "en";

  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [data, setData] = useState<TailorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const earningsChartRef = useRef<Chart | null>(null);
  const statusChartRef = useRef<Chart | null>(null);

  const fetchDashboard = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);
      const res = await api.get<TailorDashboardData>(
        `/api/tailor/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
      );
      setData(res);
    } catch (err) {
      console.error("Tailor dashboard error:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [timeframe]);

  const formatCurrency = (amount: number, currency = "AED") =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency: data?.currency || currency,
    }).format(amount);

  const formatKpiCurrency = (amount: number) => {
    const code = data?.currency || "AED";
    const formatted = new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
    return `${code} ${formatted}`;
  };

  /** Server sends net payout only — never reconstruct gross/commission in the browser. */
  const getTailorPayout = (order: Order) =>
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
      if (!pricingSearch.trim()) return true;
      const term = pricingSearch.toLowerCase();
      return order._id.toLowerCase().includes(term);
    });
  }, [pricingOrders, pricingSearch]);

  useEffect(() => {
    if (!data) return;

    earningsChartRef.current?.destroy();
    statusChartRef.current?.destroy();
    earningsChartRef.current = null;
    statusChartRef.current = null;

    const earningsCanvas = document.getElementById(
      "tailor-earnings-chart",
    ) as HTMLCanvasElement | null;
    const statusCanvas = document.getElementById(
      "tailor-status-chart",
    ) as HTMLCanvasElement | null;
    if (!earningsCanvas || !statusCanvas) return;

    const monthly = data.monthlyData || [];
    const earningsConfig: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: monthly.map((d) => d.month),
        datasets: [
          {
            label: t("chartPayoutLabel"),
            data: monthly.map((d) => d.revenue || 0),
            borderColor: DASH_PALETTE.gold,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart;
              if (!chartArea) return "transparent";
              const g = c.createLinearGradient(
                0,
                chartArea.top,
                0,
                chartArea.bottom,
              );
              g.addColorStop(0, withAlpha(DASH_PALETTE.gold, 0.35));
              g.addColorStop(1, withAlpha(DASH_PALETTE.gold, 0));
              return g;
            },
            borderWidth: 2.5,
            tension: 0.4,
            fill: true,
            pointRadius: 3,
            pointBackgroundColor: DASH_PALETTE.surface,
            pointBorderColor: DASH_PALETTE.gold,
            pointBorderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
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
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: DASH_PALETTE.muted,
              font: { size: 11 },
              callback: (v) => formatCompact(Number(v)),
            },
            grid: { color: chartGridColor },
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
              (_, i) => DASH_PALETTE.series[i % DASH_PALETTE.series.length],
            ),
            borderColor: DASH_PALETTE.surface,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: { position: "bottom", labels: chartLegend.labels },
          tooltip: chartTooltip,
        },
      },
    };

    earningsChartRef.current = new Chart(earningsCanvas, earningsConfig);
    statusChartRef.current = new Chart(statusCanvas, statusConfig);

    return () => {
      earningsChartRef.current?.destroy();
      statusChartRef.current?.destroy();
      earningsChartRef.current = null;
      statusChartRef.current = null;
    };
  }, [data, t, locale]);

  if (loading) return <DashboardSkeleton kpiCount={6} />;

  const kpis = data?.kpis || {
    tailorRevenue: 0,
    orderCount: 0,
    activeDesigns: 0,
    inProgress: 0,
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
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-[var(--dash-muted)] mb-2">
            {t("eyebrow")}
          </p>
          <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] text-[var(--dash-ink)]">
            {t("title", { name: user?.name || "" })}
          </h1>
          <p className="mt-2 [font-family:var(--font-body)] text-[14px] text-[var(--dash-muted)]">
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
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-2 text-xs text-[var(--dash-ink)]"
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
          icon={Coins}
          label={t("kpiTotalEarnings")}
          value={formatKpiCurrency(totalEarnings)}
          subValue={t("kpiTotalEarningsSub")}
          compact
          delay={0}
        />
        <StatCard
          icon={Coins}
          label={t("kpiPaid")}
          value={formatKpiCurrency(payoutPaid)}
          subValue={
            totalEarnings > 0 && payoutPending <= 0
              ? t("kpiPaidInFull")
              : t("kpiPaidSub")
          }
          compact
          delay={0.05}
        />
        <StatCard
          icon={Coins}
          label={t("kpiPending")}
          value={formatKpiCurrency(payoutPending)}
          subValue={
            payoutPending > 0 ? t("kpiPendingSub") : t("kpiPendingNone")
          }
          compact
          delay={0.1}
        />
        <StatCard
          icon={ShoppingBag}
          label={t("kpiOrders")}
          value={String(kpis.orderCount)}
          compact
          delay={0.15}
        />
        <StatCard
          icon={Scissors}
          label={t("kpiDesigns")}
          value={String(kpis.activeDesigns)}
          compact
          delay={0.2}
        />
        <StatCard
          icon={Activity}
          label={t("kpiInProgress")}
          value={String(kpis.inProgress)}
          compact
          delay={0.25}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/tailor/shop"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2.5 text-sm text-[var(--dash-ink)] transition hover:border-[var(--dash-gold)]"
        >
          <Store className="h-4 w-4 text-[var(--dash-gold)]" />
          {t("shopCardTitle")}
        </Link>
        <Link
          href="/tailor/designs"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2.5 text-sm text-[var(--dash-ink)] transition hover:border-[var(--dash-gold)]"
        >
          <Scissors className="h-4 w-4 text-[var(--dash-gold)]" />
          {t("designsCardTitle")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={t("chartEarnings")}
          subtitle={t("chartEarningsSub")}
          className="lg:col-span-2"
          delay={0.1}
        >
          <div className="h-64">
            <canvas id="tailor-earnings-chart" />
          </div>
        </ChartCard>
        <ChartCard title={t("chartStatus")} delay={0.15}>
          <div className="mx-auto h-64 max-w-[240px]">
            <canvas id="tailor-status-chart" />
          </div>
        </ChartCard>
      </div>

      <ActivityFeed
        items={data?.recentOrders || []}
        formatCurrency={formatCurrency}
        title={t("recentActivity")}
        emptyLabel={t("noRecent")}
      />

      <div className="rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-[var(--dash-ink)] flex items-center gap-2">
              <Coins className="h-4 w-4" strokeWidth={1.5} />
              {t("pricingTitle")}
            </h3>
            <p className="mt-1 text-xs text-[var(--dash-muted)]">
              {t("pricingDesc")}
            </p>
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-muted)]" />
            <input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--dash-border)] bg-white py-1.5 pl-9 pr-3 text-xs text-[var(--dash-ink)] outline-none focus:border-[var(--dash-gold)]"
            />
          </div>
        </div>

        {!data ? (
          <div className="flex flex-col items-center py-12">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--dash-charcoal)]" />
          </div>
        ) : filteredPricingOrders.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <PackageSearch
              className="mb-3 h-12 w-12 text-[var(--dash-border)]"
              strokeWidth={1}
            />
            <p className="text-xs text-[var(--dash-muted)]">{t("noOrders")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-[var(--dash-muted)]">
              <thead className="border-b border-[var(--dash-border)] text-[9px] font-semibold uppercase tracking-wider">
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
                      className="border-b border-[var(--dash-border)] hover:bg-[var(--dash-bg)]"
                    >
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-[var(--dash-ink)]">
                          #{order._id.slice(-6)}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {formatOrderDateLocal(order.createdAt)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[var(--dash-ink)]">
                        {formatCurrency(getTailorPayout(order))}
                      </td>
                      <td className="px-3 py-2.5 capitalize">
                        <span className="rounded-md bg-[var(--dash-bg)] px-2 py-0.5 text-[10px] text-[var(--dash-ink)]">
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
    </div>
  );
}
