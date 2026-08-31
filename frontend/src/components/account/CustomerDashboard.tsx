"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import {
  Banknote,
  ShoppingBag,
  Activity,
  PackageCheck,
  Star,
  Users,
  Bell,
  Ruler,
  MapPin,
  RefreshCw,
  Shirt,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/api/client";
import type { Locale } from "@/i18n/routing";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import TimeframePills from "@/components/dashboard/TimeframePills";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { DASH_PALETTE, withAlpha } from "@/components/dashboard/palette";
import {
  chartTooltip,
  chartGridColor,
  formatCompact,
} from "@/components/dashboard/chartDefaults";

type AccountNavigateTab =
  | "dashboard"
  | "profile"
  | "orders"
  | "reviews"
  | "notifications"
  | "measurements"
  | "family-members"
  | "settings";

interface CustomerDashboardData {
  success: boolean;
  currency: string;
  timeframe: string;
  kpis: {
    totalSpent: number;
    orderCount: number;
    customCount: number;
    retailCount: number;
    inProgress: number;
    delivered: number;
    returns: number;
    reviewsCount: number;
    familyMembersCount: number;
    unreadNotifications: number;
  };
  setup: {
    hasProfile: boolean;
    hasMeasurements: boolean;
    hasAddress: boolean;
    hasFamilyMembers: boolean;
    hasReviews: boolean;
  };
  monthlyData: Array<{ month: string; spent: number }>;
  statusBreakdown: Array<{
    status: string;
    count: number;
    channel: string;
  }>;
  recentOrders: Array<{
    id: string;
    type?: string;
    amount: number;
    status: string;
    date: string;
  }>;
}

type CustomerDashboardProps = {
  userName?: string;
  isGuest?: boolean;
  onNavigate?: (
    tab: AccountNavigateTab,
    extras?: { orderId?: string; orderType?: "custom" | "retail" },
  ) => void;
};

