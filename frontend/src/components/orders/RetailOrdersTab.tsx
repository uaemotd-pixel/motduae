"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import {
  formatOrderDate,
  shortenOrderId,
  type RetailOrderListItem,
} from "@/lib/customOrders";
import { resolveReadyMadeImage } from "@/lib/readyMade";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";

type RetailOrdersTabProps = {
  locale: Locale;
  initialOrderId?: string | null;
};

export default function RetailOrdersTab({
  locale,
  initialOrderId = null,
}: RetailOrdersTabProps) {
  const t = useTranslations("OrdersPage.retail");
  const [orders, setOrders] = useState<RetailOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<{
          success: boolean;
          orders: RetailOrderListItem[];
        }>("/api/orders/retail/mine");
        if (!data?.success) throw new Error("Failed to load ready-made orders");
        setOrders(data.orders || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : t("error"));
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  useEffect(() => {
    if (!initialOrderId || loading) return;
    const match = orders.find((o) => o.id === initialOrderId);
    if (match) {
      setExpandedId(initialOrderId);
    }
  }, [initialOrderId, loading, orders]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <div className="space-y-3 py-4" role="status" aria-label="Loading">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border border-(--color-border) bg-white p-4 space-y-3"
          >
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-center text-red-600 py-12 sm:py-16 text-sm sm:text-base">
        {error}
      </p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12 sm:py-16 border border-(--color-border) bg-[#FDFAF5] px-4 sm:px-6">
        <p className="[font-family:var(--font-display)] text-lg sm:text-[22px] mb-2 sm:mb-3">
          {t("emptyTitle")}
        </p>
        <p className="[font-family:var(--font-body)] text-sm sm:text-[14px] text-(--color-grey-muted) mb-4 sm:mb-6 max-w-md mx-auto">
          {t("emptyDescription")}
        </p>
        <Link
          href="/#ready-made"
          className="inline-block px-6 sm:px-8 py-2 sm:py-3 bg-black text-white text-[8px] sm:text-[10px] tracking-[0.18em] sm:tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
        >
          {t("browseReadyMade")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {orders.map((order) => {
        const isMulti = order.items.length > 1;
        const isExpanded = expandedId === order.id;

        return (
          <article
            key={order.id}
            className="border border-(--color-border) bg-white p-4 sm:p-5 md:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              {/* Left section */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 sm:gap-4">
                  {/* First item image always shown */}
                  {order.items[0]?.image && (
                    <div className="w-14 h-14 sm:w-16 sm:h-16 shrink-0 bg-[#F0EBE3] overflow-hidden">
                      <img
                        src={resolveReadyMadeImage(order.items[0].image)}
                        alt={order.items[0].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="[font-family:var(--font-ui)] text-[8px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.24em] text-(--color-grey-muted) mb-1.5 sm:mb-2">
                      {t("orderId", { id: shortenOrderId(order.id) })}
                    </p>
                    {/* Summary: show first item name + count if multi */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h3 className="[font-family:var(--font-display)] text-base sm:text-[18px] truncate">
                        {order.items[0]?.name || t("unknownItem")}
                      </h3>
                      {isMulti && (
                        <span className="[font-family:var(--font-ui)] text-[8px] sm:text-[10px] text-(--color-grey-muted) bg-[#F0EBE3] px-1.5 sm:px-2 py-0.5 rounded shrink-0">
                          +{order.items.length - 1} more
                        </span>
                      )}
                    </div>
                    {!isMulti && (
                      <>
                        {order.items[0]?.size && (
                          <p className="[font-family:var(--font-ui)] text-[8px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-(--color-grey-muted) mt-0.5 sm:mt-1">
                            {t("size")}: {order.items[0].size}
                          </p>
                        )}
                        <p className="[font-family:var(--font-ui)] text-[8px] sm:text-[10px] text-(--color-grey-muted) mt-0.5">
                          Quantity: {order.items[0].quantity}
                        </p>
                      </>
                    )}
                    <p className="[font-family:var(--font-ui)] text-[8px] sm:text-[10px] uppercase tracking-[0.14em] sm:tracking-[0.16em] text-(--color-grey-muted) mt-1.5 sm:mt-2">
                      {formatOrderDate(order.date.toString(), locale)}
                    </p>
                  </div>
                </div>

                {/* Expandable details for multi-item orders */}
                {isMulti && (
                  <div className="mt-2 sm:mt-3 pl-13 sm:pl-17 md:pl-18">
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="flex items-center gap-1 text-[10px] sm:text-xs [font-family:var(--font-ui)] text-(--color-grey-muted) hover:text-black transition hover:cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp
                            size={14}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          />{" "}
                          Hide items
                        </>
                      ) : (
                        <>
                          <ChevronDown
                            size={14}
                            className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                          />{" "}
                          Show all items
                        </>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-3 space-y-3 border-t border-(--color-border) pt-3">
                        {order.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-3 sm:gap-4"
                          >
                            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#F0EBE3] overflow-hidden rounded shrink-0">
                              <img
                                src={resolveReadyMadeImage(item.image)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="[font-family:var(--font-body)] text-xs sm:text-sm text-black truncate">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap gap-2 sm:gap-3 text-[8px] sm:text-[10px] [font-family:var(--font-ui)] text-(--color-grey-muted) uppercase tracking-[0.14em] sm:tracking-[0.16em]">
                                {item.size && (
                                  <span>
                                    {t("size")}: {item.size}
                                  </span>
                                )}
                                <span>× {item.quantity}</span>
                                <span>
                                  {formatCurrency(item.price, locale)} each
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="[font-family:var(--font-display)] text-xs sm:text-sm">
                                {formatCurrency(
                                  item.price * item.quantity,
                                  locale,
                                )}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right: status & total */}
              <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
                <span className="[font-family:var(--font-ui)] text-[8px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.18em] bg-black text-white px-1.5 sm:px-2.5 py-0.5 sm:py-1 whitespace-nowrap">
                  {t(`statuses.${order.status}`, {
                    defaultValue: order.status,
                  })}
                </span>
                {order.totalPrice !== undefined && (
                  <span className="[font-family:var(--font-display)] text-base sm:text-[18px] text-black whitespace-nowrap">
                    {formatCurrency(order.totalPrice, locale)}
                  </span>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
