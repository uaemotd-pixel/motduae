"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  RefreshCw,
  Loader2,
  Search,
  PackageSearch,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  User,
  Ruler,
} from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import {
  formatOrderDate,
  isCustomOrderStatus,
  CUSTOM_ORDER_STATUSES,
} from "@/lib/customOrders";
import type { Locale } from "@/i18n/routing";

interface OrderUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
}

interface Measurements {
  totalLength?: number | null;
  shoulderWidth?: number | null;
  armLength?: number | null;
  chestWidth?: number | null;
  waist?: number | null;
  hips?: number | null;
  notes?: string;
}

interface Order {
  _id: string;
  userId: OrderUser | string;
  designSnapshot?: { name: string };
  fabricSnapshot?: { name: string } | null;
  measurements?: Measurements;
  status: string;
  createdAt: string;
  fabricMeters: number;
  pricing: {
    total: number;
    currency: string;
    fabricCost: number;
    fabricPricePerMeter: number;
  };
}

const TOAST_BASE = {
  position: "top-right" as const,
  duration: 6000,
  style: {
    fontFamily: "var(--font-body)",
    fontSize: "13px",
    letterSpacing: "0.04em",
    borderRadius: "0",
    padding: "14px 18px",
    maxWidth: "360px",
  },
};

const ERROR_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#fef2f2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  },
  iconTheme: { primary: "#dc2626", secondary: "#ffffff" },
};

function readPartnerName(
  value: { name?: string } | string | null | undefined,
  fallback: string,
): string {
  if (!value) return fallback;
  if (typeof value === "string") return value;
  return value.name || fallback;
}

