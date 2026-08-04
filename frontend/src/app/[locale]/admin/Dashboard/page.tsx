"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
  Search,
  PackageSearch,
  Loader2,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import TimeframePills from "@/components/dashboard/TimeframePills";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
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

  const [pricingOrders, setPricingOrders] = useState<any[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");

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

  useEffect(() => {
    const fetchPricingOrders = async () => {
      try {
        setPricingLoading(true);
        const data = await api.get<any>("/api/admin/orders/custom");
        const items = Array.isArray(data) ? data : data.items || [];
        setPricingOrders(items);
      } catch (err) {
        console.error("Pricing fetch error:", err);
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPricingOrders();
  }, []);

  const getOrderFees = (order: any) => {
    if (order.items && order.items.length > 0) {
      return {
        tailorFee: order.items.reduce(
          (sum: number, item: any) => sum + (item.pricing?.designBase || 0),
          0,
        ),
        tailoringFee: order.items.reduce(
          (sum: number, item: any) => sum + (item.pricing?.tailoringFee || 0),
          0,
        ),
        fabricFee: order.items.reduce(
          (sum: number, item: any) => sum + (item.pricing?.fabricCost || 0),
          0,
        ),
      };
    }
    return {
      tailorFee: order.pricing?.designBase || 0,
      tailoringFee: order.pricing?.tailoringFee || 0,
      fabricFee: order.pricing?.fabricCost || 0,
    };
  };

  const readPartnerName = (value: any, fallback: string) => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value.name || fallback;
  };

  const formatOrderDateLocal = (dateStr: string) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const filteredPricingOrders = useMemo(() => {
    return pricingOrders.filter((order) => {
      if (!pricingSearch.trim()) return true;
      const term = pricingSearch.toLowerCase();
      const customerName = readPartnerName(
        order.userId && typeof order.userId === "object" ? order.userId : null,
        "",
      ).toLowerCase();
      const customerEmail = (
        order.userId && typeof order.userId === "object"
          ? (order.userId as any).email || ""
          : ""
      ).toLowerCase();
      return (
        customerName.includes(term) ||
        customerEmail.includes(term) ||
        order._id.toLowerCase().includes(term)
      );
    });
  }, [pricingOrders, pricingSearch]);

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
            borderColor: DASH_PALETTE.gold,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart;
              if (!chartArea) return "transparent";
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, withAlpha(DASH_PALETTE.gold, 0.35));
              g.addColorStop(1, withAlpha(DASH_PALETTE.gold, 0));
              return g;
            },
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: DASH_PALETTE.surface,
            pointBorderColor: DASH_PALETTE.gold,
            pointBorderWidth: 2,
            fill: true,
          },
          {
            label: "Custom",
            data: monthlyData.map((d) => d.custom || 0),
            borderColor: DASH_PALETTE.charcoal,
            backgroundColor: (ctx) => {
              const { ctx: c, chartArea } = ctx.chart;
              if (!chartArea) return "transparent";
              const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              g.addColorStop(0, withAlpha(DASH_PALETTE.charcoal, 0.2));
              g.addColorStop(1, withAlpha(DASH_PALETTE.charcoal, 0));
              return g;
            },
            borderWidth: 2,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
            pointBackgroundColor: DASH_PALETTE.surface,
            pointBorderColor: DASH_PALETTE.charcoal,
            pointBorderWidth: 2,
            fill: true,
            borderDash: [5, 4],
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
            backgroundColor: withAlpha(DASH_PALETTE.gold, 0.85),
            borderRadius: 6,
            borderSkipped: false,
          },
          {
            label: "Custom",
            data: monthlyOrders.length
              ? monthlyOrders.map((d) => d.custom || 0)
              : [stats.custom.orderCount],
            backgroundColor: withAlpha(DASH_PALETTE.charcoal, 0.8),
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
            backgroundColor: [
              withAlpha(DASH_PALETTE.gold, 0.9),
              withAlpha(DASH_PALETTE.charcoal, 0.85),
            ],
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
            className="mt-6 rounded-xl bg-[var(--dash-charcoal)] px-6 py-2 text-sm text-white transition hover:opacity-90"
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
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-3 py-2 text-xs text-[var(--dash-ink)] transition hover:border-[var(--dash-gold)]"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatKpiCurrency(totalRevenue)}
          subValue={`Retail ${formatKpiCurrency(retail.revenue)}`}
          trend={avgGrowth}
          delay={0}
        />
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          subValue={`${retail.orderCount} retail · ${custom.orderCount} custom`}
          trend={retail.growth}
          delay={0.05}
        />
        <StatCard
          icon={Package}
          label="Avg Order Value"
          value={formatKpiCurrency(aov)}
          subValue="Across all channels"
          delay={0.1}
        />
        <StatCard
          icon={Users}
          label="Customers"
          value={(stats.customers?.total ?? 0).toLocaleString()}
          subValue={`${stats.customers?.newThisMonth ?? 0} new this month`}
          delay={0.15}
        />
        <StatCard
          icon={Store}
          label="Pending Approvals"
          value={String(stats.partners?.pendingTotal ?? 0)}
          subValue={`${stats.partners?.pendingTailors ?? 0} tailor · ${stats.partners?.pendingFabricStores ?? 0} fabric`}
          delay={0.2}
        />
        <StatCard
          icon={AlertTriangle}
          label="Low Stock"
          value={String(stats.inventory?.lowTotal ?? 0)}
          subValue={`${stats.inventory?.lowFabrics ?? 0} fabrics · ${stats.inventory?.lowReadyMade ?? 0} ready`}
          delay={0.25}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Revenue Trend"
          subtitle="Retail vs custom — last 6 months"
          delay={0.1}
        >
          <div className="h-72">
            <canvas id="admin-revenue-chart" />
          </div>
        </ChartCard>
        <ChartCard
          title="Order Volume"
          subtitle="Monthly order counts by channel"
          delay={0.15}
        >
          <div className="h-72">
            <canvas id="admin-orders-chart" />
          </div>
        </ChartCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="Order Status" subtitle="Current period mix" delay={0.18}>
          <div className="mx-auto h-64 max-w-xs">
            <canvas id="admin-status-chart" />
          </div>
        </ChartCard>
        <ChartCard title="Channel Mix" subtitle="Retail vs custom share" delay={0.22}>
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
        />
        <RankList
          title="Top Ready-Made"
          items={stats.topProducts || []}
          formatValue={formatCurrency}
          delay={0.16}
        />
        <RankList
          title="Top Tailors"
          items={stats.topTailors || []}
          formatValue={formatCurrency}
          delay={0.2}
        />
      </div>

      {/* Activity + Pricing */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-1">
          <ActivityFeed
            items={stats.recentOrders || []}
            formatCurrency={formatCurrency}
          />
        </div>

        <div className="rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6 xl:col-span-2">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="[font-family:var(--font-display)] text-lg text-[var(--dash-ink)]">
                Pricing & Fees
              </h3>
              <p className="mt-1 text-xs text-[var(--dash-muted)]">
                Custom order fee breakdown across tailor, tailoring, and fabric.
              </p>
            </div>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-muted)]" />
              <input
                type="text"
                placeholder="Search customer or order..."
                value={pricingSearch}
                onChange={(e) => setPricingSearch(e.target.value)}
                className="w-full rounded-xl border border-[var(--dash-border)] bg-white py-1.5 pl-9 pr-3 text-xs text-[var(--dash-ink)] outline-none transition focus:border-[var(--dash-gold)]"
              />
            </div>
          </div>

          {pricingLoading && pricingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="mb-3 h-8 w-8 animate-spin text-[var(--dash-charcoal)]" />
              <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-widest text-[var(--dash-muted)]">
                Loading data...
              </p>
            </div>
          ) : filteredPricingOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <PackageSearch
                className="mb-3 h-12 w-12 text-[var(--dash-border)]"
                strokeWidth={1}
              />
              <p className="text-xs text-[var(--dash-muted)]">
                No orders found matching filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-[var(--dash-muted)]">
                <thead className="border-b border-[var(--dash-border)] text-[9px] font-semibold uppercase tracking-wider text-[var(--dash-muted)]">
                  <tr>
                    <th className="px-3 py-2">Order / Customer</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2 text-right">Tailor Fee</th>
                    <th className="px-3 py-2 text-right">Tailoring</th>
                    <th className="px-3 py-2 text-right">Fabric</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPricingOrders.slice(0, 12).map((order) => {
                    const fees = getOrderFees(order);
                    return (
                      <tr
                        key={order._id}
                        className="border-b border-[var(--dash-border)] transition hover:bg-[var(--dash-bg)]"
                      >
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-[var(--dash-ink)]">
                            #{order._id.slice(-6)}
                          </p>
                          <p className="text-[10px]">
                            {readPartnerName(
                              typeof order.userId === "object"
                                ? order.userId
                                : null,
                              "Customer",
                            )}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {formatOrderDateLocal(order.createdAt)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--dash-ink)]">
                          {formatCurrency(fees.tailorFee)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--dash-ink)]">
                          {formatCurrency(fees.tailoringFee)}
                        </td>
                        <td className="px-3 py-2.5 text-right text-[var(--dash-ink)]">
                          {formatCurrency(fees.fabricFee)}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-[var(--dash-ink)]">
                          {formatCurrency(order.pricing?.total || 0)}
                        </td>
                        <td className="px-3 py-2.5 capitalize">
                          <span className="rounded-md bg-[var(--dash-bg)] px-2 py-0.5 text-[10px] text-[var(--dash-ink)]">
                            {(order.status || "").replace(/_/g, " ")}
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
    </div>
  );
}
