"use client";

import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import {
    formatOrderDate,
    getDesignDisplayName,
    getFabricDisplayName,
    getOrderHeadline,
    getOrderItemsSummary,
    getTailorDisplayName,
    shortenOrderId,
    type CustomOrderDetail,
    type CustomOrderLineItemSummary,
    type CustomOrderListItem,
} from "@/lib/customOrders";
import OrderTimeline from "@/components/orders/OrderTimeline";

type CustomOrdersTabProps = {
    locale: Locale;
};

export default function CustomOrdersTab({ locale }: CustomOrdersTabProps) {
    const t = useTranslations("OrdersPage.custom");

    const [orders, setOrders] = useState<CustomOrderListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [itemsOpenId, setItemsOpenId] = useState<string | null>(null);
    const [detailById, setDetailById] = useState<Record<string, CustomOrderDetail>>({});
    const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
    const [detailError, setDetailError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await api.get<{
                    success: boolean;
                    orders: CustomOrderListItem[];
                }>("/api/orders/custom/mine");

                if (!data?.success) {
                    throw new Error("Failed to load custom orders");
                }

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
    }, [t]);

    const loadDetail = useCallback(
        async (orderId: string) => {
            if (detailById[orderId]) return;

            try {
                setDetailLoadingId(orderId);
                setDetailError(null);

                const data = await api.get<{
                    success: boolean;
                    order: CustomOrderDetail;
                }>(`/api/orders/custom/${orderId}`);

                if (!data?.success || !data.order) {
                    throw new Error("Failed to load order detail");
                }

                setDetailById((prev) => ({ ...prev, [orderId]: data.order }));
            } catch (err: unknown) {
                const message =
                    (err as ApiError)?.message ||
                    (err instanceof Error ? err.message : t("detailError"));
                setDetailError(message);
            } finally {
                setDetailLoadingId(null);
            }
        },
        [detailById, t],
    );

    const handleToggleTimeline = async (orderId: string) => {
        if (expandedId === orderId) {
            setExpandedId(null);
            return;
        }

        setExpandedId(orderId);
        await loadDetail(orderId);
    };

    const handleToggleItems = (orderId: string, event: MouseEvent) => {
        event.stopPropagation();
        setItemsOpenId((current) => (current === orderId ? null : orderId));
    };

    const renderItemRow = (
        item: CustomOrderLineItemSummary,
        index: number,
        fabricSource: CustomOrderListItem["fabricSource"],
    ) => {
        const designName = getDesignDisplayName(item.design, locale) || t("unknownDesign");
        const fabricName =
            fabricSource === "self"
                ? t("ownFabric")
                : getFabricDisplayName(item.fabric, locale) || t("unknownFabric");
        const tailorName = getTailorDisplayName(item.tailorShop, locale);

        return (
            <li
                key={`${designName}-${index}`}
                className="px-3 py-2.5 border-b border-(--color-border) last:border-b-0 bg-white"
            >
                <p className="[font-family:var(--font-display)] text-[14px] text-black mb-1">
                    {designName}
                </p>
                <div className="flex flex-wrap gap-x-3 gap-y-1 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.14em] text-(--color-grey-muted)">
                    {tailorName ? <span>{tailorName}</span> : null}
                    <span>{fabricName}</span>
                    {item.fabricMeters != null && (
                        <span>
                            {item.fabricMeters} {t("meters")}
                        </span>
                    )}
                </div>
            </li>
        );
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
                <p className="[font-family:var(--font-display)] text-[22px] mb-3">{t("emptyTitle")}</p>
                <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted) mb-6 max-w-md mx-auto">
                    {t("emptyDescription")}
                </p>
                <Link
                    href="/custom-order/fabric"
                    className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
                >
                    {t("startOrder")}
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {orders.map((order) => {
                const isExpanded = expandedId === order.id;
                const isItemsOpen = itemsOpenId === order.id;
                const detail = detailById[order.id];
                const items = getOrderItemsSummary(order);
                const headline = getOrderHeadline(order, locale, {
                    singleFallback: t("unknownDesign"),
                    multiple: (count) => t("multipleItemsTitle", { count }),
                });
                const tailorName = getTailorDisplayName(order.tailorShop, locale);
                const showItemsToggle = items.length > 0;

                return (
                    <article
                        key={order.id}
                        className={`border border-(--color-border) bg-white ${isItemsOpen ? "relative z-10" : ""}`}
                    >
                        <div className="p-5 sm:p-6">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2">
                                        {t("orderId", { id: shortenOrderId(order.id) })}
                                    </p>
                                    <h3 className="[font-family:var(--font-display)] text-[20px] mb-1">
                                        {headline}
                                    </h3>
                                    {items.length === 1 && tailorName && (
                                        <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
                                            {tailorName}
                                        </p>
                                    )}
                                    {showItemsToggle && (
                                        <div className="mt-3">
                                            <button
                                                type="button"
                                                onClick={(event) => handleToggleItems(order.id, event)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 border border-(--color-border) bg-white hover:bg-[#FDFAF5] transition [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-black"
                                                aria-expanded={isItemsOpen}
                                            >
                                                {t("viewItems", { count: items.length })}
                                                <span
                                                    className={`text-[12px] transition-transform ${isItemsOpen ? "rotate-180" : ""}`}
                                                    aria-hidden
                                                >
                                                    ▾
                                                </span>
                                            </button>

                                            {isItemsOpen && (
                                                <div className="mt-2 max-w-md border border-(--color-border) bg-[#FDFAF5]">
                                                    <p className="px-3 py-2 border-b border-(--color-border) [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                                                        {t("itemsDropdownTitle")}
                                                    </p>
                                                    <ul>
                                                        {items.map((item, index) =>
                                                            renderItemRow(
                                                                item,
                                                                index,
                                                                order.fabricSource,
                                                            ),
                                                        )}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-2">
                                        {formatOrderDate(order.date, locale)}
                                    </p>
                                </div>

                                <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                                    <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-1">
                                        {t(`statuses.${order.status}`)}
                                    </span>
                                    {order.total !== undefined && (
                                        <span className="[font-family:var(--font-display)] text-[18px] text-black">
                                            {formatCurrency(order.total, locale)}
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => handleToggleTimeline(order.id)}
                                        className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) hover:text-black transition"
                                        aria-expanded={isExpanded}
                                    >
                                        {isExpanded ? t("hideTimeline") : t("viewTimeline")}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="border-t border-(--color-border) p-5 sm:p-6 bg-[#FDFAF5]">
                                {detailLoadingId === order.id && (
                                    <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted) py-4">
                                        {t("loadingDetail")}
                                    </p>
                                )}

                                {detailError && detailLoadingId !== order.id && !detail && (
                                    <p className="text-red-600 text-sm py-4">{detailError}</p>
                                )}

                                {detail && (
                                    <>
                                        <h4 className="[font-family:var(--font-display)] text-[18px] mb-4">
                                            {t("timelineTitle")}
                                        </h4>
                                        <OrderTimeline
                                            currentStatus={detail.status}
                                            statusHistory={detail.statusHistory || []}
                                            locale={locale}
                                        />
                                    </>
                                )}
                            </div>
                        )}
                    </article>
                );
            })}
        </div>
    );
}
