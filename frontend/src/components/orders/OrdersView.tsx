"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import CustomOrdersTab from "@/components/orders/CustomOrdersTab";
import RetailOrdersTab from "@/components/orders/RetailOrdersTab";

type OrdersTab = "custom" | "retail";

type OrdersViewProps = {
  embedded?: boolean;
  initialOrderId?: string | null;
  initialOrderType?: "custom" | "retail" | null;
};

export default function OrdersView({
  embedded = false,
  initialOrderId = null,
  initialOrderType = null,
}: OrdersViewProps) {
  const t = useTranslations("OrdersPage");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const [activeTab, setActiveTab] = useState<OrdersTab>(
    initialOrderType === "retail" ? "retail" : "custom",
  );

  useEffect(() => {
    if (initialOrderType === "retail") {
      setActiveTab("retail");
    } else if (initialOrderType === "custom") {
      setActiveTab("custom");
    }
  }, [initialOrderType]);

  return (
    <div
      className={
        embedded
          ? ""
          : "max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14"
      }
    >
      {!embedded && (
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h1 className="[font-family:var(--font-display)] text-2xl sm:text-[32px] lg:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-2 sm:mb-3">
            {t("title")}
          </h1>
          <p className="[font-family:var(--font-body)] text-xs sm:text-sm lg:text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
            {t("description")}
          </p>
        </div>
      )}

      {embedded && (
        <div className="mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg lg:text-xl font-['TT_Norms_Pro_Mono'] mb-1 sm:mb-2">
            {t("title")}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 font-['TT_Norms_Pro']">
            {t("description")}
          </p>
        </div>
      )}

      <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide">
        <button
          type="button"
          onClick={() => setActiveTab("custom")}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 border text-[8px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] whitespace-nowrap [font-family:var(--font-ui)] transition-all hover:cursor-pointer ${
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
          className={`px-3 sm:px-4 py-1.5 sm:py-2 border text-[8px] sm:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] whitespace-nowrap [font-family:var(--font-ui)] transition-all hover:cursor-pointer ${
            activeTab === "retail"
              ? "bg-black text-white border-black"
              : "text-black border-(--color-border) hover:border-black"
          }`}
        >
          {t("tabs.retail")}
        </button>
      </div>

      <div className="min-h-60 sm:min-h-72 lg:min-h-80">
        {activeTab === "custom" && (
          <CustomOrdersTab locale={locale} initialOrderId={initialOrderId} />
        )}
        {activeTab === "retail" && (
          <RetailOrdersTab locale={locale} initialOrderId={initialOrderId} />
        )}
      </div>
    </div>
  );
}
