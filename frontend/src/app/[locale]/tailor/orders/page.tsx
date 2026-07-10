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
  Sliders,
} from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import CustomOrderMeasurementsPanel from "@/components/custom-order/CustomOrderMeasurementsPanel";
import {
  formatOrderDate,
  getNextCustomOrderStatus,
  getPreviousCustomOrderStatus,
  isCustomOrderStatus,
  CUSTOM_ORDER_STATUSES,
  type CustomOrderStatus,
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
  neckWidth?: number | null;
  neckDepth?: number | null;
  armholeHeight?: number | null;
  sleeveOpeningWidth?: number | null;
  cuffWidth?: number | null;
  cuffLength?: number | null;
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
  pricing: {
    total: number;
    currency: string;
    tailoringFee: number;
    designBase: number;
  };
  addPocket?: boolean;
  addBottomWideFold?: boolean;
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

const SUCCESS_TOAST = {
  ...TOAST_BASE,
  style: {
    ...TOAST_BASE.style,
    background: "#f0fdf4",
    color: "#166534",
    border: "1px solid #86efac",
  },
  iconTheme: { primary: "#16a34a", secondary: "#ffffff" },
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

export default function TailorOrdersPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const t = useTranslations("TailorPortal.orders");
  const tStatus = useTranslations("OrdersPage.custom.statuses");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<Record<string, string>>({});

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
      const res = await api.get<{ success: boolean; items: Order[] }>("/api/tailor/orders");
      const ordersData = res.items || [];
      setOrders(ordersData);

      const initialNote: Record<string, string> = {};
      ordersData.forEach((order) => {
        initialNote[order._id] = "";
      });
      setNote(initialNote);
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

  const handleStatusChange = async (order: Order, newStatus: CustomOrderStatus) => {
    setUpdatingOrderId(order._id);
    try {
      await api.patch(`/api/tailor/orders/${order._id}/status`, {
        status: newStatus,
        note: note[order._id] || "",
      });

      toast.success(t("updateSuccess"), SUCCESS_TOAST);
      // Reset note for this order
      setNote((prev) => ({ ...prev, [order._id]: "" }));
      await fetchOrders();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("updateFailed")), ERROR_TOAST);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const toggleExpandOptions = (orderId: string) => {
    setExpandedOptions((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const formatCurrency = (amount: number, currency = "AED") =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency,
    }).format(amount);

  // Client-side filtering logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Customer name/email/phone filter
      if (filterCustomer.trim()) {
        const term = filterCustomer.toLowerCase();
        const customerName = readPartnerName(
          typeof order.userId === "object" ? order.userId : null,
          "",
        ).toLowerCase();
        const customerEmail =
          (typeof order.userId === "object" && order.userId?.email || "").toLowerCase();
        const customerPhone =
          (typeof order.userId === "object" && order.userId?.phone || "").toLowerCase();
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
        <p className="text-gray-500 font-['TT_Norms_Pro_Mono'] text-sm tracking-widest uppercase">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-500 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-800 transition"
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
          <p className="text-gray-500 text-sm mt-1">{t("subtitle")}</p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-50 hover:cursor-pointer transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {locale === "ar" ? "تحديث" : "Refresh"}
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
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
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {t("status")}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
          >
            <option value="">{locale === "ar" ? "كل الحالات" : "All Statuses"}</option>
            {CUSTOM_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Orders List Section */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-20 shadow-sm">
          <PackageSearch className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1} />
          <p className="text-gray-500 mt-1 max-w-sm">{t("empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order._id;
            const nextStatus = getNextCustomOrderStatus(order.status);
            const previousStatus = getPreviousCustomOrderStatus(order.status);
            const customerName = readPartnerName(
              typeof order.userId === "object" ? order.userId : null,
              locale === "ar" ? "عميل غير معروف" : "Unknown Customer",
            );
            const customerEmail =
              typeof order.userId === "object" ? order.userId.email : "";
            const customerPhone =
              typeof order.userId === "object" ? order.userId.phone : "";
            const fabricName = order.fabricSnapshot?.name || (locale === "ar" ? "قماش خاص" : "Self Fabric");
            const isExpanded = !!expandedOrders[order._id];
            const isOptionsExpanded = !!expandedOptions[order._id];

            return (
              <div
                key={order._id}
                className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Upper card info grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t("customer")}</p>
                    <p className="font-medium text-sm text-black flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {customerName}
                    </p>
                    {customerPhone && (
                      <p className="text-xs text-black font-semibold font-mono mt-1 flex items-center gap-1.5 bg-[#FFFDF9] border border-amber-100 px-2 py-0.5 rounded w-max">
                        <Phone className="w-3 h-3 text-amber-600 shrink-0" />
                        {customerPhone}
                      </p>
                    )}
                    {customerEmail && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1.5">
                        <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                        {customerEmail}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t("design")}</p>
                    <p className="text-sm font-medium text-black">
                      {order.designSnapshot?.name || "Bespoke Design"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t("fabricLabel", { name: fabricName })}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t("date")}</p>
                    <p className="text-sm text-black">{formatOrderDate(order.createdAt, locale)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">{t("status")}</p>
                    <StatusBadge
                      status={order.status}
                      label={statusLabel(order.status)}
                    />
                  </div>

                  <div>
                    <div className="mb-2">
                      <p className="text-3xs text-gray-400 uppercase tracking-wider mb-0.5">
                        {locale === "ar" ? "رسوم الخياطة" : "Tailoring Fee"}
                      </p>
                      <p className="font-semibold text-black text-xs">
                        {formatCurrency(order.pricing.tailoringFee, order.pricing.currency)}
                      </p>
                    </div>
                    <div>
                      <p className="text-3xs text-gray-400 uppercase tracking-wider mb-0.5">
                        {locale === "ar" ? "رسوم التصميم" : "Design Fee"}
                      </p>
                      <p className="font-semibold text-black text-xs">
                        {formatCurrency(order.pricing.designBase, order.pricing.currency)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Sizing measurements details block */}
                <div className="px-5 pb-5">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => toggleExpand(order._id)}
                      className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black font-medium transition py-1 hover:cursor-pointer"
                    >
                      <Ruler className="w-3.5 h-3.5" />
                      {isExpanded ? t("hideMeasurements") : t("showMeasurements")}
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpandOptions(order._id)}
                      className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black font-medium transition py-1 hover:cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      {locale === "ar"
                        ? (isOptionsExpanded ? "إخفاء خيارات الطلب" : "عرض خيارات الطلب")
                        : (isOptionsExpanded ? "Hide Order Options" : "Show Order Options")}
                      {isOptionsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {isExpanded && order.measurements && (
                    <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <CustomOrderMeasurementsPanel measurements={order.measurements} />
                    </div>
                  )}

                  {isOptionsExpanded && (
                    <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <p className="text-3xs text-gray-400 uppercase font-medium mb-3">
                        {locale === "ar" ? "خيارات الطلب" : "Order Options"}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {order.addPocket ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-800 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                            <span>✓ {locale === "ar" ? "إضافة جيب" : "Add a Pocket"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">
                            <span>{locale === "ar" ? "بدون جيب" : "No Pocket"}</span>
                          </span>
                        )}
                        {order.addBottomWideFold ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-green-800 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                            <span>✓ {locale === "ar" ? "إضافة طية سفلية عريضة" : "Add a bottom wide fold"}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 rounded-lg">
                            <span>{locale === "ar" ? "بدون طية سفلية عريضة" : "No bottom wide fold"}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Lower card action footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-gray-100 bg-gray-50/70 items-center">
                  <div className="text-xs text-gray-500">
                    {locale === "ar" ? "الرقم التعريفي للطلب:" : "Order ID:"}{" "}
                    <span className="font-mono text-black font-medium">#{order._id.slice(-8).toUpperCase()}</span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:items-center flex-wrap">
                    <input
                      type="text"
                      placeholder={t("notePlaceholder")}
                      value={note[order._id] || ""}
                      onChange={(e) =>
                        setNote((prev) => ({
                          ...prev,
                          [order._id]: e.target.value,
                        }))
                      }
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[140px] focus:outline-none focus:border-black text-black bg-white transition"
                      disabled={isUpdating}
                    />

                    {previousStatus && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order, previousStatus)}
                        disabled={isUpdating}
                        className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-[140px] hover:bg-gray-100 disabled:opacity-50 hover:cursor-pointer transition"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                        ) : (
                          t("revertTo", { status: statusLabel(previousStatus) })
                        )}
                      </button>
                    )}

                    {nextStatus && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order, nextStatus)}
                        disabled={isUpdating}
                        className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-[140px] disabled:opacity-50 hover:cursor-pointer transition font-medium"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          t("advanceTo", { status: statusLabel(nextStatus) })
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
