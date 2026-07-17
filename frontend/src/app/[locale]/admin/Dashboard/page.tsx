"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api/client";
import {
  ShoppingBag,
  Package,
  Activity,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  BarChart3,
  PieChart,
  Search,
  PackageSearch,
  Loader2,
  Filter,
  RefreshCw,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import Chart from "chart.js/auto";

interface DashboardStats {
  retail: {
    orderCount: number;
    revenue: number;
    growth: number;
  };
  custom: {
    orderCount: number;
    revenue: number;
    growth: number;
  };
  currency: string;
  monthlyData?: Array<{
    month: string;
    retail: number;
    custom: number;
  }>;
  recentOrders?: Array<{
    id: string;
    type: "retail" | "custom";
    amount: number;
    status: "completed" | "pending" | "processing";
    date: string;
  }>;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<"week" | "month" | "year">(
    "month",
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [pricingOrders, setPricingOrders] = useState<any[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingSearch, setPricingSearch] = useState("");

  const revenueChartRef = useRef<Chart | null>(null);
  const ordersChartRef = useRef<Chart | null>(null);
  const distChartRef = useRef<Chart | null>(null);

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
      const tailorFee = order.items.reduce(
        (sum: number, item: any) => sum + (item.pricing?.designBase || 0),
        0,
      );
      const tailoringFee = order.items.reduce(
        (sum: number, item: any) => sum + (item.pricing?.tailoringFee || 0),
        0,
      );
      const fabricFee = order.items.reduce(
        (sum: number, item: any) => sum + (item.pricing?.fabricCost || 0),
        0,
      );
      return { tailorFee, tailoringFee, fabricFee };
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
      if (pricingSearch.trim()) {
        const term = pricingSearch.toLowerCase();
        const customerName = readPartnerName(
          order.userId && typeof order.userId === "object"
            ? order.userId
            : null,
          "",
        ).toLowerCase();
        const customerEmail = (
          order.userId &&
          typeof order.userId === "object" &&
          (order.userId as any).email
            ? (order.userId as any).email
            : ""
        ).toLowerCase();
        const orderIdHex = order._id.toLowerCase();
        return (
          customerName.includes(term) ||
          customerEmail.includes(term) ||
          orderIdHex.includes(term)
        );
      }
      return true;
    });
  }, [pricingOrders, pricingSearch]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: stats?.currency || "AED",
      minimumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    if (!stats) return;

    const currency = stats.currency || "AED";

    // Apex Shadcn color palette - modern gradients
    const primary = "#6366F1"; // Indigo
    const primaryLight = "rgba(99, 102, 241, 0.15)";
    const primaryGradient = "rgba(99, 102, 241, 0.35)";
    const secondary = "#EC4899"; // Pink
    const secondaryLight = "rgba(236, 72, 153, 0.15)";
    const secondaryGradient = "rgba(236, 72, 153, 0.35)";
    const accent = "#14B8A6"; // Teal
    const accentLight = "rgba(20, 184, 166, 0.15)";
    const black = "#0F172A";
    const white = "#FFFFFF";
    const gray = "#64748B";
    const border = "#E2E8F0";

    const formatCurrencyWith = (value: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: 0,
      }).format(value);
    };

    if (revenueChartRef.current) {
      revenueChartRef.current.destroy();
      revenueChartRef.current = null;
    }
    if (ordersChartRef.current) {
      ordersChartRef.current.destroy();
      ordersChartRef.current = null;
    }
    if (distChartRef.current) {
      distChartRef.current.destroy();
      distChartRef.current = null;
    }

    const revenueCanvas = document.getElementById(
      "revenue-chart",
    ) as HTMLCanvasElement | null;
    const ordersCanvas = document.getElementById(
      "orders-chart",
    ) as HTMLCanvasElement | null;
    const distCanvas = document.getElementById(
      "distribution-chart",
    ) as HTMLCanvasElement | null;

    if (!revenueCanvas || !ordersCanvas || !distCanvas) return;

    const monthlyData = stats.monthlyData || [];
    const hasData = monthlyData.length > 0;

    const labels = hasData
      ? monthlyData.map((d) => d.month)
      : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];

    const retailData = hasData
      ? monthlyData.map((d) => d.retail || 0)
      : [0, 0, 0, 0, 0, 0];

    const customData = hasData
      ? monthlyData.map((d) => d.custom || 0)
      : [0, 0, 0, 0, 0, 0];

    // REVENUE CHART
    revenueChartRef.current = new Chart(revenueCanvas, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Retail Revenue",
            data: retailData,
            borderColor: primary,
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return "transparent";
              const gradient = canvasCtx.createLinearGradient(
                0,
                chartArea.top,
                0,
                chartArea.bottom,
              );
              gradient.addColorStop(0, "rgba(99, 102, 241, 0.4)");
              gradient.addColorStop(0.3, "rgba(99, 102, 241, 0.15)");
              gradient.addColorStop(1, "rgba(99, 102, 241, 0)");
              return gradient;
            },
            borderWidth: 3,
            tension: 0.4,
            pointRadius: 4,
            pointHoverRadius: 8,
            pointBackgroundColor: white,
            pointBorderColor: primary,
            pointBorderWidth: 3,
            fill: true,
          },
          {
            label: "Custom Revenue",
            data: customData,
            borderColor: secondary,
            backgroundColor: (ctx) => {
              const chart = ctx.chart;
              const { ctx: canvasCtx, chartArea } = chart;
              if (!chartArea) return "transparent";
              const gradient = canvasCtx.createLinearGradient(
                0,
                chartArea.top,
                0,
                chartArea.bottom,
              );
              gradient.addColorStop(0, "rgba(236, 72, 153, 0.35)");
              gradient.addColorStop(0.3, "rgba(236, 72, 153, 0.12)");
              gradient.addColorStop(1, "rgba(236, 72, 153, 0)");
              return gradient;
            },
            borderWidth: 2.5,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 7,
            pointBackgroundColor: white,
            pointBorderColor: secondary,
            pointBorderWidth: 3,
            fill: true,
            borderDash: [6, 4],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: "easeOutQuart" },
        interaction: {
          intersect: false,
          mode: "index",
        },
        plugins: {
          legend: {
            position: "top",
            labels: {
              usePointStyle: true,
              pointStyle: "circle",
              padding: 20,
              font: { family: "inherit", size: 12, weight: 500 },
              color: gray,
            },
          },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            titleColor: black,
            bodyColor: black,
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const val = Number(ctx.parsed.y);
                return `${ctx.dataset.label}: ${formatCurrencyWith(val)}`;
              },
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              color: gray,
              font: { family: "inherit", size: 11 },
              maxRotation: 45,
              autoSkip: true,
              maxTicksLimit: 12,
            },
            border: { color: border },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: gray,
              font: { family: "inherit", size: 11 },
              callback: (val) => {
                const num = Number(val);
                if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                return num;
              },
            },
            grid: { color: "rgba(15, 23, 42, 0.06)" },
            border: { color: border },
          },
        },
      },
    });

    // ORDERS CHART
    ordersChartRef.current = new Chart(ordersCanvas, {
      type: "bar",
      data: {
        labels: ["Retail", "Custom"],
        datasets: [
          {
            label: "Orders",
            data: [stats.retail.orderCount, stats.custom.orderCount],
            backgroundColor: [
              "rgba(99, 102, 241, 0.8)",
              "rgba(236, 72, 153, 0.8)",
            ],
            borderColor: [primary, secondary],
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: [
              "rgba(99, 102, 241, 1)",
              "rgba(236, 72, 153, 1)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            titleColor: black,
            bodyColor: black,
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (ctx) => {
                const y = ctx.parsed?.y;
                const orders =
                  typeof y === "number"
                    ? y
                    : typeof ctx.raw === "number"
                      ? ctx.raw
                      : Number(ctx.raw);
                return ` ${orders.toLocaleString()} orders`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: gray,
              font: { family: "inherit", weight: 500, size: 12 },
            },
            grid: { display: false },
            border: { color: border },
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: gray,
              font: { family: "inherit", size: 11 },
              stepSize: Math.max(
                1,
                Math.ceil(
                  (stats.retail.orderCount + stats.custom.orderCount) / 10,
                ),
              ),
            },
            grid: { color: "rgba(15, 23, 42, 0.06)" },
            border: { color: border },
          },
        },
      },
    });

    // DISTRIBUTION CHART
    distChartRef.current = new Chart(distCanvas, {
      type: "doughnut",
      data: {
        labels: ["Retail", "Custom"],
        datasets: [
          {
            data: [stats.retail.orderCount, stats.custom.orderCount],
            backgroundColor: [
              "rgba(99, 102, 241, 0.85)",
              "rgba(236, 72, 153, 0.85)",
            ],
            borderColor: [white, white],
            borderWidth: 3,
            hoverBackgroundColor: [
              "rgba(99, 102, 241, 1)",
              "rgba(236, 72, 153, 1)",
            ],
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "65%",
        animation: { duration: 800, easing: "easeOutQuart" },
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: "circle",
              font: { family: "inherit", size: 12, weight: 500 },
              color: "#1E293B",
            },
          },
          tooltip: {
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            titleColor: black,
            bodyColor: black,
            borderColor: "rgba(226, 232, 240, 0.8)",
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (ctx) => {
                const total = (ctx.dataset.data as number[]).reduce(
                  (a, b) => a + b,
                  0,
                );
                const parsed =
                  typeof ctx.parsed === "number"
                    ? ctx.parsed
                    : Number(ctx.parsed);
                const percentage =
                  total > 0 ? ((parsed / total) * 100).toFixed(1) : "0.0";
                return ` ${ctx.label}: ${parsed} orders (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (revenueChartRef.current) {
        revenueChartRef.current.destroy();
        revenueChartRef.current = null;
      }
      if (ordersChartRef.current) {
        ordersChartRef.current.destroy();
        ordersChartRef.current = null;
      }
      if (distChartRef.current) {
        distChartRef.current.destroy();
        distChartRef.current = null;
      }
    };
  }, [stats]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse mt-4 sm:mt-0" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-32"
            >
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
              <div className="h-9 w-32 bg-gray-200 rounded mt-3 animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 rounded mt-2 animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-80"
            >
              <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-4" />
              <div className="h-60 w-full bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="font-normal text-xl text-black">
            Unable to load dashboard
          </p>
          <p className="text-gray-500 mt-2 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition text-sm"
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
  const retailGrowth = retail.growth ?? 0;
  const customGrowth = custom.growth ?? 0;
  const avgGrowth = (retailGrowth + customGrowth) / 2;

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subValue,
    trend,
    trendUp,
  }: any) => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl sm:text-3xl font-light text-black mt-2 truncate">
            {value}
          </p>
          {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
        </div>
        <div
          className={`p-3 rounded-xl shrink-0 ${
            trendUp ? "bg-emerald-50" : "bg-rose-50"
          }`}
        >
          <Icon
            className={`w-5 h-5 ${trendUp ? "text-emerald-600" : "text-rose-600"}`}
            strokeWidth={1.5}
          />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1.5 mt-3">
          <span
            className={`text-xs font-medium ${
              trendUp ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {trend}
          </span>
          {trendUp ? (
            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
          ) : (
            <ArrowDownRight className="w-3 h-3 text-rose-600" />
          )}
          <span className="text-xs text-gray-400 ml-1">vs last month</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-black tracking-tight">
            Dashboard
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Welcome back,{" "}
            <span className="text-black font-medium">
              {user?.name?.split(" ")[0] || "Admin"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-white rounded-full border border-gray-200 p-1 shadow-sm">
            {["week", "month", "year"].map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t as any)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  timeframe === t
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-black hover:bg-gray-50"
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchStats(true)}
            disabled={isRefreshing}
            className="p-2 rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 text-gray-500 ${
                isRefreshing ? "animate-spin" : ""
              }`}
            />
          </button>
          <LocaleSwitcher />
          <div className="text-xs text-gray-400 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm hidden md:flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={ShoppingBag}
          label="Total Orders"
          value={totalOrders.toLocaleString()}
          subValue={`${
            totalOrders > 0
              ? ((retail.orderCount / totalOrders) * 100).toFixed(0)
              : 0
          }% retail`}
          trend="+12.5%"
          trendUp
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          subValue={`${
            totalRevenue > 0
              ? ((retail.revenue / totalRevenue) * 100).toFixed(0)
              : 0
          }% from retail`}
          trend="+8.3%"
          trendUp
        />
        <StatCard
          icon={Package}
          label="Retail Orders"
          value={retail.orderCount.toLocaleString()}
          subValue={formatCurrency(retail.revenue)}
          trend={`${retailGrowth > 0 ? "+" : ""}${retailGrowth.toFixed(1)}%`}
          trendUp={retailGrowth > 0}
        />
        <StatCard
          icon={Users}
          label="Custom Orders"
          value={custom.orderCount.toLocaleString()}
          subValue={formatCurrency(custom.revenue)}
          trend={`${customGrowth > 0 ? "+" : ""}${customGrowth.toFixed(1)}%`}
          trendUp={customGrowth > 0}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-linear-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 text-white">
          <p className="text-xs opacity-80 font-medium">Avg Order Value</p>
          <p className="text-2xl font-light mt-1">
            {formatCurrency(totalOrders > 0 ? totalRevenue / totalOrders : 0)}
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 font-medium">Growth Rate</p>
          <p className="text-2xl font-light mt-1 text-black">
            {avgGrowth.toFixed(1)}%
          </p>
          <p className="text-xs text-emerald-600 mt-1">↑ 2.4% this week</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 font-medium">Conversion</p>
          <p className="text-2xl font-light mt-1 text-black">24.6%</p>
          <p className="text-xs text-emerald-600 mt-1">↑ 1.2%</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-xs text-gray-400 font-medium">Active Users</p>
          <p className="text-2xl font-light mt-1 text-black">1,284</p>
          <p className="text-xs text-emerald-600 mt-1">+43 today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp
                className="w-4 h-4 text-indigo-600"
                strokeWidth={1.5}
              />
              <h3 className="text-sm font-medium text-black uppercase tracking-wider">
                Revenue
              </h3>
            </div>
            <button className="text-xs text-gray-400 hover:text-black transition p-1.5 hover:bg-gray-50 rounded">
              <Filter className="w-4 h-4" />
            </button>
          </div>
          <div className="relative h-56 sm:h-64 lg:h-60 xl:h-64 2xl:h-72 overflow-hidden">
            <canvas id="revenue-chart" />
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-pink-600" strokeWidth={1.5} />
              <h3 className="text-sm font-medium text-black uppercase tracking-wider">
                Orders
              </h3>
            </div>
          </div>
          <div className="relative h-56 sm:h-64 lg:h-60 xl:h-64 2xl:h-72 overflow-hidden">
            <canvas id="orders-chart" />
          </div>
        </div>

        <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-5">
            <PieChart className="w-4 h-4 text-teal-600" strokeWidth={1.5} />
            <h3 className="text-sm font-medium text-black uppercase tracking-wider">
              Distribution
            </h3>
          </div>
          <div className="relative h-56 sm:h-64 lg:h-60 xl:h-64 2xl:h-72 overflow-hidden">
            <canvas id="distribution-chart" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Clock className="w-4 h-4 text-indigo-600" strokeWidth={1.5} />
          <h3 className="text-sm font-medium text-black uppercase tracking-wider">
            Recent Activity
          </h3>
        </div>
        <div className="space-y-4">
          {(stats.recentOrders || []).slice(0, 5).map((order, i) => (
            <div key={i} className="flex gap-4">
              <div className="relative flex flex-col items-center">
                <div
                  className={`w-2 h-2 rounded-full ${
                    order.status === "completed"
                      ? "bg-emerald-500"
                      : order.status === "processing"
                        ? "bg-amber-500"
                        : "bg-gray-300"
                  } mt-1.5`}
                />
                {i < 4 && <div className="w-px h-full bg-gray-200 mt-2" />}
              </div>
              <div className="pb-4">
                <p className="text-sm text-black">
                  {order.type === "retail" ? "Retail order" : "Custom order"}
                  <span className="font-mono text-gray-400 ml-1.5">
                    #{order.id}
                  </span>
                  <span
                    className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                      order.status === "completed"
                        ? "bg-emerald-50 text-emerald-700"
                        : order.status === "processing"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-gray-50 text-gray-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatCurrency(order.amount)} · {order.date}
                </p>
              </div>
            </div>
          ))}
          <button className="w-full mt-2 text-center text-xs text-gray-400 hover:text-black transition py-2 border-t border-gray-100">
            View all activity →
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 p-6 mt-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-sm font-medium text-black uppercase tracking-wider flex items-center gap-2">
              <DollarSign
                className="w-4 h-4 text-indigo-600"
                strokeWidth={1.5}
              />
              Pricing & Fees
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Consolidated breakdown of tailor fees, tailoring fees, and fabric
              costs per order.
            </p>
          </div>
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search customer or order..."
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500 text-black bg-white transition"
            />
          </div>
        </div>

        {pricingLoading && pricingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
            <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">
              Loading data...
            </p>
          </div>
        ) : filteredPricingOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <PackageSearch
              className="w-12 h-12 text-gray-300 mb-3"
              strokeWidth={1}
            />
            <p className="text-xs text-gray-400">
              No orders found matching filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-gray-500">
              <thead className="bg-gray-50/70 text-[9px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Tailor Fee</th>
                  <th className="px-4 py-3">Tailoring Fee</th>
                  <th className="px-4 py-3">Fabric Fee</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPricingOrders.map((order: any) => {
                  const customerName = readPartnerName(
                    typeof order.userId === "object" ? order.userId : null,
                    "Unknown Customer",
                  );
                  const { tailorFee, tailoringFee, fabricFee } =
                    getOrderFees(order);
                  const orderTotal = tailorFee + tailoringFee + fabricFee;

                  return (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-medium text-black text-2xs">
                        #{order._id.slice(-8).toUpperCase()}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-black block">
                          {customerName}
                        </span>
                        {order.userId &&
                          typeof order.userId === "object" &&
                          (order.userId as any).email && (
                            <span className="text-3xs text-gray-400 block">
                              {(order.userId as any).email}
                            </span>
                          )}
                      </td>
                      <td className="px-4 py-3 text-2xs">
                        {formatOrderDateLocal(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-black">
                        {formatCurrency(tailorFee)}
                      </td>
                      <td className="px-4 py-3 text-black">
                        {formatCurrency(tailoringFee)}
                      </td>
                      <td className="px-4 py-3 text-black">
                        {formatCurrency(fabricFee)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-black">
                        {formatCurrency(orderTotal)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-3xs font-medium bg-gray-100 text-gray-700 capitalize">
                          {order.status.replace(/_/g, " ")}
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
