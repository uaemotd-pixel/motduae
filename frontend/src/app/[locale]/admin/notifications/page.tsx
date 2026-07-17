"use client";

import { useEffect, useMemo, useState } from "react";
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
  Phone,
  Mail,
  Home,
  Truck,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import type { Locale } from "@/i18n/routing";
import { useParams } from "next/navigation";

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message?: string;
  createdAt?: string;
  read?: boolean;
  orderId?: string;
  order_id?: string;
  tailorId?: string | null;
  returnPickupAddress?: {
    fullName: string;
    line1: string;
    line2?: string;
    city: string;
    emirate?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    phone: string;
  };
  returnData?: {
    condition: string;
    reason: string;
    comment: string;
    pickupAddress: {
      fullName: string;
      line1: string;
      line2?: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      phone: string;
    };
  };
  status?: string;
};

function getApiErrMessage(err: unknown, fallback: string) {
  const msg = (err as ApiError)?.message;
  if (msg) return msg;
  return err instanceof Error ? err.message : fallback;
}

function shortenId(id: string): string {
  if (!id) return "";
  return id.length > 8 ? id.slice(0, 8) : id;
}

export default function AdminNotificationsPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const t = useTranslations("Admin");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [customOrderDetails, setCustomOrderDetails] = useState<
    Record<string, any>
  >({});
  const [loadingOrdersForDropdown, setLoadingOrdersForDropdown] =
    useState(false);
  const [processingReturn, setProcessingReturn] = useState<
    Record<string, boolean>
  >({});
  const [markingRead, setMarkingRead] = useState<Record<string, boolean>>({});
  const [markAllLoading, setMarkAllLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await api.get<{
          success: boolean;
          notifications: any[];
        }>("/api/admin/notifications");

        if (!res?.success) {
          throw new Error("Failed to load notifications");
        }

        const normalized: NotificationItem[] = (res.notifications || []).map(
          (raw) => {
            const id = raw?.id ?? raw?._id;
            return {
              ...(raw || {}),
              id: typeof id === "string" ? id : "",
              orderId:
                typeof raw?.orderId === "string"
                  ? raw.orderId
                  : typeof raw?.order_id === "string"
                    ? raw.order_id
                    : undefined,
              returnPickupAddress:
                raw?.returnPickupAddress ||
                raw?.return_pickup_address ||
                undefined,
              returnData: raw?.returnData || raw?.return_data || undefined,
              status: raw?.status || "pending",
              read: typeof raw?.read === "boolean" ? raw.read : false,
              tailorId: typeof raw?.tailorId === "string" ? raw.tailorId : null,
            };
          },
        );

        setItems(normalized.filter((x) => !!x.id));
      } catch (err: unknown) {
        setError(getApiErrMessage(err, t("loading") || "Failed to load"));
      } finally {
        setLoading(false);
      }
    };

    run();
  }, []);

  useEffect(() => {
    const loadOrderDetailsIfNeeded = async () => {
      if (!expandedId) return;

      const n = items.find((x) => x.id === expandedId);
      const orderId = n?.orderId;
      if (!orderId) return;
      if (customOrderDetails[orderId]) return;

      setLoadingOrdersForDropdown(true);
      try {
        const res = await api.get<any>("/api/admin/orders/custom");
        const ordersData = Array.isArray(res) ? res : res?.items || [];
        const found = ordersData.find((o: any) => o._id === orderId);
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
  }, [expandedId]);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });
  }, [items]);

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
      await api.post(`/api/admin/notifications/mark-read`, {
        id: notificationId,
      });

      setItems((prev) =>
        prev.map((it) =>
          it.id === notificationId ? { ...it, read: true } : it,
        ),
      );

      toast.success("Marked as read");
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, "Failed to mark as read"));
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
      await api.post(`/api/admin/orders/custom/${orderId}/return-accept`, {});

      setItems((prev) =>
        prev.map((it) =>
          it.id === notificationId
            ? { ...it, status: "approved", read: true }
            : it,
        ),
      );

      toast.success("Return request accepted. Customer will be notified.");
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, "Failed to accept return request"));
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

      setItems((prev) =>
        prev.map((it) =>
          it.id === notificationId
            ? { ...it, status: "rejected", read: true }
            : it,
        ),
      );

      toast.success("Return request rejected.");
    } catch (err: unknown) {
      toast.error(getApiErrMessage(err, "Failed to reject return request"));
    } finally {
      setProcessingReturn((prev) => ({ ...prev, [notificationId]: false }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            Notifications
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Return requests and other admin alerts.
          </p>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <Bell className="w-4 h-4" />
          <span className="text-sm">
            {sortedItems.filter((x) => !x.read).length}
          </span>
          <button
            type="button"
            disabled={
              markAllLoading || sortedItems.filter((x) => !x.read).length === 0
            }
            className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer"
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();

              const unreadIds = sortedItems
                .filter((x) => !x.read)
                .map((x) => x.id)
                .filter(Boolean);
              if (unreadIds.length === 0) return;

              setMarkAllLoading(true);
              try {
                await api.post(`/api/admin/notifications/mark-all-read`, {});
                setItems((prev) => prev.map((it) => ({ ...it, read: true })));
                toast.success("All notifications marked as read");
              } catch (err: unknown) {
                toast.error(
                  getApiErrMessage(err, "Failed to mark all as read"),
                );
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
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-16 shadow-sm">
          <Bell className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-gray-500 max-w-md">No notifications yet.</p>
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
              normalizedStatus === "return_requested" ||
              normalizedStatus === "approved";

            const isProcessed =
              n.status === "approved" ||
              n.status === "rejected" ||
              n.status === "refund_processed";

            const isProcessingMark = markingRead[n.id] || false;

            return (
              <div
                key={n.id || `${n.type}-${n.title}-${n.createdAt || ""}`}
                className={
                  "w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md " +
                  (n.read ? "opacity-70" : "")
                }
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-gray-400">
                      {(() => {
                        // Convert backend `type` into readable label.
                        const type = n.type || "";
                        const key = type.toLowerCase();

                        if (key === "user_customer_registered") {
                          return "New customer is registered";
                        }
                        if (key === "user_tailor_registered") {
                          return "New tailor is registered";
                        }
                        if (key === "user_fabric_store_registered") {
                          return "New fabric store is registered";
                        }

                        if (key === "retail_order_placed") {
                          return "New ready-made order";
                        }

                        if (key === "custom_order_placed") {
                          return "New custom order";
                        }

                        return type || "notification";
                      })()}
                      {isProcessed && (
                        <span className="ml-2 text-green-600">
                          • {n.status}
                        </span>
                      )}
                    </div>
                    <div className="text-base font-medium text-black truncate">
                      {n.title}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Delete notification"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                      onClick={async () => {
                        if (!n.id) {
                          toast.error("Invalid notification id");
                          return;
                        }
                        try {
                          await api.delete(`/api/admin/notifications/${n.id}`);
                          setItems((prev) => prev.filter((x) => x.id !== n.id));
                          if (expandedId === n.id) setExpandedId(null);
                        } catch (err: unknown) {
                          toast.error(
                            getApiErrMessage(
                              err,
                              "Failed to delete notification",
                            ),
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

                        {/* Tailor approval notification (admin action link) */}
                        {n.type === "user_tailor_registered" && n.tailorId && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                <Check className="w-4 h-4" />
                                Tailor Approval
                              </div>
                              <a
                                href={`/${locale}/admin/tailors`}
                                onClick={(e) => {
                                  // allow normal navigation
                                  e.stopPropagation();
                                }}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition"
                              >
                                Approve Tailor
                              </a>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Review and approve the registered tailor.
                            </p>
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
                                    Accept Return Request
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
                                    Reject
                                  </button>
                                </div>
                              ) : (
                                <span
                                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(n.status || "")}`}
                                >
                                  {n.status || "Processed"}
                                </span>
                              )}
                            </div>
                            {isPending && (
                              <p className="text-xs text-gray-500 mt-2">
                                Admin approval will notify the customer
                                dashboard.
                              </p>
                            )}
                          </div>
                        )}

                        {/* Order Details */}
                        {n.orderId && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex items-center gap-2 text-xs font-medium text-gray-600 mb-2">
                              <MapPin className="w-4 h-4" />
                              Order Details
                            </div>

                            {loadingOrdersForDropdown ? (
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading order...
                              </div>
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
        </div>
      )}
    </div>
  );
}