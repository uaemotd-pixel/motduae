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
  Package,
} from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import ShipmentList from "@/components/orders/ShipmentList";
import {
  formatOrderDate,
  isCustomOrderStatus,
  CUSTOM_ORDER_STATUSES,
  type CustomOrderShipmentSummary,
} from "@/lib/customOrders";
import type { Locale } from "@/i18n/routing";
import { isGuestOrderUser, resolveOrderDisplayEmail } from "@/lib/auth/guestAccount";
import { isWithinLocalDateRange } from "@/lib/dateRange";
import { splitFabricCommission } from "@/lib/fabricCommission";

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
  contactEmail?: string;
  designSnapshot?: { name: string };
  fabricSnapshot?: { name: string } | null;
  measurements?: Measurements;
  status: string;
  createdAt: string;
  shipments?: CustomOrderShipmentSummary[];
  fabricMeters: number;
  shippingPrice?: number;
  parcelCount?: number;
  perParcelFee?: number | null;
  pricing: {
    total: number;
    currency: string;
    fabricCost: number;
    fabricPricePerMeter: number;
    deliveryFee?: number;
    parcelCount?: number;
    perParcelFee?: number | null;
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

function formatParcelDeliveryNote(
  locale: string,
  parcelCount?: number | null,
  perParcelFee?: number | null,
  formatCurrencyFn: (amount: number, currency?: string) => string = (n) =>
    String(n),
  currency = "AED",
): string | null {
  const count = Number(parcelCount) || 0;
  const fee = Number(perParcelFee);
  if (count <= 0 || !Number.isFinite(fee) || fee < 0) return null;
  return locale === "ar"
    ? `${count} طرود × ${formatCurrencyFn(fee, currency)} لكل طرد`
    : `${count} parcels × ${formatCurrencyFn(fee, currency)} each`;
}

export default function FabricOrdersPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const t = useTranslations("FabricPortal.orders");
  const tStatus = useTranslations("OrdersPage.custom.statuses");

  const [activeTab, setActiveTab] = useState<"custom" | "retail">("custom");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedShipments, setExpandedShipments] = useState<
    Record<string, boolean>
  >({});

  // Filters State
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>("");
  const [filterTo, setFilterTo] = useState<string>("");
  const [commissionPercent, setCommissionPercent] = useState(15);

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
      const settingsPromise = api
        .get<{ motdCommissionFromFabricStore?: number }>("/api/orders/settings")
        .catch(() => null);

      if (activeTab === "custom") {
        const [ordersRes, settingsRes] = await Promise.all([
          api.get<{ success: boolean; items: Order[] }>("/api/fabric/orders"),
          settingsPromise,
        ]);
        setOrders(ordersRes.items || []);
        if (
          typeof settingsRes?.motdCommissionFromFabricStore === "number" &&
          Number.isFinite(settingsRes.motdCommissionFromFabricStore)
        ) {
          setCommissionPercent(settingsRes.motdCommissionFromFabricStore);
        }
      } else {
        const [res, settingsRes] = await Promise.all([
          api.get<any[]>("/api/fabric/orders/retail"),
          settingsPromise,
        ]);
        setOrders(res || []);
        if (
          typeof settingsRes?.motdCommissionFromFabricStore === "number" &&
          Number.isFinite(settingsRes.motdCommissionFromFabricStore)
        ) {
          setCommissionPercent(settingsRes.motdCommissionFromFabricStore);
        }
      }
    } catch (err) {
      setError(getApiErrorMessage(err, t("loadError")));
      toast.error(t("loadError"), ERROR_TOAST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const toggleExpandShipments = (orderId: string) => {
    setExpandedShipments((prev) => ({
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

      if (!isWithinLocalDateRange(order.createdAt, filterFrom, filterTo)) {
        return false;
      }

      return true;
    });
  }, [orders, filterCustomer, filterStatus, filterFrom, filterTo]);

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

      {/* Tabs Selector */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors hover:cursor-pointer [font-family:var(--font-ui)] ${
            activeTab === "custom"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
          onClick={() => {
            setActiveTab("custom");
            setFilterStatus("");
            setFilterCustomer("");
            setFilterFrom("");
            setFilterTo("");
          }}
        >
          {locale === "ar" ? "تفصيل مخصص" : "Custom Orders"}
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors hover:cursor-pointer [font-family:var(--font-ui)] ${
            activeTab === "retail"
              ? "border-black text-black"
              : "border-transparent text-gray-500 hover:text-black"
          }`}
          onClick={() => {
            setActiveTab("retail");
            setFilterStatus("");
            setFilterCustomer("");
            setFilterFrom("");
            setFilterTo("");
          }}
        >
          {locale === "ar" ? "طلبات التجزئة" : "Retail Orders"}
        </button>
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            {(activeTab === "custom" ? CUSTOM_ORDER_STATUSES : ["pending", "confirmed", "shipped", "delivered", "cancelled"]).map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider [font-family:var(--font-ui)]">
            {t("fromLabel")}
          </label>
          <input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer [font-family:var(--font-body)]"
          />
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider [font-family:var(--font-ui)]">
            {t("toLabel")}
          </label>
          <input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer [font-family:var(--font-body)]"
          />
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
            const isRetail = activeTab === "retail";
            const isGuest = isGuestOrderUser(order.userId);
            const customerName = isGuest
              ? (isRetail
                  ? (order as any).shippingAddress?.fullName
                  : (order as any).customerDeliveryAddress?.fullName) || (locale === "ar" ? "زائر" : "Guest")
              : readPartnerName(
                  typeof order.userId === "object" ? order.userId : null,
                  locale === "ar" ? "عميل غير معروف" : "Unknown Customer",
                );
            const user =
              order.userId && typeof order.userId === "object"
                ? order.userId
                : null;

            const customerEmail = resolveOrderDisplayEmail(order);
            const customerPhone = isGuest
              ? (isRetail
                  ? (order as any).shippingAddress?.phone
                  : (order as any).customerDeliveryAddress?.phone) || ""
              : user?.phone || "";
            const fabricName =
              order.fabricSnapshot?.name ||
              (locale === "ar" ? "قماش خاص" : "Self Fabric");
            const isExpanded = !!expandedOrders[order._id];
            const isShipmentsExpanded = !!expandedShipments[order._id];

            if (activeTab === "retail") {
              const retailOrder = order as any;
              const fabricOnlyItems =
                retailOrder.orderItems?.filter(
                  (item: any) => item.size === "Per Meter",
                ) || [];
              const fabricGross = fabricOnlyItems.reduce(
                (sum: number, item: any) =>
                  sum + (Number(item.price) || 0) * (Number(item.quantity) || 0),
                0,
              );
              const fabricBreakdown =
                fabricGross > 0
                  ? splitFabricCommission(fabricGross, commissionPercent)
                  : null;

              return (
                <div
                  key={retailOrder._id}
                  className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
                >
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
                          <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {customerPhone}
                        </p>
                      )}
                      {customerEmail && (
                        <p className="text-xs text-gray-550 mt-1 flex items-center gap-1.5 [font-family:var(--font-body)]">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {customerEmail}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 [font-family:var(--font-ui)]">
                        {locale === "ar" ? "المنتجات المطلوبة" : "Ordered Items"}
                      </p>
                      <div className="flex flex-col gap-3">
                        {retailOrder.orderItems?.map((item: any, idx: number) => {
                          const isFabricOnly = item.size === "Per Meter";
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 bg-gray-50/50 p-2 rounded-xl border border-gray-100/50"
                            >
                              {item.image && (
                                <img
                                  src={item.image}
                                  alt={item.name}
                                  className="w-10 h-10 object-cover rounded-lg border border-gray-200 shrink-0"
                                />
                              )}
                              <div>
                                <p className="text-xs font-semibold text-black [font-family:var(--font-body)]">
                                  {item.name}
                                  {isFabricOnly && (
                                    <span className="ml-1.5 text-[10px] font-normal text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                                      {locale === "ar"
                                        ? "قماش بالمتر"
                                        : "Fabric / m"}
                                    </span>
                                  )}
                                </p>
                                <p className="text-[10px] text-gray-400 mt-0.5 [font-family:var(--font-body)]">
                                  {isFabricOnly
                                    ? locale === "ar"
                                      ? `الكمية: ${item.quantity} م | ${formatCurrency(item.price)} / م`
                                      : `Qty: ${item.quantity} m | ${formatCurrency(item.price)} / m`
                                    : `${locale === "ar" ? "المقاس: " : "Size: "}${item.size} | ${locale === "ar" ? "الكمية: " : "Qty: "}${item.quantity} | ${formatCurrency(item.price)}`}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                        {t("date")}
                      </p>
                      <p className="text-sm text-black [font-family:var(--font-body)]">
                        {formatOrderDate(retailOrder.createdAt, locale)}
                      </p>
                      <div className="mt-4">
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                          {t("status")}
                        </p>
                        <StatusBadge
                          status={retailOrder.status}
                          label={statusLabel(retailOrder.status)}
                        />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 [font-family:var(--font-ui)]">
                        {locale === "ar" ? "الإجمالي" : "Total Price"}
                      </p>
                      <p className="font-semibold text-black text-base [font-family:var(--font-body)]">
                        {formatCurrency(
                          retailOrder.totalPrice || 0,
                          retailOrder.currency || "AED",
                        )}
                      </p>
                      {(retailOrder.shippingPrice || 0) > 0 && (
                        <div className="mt-2 space-y-0.5 text-[10px] text-gray-500 [font-family:var(--font-body)]">
                          <p>
                            {locale === "ar"
                              ? "رسوم توصيل الطرود: "
                              : "Parcel delivery fee: "}
                            {formatCurrency(
                              retailOrder.shippingPrice || 0,
                              retailOrder.currency || "AED",
                            )}
                          </p>
                          {(() => {
                            const note = formatParcelDeliveryNote(
                              locale,
                              retailOrder.parcelCount,
                              retailOrder.perParcelFee,
                              formatCurrency,
                              retailOrder.currency || "AED",
                            );
                            return note ? <p>{note}</p> : null;
                          })()}
                        </div>
                      )}
                      {fabricBreakdown && (
                        <div className="mt-2 space-y-0.5 text-[10px] text-gray-500 [font-family:var(--font-body)]">
                          <p>
                            {locale === "ar"
                              ? `عمولة MOTD (${commissionPercent}%): `
                              : `MOTD commission (${commissionPercent}%): `}
                            −
                            {formatCurrency(
                              fabricBreakdown.commission,
                              retailOrder.currency || "AED",
                            )}
                          </p>
                          <p className="font-medium text-black">
                            {locale === "ar"
                              ? "صافي مستحقاتك: "
                              : "Your payout: "}
                            {formatCurrency(
                              fabricBreakdown.net,
                              retailOrder.currency || "AED",
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-5 pb-5 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => toggleExpandShipments(retailOrder._id)}
                      className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black font-medium transition py-3 hover:cursor-pointer [font-family:var(--font-ui)]"
                    >
                      <Package className="w-3.5 h-3.5" />
                      {locale === "ar"
                        ? isShipmentsExpanded
                          ? "إخفاء الشحنات"
                          : "عرض الشحنات"
                        : isShipmentsExpanded
                          ? "Hide Shipments"
                          : "Show Shipments"}
                      {isShipmentsExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>

                    {isShipmentsExpanded && (
                      <div className="pb-2">
                        <ShipmentList
                          shipments={retailOrder.shipments}
                          locale={locale}
                          visibility="internal"
                          compact
                        />
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-gray-100 bg-gray-50/70 text-xs text-gray-500">
                    {locale === "ar" ? "الرقم التعريفي للطلب:" : "Order ID:"}{" "}
                    <span className="font-mono text-black font-medium">
                      #{retailOrder._id.slice(-8).toUpperCase()}
                    </span>
                  </div>
                </div>
              );
            }

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
                    {(() => {
                      const breakdown = splitFabricCommission(
                        order.pricing.fabricCost || 0,
                        commissionPercent,
                      );
                      const currency = order.pricing.currency || "AED";
                      const deliveryFee = order.pricing.deliveryFee || 0;
                      const parcelNote = formatParcelDeliveryNote(
                        locale,
                        order.pricing.parcelCount ?? order.parcelCount,
                        order.pricing.perParcelFee ?? order.perParcelFee,
                        formatCurrency,
                        currency,
                      );
                      return (
                        <>
                          <p className="font-medium text-black text-sm [font-family:var(--font-body)]">
                            {formatCurrency(breakdown.net, currency)}
                          </p>
                          <p className="text-2xs text-gray-400 [font-family:var(--font-body)]">
                            {locale === "ar"
                              ? "صافي مستحقاتك بعد العمولة"
                              : "Your payout after commission"}
                          </p>
                          <div className="mt-2 space-y-0.5 text-[10px] text-gray-500 [font-family:var(--font-body)]">
                            {deliveryFee > 0 && (
                              <>
                                <p>
                                  {locale === "ar"
                                    ? "رسوم توصيل الطرود: "
                                    : "Parcel delivery fee: "}
                                  {formatCurrency(deliveryFee, currency)}
                                </p>
                                {parcelNote && <p>{parcelNote}</p>}
                              </>
                            )}
                            <p>
                              {locale === "ar"
                                ? `عمولة MOTD (${commissionPercent}%): `
                                : `MOTD commission (${commissionPercent}%): `}
                              −{formatCurrency(breakdown.commission, currency)}
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Fabric meters & details block */}
                <div className="px-5 pb-5">
                  <div className="flex flex-wrap gap-4">
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

                    <button
                      type="button"
                      onClick={() => toggleExpandShipments(order._id)}
                      className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black font-medium transition py-1 hover:cursor-pointer [font-family:var(--font-ui)]"
                    >
                      <Package className="w-3.5 h-3.5" />
                      {locale === "ar"
                        ? isShipmentsExpanded
                          ? "إخفاء الشحنات"
                          : "عرض الشحنات"
                        : isShipmentsExpanded
                          ? "Hide Shipments"
                          : "Show Shipments"}
                      {isShipmentsExpanded ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>

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
                            : "Total Fabric Fee"}
                        </p>
                        <p className="text-sm font-semibold font-mono text-black mt-0.5">
                          {formatCurrency(
                            order.pricing.fabricCost || 0,
                            order.pricing.currency || "AED",
                          )}
                        </p>
                      </div>
                      <div className="bg-white p-3 border border-gray-100 rounded-lg sm:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {(() => {
                          const breakdown = splitFabricCommission(
                            order.pricing.fabricCost || 0,
                            commissionPercent,
                          );
                          const currency = order.pricing.currency || "AED";
                          return (
                            <>
                              <div>
                                <p className="text-3xs text-gray-400 uppercase font-medium">
                                  {locale === "ar" ? "إجمالي" : "Gross"}
                                </p>
                                <p className="text-sm font-semibold font-mono text-black mt-0.5">
                                  {formatCurrency(breakdown.gross, currency)}
                                </p>
                              </div>
                              <div>
                                <p className="text-3xs text-gray-400 uppercase font-medium">
                                  {locale === "ar"
                                    ? `عمولة MOTD (${commissionPercent}%)`
                                    : `MOTD commission (${commissionPercent}%)`}
                                </p>
                                <p className="text-sm font-semibold font-mono text-black mt-0.5">
                                  −{formatCurrency(breakdown.commission, currency)}
                                </p>
                              </div>
                              <div>
                                <p className="text-3xs text-gray-400 uppercase font-medium">
                                  {locale === "ar"
                                    ? "صافي مستحقاتك"
                                    : "Your payout"}
                                </p>
                                <p className="text-sm font-semibold font-mono text-black mt-0.5">
                                  {formatCurrency(breakdown.net, currency)}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {isShipmentsExpanded && (
                    <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <ShipmentList
                        shipments={order.shipments}
                        locale={locale}
                        visibility="internal"
                        compact
                      />
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