export default function FabricOrdersPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const t = useTranslations("FabricPortal.orders");
  const tStatus = useTranslations("OrdersPage.custom.statuses");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>(
    {},
  );

  // Filters State
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const statusLabel = (status: string) => {
    if (isCustomOrderStatus(status)) {
      return tStatus(status);
    }
    return status.replace(/_/g, " ");
  };

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ success: boolean; items: Order[] }>(
        "/api/fabric/orders",
      );
      setOrders(res.items || []);
    } catch (err) {
      setError(getApiErrorMessage(err, t("loadError")));
      toast.error(t("loadError"), ERROR_TOAST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const formatCurrency = (amount: number, currency = "AED") =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency,
    }).format(amount);

  const getNextFabricStatus = (currentStatus: string): string | null => {
    const nextMap: Record<string, string> = {
      confirmed: "fabric_delivered",
      fabric_delivered: "confirmed",
    };

    return nextMap[currentStatus] || null;
  };

  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const updateOrderStatus = async (orderId: string) => {
    const order = orders.find((o) => o._id === orderId);
    if (!order) return;

    const nextStatus = getNextFabricStatus(order.status);
    if (!nextStatus) return;

    setUpdatingOrderId(orderId);
    try {
      await api.patch(`/api/fabric/orders/${orderId}/status`, {
        status: nextStatus,
      });
      toast.success(
        locale === "ar" ? "تم تحديث حالة الطلب" : "Order status updated",
      );
      await fetchOrders();
    } catch (err) {
      toast.error(
        getApiErrorMessage(
          err,
          locale === "ar" ? "فشل التحديث" : "Update failed",
        ),
        ERROR_TOAST,
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Client-side filtering logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Customer name/email/phone filter
      if (filterCustomer.trim()) {
        const term = filterCustomer.toLowerCase();

        const user =
          order.userId && typeof order.userId === "object"
            ? order.userId
            : null;

        const customerName = readPartnerName(user, "").toLowerCase();
        const customerEmail = (user?.email || "").toLowerCase();
        const customerPhone = (user?.phone || "").toLowerCase();
        const orderId = order._id.toLowerCase();

        if (
          !customerName.includes(term) &&
          !customerEmail.includes(term) &&
          !customerPhone.includes(term) &&
          !orderId.includes(term)
        ) {
          return false;
        }
      }

      // 2. Status filter
      if (filterStatus) {
        if (order.status !== filterStatus) return false;
      }

      return true;
    });
  }, [orders, filterCustomer, filterStatus]);

  if (loading && orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-black mb-4" />
        <p className="text-gray-500 text-sm tracking-widest uppercase [font-family:var(--font-ui)]">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4 [font-family:var(--font-body)]">
          {error}
        </p>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition [font-family:var(--font-ui)]"
        >
          <RefreshCw className="w-4 h-4" />
          {locale === "ar" ? "إعادة المحاولة" : "Try Again"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="[font-family:var(--font-display)] text-2xl md:text-3xl font-light text-black tracking-tight">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm mt-1 [font-family:var(--font-body)]">
            {t("subtitle")}
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-55 hover:cursor-pointer transition shadow-sm [font-family:var(--font-ui)]"
        >
          <RefreshCw className="w-4 h-4" />
          {locale === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider [font-family:var(--font-ui)]">
            {locale === "ar" ? "البحث" : "Search"}
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                locale === "ar"
                  ? "البحث باسم العميل، الهاتف، البريد..."
                  : "Search customer, phone, email..."
              }
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition [font-family:var(--font-body)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider [font-family:var(--font-ui)]">
            {t("status")}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer [font-family:var(--font-body)]"
          >
            <option value="">
              {locale === "ar" ? "كل الحالات" : "All Statuses"}
            </option>
            {CUSTOM_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {tStatus(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List Section */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-20 shadow-sm">
          <PackageSearch
            className="w-16 h-16 text-gray-300 mb-4"
            strokeWidth={1}
          />
          <p className="text-gray-550 mt-1 max-w-sm [font-family:var(--font-body)]">
            {t("empty")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const customerName = readPartnerName(
              typeof order.userId === "object" ? order.userId : null,
              locale === "ar" ? "عميل غير معروف" : "Unknown Customer",
            );
            const user =
              order.userId && typeof order.userId === "object"
                ? order.userId
                : null;

            const customerEmail = user?.email || "";
            const customerPhone = user?.phone || "";
            const fabricName =
              order.fabricSnapshot?.name ||
              (locale === "ar" ? "قماش خاص" : "Self Fabric");
            const isExpanded = !!expandedOrders[order._id];

            return (
              <div
                key={order._id}
                className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Upper card info grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                      {t("customer")}
                    </p>
                    <p className="font-medium text-sm text-black flex items-center gap-1.5 [font-family:var(--font-body)]">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {customerName}
                    </p>
                    {customerPhone && (
                      <p className="text-xs text-black font-semibold mt-1 flex items-center gap-1.5 bg-[#FFFDF9] border border-amber-100 px-2 py-0.5 rounded w-max [font-family:var(--font-body)]">
                        <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                        {customerPhone}
                      </p>
                    )}
                    {customerEmail && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5 [font-family:var(--font-body)]">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        {customerEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                      {t("design")}
                    </p>
                    <p className="text-sm font-medium text-black [font-family:var(--font-body)]">
                      {fabricName}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                      {t("date")}
                    </p>
                    <p className="text-sm text-black [font-family:var(--font-body)]">
                      {formatOrderDate(order.createdAt, locale)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                      {t("status")}
                    </p>
                    <div className="flex flex-col gap-2">
                      <StatusBadge
                        status={order.status}
                        label={statusLabel(order.status)}
                      />

                      {(["confirmed", "fabric_delivered"] as const).includes(
                        order.status as "confirmed" | "fabric_delivered",
                      ) && (
                        <div className="relative">
                          <select
                            value={order.status}
                            disabled={updatingOrderId === order._id}
                            onChange={(e) => {
                              const next = e.target.value;
                              if (next === order.status) return;
                              if (!next) return;

                              // Only allow the fabric-flow progression (two-way)
                              if (next !== getNextFabricStatus(order.status)) return;

                              updateOrderStatus(order._id);
                            }}
                            className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-1.5 text-[11px] md:text-xs bg-white text-black transition hover:cursor-pointer disabled:bg-gray-50 disabled:text-gray-400 disabled:opacity-100 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-black/15 focus:border-black/20 [font-family:var(--font-body)]"
                          >
                            {(() => {
                              const next = getNextFabricStatus(order.status);
                              // For allowed statuses, next must exist; keep safe fallback.
                              if (!next) {
                                return (
                                  <option value={order.status}>
                                    {statusLabel(order.status)}
                                  </option>
                                );
                              }

                              return (
                                <>
                                  <option value={order.status}>
                                    {statusLabel(order.status)}
                                  </option>
                                  <option value={next}>{statusLabel(next)}</option>
                                </>
                              );
                            })()}
                          </select>

                          <div
                            className={`pointer-events-none absolute inset-y-0 ${
                              locale === "ar" ? "left-3" : "right-3"
                            } flex items-center`}
                          >
                            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                      {t("total")}
                    </p>
                    <p className="font-medium text-black text-sm [font-family:var(--font-body)]">
                      {formatCurrency(
                        order.pricing.fabricCost || 0,
                        order.pricing.currency || "AED",
                      )}
                    </p>
                    <p className="text-2xs text-gray-400 [font-family:var(--font-body)]">
                      {locale === "ar" ? "سعر القماش فقط" : "Fabric cost only"}
                    </p>
                  </div>
                </div>

                {/* Fabric meters & details block */}
                <div className="px-5 pb-5">
                  <button
                    type="button"
                    onClick={() => toggleExpand(order._id)}
                    className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black font-medium transition py-1 hover:cursor-pointer [font-family:var(--font-ui)]"
                  >
                    <Ruler className="w-3.5 h-3.5" />
                    {isExpanded ? t("hideMeasurements") : t("showMeasurements")}
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50 grid grid-cols-1 sm:grid-cols-3 gap-4 [font-family:var(--font-body)]">
                      <div className="bg-white p-3 border border-gray-100 rounded-lg">
                        <p className="text-3xs text-gray-400 uppercase font-medium">
                          {locale === "ar"
                            ? "كمية القماش المطلوبة"
                            : "Fabric Quantity Requested"}
                        </p>
                        <p className="text-sm font-semibold font-mono text-black mt-0.5">
                          {order.fabricMeters || 0} meters (m)
                        </p>
                      </div>
                      <div className="bg-white p-3 border border-gray-100 rounded-lg">
                        <p className="text-3xs text-gray-400 uppercase font-medium">
                          {locale === "ar" ? "السعر للمتر" : "Price Per Meter"}
                        </p>
                        <p className="text-sm font-semibold font-mono text-black mt-0.5">
                          {formatCurrency(
                            order.pricing.fabricPricePerMeter || 0,
                            order.pricing.currency || "AED",
                          )}{" "}
                          / m
                        </p>
                      </div>
                      <div className="bg-white p-3 border border-gray-100 rounded-lg">
                        <p className="text-3xs text-gray-400 uppercase font-medium">
                          {locale === "ar"
                            ? "إجمالي تكلفة القماش"
                            : "Total Fabric Payout"}
                        </p>
                        <p className="text-sm font-semibold font-mono text-black mt-0.5">
                          {formatCurrency(
                            order.pricing.fabricCost || 0,
                            order.pricing.currency || "AED",
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer bar showing Order ID */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/70 text-xs text-gray-500">
                  {locale === "ar" ? "الرقم التعريفي للطلب:" : "Order ID:"}{" "}
                  <span className="font-mono text-black font-medium">
                    #{order._id.slice(-8).toUpperCase()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}