export default function CustomerDashboard({
  userName = "",
  isGuest = false,
  onNavigate,
}: CustomerDashboardProps) {
  const t = useTranslations("Account.Dashboard");
  const params = useParams();
  const locale = (params.locale as Locale) || "en";

  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [data, setData] = useState<CustomerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spendChartRef = useRef<Chart | null>(null);

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

  const fetchDashboard = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) setIsRefreshing(true);
        else setLoading(true);
        const res = await api.get<CustomerDashboardData>(
          `/api/customer/dashboard?timeframe=${timeframe}&t=${Date.now()}`,
        );
        setData(res);
      } catch (err) {
        console.error("Customer dashboard error:", err);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [timeframe],
  );

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!data) return;
    const canvas = document.getElementById(
      "customer-spend-chart",
    ) as HTMLCanvasElement | null;
    if (!canvas) return;

    spendChartRef.current?.destroy();

    const config: ChartConfiguration<"line"> = {
      type: "line",
      data: {
        labels: data.monthlyData.map((m) => m.month),
        datasets: [
          {
            label: t("chartSpendLabel"),
            data: data.monthlyData.map((m) => m.spent),
            borderColor: DASH_PALETTE.charcoal,
            backgroundColor: withAlpha(DASH_PALETTE.charcoal, 0.08),
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2,
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
            grid: { color: chartGridColor },
            ticks: {
              color: DASH_PALETTE.muted,
              font: { size: 11 },
              callback: (v) => formatCompact(Number(v)),
            },
          },
        },
      },
    };

    spendChartRef.current = new Chart(canvas, config);
    return () => {
      spendChartRef.current?.destroy();
      spendChartRef.current = null;
    };
  }, [data, t, locale]);

  if (loading) return <DashboardSkeleton kpiCount={6} />;

  const kpis = data?.kpis || {
    totalSpent: 0,
    orderCount: 0,
    customCount: 0,
    retailCount: 0,
    inProgress: 0,
    delivered: 0,
    returns: 0,
    reviewsCount: 0,
    familyMembersCount: 0,
    unreadNotifications: 0,
  };
  const setup = data?.setup || {
    hasProfile: false,
    hasMeasurements: false,
    hasAddress: false,
    hasFamilyMembers: false,
    hasReviews: false,
  };

  const setupItems = isGuest
    ? []
    : [
        {
          key: "measurements",
          done: setup.hasMeasurements,
          label: t("setupMeasurements"),
          tab: "measurements" as const,
          icon: Ruler,
        },
        {
          key: "address",
          done: setup.hasAddress,
          label: t("setupAddress"),
          tab: "profile" as const,
          icon: MapPin,
        },
        {
          key: "family",
          done: setup.hasFamilyMembers,
          label: t("setupFamily"),
          tab: "family-members" as const,
          icon: Users,
        },
        {
          key: "reviews",
          done: setup.hasReviews,
          label: t("setupReviews"),
          tab: "reviews" as const,
          icon: Star,
        },
      ].filter((item) => !item.done);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--dash-muted)">
            {t("eyebrow")}
          </p>
          <h2 className="[font-family:var(--font-display)] text-[28px] text-(--dash-ink) sm:text-[34px]">
            {t("title", { name: userName || t("guestName") })}
          </h2>
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
            onClick={() => void fetchDashboard(true)}
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
          label={t("kpiSpent")}
          value={formatCurrency(kpis.totalSpent)}
          subValue={t("kpiSpentSub")}
          compact
          delay={0}
          accent="ink"
        />
        <StatCard
          icon={ShoppingBag}
          label={t("kpiOrders")}
          value={String(kpis.orderCount)}
          subValue={t("kpiOrdersSub", {
            custom: kpis.customCount,
            retail: kpis.retailCount,
          })}
          compact
          delay={0.05}
          accent="indigo"
        />
        <StatCard
          icon={Activity}
          label={t("kpiInProgress")}
          value={String(kpis.inProgress)}
          subValue={t("kpiInProgressSub")}
          compact
          delay={0.1}
          accent="amber"
        />
        <StatCard
          icon={PackageCheck}
          label={t("kpiDelivered")}
          value={String(kpis.delivered)}
          subValue={t("kpiDeliveredSub")}
          compact
          delay={0.15}
          accent="teal"
        />
        <StatCard
          icon={Star}
          label={t("kpiReviews")}
          value={String(kpis.reviewsCount)}
          compact
          delay={0.2}
          accent="sky"
        />
        <StatCard
          icon={Bell}
          label={t("kpiNotifications")}
          value={String(kpis.unreadNotifications)}
          subValue={t("kpiNotificationsSub")}
          compact
          delay={0.25}
          accent="rose"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onNavigate?.("orders")}
            className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-4 py-2.5 text-sm text-(--dash-ink) transition hover:border-(--dash-gold)"
          >
            <ShoppingBag className="h-4 w-4" />
            {t("ctaOrders")}
          </button>
          {!isGuest ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate?.("measurements")}
                className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-4 py-2.5 text-sm text-(--dash-ink) transition hover:border-(--dash-gold)"
              >
                <Shirt className="h-4 w-4" />
                {t("ctaMeasurements")}
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.("notifications")}
                className="inline-flex items-center gap-2 rounded-xl border border-(--dash-border) bg-(--dash-surface) px-4 py-2.5 text-sm text-(--dash-ink) transition hover:border-(--dash-gold)"
              >
                <Bell className="h-4 w-4" />
                {t("ctaNotifications")}
              </button>
            </>
          ) : null}
        </div>
      </div>

      {setupItems.length > 0 ? (
        <div className="rounded-(--dash-radius) border border-(--dash-border) bg-(--dash-surface) p-5 shadow-sm sm:p-6">
          <h3 className="[font-family:var(--font-display)] text-lg text-(--dash-ink)">
            {t("setupTitle")}
          </h3>
          <p className="mt-1 text-xs text-(--dash-muted)">{t("setupDesc")}</p>
          <ul className="mt-4 space-y-2">
            {setupItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onNavigate?.(item.tab)}
                    className="flex w-full items-center gap-3 rounded-xl border border-(--dash-border) px-3 py-2.5 text-left text-sm text-(--dash-ink) transition hover:bg-(--dash-bg)"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-(--dash-muted)" />
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight className="h-4 w-4 text-(--dash-muted)" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard
          title={t("chartSpend")}
          subtitle={t("chartSpendSub")}
          className="lg:col-span-2"
          delay={0.1}
          accent="ink"
        >
          <div className="h-64">
            <canvas id="customer-spend-chart" />
          </div>
        </ChartCard>
        <ChartCard title={t("chartStatus")} delay={0.15} accent="teal">
          <div className="space-y-3 py-2">
            {(data?.statusBreakdown || []).length === 0 ? (
              <p className="py-10 text-center text-xs text-(--dash-muted)">
                {t("noStatus")}
              </p>
            ) : (
              (data?.statusBreakdown || []).map((row) => (
                <div
                  key={`${row.channel}-${row.status}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="capitalize text-(--dash-ink)">
                    {row.status.replace(/_/g, " ")}
                    <span className="ml-1 text-[10px] uppercase tracking-wide text-(--dash-muted)">
                      {row.channel}
                    </span>
                  </span>
                  <span className="tabular-nums font-medium text-(--dash-ink)">
                    {row.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </ChartCard>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => onNavigate?.("orders")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onNavigate?.("orders");
        }}
        className="cursor-pointer"
      >
        <ActivityFeed
          items={data?.recentOrders || []}
          formatCurrency={formatCurrency}
          title={t("recentActivity")}
          emptyLabel={t("noRecent")}
        />
      </div>
    </div>
  );
}
