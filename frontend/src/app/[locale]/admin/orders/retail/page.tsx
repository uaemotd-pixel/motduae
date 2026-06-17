"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api, getApiErrorMessage } from "@/lib/api/client";
import { PackageSearch, AlertTriangle, RefreshCw, Search, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminOrdersTabs from "@/components/admin/AdminOrdersTabs";

type RetailOrder = {
  _id: string;
  userId: {
    name: string;
    email: string;
  } | null;
  orderItems: {
    name: string;
    quantity: number;
    image: string;
    size?: string;
    slug?: string;
  }[];
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: string;
};

const RETAIL_ORDER_STATUSES: RetailOrder['status'][] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

const RETAIL_ORDER_PIPELINE: RetailOrder['status'][] = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
];

function getNextRetailOrderStatus(status: string): RetailOrder['status'] | null {
  const index = RETAIL_ORDER_PIPELINE.indexOf(status as RetailOrder['status']);
  if (index < 0 || index >= RETAIL_ORDER_PIPELINE.length - 1) return null;
  return RETAIL_ORDER_PIPELINE[index + 1];
}

function getPreviousRetailOrderStatus(status: string): RetailOrder['status'] | null {
  const index = RETAIL_ORDER_PIPELINE.indexOf(status as RetailOrder['status']);
  if (index <= 0) return null;
  return RETAIL_ORDER_PIPELINE[index - 1];
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

const translations = {
  en: {
    title: "Retail Orders",
    subtitle: "Monitor and update delivery fulfillment status pipelines for ready-made items.",
    refresh: "Refresh",
    loading: "Loading retail orders...",
    errorTitle: "Error Loading Orders",
    tryAgain: "Try again",
    empty: "No retail orders found matching the filter criteria.",
    stats: {
      total: "Total Orders",
      pending: "Pending",
      shipped: "Shipped",
      delivered: "Delivered",
    },
    columns: {
      orderId: "Order ID",
      customer: "Customer",
      items: "Items",
      status: "Status",
      date: "Date",
      total: "Total Price",
    },
    unknownCustomer: "Guest",
    filterLabel: "Filter & Search",
    searchPlaceholder: "Search client name/email...",
    statusAll: "All Statuses",
    fromLabel: "From Date",
    toLabel: "To Date",
    toastSuccess: "Order status successfully updated to {status}",
    toastError: "Failed to update order status",
    revertTo: "Revert to {status}",
    advanceTo: "Advance to {status}",
    cancelOrder: "Cancel Order",
  },
  ar: {
    title: "الطلبات الجاهزة",
    subtitle: "مراقبة وتحديث حالة التوصيل للملابس الجاهزة.",
    refresh: "تحديث",
    loading: "جاري تحميل الطلبات الجاهزة...",
    errorTitle: "خطأ في تحميل الطلبات",
    tryAgain: "حاول مرة أخرى",
    empty: "لم يتم العثور على طلبات جاهزة مطابقة لمعايير التصفية.",
    stats: {
      total: "إجمالي الطلبات",
      pending: "قيد الانتظار",
      shipped: "تم الشحن",
      delivered: "تم التوصيل",
    },
    columns: {
      orderId: "معرف الطلب",
      customer: "العميل",
      items: "المنتجات",
      status: "الحالة",
      date: "التاريخ",
      total: "السعر الإجمالي",
    },
    unknownCustomer: "زائر",
    filterLabel: "التصفية والبحث",
    searchPlaceholder: "البحث باسم العميل أو بريده...",
    statusAll: "كل الحالات",
    fromLabel: "من تاريخ",
    toLabel: "إلى تاريخ",
    toastSuccess: "تم تحديث حالة الطلب بنجاح إلى {status}",
    toastError: "فشل في تحديث حالة الطلب",
    revertTo: "إرجاع إلى {status}",
    advanceTo: "ترقية إلى {status}",
    cancelOrder: "إلغاء الطلب",
  }
};

export default function AdminRetailOrdersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const t = translations[locale as keyof typeof translations] || translations.en;

  const [orders, setOrders] = useState<RetailOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const getTodayString = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const getFirstDayOfMonthString = () => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${month}-01`;
  };

  // Filters State
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>(getFirstDayOfMonthString());
  const [filterTo, setFilterTo] = useState<string>(getTodayString());

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      if (filterStatus) queryParams.append("status", filterStatus);
      if (filterCustomer.trim()) queryParams.append("customer", filterCustomer.trim());
      if (filterFrom) queryParams.append("from", filterFrom);
      if (filterTo) queryParams.append("to", filterTo);

      const url = `/api/admin/orders/retail${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const data = await api.get<RetailOrder[]>(url);
      setOrders(data);
    } catch (err: any) {
      console.error("Retail orders fetch error:", err);
      setError(getApiErrorMessage(err, t.errorTitle));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchOrders();
    }, 300); // 300ms debounce
    return () => clearTimeout(delayDebounceFn);
  }, [filterCustomer, filterStatus, filterFrom, filterTo]);

  const handleStatusChange = async (orderId: string, status: RetailOrder['status']) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await api.patch<any>(
        `/api/admin/orders/${orderId}/status`,
        { status }
      );
      
      const updatedOrder = response?.order || response?.data?.order || response;
      const finalStatus = updatedOrder?.status || status;

      setOrders((prevOrders) =>
        prevOrders.map((o) => (o._id === orderId ? { ...o, status: finalStatus } : o))
      );

      toast.success(t.toastSuccess.replace("{status}", finalStatus), SUCCESS_TOAST);
    } catch (err: any) {
      console.error("Status update error details:", err);
      toast.error(getApiErrorMessage(err, t.toastError), ERROR_TOAST);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatCurrency = (amount: number, currency = "AED") =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency,
    }).format(amount);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(locale === "ar" ? "ar-EG" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <AdminOrdersTabs />
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-8 w-48 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 w-96 bg-gray-200 rounded mb-6"></div>
            <div className="bg-white rounded-xl border p-4 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="space-y-6">
        <AdminOrdersTabs />
        <div className="flex items-center justify-center h-[50vh]">
          <div className="text-center bg-white p-8 rounded-2xl border max-w-md shadow-sm">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="font-semibold text-xl text-black">{t.errorTitle}</p>
            <p className="text-gray-500 mt-2 text-sm">{error}</p>
            <button
              onClick={fetchOrders}
              className="mt-6 px-4 py-2 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              {t.tryAgain}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminOrdersTabs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {t.title}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t.subtitle}</p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50 bg-white hover:cursor-pointer transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {t.refresh}
        </button>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t.stats.total, value: orders.length },
          {
            label: t.stats.pending,
            value: orders.filter((o) => o.status === "pending").length,
          },
          {
            label: t.stats.shipped,
            value: orders.filter((o) => o.status === "shipped").length,
          },
          {
            label: t.stats.delivered,
            value: orders.filter((o) => o.status === "delivered").length,
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border rounded-2xl p-4 shadow-sm border-gray-100">
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-xl font-light mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {t.filterLabel}
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {t.columns.status}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
          >
            <option value="">{t.statusAll}</option>
            {RETAIL_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {t.fromLabel}
          </label>
          <div className="relative">
            <input
              type="date"
              value={filterFrom}
              onChange={(e) => setFilterFrom(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {t.toLabel}
          </label>
          <div className="relative">
            <input
              type="date"
              value={filterTo}
              onChange={(e) => setFilterTo(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Orders List Section */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border py-20 shadow-sm border-gray-100">
          <PackageSearch className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1} />
          <p className="text-gray-500 mt-1 max-w-sm">{t.empty}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isUpdating = updatingOrderId === order._id;
            const nextStatus = getNextRetailOrderStatus(order.status);
            const previousStatus = getPreviousRetailOrderStatus(order.status);

            return (
              <div
                key={order._id}
                className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Upper card: Columns Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 p-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t.columns.orderId}
                    </p>
                    <p className="font-mono text-sm font-medium text-black">
                      #{order._id.slice(-6).toUpperCase()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t.columns.customer}
                    </p>
                    <p className="font-medium text-sm text-black">
                      {order.userId?.name || t.unknownCustomer}
                    </p>
                    {order.userId?.email && (
                      <p className="text-xs text-gray-500">{order.userId.email}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t.columns.items}
                    </p>
                    <p
                      className="text-sm text-black truncate max-w-[200px]"
                      title={order.orderItems.map((item) => item.name).join(", ")}
                    >
                      {order.orderItems.map((item) => item.name).join(", ")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {order.orderItems.reduce((acc, item) => acc + item.quantity, 0)} items
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t.columns.status}
                    </p>
                    <StatusBadge status={order.status} />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t.columns.date}
                    </p>
                    <p className="text-sm text-black">{formatDate(order.createdAt)}</p>
                  </div>
                </div>

                {/* Lower card: Pricing & Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-gray-100 bg-gray-50/70 items-center">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                      {t.columns.total}
                    </p>
                    <p className="font-medium text-black text-base mt-0.5">
                      {formatCurrency(order.totalPrice, order.currency)}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 sm:justify-end sm:items-center flex-wrap">
                    {previousStatus && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order._id, previousStatus)}
                        disabled={isUpdating}
                        className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-[140px] hover:bg-gray-100 disabled:opacity-50 hover:cursor-pointer transition"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          t.revertTo.replace("{status}", previousStatus)
                        )}
                      </button>
                    )}



                    {nextStatus && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order._id, nextStatus)}
                        disabled={isUpdating}
                        className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-[140px] disabled:opacity-50 hover:cursor-pointer transition"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          t.advanceTo.replace("{status}", nextStatus)
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