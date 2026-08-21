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
import { splitFabricCommission } from "@/lib/fabricCommission";

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
  designFeeGross?: number;
  tailoringFeeGross?: number;
  tailorFeeGross?: number;
}

interface TailorDashboardData {
  success: boolean;
  currency: string;
  tailorShopId?: string | null;
  commissionPercent?: number;
  tailoringFeeEnabled?: boolean;
  kpis: {
    tailorRevenue: number;
    tailorGross?: number;
    motdCommission?: number;
    designFees: number;
    tailoringFees: number;
    orderCount: number;
    activeDesigns: number;
    inProgress: number;
  };
  monthlyData: Array<{
    month: string;
    design: number;
    tailoring: number;
    revenue: number;
  }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  feeSplit?: {
    tailorGross: number;
    motdCommission: number;
    tailorNet: number;
    designFees: number;
    tailoringFees: number;
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

  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">("month");
  const [data, setData] = useState<TailorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const earningsChartRef = useRef<Chart | null>(null);
  const statusChartRef = useRef<Chart | null>(null);
  const commissionChartRef = useRef<Chart | null>(null);

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

  const tailorShopId = data?.tailorShopId ? String(data.tailorShopId) : null;
  const commissionPercent = data?.commissionPercent ?? 12;

  const getTailorGross = (order: Order) => {
    if (typeof order.tailorFeeGross === "number" && Number.isFinite(order.tailorFeeGross)) {
      return order.tailorFeeGross;
    }

    if (!tailorShopId) return 0;

    if (order.items && order.items.length > 0) {
      return order.items
        .filter((item) => {
          const itemShopId =
            typeof item.tailorShopId === "object"
              ? item.tailorShopId?._id
              : item.tailorShopId;
          return String(itemShopId || "") === tailorShopId;
        })
        .reduce(
          (sum, item) =>
            sum +
            (item.pricing?.designBase || 0) +
            (item.pricing?.tailoringFee || 0),
          0,
        );
    }

    const orderShopId =
      typeof order.tailorShopId === "object"
        ? order.tailorShopId?._id
        : order.tailorShopId;
    if (String(orderShopId || "") === tailorShopId) {
      return (
        (order.pricing?.designBase || 0) + (order.pricing?.tailoringFee || 0)
      );
    }
    return 0;
  };

  const getTailorBreakdown = (order: Order) =>
    splitFabricCommission(getTailorGross(order), commissionPercent);

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
      if (getTailorGross(order) <= 0) return false;

      if (!pricingSearch.trim()) return true;
      const term = pricingSearch.toLowerCase();
      const customerName = readPartnerName(
        typeof order.userId === "object" ? order.userId : null,
        "",
      ).toLowerCase();
      const customerEmail = (
        typeof order.userId === "object" ? order.userId.email || "" : ""
      ).toLowerCase();
      return (
        customerName.includes(term) ||
        customerEmail.includes(term) ||
        order._id.toLowerCase().includes(term)
      );
    });
  }, [pricingOrders, pricingSearch, tailorShopId, commissionPercent]);

  useEffect(() => {
    if (!data) return;

    earningsChartRef.current?.destroy();
    statusChartRef.current?.destroy();
    commissionChartRef.current?.destroy();
    earningsChartRef.current = null;
    statusChartRef.current = null;
    commissionChartRef.current = null;

    const earningsCanvas = document.getElementById(
      "tailor-earnings-chart",
    ) as HTMLCanvasElement | null;
    const statusCanvas = document.getElementById(
      "tailor-status-chart",
    ) as HTMLCanvasElement | null;
    const commissionCanvas = document.getElementById(
      "tailor-commission-chart",
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

    const feeSplit = data.feeSplit || {
      tailorGross: data.kpis.tailorGross || 0,
      motdCommission: data.kpis.motdCommission || 0,
      tailorNet: data.kpis.tailorRevenue || 0,
      designFees: data.kpis.designFees || 0,
      tailoringFees: data.kpis.tailoringFees || 0,
    };

    if (commissionCanvas && feeSplit.tailorGross > 0) {
      commissionChartRef.current = new Chart(commissionCanvas, {
        type: "doughnut",
        data: {
          labels: [
            t("chartPayoutLabel"),
            t("colMotdCommission", { percent: commissionPercent }),
          ],
          datasets: [
            {
              data: [feeSplit.tailorNet, feeSplit.motdCommission],
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
            tooltip: {
              ...chartTooltip,
              callbacks: {
                label: (ctx) => formatCurrency(Number(ctx.parsed)),
              },
            },
          },
        },
      });
    }

    return () => {
      earningsChartRef.current?.destroy();
      statusChartRef.current?.destroy();
      commissionChartRef.current?.destroy();
      earningsChartRef.current = null;
      statusChartRef.current = null;
      commissionChartRef.current = null;
    };
  }, [data, commissionPercent, t, locale]);

  if (loading) return <DashboardSkeleton kpiCount={4} />;

  const kpis = data?.kpis || {
    tailorRevenue: 0,
    tailorGross: 0,
    motdCommission: 0,
    designFees: 0,
    tailoringFees: 0,
    orderCount: 0,
    activeDesigns: 0,
    inProgress: 0,
  };
  const tailorGross = kpis.tailorGross ?? 0;
  const motdCommissionTotal = kpis.motdCommission ?? 0;

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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={DollarSign}
          label={t("kpiRevenue")}
          value={formatCurrency(kpis.tailorRevenue)}
          subValue={
            tailorGross > 0
              ? `${t("kpiGross")}: ${formatCurrency(tailorGross)}`
              : undefined
          }
          delay={0}
        />
        <StatCard
          icon={ShoppingBag}
          label={t("kpiOrders")}
          value={String(kpis.orderCount)}
          subValue={
            motdCommissionTotal > 0
              ? `${t("kpiCommission")} (${commissionPercent}%): ${formatCurrency(motdCommissionTotal)}`
              : undefined
          }
          delay={0.05}
        />
        <StatCard
          icon={Scissors}
          label={t("kpiDesigns")}
          value={String(kpis.activeDesigns)}
          delay={0.1}
        />
        <StatCard
          icon={Activity}
          label={t("kpiInProgress")}
          value={String(kpis.inProgress)}
          delay={0.15}
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
        <div className="space-y-4">
          <ChartCard title={t("chartCommission")} delay={0.12}>
            <div className="mx-auto h-40 max-w-[200px]">
              <canvas id="tailor-commission-chart" />
            </div>
          </ChartCard>
          <ChartCard title={t("chartStatus")} delay={0.15}>
            <div className="mx-auto h-40 max-w-[200px]">
              <canvas id="tailor-status-chart" />
            </div>
          </ChartCard>
        </div>
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
                  <th className="px-3 py-2 text-right">{t("colGross")}</th>
                  <th className="px-3 py-2 text-right">
                    {t("colMotdCommission", { percent: commissionPercent })}
                  </th>
                  <th className="px-3 py-2 text-right">{t("colYourPayout")}</th>
                  <th className="px-3 py-2">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPricingOrders.map((order) => {
                  const breakdown = getTailorBreakdown(order);
                  return (
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
                            typeof order.userId === "object"
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
                        {formatCurrency(breakdown.gross)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[var(--dash-muted)]">
                        −{formatCurrency(breakdown.commission)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[var(--dash-ink)]">
                        {formatCurrency(breakdown.net)}
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
  );
}
