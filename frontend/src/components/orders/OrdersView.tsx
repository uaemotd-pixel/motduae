"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import CustomOrdersTab from "@/components/orders/CustomOrdersTab";
import RetailOrdersTab from "@/components/orders/RetailOrdersTab";

type OrdersTab = "custom" | "retail";

type OrdersViewProps = {
  embedded?: boolean;
};

export default function OrdersView({ embedded = false }: OrdersViewProps) {
  const t = useTranslations("OrdersPage");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const [activeTab, setActiveTab] = useState<OrdersTab>("custom");

  return (
    <div
      className={
        embedded ? "" : "max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14"
      }
    >
      {!embedded && (
        <div className="mb-10">
          <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3">
            {t("title")}
          </h1>
          <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) max-w-2xl">
            {t("description")}
          </p>
        </div>
      )}

      {embedded && (
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-['TT_Norms_Pro_Mono'] mb-2">
            {t("title")}
          </h2>
          <p className="text-sm text-gray-500 font-['TT_Norms_Pro']">
            {t("description")}
          </p>
        </div>
      )}

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

      <div className="min-h-80">
        {activeTab === "custom" && <CustomOrdersTab locale={locale} />}
        {activeTab === "retail" && <RetailOrdersTab locale={locale} />}
      </div>
    </div>
  );
}
