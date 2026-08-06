"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, type ApiError } from "@/lib/api/client";
import toast from "react-hot-toast";
import {
  Loader2,
  Bell,
  Trash2,
  ChevronDown,
  MapPin,
  Package,
  User,
  Truck,
  Check,
  X,
  AlertTriangle,
  Home,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { Locale } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import NotificationReturnStepper from "@/components/admin/notifications/NotificationReturnStepper";
import {
  dispatchNotificationRefresh,
  getActionAuditFromHistory,
  getAdminDeepLinkHref,
  getNotificationPriority,
  getNotificationTypeLabel,
  getOrderDetailHref,
  getPriorityStyles,
  isNotificationAging,
  type NotificationCategory,
} from "@/lib/notifications";

function getApiErrMessage(err: unknown, fallback: string) {
  const msg = (err as ApiError)?.message;
  if (msg) return msg;
  return err instanceof Error ? err.message : fallback;
}

function shortenId(id: string): string {
  if (!id) return "";
  return id.length > 8 ? id.slice(0, 8) : id;
}

const CATEGORY_TABS: Array<{ id: NotificationCategory | "all"; labelKey: string }> =
  [
    { id: "all", labelKey: "categoryAll" },
    { id: "orders", labelKey: "categoryOrders" },
    { id: "returns", labelKey: "categoryReturns" },
    { id: "registrations", labelKey: "categoryRegistrations" },
    { id: "partners", labelKey: "categoryPartners" },
  ];

export default function AdminNotificationsPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const tn = useTranslations("Admin.Notifications");

  const [categoryTab, setCategoryTab] = useState<NotificationCategory | "all">("all");
  const [readFilter, setReadFilter] = useState<"" | "true" | "false">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customOrderDetails, setCustomOrderDetails] = useState<Record<string, any>>({});
  const [retailOrderDetails, setRetailOrderDetails] = useState<Record<string, any>>({});
  const [loadingOrdersForDropdown, setLoadingOrdersForDropdown] = useState(false);
  const [processingReturn, setProcessingReturn] = useState<Record<string, boolean>>({});
  const [markingRead, setMarkingRead] = useState<Record<string, boolean>>({});
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  const {
    items: sortedItems,
    unreadCount,
    loading,
    loadingMore,
    error,
    hasMore,
    loadMore,
    applyFilters,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    bulkMarkAsRead,
    bulkDelete,
  } = useNotifications({
    audience: "admin",
    initialFilters: { page: 1, limit: 20 },
  });

  useEffect(() => {
    applyFilters({
      read: readFilter || undefined,
      search: searchQuery.trim() || undefined,
      category: categoryTab === "all" ? undefined : categoryTab,
      page: 1,
    });
  }, [readFilter, searchQuery, categoryTab]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const loadOrderDetailsIfNeeded = async () => {
      if (!expandedId) return;

      const n = sortedItems.find((x) => x.id === expandedId);
      const orderId = n?.orderId;
      if (!orderId) return;

      const isRetail =
        n?.orderType === "retail" || n?.type === "retail_order_placed";

      if (isRetail) {
        if (retailOrderDetails[orderId]) return;

        setLoadingOrdersForDropdown(true);
        try {
          const found = await api.get<any>(`/api/admin/orders/retail/${orderId}`);
          if (found) {
            setRetailOrderDetails((prev) => ({ ...prev, [orderId]: found }));
          }
        } catch {
          // keep dropdown resilient
        } finally {
          setLoadingOrdersForDropdown(false);
        }
        return;
      }

      if (customOrderDetails[orderId]) return;

      setLoadingOrdersForDropdown(true);
      try {
        const found = await api.get<any>(`/api/admin/orders/custom/${orderId}`);
        if (found) {
          setCustomOrderDetails((prev) => ({ ...prev, [orderId]: found }));
        }
      } catch {
        // keep dropdown resilient
      } finally {
        setLoadingOrdersForDropdown(false);
      }
    };

    loadOrderDetailsIfNeeded();
  }, [expandedId, sortedItems]);

  const formatDate = (d?: string) => {
    if (!d) return "";
    try {
      return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(d));
    } catch {
      return d;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-gray-100 text-gray-800",
      return_requested: "bg-yellow-100 text-yellow-800",
      return_approved: "bg-green-100 text-green-800",
      return_rejected: "bg-red-100 text-red-800",
      refund_processed: "bg-green-100 text-green-800",
    };
    return colors[status?.toLowerCase()] || "bg-gray-100 text-gray-800";
  };

  const renderPickupAddress = (address: any) => {
    if (!address) return null;

    const stateOrEmirate = address.state || address.emirate || "-";
    const country = address.country || "UAE";
    const postalCode = address.postalCode || "-";

    return (
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
          <Truck className="w-4 h-4" />
          Return Pickup Address
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-xs text-gray-400 block">Full Name</span>
            <span className="text-black font-medium">
              {address.fullName || "-"}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Phone</span>
            <span className="text-black font-medium">
              {address.phone || "-"}
            </span>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs text-gray-400 block">Address</span>
            <span className="text-black">
              {address.line1 || "-"}
              {address.line2 && `, ${address.line2}`}
            </span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">City</span>
            <span className="text-black">{address.city || "-"}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Emirate/State</span>
            <span className="text-black">{stateOrEmirate}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Postal Code</span>
            <span className="text-black">{postalCode}</span>
          </div>
          <div>
            <span className="text-xs text-gray-400 block">Country</span>
            <span className="text-black">{country}</span>
          </div>
        </div>
      </div>
    );
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!notificationId) return;

    setMarkingRead((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await markAsRead(notificationId);
      toast.success(tn("markedAsRead"));
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, tn("markReadFailed")));
    } finally {
      setMarkingRead((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleAcceptReturn = async (
    orderId: string,
    notificationId: string,
  ) => {
    if (!orderId) return;

    setProcessingReturn((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await api.post(`/api/admin/orders/custom/${orderId}/return-approve`, {});
      await markAsRead(notificationId);
      await applyFilters({
        read: readFilter || undefined,
        search: searchQuery.trim() || undefined,
        category: categoryTab === "all" ? undefined : categoryTab,
        page: 1,
      });
      dispatchNotificationRefresh();
      toast.success(tn("returnAccepted"));
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, tn("returnAcceptFailed")));
    } finally {
      setProcessingReturn((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleRejectReturn = async (
    orderId: string,
    notificationId: string,
  ) => {
    if (!orderId) return;

    setProcessingReturn((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await api.post(`/api/admin/orders/custom/${orderId}/return-reject`, {});
      await markAsRead(notificationId);
      await applyFilters({
        read: readFilter || undefined,
        search: searchQuery.trim() || undefined,
        category: categoryTab === "all" ? undefined : categoryTab,
        page: 1,
      });
      dispatchNotificationRefresh();
      toast.success(tn("returnRejected"));
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, tn("returnRejectFailed")));
    } finally {
      setProcessingReturn((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const handleProcessRefund = async (
    orderId: string,
    notificationId: string,
  ) => {
    if (!orderId) return;

    setProcessingReturn((prev) => ({ ...prev, [notificationId]: true }));

    try {
      await api.post(`/api/admin/orders/custom/${orderId}/refund-process`, {});
      await markAsRead(notificationId);
      await applyFilters({
        read: readFilter || undefined,
        search: searchQuery.trim() || undefined,
        category: categoryTab === "all" ? undefined : categoryTab,
        page: 1,
      });
      dispatchNotificationRefresh();
      toast.success(tn("refundProcessed"));
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, tn("refundProcessFailed")));
    } finally {
      setProcessingReturn((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      await bulkMarkAsRead(ids);
      setSelectedIds(new Set());
      toast.success(tn("bulkMarkedRead"));
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, tn("bulkActionFailed")));
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setBulkLoading(true);
    try {
      await bulkDelete(ids);
      setSelectedIds(new Set());
      toast.success(tn("bulkDeleted"));
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, tn("bulkActionFailed")));
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {tn("title")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{tn("subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={tn("searchPlaceholder")}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
          <select
            value={readFilter}
            onChange={(e) =>
              setReadFilter(e.target.value as "" | "true" | "false")
            }
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">{tn("filterAll")}</option>
            <option value="false">{tn("filterUnread")}</option>
            <option value="true">{tn("filterRead")}</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryTab(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                categoryTab === tab.id
                  ? "bg-gray-900 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {tn(tab.labelKey)}
            </button>
          ))}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
            <span className="text-sm text-gray-600">
              {tn("selectedCount", { count: selectedIds.size })}
            </span>
            <button
              type="button"
              disabled={bulkLoading}
              onClick={handleBulkMarkRead}
              className="px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium disabled:opacity-50"
            >
              {tn("bulkMarkRead")}
            </button>
            <button
              type="button"
              disabled={bulkLoading}
              onClick={handleBulkDelete}
              className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium disabled:opacity-50"
            >
              {tn("bulkDelete")}
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 text-gray-500">
          <Bell className="w-4 h-4" />
          <span className="text-sm">{unreadCount}</span>
          <button
            type="button"
            disabled={markAllLoading || unreadCount === 0}
            className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (unreadCount === 0) return;

              setMarkAllLoading(true);
              try {
                await markAllAsRead();
                toast.success(tn("markedAllAsRead"));
              } catch (err: unknown) {
                toast.error(getApiErrMessage(err, tn("markAllFailed")));
              } finally {
                setMarkAllLoading(false);
              }
            }}
          >
            {markAllLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Check className="w-3 h-3" />
            )}
            MARK ALL AS READ
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 text-gray-500 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {tn("loading")}
        </div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-16 shadow-sm">
          <Bell className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 max-w-md">{tn("empty")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((n) => {
            const isReturnRequest =
              n.type === "custom_return_requested" ||
              n.type === "return_request" ||
              (n.returnData && (n.orderId || n.order_id));

            const normalizedStatus = n.status || "";
            const isPending =
              normalizedStatus === "pending" ||
              normalizedStatus === "return_requested";

            const isRefundPending = normalizedStatus === "return_approved";

            const isProcessed =
              normalizedStatus === "return_rejected" ||
              normalizedStatus === "refund_processed" ||
              normalizedStatus === "rejected";

            const orderHref = getOrderDetailHref(
              { ...n, audience: "admin" },
              locale,
            );
            const deepLink = getAdminDeepLinkHref(n, locale);
            const priority = getNotificationPriority(n);
            const aging =
              isReturnRequest && isNotificationAging(n.createdAt, 2) && isPending;
            const auditEntry = getActionAuditFromHistory(n.statusHistory, [
              "return_approved",
              "return_rejected",
              "refund_processed",
            ]);
            const isProcessingMark = markingRead[n.id] || false;

            return (
              <div
                key={n.id || `${n.type}-${n.title}-${n.createdAt || ""}`}
                className={`w-full bg-white border rounded-2xl p-4 shadow-sm transition-all hover:shadow-md ${getPriorityStyles(priority)} ${
                  n.read ? "opacity-70" : ""
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(n.id)}
                      onChange={() => toggleSelected(n.id)}
                      className="mt-1"
                      aria-label={tn("selectNotification")}
                    />
                    <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-gray-400 flex items-center gap-2 flex-wrap">
                      {getNotificationTypeLabel(n.type || "", (key) =>
                        tn(`types.${key}`),
                      )}
                      {aging && (
                        <span className="inline-flex items-center gap-1 text-red-600 normal-case">
                          <AlertTriangle className="w-3 h-3" />
                          {tn("agingBadge")}
                        </span>
                      )}
                      {priority === "high" || priority === "urgent" ? (
                        <span className="text-amber-600 normal-case">
                          {tn(`priority.${priority}`)}
                        </span>
                      ) : null}
                      {isProcessed && (
                        <span className="ml-2 text-green-600 normal-case">
                          • {n.status}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-medium text-black truncate">
                      {n.title}
                    </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Delete notification"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                      onClick={async () => {
                        if (!n.id) {
                          toast.error(tn("invalidId"));
                          return;
                        }
                        try {
                          await deleteNotification(n.id);
                          if (expandedId === n.id) setExpandedId(null);
                        } catch (err: unknown) {
                          toast.error(
                            getApiErrMessage(err, tn("deleteFailed")),
                          );
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Toggle notification details"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!n.id) return;
                        setExpandedId((cur) => (cur === n.id ? null : n.id));
                      }}
                    >
                      <ChevronDown
                        className={
                          "w-4 h-4 transition-transform " +
                          (expandedId === n.id ? "rotate-180" : "rotate-0")
                        }
                      />
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === n.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-3 rounded-xl bg-[#FDFAF5] border border-gray-100 overflow-hidden"
                    >
                      <div className="p-4 space-y-4">
                        <div className="text-xs text-gray-500">
                          {formatDate(n.createdAt)}
                        </div>

                        {n.message && (
                          <p className="text-sm text-gray-700">{n.message}</p>
                        )}

                        {/* MARK AS READ button */}
                        {!n.read && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isProcessingMark}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleMarkAsRead(n.id);
                              }}
                            >
                              {isProcessingMark ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                              MARK AS READ
                            </button>
                          </div>
                        )}

                        {/* Return Pickup Address - Top Level */}
                        {n.returnPickupAddress && (
                          <div className="space-y-3">
                            {renderPickupAddress(n.returnPickupAddress)}
                          </div>
                        )}

                        {/* Return Request Details */}
                        {n.returnData && (
                          <div className="space-y-3 border-t border-gray-200 pt-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                              <Package className="w-4 h-4" />
                              Return Request Details
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <span className="text-xs text-gray-400 block">
                                  Condition
                                </span>
                                <span className="text-sm text-black font-medium">
                                  {n.returnData.condition || "-"}
                                </span>
                              </div>
                              <div>
                                <span className="text-xs text-gray-400 block">
                                  Reason
                                </span>
                                <span className="text-sm text-black font-medium">
                                  {n.returnData.reason || "-"}
                                </span>
                              </div>
                            </div>

                            {n.returnData.comment && (
                              <div>
                                <span className="text-xs text-gray-400 block">
                                  Comment
                                </span>
                                <p className="text-sm text-gray-700 mt-0.5">
                                  {n.returnData.comment}
                                </p>
                              </div>
                            )}

                            {n.returnData.pickupAddress &&
                              renderPickupAddress(n.returnData.pickupAddress)}
                          </div>
                        )}

                        {deepLink && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                <Check className="w-4 h-4" />
                                {tn("quickAction")}
                              </div>
                              <Link
                                href={deepLink.href}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition"
                              >
                                {deepLink.label}
                              </Link>
                            </div>
                          </div>
                        )}

                        {isReturnRequest && (
                          <NotificationReturnStepper status={normalizedStatus} />
                        )}

                        {auditEntry && (
                          <div className="border-t border-gray-200 pt-3 text-xs text-gray-600">
                            {tn("actionAudit", {
                              status: auditEntry.status,
                              actor:
                                typeof auditEntry.changedBy === "object"
                                  ? auditEntry.changedBy?.name || tn("unknownAdmin")
                                  : tn("unknownAdmin"),
                              at: auditEntry.changedAt
                                ? formatDate(auditEntry.changedAt)
                                : "-",
                            })}
                          </div>
                        )}

                        {/* Return Accept/Reject (admin action) */}
                        {isReturnRequest && n.orderId && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                <Check className="w-4 h-4" />
                                Return Review
                              </div>
                              {isPending ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={processingReturn[n.id] || false}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition disabled:opacity-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleAcceptReturn(
                                        n.orderId || n.order_id!,
                                        n.id,
                                      );
                                    }}
                                  >
                                    {processingReturn[n.id] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    {tn("acceptReturn")}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={processingReturn[n.id] || false}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition disabled:opacity-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleRejectReturn(
                                        n.orderId || n.order_id!,
                                        n.id,
                                      );
                                    }}
                                  >
                                    {processingReturn[n.id] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                    {tn("rejectReturn")}
                                  </button>
                                </div>
                              ) : isRefundPending ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    disabled={processingReturn[n.id] || false}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleProcessRefund(
                                        n.orderId || n.order_id!,
                                        n.id,
                                      );
                                    }}
                                  >
                                    {processingReturn[n.id] ? (
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    {tn("processRefund")}
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(n.status || "")}`}
                                >
                                  {n.status || tn("processed")}
                                </span>
                              )}
                            </div>
                            {isPending && (
                              <p className="text-xs text-gray-500 mt-2">
                                {tn("returnReviewHint")}
                              </p>
                            )}
                            {isRefundPending && (
                              <p className="text-xs text-gray-500 mt-2">
                                {tn("refundReviewHint")}
                              </p>
                            )}
                          </div>
                        )}

                        {/* Order Details */}
                        {n.orderId && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                <MapPin className="w-4 h-4" />
                                {tn("orderDetails")}
                              </div>
                              {orderHref && (
                                <Link
                                  href={orderHref}
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  {tn("viewOrder")}
                                </Link>
                              )}
                            </div>

                            {loadingOrdersForDropdown ? (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading order...
                              </div>
                            ) : n.orderType === "retail" ||
                              n.type === "retail_order_placed" ? (
                              retailOrderDetails[n.orderId] ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">
                                      Order ID:
                                    </span>
                                    <span className="font-mono text-black font-medium">
                                      #
                                      {shortenId(
                                        retailOrderDetails[n.orderId]?._id,
                                      )}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">
                                      Status:
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(retailOrderDetails[n.orderId]?.status)}`}
                                    >
                                      {retailOrderDetails[n.orderId]?.status ||
                                        "-"}
                                    </span>
                                  </div>

                                  {retailOrderDetails[n.orderId]?.totalPrice !==
                                    undefined && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <span className="text-gray-500">
                                        Total:
                                      </span>
                                      <span className="text-black font-medium">
                                        AED{" "}
                                        {Number(
                                          retailOrderDetails[n.orderId]
                                            .totalPrice,
                                        ).toFixed(2)}
                                      </span>
                                    </div>
                                  )}

                                  {retailOrderDetails[n.orderId]?.userId
                                    ?.name && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="w-3.5 h-3.5 text-gray-400" />
                                      <span className="text-black">
                                        {
                                          retailOrderDetails[n.orderId].userId
                                            .name
                                        }
                                      </span>
                                    </div>
                                  )}

                                  {Array.isArray(
                                    retailOrderDetails[n.orderId]?.orderItems,
                                  ) &&
                                    retailOrderDetails[n.orderId].orderItems
                                      .length > 0 && (
                                      <div className="mt-2 pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                                          <Package className="w-3.5 h-3.5" />
                                          Items
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-0.5">
                                          {retailOrderDetails[
                                            n.orderId
                                          ].orderItems.map(
                                            (item: any, idx: number) => (
                                              <p key={idx}>
                                                {item.name} ({item.size}) x
                                                {item.quantity}
                                              </p>
                                            ),
                                          )}
                                        </div>
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <p className="text-sm text-gray-500">
                                  Order details not found
                                </p>
                              )
                            ) : customOrderDetails[n.orderId] ? (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">
                                    Order ID:
                                  </span>
                                  <span className="font-mono text-black font-medium">
                                    #
                                    {shortenId(
                                      customOrderDetails[n.orderId]?._id,
                                    )}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                  <span className="text-gray-500">Status:</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customOrderDetails[n.orderId]?.status)}`}
                                  >
                                    {customOrderDetails[n.orderId]?.status ||
                                      "-"}
                                  </span>
                                </div>

                                {customOrderDetails[n.orderId]?.tailorShopId
                                  ?.name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">
                                      Tailor:
                                    </span>
                                    <span className="text-black">
                                      {
                                        customOrderDetails[n.orderId]
                                          .tailorShopId.name
                                      }
                                    </span>
                                  </div>
                                )}

                                {customOrderDetails[n.orderId]?.total !==
                                  undefined && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500">
                                      Total:
                                    </span>
                                    <span className="text-black font-medium">
                                      AED{" "}
                                      {customOrderDetails[
                                        n.orderId
                                      ].total.toFixed(2)}
                                    </span>
                                  </div>
                                )}

                                {customOrderDetails[n.orderId]?.customerId
                                  ?.name && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <User className="w-3.5 h-3.5 text-gray-400" />
                                    <span className="text-black">
                                      {
                                        customOrderDetails[n.orderId].customerId
                                          .name
                                      }
                                    </span>
                                  </div>
                                )}

                                {customOrderDetails[n.orderId]
                                  ?.customerDeliveryAddress && (
                                  <div className="mt-2 pt-2 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-1">
                                      <Home className="w-3.5 h-3.5" />
                                      Pickup Address
                                    </div>
                                    <div className="text-xs text-gray-600 space-y-0.5">
                                      <p>
                                        {
                                          customOrderDetails[n.orderId]
                                            .customerDeliveryAddress.fullName
                                        }
                                      </p>
                                      <p>
                                        {
                                          customOrderDetails[n.orderId]
                                            .customerDeliveryAddress.line1
                                        }
                                      </p>
                                      {customOrderDetails[n.orderId]
                                        .customerDeliveryAddress.line2 && (
                                        <p>
                                          {
                                            customOrderDetails[n.orderId]
                                              .customerDeliveryAddress.line2
                                          }
                                        </p>
                                      )}
                                      <p>
                                        {
                                          customOrderDetails[n.orderId]
                                            .customerDeliveryAddress.city
                                        }
                                        ,{" "}
                                        {
                                          customOrderDetails[n.orderId]
                                            .customerDeliveryAddress.emirate
                                        }
                                      </p>
                                      <p className="text-gray-400">
                                        {
                                          customOrderDetails[n.orderId]
                                            .customerDeliveryAddress.phone
                                        }
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">
                                Order details not found
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                disabled={loadingMore}
                onClick={loadMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {tn("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}