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
  Scissors,
  Wallet,
  Truck,
  ChevronDown,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import LocaleSwitcher from "@/components/shared/LocaleSwitcher";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import StatCard from "@/components/dashboard/StatCard";
import ChartCard from "@/components/dashboard/ChartCard";
import TimeframePills from "@/components/dashboard/TimeframePills";
import RankList from "@/components/dashboard/RankList";
import DashboardSkeleton from "@/components/dashboard/DashboardSkeleton";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { DASH_PALETTE, withAlpha } from "@/components/dashboard/palette";
import {
  chartTooltip,
  chartLegend,
  chartGridColor,
  formatCompact,
} from "@/components/dashboard/chartDefaults";
import { splitFabricCommission } from "@/lib/fabricCommission";

/** Courier partner — fixed platform shipping company. */
const SHIPPING_COMPANY_NAME = "SHIPAA";
const PARTNER_PAYOUT_STORAGE_KEY = "motd-admin-partner-payouts";

type PartnerPayoutKind = "tailor" | "fabric" | "shipping";

interface PartnerPayoutRelease {
  paid: number;
  releasedAt?: string;
}

interface PartnerShareBreakdown {
  gross: number;
  commission: number;
  net: number;
  percent: number;
  customGross?: number;
  retailGross?: number;
}

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
  partnerShares?: {
    tailor: PartnerShareBreakdown;
    fabricStore: PartnerShareBreakdown;
    shipping?: {
      gross: number;
      net: number;
      customGross?: number;
      retailGross?: number;
    };
    motdKeeps: number;
    motdEarnings?: number;
  };
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
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [partnerPayoutReleases, setPartnerPayoutReleases] = useState<
    Record<string, PartnerPayoutRelease>
  >({});

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
        const [customData, retailData] = await Promise.all([
          api.get<any>("/api/admin/orders/custom"),
          api.get<any>("/api/admin/orders/retail?limit=100"),
        ]);
        const customItems = (
          Array.isArray(customData) ? customData : customData.items || []
        ).map((order: any) => ({
          ...order,
          channel: "custom" as const,
        }));
        const retailItems = (
          Array.isArray(retailData)
            ? retailData
            : retailData.items || []
        ).map((order: any) => ({
          ...order,
          channel: "retail" as const,
        }));
        const merged = [...customItems, ...retailItems].sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
        setPricingOrders(merged);
      } catch (err) {
        console.error("Pricing fetch error:", err);
      } finally {
        setPricingLoading(false);
      }
    };
    fetchPricingOrders();
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PARTNER_PAYOUT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") setPartnerPayoutReleases(parsed);
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  const formatPickupAddress = (addr: any) => {
    if (!addr || typeof addr !== "object") return "";
    return [
      addr.fullName,
      addr.phone,
      addr.line1,
      addr.line2,
      addr.city,
      addr.emirate,
    ]
      .map((part) => String(part || "").trim())
      .filter(Boolean)
      .join(" · ");
  };

  const isRetailOrder = (order: any) =>
    order?.channel === "retail" ||
    order?.orderType === "retail" ||
    Array.isArray(order?.orderItems);

  const getOrderFees = (order: any) => {
    if (isRetailOrder(order)) {
      const fabricFee = (order.orderItems || []).reduce(
        (sum: number, item: any) =>
          sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
        0,
      );
      return {
        tailorFee: 0,
        tailoringFee: 0,
        fabricFee,
        shippingFee: Number(order.shippingPrice) || 0,
      };
    }
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
        shippingFee: Number(order.pricing?.deliveryFee) || 0,
      };
    }
    return {
      tailorFee: order.pricing?.designBase || 0,
      tailoringFee: order.pricing?.tailoringFee || 0,
      fabricFee: order.pricing?.fabricCost || 0,
      shippingFee: Number(order.pricing?.deliveryFee) || 0,
    };
  };

  const tailorCommissionPercent =
    stats?.partnerShares?.tailor.percent ?? 12;
  const fabricCommissionPercent =
    stats?.partnerShares?.fabricStore.percent ?? 15;

  const getOrderShares = (order: any) => {
    const fees = getOrderFees(order);
    const tailorGross = fees.tailorFee + fees.tailoringFee;
    const tailor = splitFabricCommission(
      tailorGross,
      tailorCommissionPercent,
    );
    const fabric = splitFabricCommission(
      fees.fabricFee,
      fabricCommissionPercent,
    );
    const shipping = {
      gross: fees.shippingFee,
      net: fees.shippingFee,
      commission: 0,
      percent: 0,
    };
    const motdEarns = Number(
      (tailor.commission + fabric.commission).toFixed(2),
    );
    return { fees, tailorGross, tailor, fabric, shipping, motdEarns };
  };

  const readPartnerName = (value: any, fallback: string) => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    return value.name || fallback;
  };

  const readPartnerId = (value: any) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    return String(value._id || value.id || "").trim();
  };

  const getOrderPayees = (order: any) => {
    const shares = getOrderShares(order);

    const firstObject = (...values: any[]) =>
      values.find((v) => v && typeof v === "object") || null;

    const tailorShop = firstObject(
      order.tailorShopId,
      ...(order.items || []).map((item: any) => item.tailorShopId),
    );
    const tailorOwner =
      tailorShop?.ownerId && typeof tailorShop.ownerId === "object"
        ? tailorShop.ownerId
        : null;
    const retailFabricShops = [
      ...(Array.isArray(order.fabricStores) ? order.fabricStores : []),
      ...(order.orderItems || []).map(
        (item: any) => item.productId?.fabricShopId,
      ),
    ].filter((shop: any) => shop && typeof shop === "object");

    const fabricStore = firstObject(
      order.fabricStoreId,
      ...(order.items || []).map((item: any) => item.fabricStoreId),
      ...retailFabricShops,
    );

    const shopNames = (key: "tailorShopId" | "fabricStoreId") =>
      [
        readPartnerName(
          typeof order[key] === "object" ? order[key] : null,
          "",
        ),
        ...(order.items || []).map((item: any) =>
          readPartnerName(
            typeof item[key] === "object" ? item[key] : null,
            "",
          ),
        ),
      ].filter(Boolean);

    const itemDesigns = (order.items || [])
      .map((item: any) => item.designSnapshot?.name)
      .filter(Boolean);
    const itemFabrics = (order.items || [])
      .map((item: any) => item.fabricSnapshot?.name)
      .filter(Boolean);
    const retailProductNames = (order.orderItems || [])
      .map((item: any) => item.name)
      .filter(Boolean);

    const tailorShopName =
      [...new Set(shopNames("tailorShopId"))].join(", ") ||
      tailorShop?.name ||
      (isRetailOrder(order) ? "—" : "Tailor shop not set");
    const retailFabricShopNames = retailFabricShops
      .map((shop: any) => shop.shopName || shop.name)
      .filter(Boolean);

    const fabricShopName =
      [...new Set([...shopNames("fabricStoreId"), ...retailFabricShopNames])].join(
        ", ",
      ) ||
      fabricStore?.shopName ||
      fabricStore?.name ||
      (isRetailOrder(order) ? "Fabric store not set" : "Fabric store not set");

    const parcelCount =
      Number(order.pricing?.parcelCount || order.parcelCount) || 0;
    const deliveryLines = Array.isArray(order.pricing?.deliveryBreakdown)
      ? order.pricing.deliveryBreakdown
      : Array.isArray(order.deliveryBreakdown)
        ? order.deliveryBreakdown
        : [];

    return {
      shares,
      channel: isRetailOrder(order) ? "retail" : "custom",
      tailor: {
        id:
          readPartnerId(tailorShop) ||
          readPartnerId(order.tailorShopId) ||
          "",
        shopName: tailorShopName,
        payeeName:
          tailorOwner?.name || tailorShop?.name || tailorShopName,
        phone: tailorShop?.phone || tailorOwner?.phone || "",
        email: tailorOwner?.email || "",
        city: tailorShop?.city || "",
        location: tailorShop?.location || "",
        pickup: formatPickupAddress(tailorShop?.pickupAddress),
        designs:
          [...new Set(itemDesigns)].join(", ") ||
          order.designSnapshot?.name ||
          "",
      },
      fabric: {
        id:
          readPartnerId(fabricStore?.shopId) ||
          readPartnerId(fabricStore) ||
          readPartnerId(order.fabricStoreId) ||
          "",
        shopName: fabricShopName,
        payeeName:
          fabricStore?.ownerName ||
          fabricStore?.shopName ||
          fabricStore?.name ||
          fabricShopName,
        phone: fabricStore?.phone || fabricStore?.ownerPhone || "",
        email: fabricStore?.ownerEmail || fabricStore?.email || "",
        city: fabricStore?.city || "",
        location: fabricStore?.location || "",
        pickup: formatPickupAddress(fabricStore?.pickupAddress),
        fabrics:
          [...new Set([...itemFabrics, ...retailProductNames])].join(", ") ||
          order.fabricSnapshot?.name ||
          "",
      },
      shipping: {
        id: "shipaa",
        payeeName: SHIPPING_COMPANY_NAME,
        companyName: SHIPPING_COMPANY_NAME,
        parcelCount,
        deliveryLines,
        label:
          parcelCount > 0
            ? `${parcelCount} parcel${parcelCount === 1 ? "" : "s"}`
            : deliveryLines.length > 0
              ? `${deliveryLines.length} delivery leg${deliveryLines.length === 1 ? "" : "s"}`
              : "Courier delivery",
      },
    };
  };

  const filteredPricingOrders = useMemo(() => {
    return pricingOrders.filter((order) => {
      if (!pricingSearch.trim()) return true;
      const term = pricingSearch.toLowerCase();
      const payees = getOrderPayees(order);
      return (
        payees.tailor.shopName.toLowerCase().includes(term) ||
        payees.tailor.payeeName.toLowerCase().includes(term) ||
        payees.fabric.shopName.toLowerCase().includes(term) ||
        payees.fabric.payeeName.toLowerCase().includes(term) ||
        payees.shipping.companyName.toLowerCase().includes(term) ||
        order._id.toLowerCase().includes(term)
      );
    });
  }, [pricingOrders, pricingSearch, tailorCommissionPercent, fabricCommissionPercent]);

  const partnerPayoutRows = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        kind: PartnerPayoutKind;
        name: string;
        payeeName: string;
        contact: string;
        orderCount: number;
        due: number;
        ids: Set<string>;
      }
    >();

    const normalizePartnerLabel = (value: string) =>
      String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
        .trim()
        .replace(/\s+/g, " ");

    const isPlaceholderName = (value: string) => {
      const norm = normalizePartnerLabel(value);
      return (
        !norm ||
        norm === "-" ||
        norm === "tailor shop not set" ||
        norm === "fabric store not set"
      );
    };

    const bump = (
      kind: PartnerPayoutKind,
      id: string,
      name: string,
      payeeName: string,
      contact: string,
      amount: number,
    ) => {
      if (amount <= 0) return;
      const displayName = name || payeeName;
      const nameNorm = normalizePartnerLabel(displayName);
      const payeeNorm = normalizePartnerLabel(payeeName);
      const placeholder = isPlaceholderName(displayName);

      let existing:
        | {
            key: string;
            kind: PartnerPayoutKind;
            name: string;
            payeeName: string;
            contact: string;
            orderCount: number;
            due: number;
            ids: Set<string>;
          }
        | undefined;

      for (const row of map.values()) {
        if (row.kind !== kind) continue;
        if (id && row.ids.has(id)) {
          existing = row;
          break;
        }
        if (placeholder) continue;
        const rowNameNorm = normalizePartnerLabel(row.name);
        const rowPayeeNorm = normalizePartnerLabel(row.payeeName);
        if (
          (nameNorm &&
            (rowNameNorm === nameNorm || rowPayeeNorm === nameNorm)) ||
          (payeeNorm &&
            (rowNameNorm === payeeNorm || rowPayeeNorm === payeeNorm))
        ) {
          existing = row;
          break;
        }
      }

      if (existing) {
        existing.due += amount;
        existing.orderCount += 1;
        if (id) existing.ids.add(id);
        if (contact && !existing.contact) existing.contact = contact;
        if (!isPlaceholderName(name) && name.length >= existing.name.length) {
          existing.name = name;
        }
        if (payeeName && payeeName !== existing.name && !existing.payeeName) {
          existing.payeeName = payeeName;
        }
        return;
      }

      const key =
        kind === "shipping"
          ? `${kind}:shipaa`
          : !placeholder && nameNorm
            ? `${kind}:name:${nameNorm}`
            : `${kind}:${id || `unknown-${map.size}`}`;

      map.set(key, {
        key,
        kind,
        name: displayName,
        payeeName,
        contact,
        orderCount: 1,
        due: amount,
        ids: new Set(id ? [id] : []),
      });
    };

    for (const order of pricingOrders) {
      const payees = getOrderPayees(order);
      bump(
        "tailor",
        payees.tailor.id,
        payees.tailor.shopName,
        payees.tailor.payeeName,
        payees.tailor.phone,
        payees.shares.tailor.net,
      );
      bump(
        "fabric",
        payees.fabric.id,
        payees.fabric.shopName,
        payees.fabric.payeeName,
        payees.fabric.phone,
        payees.shares.fabric.net,
      );
      bump(
        "shipping",
        payees.shipping.id,
        payees.shipping.companyName,
        payees.shipping.payeeName,
        SHIPPING_COMPANY_NAME,
        payees.shares.shipping.net,
      );
    }

    const kindOrder: Record<PartnerPayoutKind, number> = {
      tailor: 0,
      fabric: 1,
      shipping: 2,
    };

    return Array.from(map.values())
      .map((row) => {
        const paidKeys = new Set<string>([
          row.key,
          `${row.kind}:${row.name}`,
          ...Array.from(row.ids).map((id) => `${row.kind}:${id}`),
        ]);
        const paid = Array.from(paidKeys).reduce((sum, key) => {
          return sum + (Number(partnerPayoutReleases[key]?.paid) || 0);
        }, 0);
        const remaining = Math.max(0, Number((row.due - paid).toFixed(2)));
        return {
          ...row,
          due: Number(row.due.toFixed(2)),
          paid: Number(Math.min(paid, row.due).toFixed(2)),
          remaining,
          releasedAt: partnerPayoutReleases[row.key]?.releasedAt,
        };
      })
      .sort(
        (a, b) =>
          kindOrder[a.kind] - kindOrder[b.kind] ||
          b.remaining - a.remaining ||
          a.name.localeCompare(b.name),
      );
  }, [
    pricingOrders,
    partnerPayoutReleases,
    tailorCommissionPercent,
    fabricCommissionPercent,
  ]);

  const partnerKindLabel = (kind: PartnerPayoutKind) =>
    kind === "tailor"
      ? "Tailor"
      : kind === "fabric"
        ? "Fabric store"
        : "Shipping company";

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

  const formatShippingLegLine = (line: any) => {
    const from = String(line?.from?.label || "").trim();
    const to = String(line?.to?.label || "").trim();
    let title = String(line?.label || line?.type || "").trim();
    if (/^delivery to you$/i.test(title)) title = "Delivery to customer";

    const route = from && to ? `${from} → ${to}` : from || to;
    const feeText = formatKpiCurrency(Number(line?.fee) || 0);

    if (title && route) {
      const titleNorm = title.toLowerCase().replace(/\s+/g, " ");
      const routeNorm = route.toLowerCase().replace(/\s+/g, " ");
      if (titleNorm === routeNorm) return `${route}: ${feeText}`;
      return `${title} · from ${route}: ${feeText}`;
    }
    if (title) return `${title}: ${feeText}`;
    if (route) return `${route}: ${feeText}`;
    return `Delivery leg: ${feeText}`;
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
  const partnerShares = stats.partnerShares;
  const tailorShareNet = partnerShares?.tailor.net ?? 0;
  const fabricShareNet = partnerShares?.fabricStore.net ?? 0;
  const shippingShareNet = partnerShares?.shipping?.net ?? 0;
  const motdKeeps =
    partnerShares?.motdEarnings ?? partnerShares?.motdKeeps ?? 0;

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

      {/* Who gets paid — full width payout workspace */}
      <div className="rounded-[var(--dash-radius)] border border-[var(--dash-border)] bg-[var(--dash-surface)] p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="[font-family:var(--font-display)] text-lg text-[var(--dash-ink)]">
              Per-order money split
            </h3>
            <p className="mt-1 max-w-2xl text-xs text-[var(--dash-muted)]">
              Review how each order splits between MOTD, the tailor, fabric
              store, and SHIPAA. Payments are sent collectively — totals are at
              the bottom.
            </p>
          </div>
          <div className="relative w-full max-w-xs shrink-0">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--dash-muted)]" />
            <input
              type="text"
              placeholder="Search order, tailor, fabric store..."
              value={pricingSearch}
              onChange={(e) => setPricingSearch(e.target.value)}
              className="w-full rounded-xl border border-[var(--dash-border)] bg-white py-1.5 pl-9 pr-3 text-xs text-[var(--dash-ink)] outline-none transition focus:border-[var(--dash-gold)]"
            />
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
              <Wallet className="h-3.5 w-3.5" />
              MOTD earnings
            </div>
            <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
              {formatKpiCurrency(motdKeeps)}
            </p>
            <p className="mt-1 text-xs text-[var(--dash-muted)]">
              Commission from tailor + fabric shares
            </p>
          </div>
          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
              <Scissors className="h-3.5 w-3.5" />
              Send to Tailors
            </div>
            <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
              {formatKpiCurrency(tailorShareNet)}
            </p>
            <p className="mt-1 text-xs text-[var(--dash-muted)]">
              After {partnerShares?.tailor.percent ?? tailorCommissionPercent}%
              MOTD · Gross {formatKpiCurrency(partnerShares?.tailor.gross ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
              <Store className="h-3.5 w-3.5" />
              Send to Fabric Stores
            </div>
            <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
              {formatKpiCurrency(fabricShareNet)}
            </p>
            <p className="mt-1 text-xs text-[var(--dash-muted)]">
              After {partnerShares?.fabricStore.percent ?? fabricCommissionPercent}%
              MOTD · Gross{" "}
              {formatKpiCurrency(partnerShares?.fabricStore.gross ?? 0)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
              <Truck className="h-3.5 w-3.5" />
              Send to {SHIPPING_COMPANY_NAME}
            </div>
            <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
              {formatKpiCurrency(shippingShareNet)}
            </p>
            <p className="mt-1 text-xs text-[var(--dash-muted)]">
              Full delivery fees (custom + retail)
            </p>
          </div>
        </div>

        {pricingLoading && pricingOrders.length === 0 ? (
          <TableSkeleton rows={5} cols={4} className="rounded-xl border-0" />
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
          <div className="space-y-3">
            {filteredPricingOrders.slice(0, 30).map((order) => {
              const payees = getOrderPayees(order);
              const expanded = expandedOrderId === order._id;

              return (
                <div
                  key={`${payees.channel}-${order._id}`}
                  className="rounded-xl border border-[var(--dash-border)] bg-white"
                >
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--dash-ink)]">
                        Order #{order._id.slice(-6)}
                        <span className="ml-2 rounded-md bg-[var(--dash-bg)] px-2 py-0.5 text-[10px] font-normal capitalize text-[var(--dash-ink)]">
                          {payees.channel}
                        </span>
                      </p>
                      <p className="mt-2 text-[11px] text-[var(--dash-ink)]">
                        <span className="text-[var(--dash-muted)]">Tailor:</span>{" "}
                        {payees.tailor.shopName}
                        <span className="mx-1.5 text-[var(--dash-muted)]">·</span>
                        <span className="text-[var(--dash-muted)]">
                          Fabric store:
                        </span>{" "}
                        {payees.fabric.shopName}
                        <span className="mx-1.5 text-[var(--dash-muted)]">·</span>
                        <span className="text-[var(--dash-muted)]">
                          Shipping:
                        </span>{" "}
                        {payees.shipping.companyName}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedOrderId(expanded ? null : order._id)
                      }
                      aria-expanded={expanded}
                      className="inline-flex shrink-0 items-center gap-1.5 text-xs text-[var(--dash-muted)] transition hover:text-[var(--dash-ink)]"
                    >
                      {expanded ? "Hide share breakdown" : "View share breakdown"}
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {expanded && (
                    <>
                      {/* Per-order money split */}
                      <div className="grid grid-cols-2 gap-2 border-t border-[var(--dash-border)] p-4 lg:grid-cols-4">
                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--dash-muted)]">
                            <Wallet className="h-3 w-3" />
                            You earn
                          </p>
                          <p className="mt-1 text-sm font-medium text-[var(--dash-ink)]">
                            MOTD
                          </p>
                          <p className="mt-1 text-lg font-medium text-[var(--dash-ink)]">
                            {formatCurrency(payees.shares.motdEarns)}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--dash-muted)]">
                            Commission kept
                          </p>
                        </div>
                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--dash-muted)]">
                            <Scissors className="h-3 w-3" />
                            Tailor share
                          </p>
                          <p
                            className="mt-1 truncate text-sm font-medium text-[var(--dash-ink)]"
                            title={payees.tailor.shopName}
                          >
                            {payees.tailor.shopName}
                          </p>
                          <p className="mt-1 text-lg font-medium text-[var(--dash-ink)]">
                            {formatCurrency(payees.shares.tailor.net)}
                          </p>
                          {payees.tailor.payeeName !==
                            payees.tailor.shopName && (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--dash-muted)]">
                              {payees.tailor.payeeName}
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--dash-muted)]">
                            <Store className="h-3 w-3" />
                            Fabric store share
                          </p>
                          <p
                            className="mt-1 truncate text-sm font-medium text-[var(--dash-ink)]"
                            title={payees.fabric.shopName}
                          >
                            {payees.fabric.shopName}
                          </p>
                          <p className="mt-1 text-lg font-medium text-[var(--dash-ink)]">
                            {formatCurrency(payees.shares.fabric.net)}
                          </p>
                          {payees.fabric.payeeName !==
                            payees.fabric.shopName && (
                            <p className="mt-0.5 truncate text-[10px] text-[var(--dash-muted)]">
                              {payees.fabric.payeeName}
                            </p>
                          )}
                        </div>
                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3">
                          <p className="flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-[var(--dash-muted)]">
                            <Truck className="h-3 w-3" />
                            Shipping share
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-[var(--dash-ink)]">
                            {payees.shipping.companyName}
                          </p>
                          <p className="mt-1 text-lg font-medium text-[var(--dash-ink)]">
                            {formatCurrency(payees.shares.shipping.net)}
                          </p>
                          <p className="mt-0.5 truncate text-[10px] text-[var(--dash-muted)]">
                            {payees.shipping.label}
                          </p>
                        </div>
                      </div>

                      {/* Who to pay */}
                      <div className="grid grid-cols-1 gap-3 border-t border-[var(--dash-border)] p-4 md:grid-cols-3">
                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                                <Scissors className="h-3 w-3" />
                                Tailor share for
                              </p>
                              <p className="mt-1 truncate text-base font-medium text-[var(--dash-ink)]">
                                {payees.tailor.shopName}
                              </p>
                              {payees.tailor.payeeName !==
                                payees.tailor.shopName && (
                                <p className="text-[11px] text-[var(--dash-muted)]">
                                  Payee: {payees.tailor.payeeName}
                                </p>
                              )}
                            </div>
                            <p className="shrink-0 text-lg font-medium text-[var(--dash-ink)]">
                              {formatCurrency(payees.shares.tailor.net)}
                            </p>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--dash-muted)]">
                            {payees.shares.tailor.net <= 0 ? (
                              <li>No tailor payout on this order</li>
                            ) : payees.tailor.phone ? (
                              <li className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 shrink-0" />
                                {payees.tailor.phone}
                              </li>
                            ) : (
                              <li className="text-[var(--dash-danger)]">
                                Phone not available
                              </li>
                            )}
                            {payees.tailor.email ? (
                              <li className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                {payees.tailor.email}
                              </li>
                            ) : null}
                            {(payees.tailor.city || payees.tailor.location) && (
                              <li className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {[payees.tailor.location, payees.tailor.city]
                                  .filter(Boolean)
                                  .join(", ")}
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                                <Store className="h-3 w-3" />
                                Fabric share for
                              </p>
                              <p className="mt-1 truncate text-base font-medium text-[var(--dash-ink)]">
                                {payees.fabric.shopName}
                              </p>
                              {payees.fabric.payeeName !==
                                payees.fabric.shopName && (
                                <p className="text-[11px] text-[var(--dash-muted)]">
                                  Payee: {payees.fabric.payeeName}
                                </p>
                              )}
                            </div>
                            <p className="shrink-0 text-lg font-medium text-[var(--dash-ink)]">
                              {formatCurrency(payees.shares.fabric.net)}
                            </p>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--dash-muted)]">
                            {payees.shares.fabric.net <= 0 ? (
                              <li>No fabric payout on this order</li>
                            ) : payees.fabric.phone ? (
                              <li className="flex items-center gap-1.5">
                                <Phone className="h-3 w-3 shrink-0" />
                                {payees.fabric.phone}
                              </li>
                            ) : (
                              <li className="text-[var(--dash-danger)]">
                                Phone not available
                              </li>
                            )}
                            {payees.fabric.email ? (
                              <li className="flex items-center gap-1.5">
                                <Mail className="h-3 w-3 shrink-0" />
                                {payees.fabric.email}
                              </li>
                            ) : null}
                            {(payees.fabric.city || payees.fabric.location) && (
                              <li className="flex items-center gap-1.5">
                                <MapPin className="h-3 w-3 shrink-0" />
                                {[payees.fabric.location, payees.fabric.city]
                                  .filter(Boolean)
                                  .join(", ")}
                              </li>
                            )}
                          </ul>
                        </div>

                        <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                                <Truck className="h-3 w-3" />
                                Shipping fee for
                              </p>
                              <p className="mt-1 truncate text-base font-medium text-[var(--dash-ink)]">
                                {payees.shipping.companyName}
                              </p>
                              <p className="text-[11px] text-[var(--dash-muted)]">
                                {payees.shipping.label}
                              </p>
                            </div>
                            <p className="shrink-0 text-lg font-medium text-[var(--dash-ink)]">
                              {formatCurrency(payees.shares.shipping.net)}
                            </p>
                          </div>
                          <ul className="mt-3 space-y-1.5 text-[11px] text-[var(--dash-muted)]">
                            {payees.shares.shipping.net <= 0 ? (
                              <li>No shipping fee on this order</li>
                            ) : (
                              payees.shipping.deliveryLines
                                .slice(0, 3)
                                .map((line: any, idx: number) => (
                                  <li key={`${order._id}-ship-${idx}`}>
                                    {formatShippingLegLine(line)}
                                  </li>
                                ))
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* Fee math */}
                      <div className="border-t border-[var(--dash-border)] p-4">
                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 text-[11px] text-[var(--dash-muted)]">
                            <p className="mb-2 font-medium text-[var(--dash-ink)]">
                              MOTD earnings
                            </p>
                            <p>
                              Tailor commission{" "}
                              {formatCurrency(
                                payees.shares.tailor.commission,
                              )}{" "}
                              ({tailorCommissionPercent}%)
                            </p>
                            <p className="mt-1">
                              Fabric commission{" "}
                              {formatCurrency(
                                payees.shares.fabric.commission,
                              )}{" "}
                              ({fabricCommissionPercent}%)
                            </p>
                            <p className="mt-1 font-medium text-[var(--dash-ink)]">
                              Total earn{" "}
                              {formatCurrency(payees.shares.motdEarns)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 text-[11px] text-[var(--dash-muted)]">
                            <p className="mb-2 font-medium text-[var(--dash-ink)]">
                              Tailor transfer details
                            </p>
                            {payees.tailor.pickup ? (
                              <p>Pickup: {payees.tailor.pickup}</p>
                            ) : (
                              <p>No pickup address on file</p>
                            )}
                            {payees.tailor.designs && (
                              <p className="mt-1">
                                Design: {payees.tailor.designs}
                              </p>
                            )}
                            <p className="mt-1">
                              Gross {formatCurrency(payees.shares.tailorGross)}{" "}
                              − MOTD{" "}
                              {formatCurrency(
                                payees.shares.tailor.commission,
                              )}{" "}
                              ({tailorCommissionPercent}%) ={" "}
                              {formatCurrency(payees.shares.tailor.net)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 text-[11px] text-[var(--dash-muted)]">
                            <p className="mb-2 font-medium text-[var(--dash-ink)]">
                              Fabric store transfer details
                            </p>
                            {payees.fabric.pickup ? (
                              <p>Pickup: {payees.fabric.pickup}</p>
                            ) : (
                              <p>No pickup address on file</p>
                            )}
                            {payees.fabric.fabrics && (
                              <p className="mt-1">
                                Fabric: {payees.fabric.fabrics}
                              </p>
                            )}
                            <p className="mt-1">
                              Gross{" "}
                              {formatCurrency(payees.shares.fees.fabricFee)} −
                              MOTD{" "}
                              {formatCurrency(
                                payees.shares.fabric.commission,
                              )}{" "}
                              ({fabricCommissionPercent}%) ={" "}
                              {formatCurrency(payees.shares.fabric.net)}
                            </p>
                          </div>
                          <div className="rounded-lg border border-[var(--dash-border)] bg-[var(--dash-bg)] p-3 text-[11px] text-[var(--dash-muted)]">
                            <p className="mb-3 font-medium text-[var(--dash-ink)]">
                              {SHIPPING_COMPANY_NAME} transfer details
                            </p>
                            <p>Company: {payees.shipping.companyName}</p>
                            <p className="mt-2">{payees.shipping.label}</p>
                            <p className="mt-2">
                              Delivery fee collected ={" "}
                              {formatKpiCurrency(payees.shares.shipping.net)}{" "}
                              (paid in full to {SHIPPING_COMPANY_NAME})
                            </p>
                            {payees.shipping.deliveryLines.length > 0 && (
                              <ul className="mt-3 space-y-2">
                                {payees.shipping.deliveryLines.map(
                                  (line: any, idx: number) => (
                                    <li
                                      key={`${order._id}-detail-ship-${idx}`}
                                      className="leading-relaxed text-[var(--dash-ink)]"
                                    >
                                      {formatShippingLegLine(line)}
                                    </li>
                                  ),
                                )}
                              </ul>
                            )}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Collective payout table */}
        <div className="mt-6 border-t border-[var(--dash-border)] pt-5">
          <div className="mb-4">
            <h4 className="[font-family:var(--font-display)] text-base text-[var(--dash-ink)]">
              Collective amount Admin must pay
            </h4>
            <p className="mt-1 text-xs text-[var(--dash-muted)]">
              Pay each tailor, fabric store, and shipping company in bulk.
            </p>
          </div>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
                <Scissors className="h-3.5 w-3.5" />
                Pay Tailors
              </div>
              <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
                {formatKpiCurrency(tailorShareNet)}
              </p>
              <p className="mt-1 text-xs text-[var(--dash-muted)]">
                Net after MOTD commission
              </p>
            </div>
            <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
                <Store className="h-3.5 w-3.5" />
                Pay Fabric Stores
              </div>
              <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
                {formatKpiCurrency(fabricShareNet)}
              </p>
              <p className="mt-1 text-xs text-[var(--dash-muted)]">
                Net after MOTD commission
              </p>
            </div>
            <div className="rounded-xl border border-[var(--dash-border)] bg-[var(--dash-bg)] p-4">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--dash-muted)]">
                <Truck className="h-3.5 w-3.5" />
                Pay {SHIPPING_COMPANY_NAME}
              </div>
              <p className="mt-2 text-2xl font-light text-[var(--dash-ink)]">
                {formatKpiCurrency(shippingShareNet)}
              </p>
              <p className="mt-1 text-xs text-[var(--dash-muted)]">
                Full delivery fees collected
              </p>
            </div>
          </div>

          {partnerPayoutRows.length === 0 ? (
            <p className="py-6 text-center text-xs text-[var(--dash-muted)]">
              No partner payouts to release yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--dash-border)]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--dash-bg)] text-[10px] uppercase tracking-[0.16em] text-[var(--dash-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Partner</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Orders</th>
                    <th className="px-4 py-3 font-medium">To pay</th>
                    <th className="px-4 py-3 font-medium">Paid</th>
                    <th className="px-4 py-3 font-medium">Remaining</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerPayoutRows.map((row) => (
                      <tr
                        key={row.key}
                        className="border-t border-[var(--dash-border)] bg-white"
                      >
                        <td className="px-4 py-3 text-xs text-[var(--dash-muted)]">
                          {partnerKindLabel(row.kind)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-[var(--dash-ink)]">
                            {row.name}
                          </p>
                          {row.payeeName && row.payeeName !== row.name ? (
                            <p className="text-[11px] text-[var(--dash-muted)]">
                              {row.payeeName}
                            </p>
                          ) : null}
                          {row.contact ? (
                            <p className="text-[11px] text-[var(--dash-muted)]">
                              {row.contact}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--dash-ink)]">
                          {row.orderCount}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--dash-ink)]">
                          {formatCurrency(row.due)}
                        </td>
                        <td className="px-4 py-3 text-xs text-[var(--dash-ink)]">
                          {formatCurrency(row.paid)}
                        </td>
                        <td className="px-4 py-3 text-xs font-medium text-[var(--dash-ink)]">
                          {formatCurrency(row.remaining)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            disabled
                            className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg bg-[var(--dash-charcoal)] px-3 py-1.5 text-xs font-medium text-white opacity-50"
                          >
                            Release Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="mt-4 text-sm text-[var(--dash-ink)]">
            Total outbound payout{" "}
            <span className="font-medium">
              {formatKpiCurrency(
                tailorShareNet + fabricShareNet + shippingShareNet,
              )}
            </span>
            {" · "}
            Remaining to release{" "}
            <span className="font-medium">
              {formatKpiCurrency(
                partnerPayoutRows.reduce((sum, row) => sum + row.remaining, 0),
              )}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
