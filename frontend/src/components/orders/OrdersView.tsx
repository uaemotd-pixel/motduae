"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import CustomOrdersTab from "@/components/orders/CustomOrdersTab";
import RetailOrdersTab from "@/components/orders/RetailOrdersTab";

type OrdersTab = "custom" | "retail";

export default function OrdersView() {
    const t = useTranslations("OrdersPage");
    const router = useRouter();
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";

    const { isLoading: authLoading, isAuthenticated } = useAuth();
    const [activeTab, setActiveTab] = useState<OrdersTab>("custom");

    useEffect(() => {
        if (authLoading) return;

        if (!isAuthenticated) {
            const redirect = encodeURIComponent(`/${locale}/orders`);
            router.push(`/auth/login?redirect=${redirect}`);
        }
    }, [authLoading, isAuthenticated, locale, router]);

    if (authLoading || !isAuthenticated) {
        return (
            <div className="min-h-[40vh] flex items-center justify-center">
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {t("loading")}
                </p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
            <div className="mb-10">
                <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3">
                    {t("title")}
                </h1>
                <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
                    {t("description")}
                </p>
            </div>

            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                <button
                    type="button"
                    onClick={() => setActiveTab("custom")}
                    className={`px-4 py-2 border text-[10px] uppercase tracking-[0.22em] whitespace-nowrap [font-family:var(--font-ui)] transition-all ${
                        activeTab === "custom"
                            ? "bg-black text-white border-black"
                            : "text-black border-(--color-border) hover:border-black"
                    }`}
                >
                    {t("tabs.custom")}
                </button>
                <button
                    type="button"
                    onClick={() => setActiveTab("retail")}
                    className={`px-4 py-2 border text-[10px] uppercase tracking-[0.22em] whitespace-nowrap [font-family:var(--font-ui)] transition-all ${
                        activeTab === "retail"
                            ? "bg-black text-white border-black"
                            : "text-black border-(--color-border) hover:border-black"
                    }`}
                >
                    {t("tabs.retail")}
                </button>
            </div>

            <div className="min-h-[320px]">
                <div
                    className={activeTab === "custom" ? "" : "hidden"}
                    aria-hidden={activeTab !== "custom"}
                >
                    <CustomOrdersTab locale={locale} />
                </div>
                <div
                    className={activeTab === "retail" ? "" : "hidden"}
                    aria-hidden={activeTab !== "retail"}
                >
                    <RetailOrdersTab locale={locale} />
                </div>
            </div>
        </div>
    );
}
