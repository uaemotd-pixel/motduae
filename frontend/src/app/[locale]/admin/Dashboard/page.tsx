"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import {
  ShoppingBag,
  Package,
  Activity,
  DollarSign,
  Users,
  AlertTriangle,
  Store,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import TimeframePills from "@/components/dashboard/TimeframePills";
import RankList from "@/components/dashboard/RankList";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { DASH_PALETTE, withAlpha } from "@/components/dashboard/palette";
import {
  chartTooltip,
  chartLegend,
  chartGridColor,
  formatCompact,
} from "@/components/dashboard/chartDefaults";

interface DashboardStats {
  retail: { orderCount: number; revenue: number; growth: number };
  custom: { orderCount: number; revenue: number; growth: number };
  currency: string;
  aov?: number;
  monthlyData?: Array<{ month: string; retail: number; custom: number }>;
  monthlyOrders?: Array<{ month: string; retail: number; custom: number }>;
  recentOrders?: Array<{
    id: string;
    type: "retail" | "custom";
    amount: number;
    status: string;
    date: string;
  }>;
  statusBreakdown?: Array<{ status: string; count: number }>;
  customers?: { total: number; active: number; newThisMonth: number };
  partners?: {
    pendingTailors: number;
    pendingFabricStores: number;
    pendingTotal: number;
    activeTailorShops: number;
    activeFabricShops: number;
  };
  inventory?: {
    lowFabrics: number;
    lowReadyMade: number;
    lowAddons: number;
    lowTotal: number;
  };
  topFabrics?: Array<{ id: string; name: string; value: number; meta?: string }>;
  topProducts?: Array<{ id: string; name: string; value: number; meta?: string }>;
  topTailors?: Array<{ id: string; name: string; value: number; meta?: string }>;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const revenueChartRef = useRef<Chart | null>(null);
  const ordersChartRef = useRef<Chart | null>(null);
  const statusChartRef = useRef<Chart | null>(null);
  const channelChartRef = useRef<Chart | null>(null);

