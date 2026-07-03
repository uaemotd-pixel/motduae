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
import { ChevronDown, ChevronUp } from "lucide-react"; // or custom icon

type RetailOrdersTabProps = {
  locale: Locale;
};

export default function RetailOrdersTab({ locale }: RetailOrdersTabProps) {
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

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return (
      <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-center py-16 text-(--color-grey-muted)">
        {t("loading")}
      </p>
    );
  }

  if (error) {
    return <p className="text-center text-red-600 py-16">{error}</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-16 border border-(--color-border) bg-[#FDFAF5] px-6">
        <p className="[font-family:var(--font-display)] text-[22px] mb-3">
          {t("emptyTitle")}
        </p>
        <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) mb-6 max-w-md mx-auto">
          {t("emptyDescription")}
        </p>
        <Link
          href="/#ready-made"
          className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
        >
          {t("browseReadyMade")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => {
        const isMulti = order.items.length > 1;
        const isExpanded = expandedId === order.id;

        return (
          <article
            key={order.id}
            className="border border-(--color-border) bg-white p-5 sm:p-6"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              {/* Left section */}
              <div className="flex-1">
                <div className="flex items-start gap-4">
                  {/* First item image always shown */}
                  {order.items[0]?.image && (
                    <div className="w-16 h-16 shrink-0 bg-[#F0EBE3] overflow-hidden">
                      <img
                        src={resolveReadyMadeImage(order.items[0].image)}
                        alt={order.items[0].name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2">
                      {t("orderId", { id: shortenOrderId(order.id) })}
                    </p>
                    {/* Summary: show first item name + count if multi */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="[font-family:var(--font-display)] text-[18px]">
                        {order.items[0]?.name || t("unknownItem")}
                      </h3>
                      {isMulti && (
                        <span className="[font-family:var(--font-ui)] text-[10px] text-(--color-grey-muted) bg-[#F0EBE3] px-2 py-0.5 rounded">
                          +{order.items.length - 1} more
                        </span>
                      )}
                    </div>
                    {!isMulti && (
                      <>
                        {order.items[0]?.size && (
                          <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-1">
                            {t("size")}: {order.items[0].size}
                          </p>
                        )}
                        <p className="[font-family:var(--font-ui)] text-[10px] text-(--color-grey-muted) mt-0.5">
                          Quantity: {order.items[0].quantity}
                        </p>
                      </>
                    )}
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-2">
                      {formatOrderDate(order.date.toString(), locale)}
                    </p>
                  </div>
                </div>

                {/* Expandable details for multi-item orders */}
                {isMulti && (
                  <div className="mt-3 pl-20">
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="flex items-center gap-1 text-xs [font-family:var(--font-ui)] text-(--color-grey-muted) hover:text-black transition"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} /> Hide items
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} /> Show all items
                        </>
                      )}
                    </button>
                    {isExpanded && (
                      <div className="mt-3 space-y-3 border-t border-(--color-border) pt-3">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[#F0EBE3] overflow-hidden rounded shrink-0">
                              <img
                                src={resolveReadyMadeImage(item.image)}
                                alt={item.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="[font-family:var(--font-body)] text-sm text-black">
                                {item.name}
                              </p>
                              <div className="flex flex-wrap gap-3 text-[10px] [font-family:var(--font-ui)] text-(--color-grey-muted) uppercase tracking-[0.16em]">
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
                            <div className="text-right">
                              <span className="[font-family:var(--font-display)] text-sm">
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
              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-1">
                  {t(`statuses.${order.status}`, {
                    defaultValue: order.status,
                  })}
                </span>
                {order.totalPrice !== undefined && (
                  <span className="[font-family:var(--font-display)] text-[18px] text-black">
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
