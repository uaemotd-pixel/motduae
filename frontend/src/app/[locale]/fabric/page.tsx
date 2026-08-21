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
  DollarSign,
  ShoppingBag,
  Scissors,
  AlertTriangle,
  Store,
  RefreshCw,
  Ruler,
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
  fabricSnapshot?: { name: string; nameAr?: string } | null;
  fabricStoreId?: { _id: string; name: string } | string;
  pricing?: CustomOrderItemPricing;
}

interface Order {
  _id: string;
  userId: OrderUser | string | null;
  status: string;
  createdAt: string;
  pricing: {
    total: number;
    currency: string;
    fabricCost?: number;
  };
  items?: CustomOrderItem[];
}

interface FabricDashboardData {
  success: boolean;
  currency: string;
  fabricShopId?: string;
  kpis: {
    fabricRevenue: number;
    orderCount: number;
    metersSold: number;
    activeSkus: number;
    lowStock: number;
  };
  monthlyData: Array<{ month: string; revenue: number }>;
  statusBreakdown: Array<{ status: string; count: number }>;
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

export default function FabricDashboardPage() {
  const t = useTranslations("FabricPortal.dashboard");
  const { user } = useAuth();
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const isAr = locale === "ar";

  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");
  const [data, setData] = useState<FabricDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const revenueChartRef = useRef<Chart | null>(null);
  const statusChartRef = useRef<Chart | null>(null);

  const fetchDashboard = async (showRefresh = false) => {
    try {
      if (showRefresh) setIsRefreshing(true);
      else setLoading(true);
      const res = await api.get<FabricDashboardData>(
        `/api/fabric/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
      );
      setData(res);
    } catch (err) {
      console.error("Fabric dashboard error:", err);
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

  const fabricShopId = data?.fabricShopId || null;

  const getFabricFee = (order: Order) => {
    if (!fabricShopId) return 0;
    if (order.items && order.items.length > 0) {
      return order.items
        .filter((item) => {
          const itemStoreId =
            typeof item.fabricStoreId === "object"
              ? item.fabricStoreId?._id
              : item.fabricStoreId;
          return itemStoreId === fabricShopId;
        })
        .reduce((sum, item) => sum + (item.pricing?.fabricCost || 0), 0);
    }
    return order.pricing?.fabricCost || 0;
  };

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
            label: isAr ? "إيراد القماش" : "Fabric revenue",
            data: monthly.map((d) => d.revenue || 0),
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

    revenueChartRef.current = new Chart(revenueCanvas, revenueConfig);
    statusChartRef.current = new Chart(statusCanvas, statusConfig);

    return () => {
      revenueChartRef.current?.destroy();
      statusChartRef.current?.destroy();
      revenueChartRef.current = null;
      statusChartRef.current = null;
    };
  }, [data, isAr]);

  if (loading) return <DashboardSkeleton kpiCount={4} />;

  const kpis = data?.kpis || {
    fabricRevenue: 0,
    orderCount: 0,
    metersSold: 0,
    activeSkus: 0,
    lowStock: 0,
  };

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
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label={t("kpiRevenue")}
          value={formatCurrency(kpis.fabricRevenue)}
          delay={0}
        />
        <StatCard
          icon={ShoppingBag}
          label={t("kpiOrders")}
          value={String(kpis.orderCount)}
          delay={0.05}
        />
        <StatCard
          icon={Scissors}
          label={t("kpiSkus")}
          value={String(kpis.activeSkus)}
          subValue={
            kpis.metersSold
              ? `${kpis.metersSold.toFixed(1)} ${t("metersSold")}`
              : undefined
          }
          delay={0.1}
        />
        <StatCard
          icon={AlertTriangle}
          label={t("kpiLowStock")}
          value={String(kpis.lowStock)}
          delay={0.15}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/fabric/shop"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2.5 text-sm text-[var(--dash-ink)] transition hover:border-[var(--dash-gold)]"
        >
          <Store className="h-4 w-4 text-[var(--dash-gold)]" />
          {t("shopCardTitle")}
        </Link>
        <Link
          href="/fabric/fabrics"
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--dash-border)] bg-[var(--dash-surface)] px-4 py-2.5 text-sm text-[var(--dash-ink)] transition hover:border-[var(--dash-gold)]"
        >
          <Ruler className="h-4 w-4 text-[var(--dash-gold)]" />
          {t("fabricsCardTitle")}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={t("chartRevenue")}
          subtitle={t("chartRevenueSub")}
          className="lg:col-span-2"
          delay={0.1}
        >
          <div className="h-64">
            <canvas id="fabric-revenue-chart" />
          </div>
        </ChartCard>
        <ChartCard title={t("chartStatus")} delay={0.15}>
          <div className="mx-auto h-64 max-w-[240px]">
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

      <div className="rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-[var(--dash-ink)] flex items-center gap-2">
              <DollarSign className="h-4 w-4" strokeWidth={1.5} />
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
            <PackageSearch className="mb-3 h-12 w-12 text-[var(--dash-border)]" strokeWidth={1} />
            <p className="text-xs text-[var(--dash-muted)]">{t("noOrders")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-[var(--dash-muted)]">
              <thead className="border-b border-[var(--dash-border)] text-[9px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-3 py-2">{t("colOrder")}</th>
                  <th className="px-3 py-2">{t("colDate")}</th>
                  <th className="px-3 py-2 text-right">{t("colFabricFee")}</th>
                  <th className="px-3 py-2">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPricingOrders.map((order) => (
                  <tr
                    key={order._id}
                    className="border-b border-[var(--dash-border)] hover:bg-[var(--dash-bg)]"
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-[var(--dash-ink)]">
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
                    <td className="px-3 py-2.5 text-right font-medium text-[var(--dash-ink)]">
                      {formatCurrency(getFabricFee(order))}
                    </td>
                    <td className="px-3 py-2.5 capitalize">
                      <span className="rounded-md bg-[var(--dash-bg)] px-2 py-0.5 text-[10px] text-[var(--dash-ink)]">
                        {(order.status || "").replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
