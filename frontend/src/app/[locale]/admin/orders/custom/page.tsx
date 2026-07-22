"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import { RefreshCw, Loader2, Search, PackageSearch } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminOrdersTabs from "@/components/admin/AdminOrdersTabs";
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

interface DesignPopulated {
  _id: string;
  images: string[];
}

interface TailorShopPopulated {
  _id: string;
  name: string;
  nameAr?: string;
  location?: string;
  city?: string;
  logo?: string;
  coverImage?: string;
}

interface FabricPopulated {
  _id: string;
  images: string[];
}

interface CustomOrderItem {
  designSnapshot: {
    name: string;
    nameAr?: string;
  };
  tailorShopId: TailorShopPopulated | string;
  fabricSnapshot?: {
    name: string;
    nameAr?: string;
  } | null;
  designId?: DesignPopulated | string | null;
  fabricId?: FabricPopulated | string | null;
  pricing?: {
    total: number;
  };
}

interface Order {
  _id: string;
  userId: OrderUser | string;
  tailorShopId: TailorShopPopulated | string;
  designSnapshot?: { name: string };
  designId?: DesignPopulated | string | null;
  fabricSnapshot?: { name: string } | null;
  fabricId?: FabricPopulated | string | null;
  status: string;
  createdAt: string;
  pricing: {
    total: number;
    currency: string;
  };
  items?: CustomOrderItem[];
  addons?: Array<{
    addonId: string;
    name: string;
    nameAr: string;
    price: number;
    thumbnailImage: string;
  }>;
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

export default function AdminCustomOrdersPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const t = useTranslations("Admin.OrdersCustom");
  const tStatus = useTranslations("OrdersPage.custom.statuses");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});

  // Date defaults: current month-to-date
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
  const [filterFrom, setFilterFrom] = useState<string>(
    getFirstDayOfMonthString(),
  );
  const [filterTo, setFilterTo] = useState<string>(getTodayString());

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
      const res = await api.get<Order[] | { items: Order[] }>(
        "/api/admin/orders/custom",
      );
      const ordersData = Array.isArray(res) ? res : res.items || [];
      setOrders(ordersData);

      const initialNote: Record<string, string> = {};
      ordersData.forEach((order) => {
        initialNote[order._id] = "";
      });
      setNote(initialNote);
    } catch (err) {
      setError(getApiErrorMessage(err, t("loadError")));
      toast.error(t("loadToastError"), ERROR_TOAST);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (
    order: Order,
    newStatus: CustomOrderStatus,
  ) => {
    setUpdatingOrderId(order._id);
    try {
      await api.patch(`/api/admin/orders/custom/${order._id}/status`, {
        status: newStatus,
        note: note[order._id] || "",
      });

      toast.success(t("updateSuccess"), SUCCESS_TOAST);
      await fetchOrders();
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("updateFailed")), ERROR_TOAST);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatCurrency = (amount: number, currency = "AED") =>
    new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
      style: "currency",
      currency,
    }).format(amount);

  // Client-side filtering logic
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // 1. Customer name/email/ID filter
      if (filterCustomer.trim()) {
        const term = filterCustomer.toLowerCase();
        const customerName = readPartnerName(
          typeof order.userId === "object" ? order.userId : null,
          "",
        ).toLowerCase();
        const customerEmail = (
          (typeof order.userId === "object" && order.userId?.email) ||
          ""
        ).toLowerCase();
        const orderId = order._id.toLowerCase();

        if (
          !customerName.includes(term) &&
          !customerEmail.includes(term) &&
          !orderId.includes(term)
        ) {
          return false;
        }
      }

      // 2. Status filter
      if (filterStatus) {
        if (order.status !== filterStatus) return false;
      }

      // 3. From Date filter
      if (filterFrom) {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(filterFrom + "T00:00:00");
        if (orderDate < fromDate) return false;
      }

      // 4. To Date filter
      if (filterTo) {
        const orderDate = new Date(order.createdAt);
        const toDate = new Date(filterTo + "T23:59:59");
        if (orderDate > toDate) return false;
      }

      return true;
    });
  }, [orders, filterCustomer, filterStatus, filterFrom, filterTo]);

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <AdminOrdersTabs />
        <div className="p-6 text-gray-500">{t("loading")}</div>
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="space-y-6">
        <AdminOrdersTabs />
        <div className="p-6 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminOrdersTabs />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t("subtitle")}</p>
        </div>

        <button
          onClick={fetchOrders}
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white rounded-lg text-sm hover:bg-gray-50 hover:cursor-pointer transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {t("refresh")}
        </button>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: t("stats.total"), value: filteredOrders.length },
          {
            label: t("stats.pending"),
            value: filteredOrders.filter((o) => o.status === "confirmed")
              .length,
          },
          {
            label: t("stats.inProduction"),
            value: filteredOrders.filter((o) => o.status === "in_production")
              .length,
          },
          {
            label: t("stats.delivered"),
            value: filteredOrders.filter((o) => o.status === "delivered")
              .length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm"
          >
            <p className="text-xs text-gray-400">{stat.label}</p>
            <p className="text-xl font-light mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {locale === "ar" ? "التصفية والبحث" : "Filter & Search"}
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder={
                locale === "ar"
                  ? "البحث باسم العميل أو بريده..."
                  : "Search client name/email..."
              }
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {locale === "ar" ? "الحالة" : "Status"}
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-black text-black bg-white transition hover:cursor-pointer"
          >
            <option value="">
              {locale === "ar" ? "كل الحالات" : "All Statuses"}
            </option>
            {CUSTOM_ORDER_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-400 mb-1.5 font-medium uppercase tracking-wider">
            {locale === "ar" ? "من تاريخ" : "From Date"}
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
            {locale === "ar" ? "إلى تاريخ" : "To Date"}
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
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-20 shadow-sm">
          <PackageSearch
            className="w-16 h-16 text-gray-300 mb-4"
            strokeWidth={1}
          />
          <p className="text-gray-500 mt-1 max-w-sm">
            {locale === "ar"
              ? "لم يتم العثور على طلبات مطابقة لمعايير التصفية."
              : "No custom orders found matching the filter criteria."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isUpdating = updatingOrderId === order._id;
            const nextStatus = getNextCustomOrderStatus(order.status);
            const previousStatus = getPreviousCustomOrderStatus(order.status);
            const customerName = readPartnerName(
              typeof order.userId === "object" ? order.userId : null,
              t("unknownCustomer"),
            );
            const customerEmail =
              order.userId && typeof order.userId === "object"
                ? order.userId.email || ""
                : "";

            const tailorName = readPartnerName(
              typeof order.tailorShopId === "object"
                ? order.tailorShopId
                : null,
              t("unknownTailor"),
            );
            const fabricName = order.fabricSnapshot?.name || t("unknownFabric");

            const getFabricImage = (
              fabricId: FabricPopulated | string | null | undefined,
            ): string | null => {
              if (
                fabricId &&
                typeof fabricId === "object" &&
                fabricId.images?.length > 0
              ) {
                return fabricId.images[0];
              }
              return null;
            };

            const getDesignImage = (
              designId: DesignPopulated | string | null | undefined,
            ): string | null => {
              if (
                designId &&
                typeof designId === "object" &&
                designId.images?.length > 0
              ) {
                return designId.images[0];
              }
              return null;
            };

            const getTailorLogo = (
              shop: TailorShopPopulated | string | null | undefined,
            ): string | null => {
              if (shop && typeof shop === "object" && shop.logo) {
                return shop.logo;
              }
              return null;
            };

            const orderFabricImage = getFabricImage(order.fabricId);
            const orderDesignImage = getDesignImage(order.designId);
            const orderTailorLogo = getTailorLogo(order.tailorShopId);

            return (
              <div
                key={order._id}
                className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                {/* Upper card info grid */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-5">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t("columns.customer")}
                    </p>
                    <p className="font-medium text-sm text-black">
                      {customerName}
                    </p>
                    {customerEmail && (
                      <p className="text-xs text-gray-500">{customerEmail}</p>
                    )}
                    {typeof order.userId === "object" &&
                      order.userId?.phone && (
                        <p className="text-xs text-gray-500 font-mono mt-0.5">
                          {order.userId.phone}
                        </p>
                      )}
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {locale === "ar" ? "العناصر المطلوبة" : "Order Items"}
                    </p>
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => {
                        const itemFabricImage = getFabricImage(item.fabricId);
                        const itemDesignImage = getDesignImage(item.designId);
                        const itemTailorLogo = getTailorLogo(item.tailorShopId);
                        return (
                          <div
                            key={idx}
                            className="bg-gray-50/50 rounded-xl border border-gray-100/50 space-y-1"
                          >
                            <div className="flex items-center gap-2">
                              {itemDesignImage && (
                                <img
                                  src={itemDesignImage}
                                  alt={item.designSnapshot?.name || "Design"}
                                  className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                                />
                              )}
                              <div className="flex justify-between items-start gap-2 flex-1">
                                <span className="text-xs font-normal text-gray-500">
                                  Design:
                                  {item.designSnapshot?.name ||
                                    t("unknownDesign")}
                                </span>
                                {item.pricing?.total !== undefined && (
                                  <span className="text-xs font-medium text-gray-500 font-mono">
                                    {formatCurrency(
                                      item.pricing.total,
                                      order.pricing.currency,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 text-[11px] text-gray-500">
                              <span className="flex items-center gap-2">
                                {itemFabricImage && (
                                  <img
                                    src={itemFabricImage}
                                    alt={item.fabricSnapshot?.name || "Fabric"}
                                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                                  />
                                )}
                                {t("fabricLabel", {
                                  name:
                                    item.fabricSnapshot?.name ||
                                    t("unknownFabric"),
                                })}
                              </span>
                              <span className="flex items-center gap-1.5">
                                {itemTailorLogo && (
                                  <img
                                    src={itemTailorLogo}
                                    alt={readPartnerName(
                                      item.tailorShopId,
                                      t("unknownTailor"),
                                    )}
                                    className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                                  />
                                )}
                                {locale === "ar" ? `الخياط:` : `Tailor:`}{" "}
                                {readPartnerName(
                                  item.tailorShopId,
                                  t("unknownTailor"),
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50 space-y-">
                        <div className="flex items-center gap-2">
                          {orderDesignImage && (
                            <img
                              src={orderDesignImage}
                              alt={order.designSnapshot?.name || "Design"}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                            />
                          )}
                          <div className="flex justify-between items-start gap-2 flex-1">
                            <span className="text-xs font-medium text-black">
                              {order.designSnapshot?.name || t("unknownDesign")}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-0.5 text-[11px] text-gray-500">
                          <span className="flex items-center gap-2">
                            {orderFabricImage && (
                              <img
                                src={orderFabricImage}
                                alt={fabricName}
                                className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0"
                              />
                            )}
                            {t("fabricLabel", { name: fabricName })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            {orderTailorLogo && (
                              <img
                                src={orderTailorLogo}
                                alt={tailorName}
                                className="w-5 h-5 rounded-full object-cover border border-gray-200 shrink-0"
                              />
                            )}
                            {locale === "ar" ? `الخياط:` : `Tailor:`}{" "}
                            {tailorName}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  {order.addons && order.addons.length > 0 && (
                    <div className="md:col-span-2 space-y-2 border-t border-gray-100 pt-3 mt-1">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-1 font-medium">
                        {locale === "ar"
                          ? "الإضافات المختارة"
                          : "Selected Add-Ons"}
                      </p>
                      <div className="space-y-1.5 bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                        {order.addons.map((addon, idx) => {
                          const name =
                            locale === "ar"
                              ? addon.nameAr || addon.name
                              : addon.name;
                          return (
                            <div
                              key={idx}
                              className="flex justify-between items-center text-xs"
                            >
                              <span className="text-gray-600 font-medium">
                                {name}
                              </span>
                              <span className="text-black font-semibold font-mono">
                                {formatCurrency(
                                  addon.price,
                                  order.pricing.currency,
                                )}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t("columns.status")}
                    </p>
                    <StatusBadge
                      status={order.status}
                      label={statusLabel(order.status)}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                      {t("columns.date")}
                    </p>
                    <p className="text-sm text-black">
                      {formatOrderDate(order.createdAt, locale)}
                    </p>
                  </div>
                </div>

                {/* Lower card action footer */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-gray-100 bg-gray-50/70 items-center">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">
                      {t("columns.total")}
                    </p>
                    <p className="font-medium text-black text-base mt-0.5">
                      {formatCurrency(
                        order.pricing.total,
                        order.pricing.currency,
                      )}
                    </p>
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
                      className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm flex-1 min-w-35 focus:outline-none focus:border-black text-black bg-white transition"
                      disabled={isUpdating}
                    />

                    {previousStatus && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(order, previousStatus)
                        }
                        disabled={
                          isUpdating || order.status === "return_requested"
                        }
                        className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 hover:bg-gray-100 disabled:opacity-50 hover:cursor-pointer transition"
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
                        disabled={
                          isUpdating ||
                          order.status === "delivered" ||
                          ["return_requested"].includes(nextStatus)
                        }
                        className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 disabled:opacity-50 hover:cursor-pointer transition font-medium"
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