  const fetchStats = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);
      const data = await api.get<DashboardStats>(
        `/api/admin/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
      );
      setStats(data);
      setError(null);
    } catch (err: any) {
      console.error("Dashboard fetch error:", err);
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: stats?.currency || "AED",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  const formatKpiCurrency = (value: number) => {
    const amount = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
    return `${stats?.currency || "AED"} ${amount}`;
  };

  useEffect(() => {
    if (!stats) return;

    const destroy = (...charts: (Chart | null)[]) => {
      charts.forEach((c) => c?.destroy());
    };
    destroy(
      revenueChartRef.current,
      ordersChartRef.current,
      statusChartRef.current,
      channelChartRef.current,
    );
    revenueChartRef.current = null;
    ordersChartRef.current = null;
    statusChartRef.current = null;
    channelChartRef.current = null;

    const revenueCanvas = document.getElementById(
      "admin-revenue-chart",
    ) as HTMLCanvasElement | null;
    const ordersCanvas = document.getElementById(
      "admin-orders-chart",
    ) as HTMLCanvasElement | null;
    const statusCanvas = document.getElementById(
      "admin-status-chart",
    ) as HTMLCanvasElement | null;
    const channelCanvas = document.getElementById(
      "admin-channel-chart",
    ) as HTMLCanvasElement | null;

    if (!revenueCanvas || !ordersCanvas || !statusCanvas || !channelCanvas)
      return;

    const monthlyData = stats.monthlyData || [];
    const monthlyOrders = stats.monthlyOrders || [];
    const labels = monthlyData.length
      ? monthlyData.map((d) => d.month)
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    const revenueConfig: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Retail",
            data: monthlyData.map((d) => d.retail || 0),
            borderColor: DASH_PALETTE.charcoal,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart;
              if (!chartArea) return "transparent";
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, withAlpha(DASH_PALETTE.charcoal, 0.28));
              g.addColorStop(1, withAlpha(DASH_PALETTE.charcoal, 0));
              return g;
            },
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: DASH_PALETTE.surface,
            pointBorderColor: DASH_PALETTE.charcoal,
            pointBorderWidth: 2,
            fill: true,
          },
          {
            label: "Custom",
            data: monthlyData.map((d) => d.custom || 0),
            borderColor: DASH_PALETTE.teal,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart;
              if (!chartArea) return "transparent";
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, withAlpha(DASH_PALETTE.teal, 0.32));
              g.addColorStop(1, withAlpha(DASH_PALETTE.teal, 0));
              return g;
            },
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: DASH_PALETTE.surface,
            pointBorderColor: DASH_PALETTE.teal,
            pointBorderWidth: 2,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { position: "top", labels: chartLegend.labels },
          tooltip: {
            ...chartTooltip,
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${formatCurrency(Number(ctx.parsed.y))}`,
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

    const orderLabels = monthlyOrders.length
      ? monthlyOrders.map((d) => d.month)
      : labels;
    const ordersConfig: ChartConfiguration<"bar"> = {
      type: "bar",
      data: {
        labels: orderLabels,
        datasets: [
          {
            label: "Retail",
            data: monthlyOrders.length
              ? monthlyOrders.map((d) => d.retail || 0)
              : [stats.retail.orderCount],
            backgroundColor: withAlpha(DASH_PALETTE.charcoal, 0.9),
            hoverBackgroundColor: DASH_PALETTE.charcoal,
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Custom",
            data: monthlyOrders.length
              ? monthlyOrders.map((d) => d.custom || 0)
              : [stats.custom.orderCount],
            backgroundColor: withAlpha(DASH_PALETTE.teal, 0.88),
            hoverBackgroundColor: DASH_PALETTE.teal,
            borderRadius: 6,
            borderSkipped: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "top", labels: chartLegend.labels },
          tooltip: chartTooltip,
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: DASH_PALETTE.muted, font: { size: 11 } },
            border: { color: DASH_PALETTE.sandDeep },
          },
          y: {
            beginAtZero: true,
            ticks: { color: DASH_PALETTE.muted, font: { size: 11 }, stepSize: 1 },
            grid: { color: chartGridColor },
            border: { color: DASH_PALETTE.sandDeep },
          },
        },
      },
    };

    const statusData = stats.statusBreakdown || [];
    const statusConfig: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: statusData.map((s) => s.status.replace(/_/g, " ")),
        datasets: [
          {
            data: statusData.map((s) => s.count),
            backgroundColor: statusData.map(
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

    const channelConfig: ChartConfiguration<"doughnut"> = {
      type: "doughnut",
      data: {
        labels: ["Retail", "Custom"],
        datasets: [
          {
            data: [stats.retail.orderCount, stats.custom.orderCount],
            backgroundColor: [DASH_PALETTE.charcoal, DASH_PALETTE.teal],
            borderColor: DASH_PALETTE.surface,
            borderWidth: 3,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        plugins: {
          legend: { position: "bottom", labels: chartLegend.labels },
          tooltip: chartTooltip,
        },
      },
    };

    revenueChartRef.current = new Chart(revenueCanvas, revenueConfig);
    ordersChartRef.current = new Chart(ordersCanvas, ordersConfig);
    statusChartRef.current = new Chart(statusCanvas, statusConfig);
    channelChartRef.current = new Chart(channelCanvas, channelConfig);

    return () => {
      destroy(
        revenueChartRef.current,
        ordersChartRef.current,
        statusChartRef.current,
        channelChartRef.current,
      );
      revenueChartRef.current = null;
      ordersChartRef.current = null;
      statusChartRef.current = null;
      channelChartRef.current = null;
    };
  }, [stats]);

  if (loading) return <DashboardSkeleton kpiCount={6} />;

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="max-w-md rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-8 text-center shadow-sm">
          <Activity className="mx-auto mb-4 h-12 w-12 text-[var(--dash-muted)]" />
          <p className="text-xl text-[var(--dash-ink)]">Unable to load dashboard</p>
          <p className="mt-2 text-sm text-[var(--dash-muted)]">{error}</p>
          <button
            type="button"
            onClick={() => fetchStats()}
            className="mt-6 rounded-xl bg-black px-6 py-2 text-sm text-white transition hover:opacity-90"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { retail, custom } = stats;
  const totalOrders = retail.orderCount + custom.orderCount;
  const totalRevenue = retail.revenue + custom.revenue;
  const aov =
    stats.aov ?? (totalOrders > 0 ? totalRevenue / totalOrders : 0);
  const avgGrowth = ((retail.growth ?? 0) + (custom.growth ?? 0)) / 2;

  const pendingTotal = stats.partners?.pendingTotal ?? 0;
  const lowStockTotal = stats.inventory?.lowTotal ?? 0;
  const pendingHref =
    (stats.partners?.pendingTailors ?? 0) >=
    (stats.partners?.pendingFabricStores ?? 0)
      ? "/admin/tailors"
      : "/admin/partners";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-[var(--dash-muted)]">
            Operations overview
          </p>
          <h1 className="[font-family:var(--font-display)] mt-1 text-3xl text-[var(--dash-ink)] sm:text-4xl">
            Welcome{user?.name ? `, ${user.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[var(--dash-muted)]">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <LocaleSwitcher />
          <TimeframePills value={timeframe} onChange={setTimeframe} />
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-2 text-xs text-[var(--dash-ink)] transition hover:border-black hover:bg-black hover:text-white"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatKpiCurrency(totalRevenue)}
          subValue={`Retail ${formatKpiCurrency(retail.revenue)}`}
          trend={avgGrowth}
          compact
          delay={0}
          accent="ink"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          subValue={`${retail.orderCount} retail · ${custom.orderCount} custom`}
          trend={retail.growth}
          compact
          delay={0.05}
          accent="teal"
        />
        <StatCard
          icon={Package}
          label="Avg Order Value"
          value={formatKpiCurrency(aov)}
          subValue="Across all channels"
          compact
          delay={0.1}
          accent="indigo"
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={(stats.customers?.total ?? 0).toLocaleString()}
          subValue={`${stats.customers?.newThisMonth ?? 0} new this month`}
          compact
          delay={0.15}
          accent="sky"
        />
        <StatCard
          icon={Store}
          label="Pending Approvals"
          value={String(pendingTotal)}
          subValue={`${stats.partners?.pendingTailors ?? 0} tailor · ${stats.partners?.pendingFabricStores ?? 0} fabric`}
          compact
          delay={0.2}
          accent="amber"
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={String(lowStockTotal)}
          subValue={`${stats.inventory?.lowFabrics ?? 0} fabrics · ${stats.inventory?.lowReadyMade ?? 0} ready`}
          compact
          delay={0.25}
          accent="rose"
        />
      </div>

      {(pendingTotal > 0 || lowStockTotal > 0) && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {pendingTotal > 0 && (
            <Link
              href={pendingHref}
              className="group flex items-center justify-between gap-3 rounded-[var(--dash-radius)] border border-amber-200 bg-amber-50 px-4 py-3 transition hover:border-amber-300 hover:bg-amber-100/80"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                  <Store className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {pendingTotal} pending approval{pendingTotal === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-amber-700/80">
                    Review tailor and fabric-store applications
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-700 transition group-hover:translate-x-0.5" />
            </Link>
          )}
          {lowStockTotal > 0 && (
            <Link
              href="/admin/fabrics"
              className="group flex items-center justify-between gap-3 rounded-[var(--dash-radius)] border border-rose-200 bg-rose-50 px-4 py-3 transition hover:border-rose-300 hover:bg-rose-100/80"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-700">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-rose-900">
                    {lowStockTotal} low-stock item{lowStockTotal === 1 ? "" : "s"}
                  </p>
                  <p className="text-xs text-rose-700/80">
                    Restock fabrics and ready-made pieces
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-rose-700 transition group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      )}

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          subtitle="Retail vs custom — last 6 months"
          delay={0.1}
          accent="ink"
        >
          <div className="h-72">
            <canvas id="admin-revenue-chart" />
          </div>
        </ChartCard>
        <ChartCard
          title="Order Volume"
          subtitle="Monthly order counts by channel"
          delay={0.15}
          accent="teal"
        >
          <div className="h-72">
            <canvas id="admin-orders-chart" />
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard
          title="Order Status"
          subtitle="Current period mix"
          delay={0.18}
          accent="indigo"
        >
          <div className="mx-auto h-64 max-w-xs">
            <canvas id="admin-status-chart" />
          </div>
        </ChartCard>
        <ChartCard
          title="Channel Mix"
          subtitle="Retail vs custom share"
          delay={0.22}
          accent="sky"
        >
          <div className="mx-auto h-64 max-w-xs">
            <canvas id="admin-channel-chart" />
          </div>
        </ChartCard>
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <RankList
          title="Top Fabrics"
          items={stats.topFabrics || []}
          formatValue={formatCurrency}
          delay={0.12}
          accent="ink"
        />
        <RankList
          title="Top Ready-Made"
          items={stats.topProducts || []}
          formatValue={formatCurrency}
          delay={0.16}
          accent="teal"
        />
        <RankList
          title="Top Tailors"
          items={stats.topTailors || []}
          formatValue={formatCurrency}
          delay={0.2}
          accent="indigo"
        />
      </div>
    </div>
  );
}
