"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import {
    formatOrderDate,
    getDesignDisplayName,
    getTailorDisplayName,
    shortenOrderId,
    type CustomOrderDetail,
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
    }, []);

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

    const handleToggle = async (orderId: string) => {
        if (expandedId === orderId) {
            setExpandedId(null);
            return;
        }

        setExpandedId(orderId);
        await loadDetail(orderId);
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
                const detail = detailById[order.id];
                const designName = getDesignDisplayName(order.design, locale);
                const tailorName = getTailorDisplayName(order.tailorShop, locale);

                return (
                    <article
                        key={order.id}
                        className="border border-(--color-border) bg-white overflow-hidden"
                    >
                        <button
                            type="button"
                            onClick={() => handleToggle(order.id)}
                            className="w-full text-left p-5 sm:p-6 hover:bg-[#FDFAF5] transition"
                            aria-expanded={isExpanded}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                <div>
                                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2">
                                        {t("orderId", { id: shortenOrderId(order.id) })}
                                    </p>
                                    <h3 className="[font-family:var(--font-display)] text-[20px] mb-1">
                                        {designName || t("unknownDesign")}
                                    </h3>
                                    {tailorName && (
                                        <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
                                            {tailorName}
                                        </p>
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
                                    <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                                        {isExpanded ? t("hideTimeline") : t("viewTimeline")}
                                    </span>
                                </div>
                            </div>
                        </button>

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
