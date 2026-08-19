"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, getApiErrorMessage } from "@/lib/api/client";
import toast from "react-hot-toast";
import { RefreshCw, Loader2, Search, PackageSearch, ChevronDown, ChevronUp } from "lucide-react";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminOrdersTabs from "@/components/admin/AdminOrdersTabs";
import AdminPackOrderButton, {
  type PackReadiness,
} from "@/components/admin/AdminPackOrderButton";

import OrderProgressPanel from "@/components/orders/OrderProgressPanel";
import { TableSkeleton } from "@/components/ui/Skeleton";
import {
  formatOrderDate,
  getAdminAssignableStatuses,
  getAdminTimelineNeighbors,
  isCustomOrderStatus,
  CUSTOM_ORDER_STATUSES,
  type CustomOrderStatus,
  type CustomOrderStatusHistoryEntry,

  type CustomOrderShipmentSummary,
} from "@/lib/customOrders";
import type { Locale } from "@/i18n/routing";
import { ImageModal } from "@/components/shared/ImageModal";
import GlobalPagination from "@/components/shared/GlobalPagination";

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
  statusHistory?: CustomOrderStatusHistoryEntry[];
  shipments?: CustomOrderShipmentSummary[];
  createdAt: string;
  returnItems?: unknown[];
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
  packedAt?: string | null;
  packReadiness?: PackReadiness;
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
  const tLogistics = useTranslations("OrdersPage.logistics");

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [note, setNote] = useState<Record<string, string>>({});
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const handleImageClick = (imageUrl: string) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

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

  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterFrom, setFilterFrom] = useState<string>(
    getFirstDayOfMonthString(),
  );
  const [filterTo, setFilterTo] = useState<string>(getTodayString());
  const [expandedLogistics, setExpandedLogistics] = useState<
    Record<string, boolean>
  >({});

  const toggleLogistics = (orderId: string) => {
    setExpandedLogistics((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

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
    if (order.status === newStatus) return;

    setUpdatingOrderId(order._id);
    try {
      if (newStatus === "return_approved") {
        await api.post(
          `/api/admin/orders/custom/${order._id}/return-approve`,
          {},
        );
      } else if (newStatus === "return_rejected") {
        await api.post(
          `/api/admin/orders/custom/${order._id}/return-reject`,
          {},
        );
      } else if (newStatus === "refund_processed") {
        await api.post(
          `/api/admin/orders/custom/${order._id}/refund-process`,
          {},
        );
      } else {
        await api.patch(`/api/admin/orders/custom/${order._id}/status`, {
          status: newStatus,
          note: note[order._id] || "",
        });
      }

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

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
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

      if (filterStatus) {
        if (order.status !== filterStatus) return false;
      }

      if (filterFrom) {
        const orderDate = new Date(order.createdAt);
        const fromDate = new Date(filterFrom + "T00:00:00");
        if (orderDate < fromDate) return false;
      }

      if (filterTo) {
        const orderDate = new Date(order.createdAt);
        const toDate = new Date(filterTo + "T23:59:59");
        if (orderDate > toDate) return false;
      }

      return true;
    });
  }, [orders, filterCustomer, filterStatus, filterFrom, filterTo]);

  const totalItems = filteredOrders.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * limit;
    return filteredOrders.slice(startIndex, startIndex + limit);
  }, [filteredOrders, currentPage, limit]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterCustomer, filterStatus, filterFrom, filterTo]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit);
    setCurrentPage(1);
  };

  const getFabricImage = (
    fabricId: FabricPopulated | string | null | undefined,
  ): string | null => {
    if (
      fabricId &&
      typeof fabricId === "object" &&
      Array.isArray(fabricId.images) &&
      fabricId.images.length > 0
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
      Array.isArray(designId.images) &&
      designId.images.length > 0
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

  if (loading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <AdminOrdersTabs />
        <TableSkeleton rows={6} cols={5} className="rounded-xl" />
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

      {totalItems === 0 ? (
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
          {paginatedOrders.map((order) => {
            const isUpdating = updatingOrderId === order._id;
            const isGuest =
              order.userId &&
              typeof order.userId === "object" &&
              order.userId.email === "customer@motd.test";
            const customerName =
              isGuest && (order as any).customerDeliveryAddress?.fullName
                ? (order as any).customerDeliveryAddress.fullName
                : readPartnerName(
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

            const orderFabricImage = getFabricImage(order.fabricId);
            const orderDesignImage = getDesignImage(order.designId);
            const orderTailorLogo = getTailorLogo(order.tailorShopId);
            const timelineStatus = isCustomOrderStatus(order.status)
              ? order.status
              : "pending";
            const hasReturnItems =
              (order.returnItems?.length || 0) > 0 ||
              [
                "return_requested",
                "return_approved",
                "return_rejected",
                "refund_processed",
              ].includes(timelineStatus);
            const { previous: previousStatus, next: nextStatus } =
              getAdminTimelineNeighbors(
                timelineStatus,
                order.statusHistory || [],
                hasReturnItems,
              );
            const assignableStatuses = getAdminAssignableStatuses(
              timelineStatus,
              order.statusHistory || [],
              hasReturnItems,
            );

            return (
              <div
                key={order._id}
                className="border border-gray-100 rounded-2xl bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
              >
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
                    {isGuest
                      ? (order as any).customerDeliveryAddress?.phone && (
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {(order as any).customerDeliveryAddress.phone}
                          </p>
                        )
                      : typeof order.userId === "object" &&
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
                            className="bg-gray-50/50 rounded-xl border border-gray-100/50 p-3 space-y-2"
                          >
                            <div className="flex items-center gap-3">
                              {itemDesignImage ? (
                                <img
                                  src={itemDesignImage}
                                  alt={item.designSnapshot?.name || "Design"}
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 hover:cursor-pointer"
                                  onClick={() =>
                                    handleImageClick(itemDesignImage)
                                  }
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-xs">
                                  No img
                                </div>
                              )}
                              <div className="flex-1 flex justify-between items-center">
                                <span className="text-sm font-medium text-black">
                                  {item.designSnapshot?.name ||
                                    t("unknownDesign")}
                                </span>
                                {item.pricing?.total !== undefined && (
                                  <span className="text-sm font-mono text-gray-600">
                                    {formatCurrency(
                                      item.pricing.total,
                                      order.pricing.currency,
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 pl-1">
                              {itemFabricImage ? (
                                <img
                                  src={itemFabricImage}
                                  alt={item.fabricSnapshot?.name || "Fabric"}
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 hover:cursor-pointer"
                                  onClick={() =>
                                    handleImageClick(itemFabricImage)
                                  }
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-[10px]">
                                  No img
                                </div>
                              )}
                              <span className="text-xs text-gray-600">
                                {t("fabricLabel", {
                                  name:
                                    item.fabricSnapshot?.name ||
                                    t("unknownFabric"),
                                })}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 pl-1">
                              {itemTailorLogo ? (
                                <img
                                  src={itemTailorLogo}
                                  alt={readPartnerName(
                                    item.tailorShopId,
                                    t("unknownTailor"),
                                  )}
                                  className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 hover:cursor-pointer"
                                  onClick={() =>
                                    handleImageClick(itemTailorLogo)
                                  }
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-[8px]">
                                  N/A
                                </div>
                              )}
                              <span className="text-xs text-gray-600">
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
                      <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50 space-y-2">
                        <div className="flex items-center gap-2">
                          {orderDesignImage && (
                            <img
                              src={orderDesignImage}
                              alt={order.designSnapshot?.name || "Design"}
                              className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 hover:cursor-pointer"
                              onClick={() => handleImageClick(orderDesignImage)}
                            />
                          )}
                          <div className="flex-1 flex justify-between items-center">
                            <span className="text-sm font-medium text-black">
                              {order.designSnapshot?.name || t("unknownDesign")}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pl-1">
                          {orderFabricImage && (
                            <img
                              src={orderFabricImage}
                              alt={fabricName}
                              className="w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0 hover:cursor-pointer"
                              onClick={() => handleImageClick(orderFabricImage)}
                            />
                          )}
                          <span className="text-xs text-gray-600">
                            {t("fabricLabel", { name: fabricName })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 pl-1">
                          {orderTailorLogo && (
                            <img
                              src={orderTailorLogo}
                              alt={tailorName}
                              className="w-6 h-6 rounded-full object-cover border border-gray-200 shrink-0 hover:cursor-pointer"
                              onClick={() => handleImageClick(orderTailorLogo)}
                            />
                          )}
                          <span className="text-xs text-gray-600">
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

                    <select
                      aria-label={t("setStatus")}
                      value={timelineStatus}
                      disabled={isUpdating}
                      onChange={(e) =>
                        handleStatusChange(
                          order,
                          e.target.value as CustomOrderStatus,
                        )
                      }
                      className="border border-gray-200 rounded-lg px-3 py-2 text-xs text-black bg-white focus:outline-none focus:border-black hover:cursor-pointer disabled:opacity-50 min-w-40"
                    >
                      {assignableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>

                    {previousStatus && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(order, previousStatus)
                        }
                        disabled={isUpdating}
                        className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 hover:bg-gray-100 disabled:opacity-50 hover:cursor-pointer transition"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-500" />
                        ) : (
                          t("revertTo", {
                            status: statusLabel(previousStatus),
                          })
                        )}
                      </button>
                    )}

                    {nextStatus && nextStatus !== "refund_processed" && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(order, nextStatus)}
                        disabled={isUpdating}
                        className="bg-black text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 disabled:opacity-50 hover:cursor-pointer transition font-medium"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          t("advanceTo", {
                            status: statusLabel(nextStatus),
                          })
                        )}
                      </button>
                    )}

                    <AdminPackOrderButton
                      kind="custom"
                      orderId={order._id}
                      status={order.status}
                      packedAt={order.packedAt}
                      packReadiness={order.packReadiness}
                      disabled={isUpdating}
                      copy={{
                        pack: t("pack"),
                        packing: t("packing"),
                        packed: t("packed"),
                        success: t("packSuccess"),
                        error: t("packFailed"),
                      }}
                      onPacked={() => {
                        void fetchOrders();
                      }}
                    />

                    {timelineStatus === "return_requested" && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(order, "return_approved")
                          }
                          disabled={isUpdating}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 disabled:opacity-50 hover:bg-green-700 hover:cursor-pointer transition font-medium"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            t("approveReturn")
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleStatusChange(order, "return_rejected")
                          }
                          disabled={isUpdating}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 disabled:opacity-50 hover:bg-red-700 hover:cursor-pointer transition font-medium"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                          ) : (
                            t("rejectReturn")
                          )}
                        </button>
                      </>
                    )}

                    {timelineStatus === "return_approved" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusChange(order, "refund_processed")
                        }
                        disabled={isUpdating}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-xs flex items-center justify-center gap-1 min-w-35 disabled:opacity-50 hover:bg-green-700 hover:cursor-pointer transition font-medium"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                        ) : (
                          t("processRefund")
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="border-t border-gray-100 px-5 py-4 bg-white">
                  <button
                    type="button"
                    onClick={() => toggleLogistics(order._id)}
                    className="inline-flex items-center gap-1.5 text-xs text-black/60 hover:text-black font-medium transition hover:cursor-pointer"
                    aria-expanded={!!expandedLogistics[order._id]}
                  >
                    {expandedLogistics[order._id]
                      ? tLogistics("hide")
                      : tLogistics("show")}
                    {expandedLogistics[order._id] ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>

                  {expandedLogistics[order._id] && (
                    <div className="mt-4 p-4 border border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                      <p className="text-xs text-gray-400 uppercase tracking-wider mb-4 font-medium">
                        {tLogistics("title")}
                      </p>
                      <OrderProgressPanel
                        variant="custom"
                        currentStatus={timelineStatus}
                        statusHistory={order.statusHistory || []}
                        shipments={order.shipments}
                        locale={locale}
                        visibility="internal"
                        hasReturnItems={hasReturnItems}
                        compact
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalItems > 0 && (
        <GlobalPagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          showItemsPerPage={true}
          itemsPerPage={limit}
          onItemsPerPageChange={handleLimitChange}
          itemsPerPageOptions={[5, 10, 20, 50, 100]}
          totalItems={totalItems}
        />
      )}

      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Custom Order Image"
        onClose={() => setImageModalOpen(false)}
      />
    </div>
  );
}
