"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { formatCurrency } from "@/lib/format";
import type { Locale } from "@/i18n/routing";
import { formatOrderDate, shortenOrderId, type RetailOrderListItem } from "@/lib/customOrders";
import { resolveReadyMadeImage } from "@/lib/readyMade";

type RetailOrdersTabProps = {
    locale: Locale;
};

export default function RetailOrdersTab({ locale }: RetailOrdersTabProps) {
    const t = useTranslations("OrdersPage.retail");

    const [orders, setOrders] = useState<RetailOrderListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await api.get<{
                    success: boolean;
                    orders: RetailOrderListItem[];
                }>("/api/orders/retail/mine");

                if (!data?.success) {
                    throw new Error("Failed to load ready-made orders");
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
            {orders.map((order) => (
                <article
                    key={order.id}
                    className="border border-(--color-border) bg-white p-5 sm:p-6"
                >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-4">
                            {order.firstItem?.image && (
                                <div className="w-16 h-16 shrink-0 bg-[#F0EBE3] overflow-hidden">
                                    <img
                                        src={resolveReadyMadeImage(order.firstItem.image)}
                                        alt={order.firstItem.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            )}
                            <div>
                                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2">
                                    {t("orderId", { id: shortenOrderId(order.id) })}
                                </p>
                                <h3 className="[font-family:var(--font-display)] text-[18px] mb-1">
                                    {order.firstItem?.name || t("unknownItem")}
                                </h3>
                                {order.firstItem?.size && (
                                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted)">
                                        {t("size")}: {order.firstItem.size}
                                    </p>
                                )}
                                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted) mt-2">
                                    {formatOrderDate(order.date, locale)}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                            <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] bg-black text-white px-2.5 py-1">
                                {t(`statuses.${order.status}`, { defaultValue: order.status })}
                            </span>
                            {order.totalPrice !== undefined && (
                                <span className="[font-family:var(--font-display)] text-[18px] text-black">
                                    {formatCurrency(order.totalPrice, locale)}
                                </span>
                            )}
                        </div>
                    </div>
                </article>
            ))}
        </div>
    );
}
