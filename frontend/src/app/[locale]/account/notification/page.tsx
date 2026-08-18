"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import Image from "next/image";
import {
  Bell,
  Loader2,
  ChevronDown,
  Trash2,
  Check,
  Package,
  Star,
  Maximize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { useNotifications } from "@/hooks/useNotifications";
import {
  getNotificationTypeLabel,
  getOrderDetailHref,
  getReviewHref,
  isReviewPromptType,
  type NotificationItem,
} from "@/lib/notifications";
import { formatCurrency } from "@/lib/format";
import {
  getDesignDisplayName,
  isCustomOrderStatus,
  type CustomOrderStatus,
  type CustomOrderStatusHistoryEntry,
} from "@/lib/customOrders";
import { resolveReadyMadeImage } from "@/lib/readyMade";
import OrderTimeline from "@/components/orders/OrderTimeline";
import { ImageModal } from "@/components/shared/ImageModal";
import { Skeleton } from "@/components/ui/Skeleton";

function getApiErrMessage(err: unknown, fallback: string) {
  const msg = (err as { message?: string })?.message;
  if (msg) return msg;
  return err instanceof Error ? err.message : fallback;
}

function formatDate(value?: string) {
  if (!value) return "";
  try {
    return new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function NotificationOrderSummary({
  notification,
  locale,
  onImageClick,
}: {
  notification: NotificationItem;
  locale: Locale;
  onImageClick?: (imageUrl: string) => void;
}) {
  const t = useTranslations("Account.Notifications");
  const summary = notification.orderSummary;
  if (!summary) return null;

  const designName =
    summary.designName || summary.itemName
      ? summary.designName
        ? getDesignDisplayName(
            { name: summary.designName, nameAr: summary.designNameAr },
            locale,
          )
        : summary.itemName
      : null;

  const imageSrc = summary.image
    ? summary.image.startsWith("http") || summary.image.startsWith("/")
      ? summary.image
      : resolveReadyMadeImage(summary.image)
    : null;

  return (
    <div className="flex gap-3 sm:gap-4 p-3 rounded-xl bg-gray-50 border border-gray-100">
      <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-lg overflow-hidden bg-gray-200 flex items-center justify-center relative group">
        {imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={designName || t("orderLabel")}
              width={80}
              height={80}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onImageClick?.(imageSrc);
              }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:cursor-pointer"
            >
              <Maximize2 className="w-5 h-5 text-white" />
            </button>
          </>
        ) : (
          <Package className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        {designName && (
          <p className="text-sm font-medium text-black truncate">
            {designName}
          </p>
        )}
        {typeof summary.total === "number" && (
          <p className="text-sm text-gray-600">
            {t("orderTotal")}: {formatCurrency(summary.total, locale)}
          </p>
        )}
        {typeof summary.refundAmount === "number" && (
          <p className="text-sm font-medium text-green-700">
            {t("refundAmount")}: {formatCurrency(summary.refundAmount, locale)}
          </p>
        )}
        {summary.status && (
          <p className="text-xs uppercase tracking-wide text-gray-400">
            {t("orderStatus")}: {summary.status.replace(/_/g, " ")}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CustomerNotificationPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const t = useTranslations("Account.Notifications");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [readFilter, setReadFilter] = useState<"" | "true" | "false">("");
  const [searchQuery, setSearchQuery] = useState("");
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [markingRead, setMarkingRead] = useState<Record<string, boolean>>({});
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string>("");

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
  } = useNotifications({
    audience: "customer",
    initialFilters: { page: 1, limit: 20 },
    refreshListOnPoll: true,
    pollIntervalMs: 30000,
  });

  const handleFilterChange = async (
    nextRead: "" | "true" | "false",
    nextSearch: string,
  ) => {
    setReadFilter(nextRead);
    setSearchQuery(nextSearch);
    await applyFilters({
      read: nextRead || undefined,
      search: nextSearch.trim() || undefined,
    });
  };

  const handleImageClick = (imageUrl: string) => {
    if (imageUrl) {
      setSelectedImage(imageUrl);
      setImageModalOpen(true);
    }
  };

  const typeLabel = (type: string) =>
    getNotificationTypeLabel(type, (key) => t(`types.${key}`));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-light text-black tracking-tight">
            {t("title")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">{t("subtitle")}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleFilterChange(readFilter, e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          />
          <select
            value={readFilter}
            onChange={(e) =>
              handleFilterChange(
                e.target.value as "" | "true" | "false",
                searchQuery,
              )
            }
            className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
          >
            <option value="">{t("filterAll")}</option>
            <option value="false">{t("filterUnread")}</option>
            <option value="true">{t("filterRead")}</option>
          </select>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <Bell className="w-4 h-4" />
          <span className="text-sm">{unreadCount}</span>
          <button
            type="button"
            disabled={markAllLoading || unreadCount === 0}
            className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 hover:cursor-pointer"
            onClick={async () => {
              setMarkAllLoading(true);
              try {
                await markAllAsRead();
                toast.success(t("markedAllAsRead"));
              } catch (err: unknown) {
                toast.error(getApiErrMessage(err, t("markAllFailed")));
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
            {t("markedAllAsRead").toUpperCase()}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="p-6 text-red-600">{error}</div>
      ) : sortedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center bg-white rounded-2xl border border-gray-100 py-16 shadow-sm px-6">
          <Bell className="w-12 h-12 text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-700 mb-2">
            {t("emptyTitle")}
          </p>
          <p className="text-gray-500 max-w-md text-sm leading-relaxed">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((n) => {
            const isProcessingMark = markingRead[n.id] || false;
            const orderHref = getOrderDetailHref({
              ...n,
              audience: "customer",
            });
            const showTimeline =
              n.statusHistory &&
              n.statusHistory.length > 0 &&
              n.status &&
              isCustomOrderStatus(n.status);

            return (
              <div
                key={n.id}
                className={
                  "w-full bg-white border border-gray-100 rounded-2xl p-4 shadow-sm transition-all hover:shadow-md " +
                  (n.read ? "opacity-70" : "")
                }
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-wider text-gray-400">
                      {typeLabel(n.type)}
                    </div>
                    <div className="text-base font-medium text-black truncate">
                      {n.title}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Delete notification"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          await deleteNotification(n.id);
                          if (expandedId === n.id) setExpandedId(null);
                          toast.success(t("deleteSuccess"));
                        } catch (err: unknown) {
                          toast.error(getApiErrMessage(err, t("deleteFailed")));
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      aria-label="Toggle notification details"
                      className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 hover:text-black transition"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
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
                      className="mt-3 text-sm text-gray-700 space-y-3"
                    >
                      {n.message ? <p>{n.message}</p> : null}

                      <NotificationOrderSummary
                        notification={n}
                        locale={locale}
                        onImageClick={handleImageClick}
                      />

                      {showTimeline && n.status && (
                        <div className="border-t border-gray-100 pt-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
                            {t("timelineTitle")}
                          </p>
                          <OrderTimeline
                            currentStatus={n.status as CustomOrderStatus}
                            statusHistory={
                              (n.statusHistory ||
                                []) as CustomOrderStatusHistoryEntry[]
                            }
                            locale={locale}
                            hasReturnItems={[
                              "return_requested",
                              "return_approved",
                              "return_rejected",
                              "refund_processed",
                            ].includes(n.status as CustomOrderStatus)}
                          />
                        </div>
                      )}

                      {!n.read && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={isProcessingMark}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50"
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMarkingRead((prev) => ({
                                ...prev,
                                [n.id]: true,
                              }));
                              try {
                                await markAsRead(n.id);
                                toast.success(t("markedAsRead"));
                              } catch (err: unknown) {
                                toast.error(
                                  getApiErrMessage(err, t("markReadFailed")),
                                );
                              } finally {
                                setMarkingRead((prev) => ({
                                  ...prev,
                                  [n.id]: false,
                                }));
                              }
                            }}
                          >
                            {isProcessingMark ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3 h-3" />
                            )}
                            {t("markedAsRead").toUpperCase()}
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        {(n.orderId || n.order_id) && orderHref && (
                          <Link
                            href={orderHref}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
                          >
                            {t("viewOrder")}
                          </Link>
                        )}
                        {isReviewPromptType(n.type) && (
                          <Link
                            href={getReviewHref()}
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-800"
                          >
                            <Star className="w-3.5 h-3.5" />
                            {t("leaveReview")}
                          </Link>
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
                {t("loadMore")}
              </button>
            </div>
          )}
        </div>
      )}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt="Wishlist Item Image"
        onClose={() => {
          setImageModalOpen(false);
          setSelectedImage("");
        }}
      />
    </div>
  );
}
