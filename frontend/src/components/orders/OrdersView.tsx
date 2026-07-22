"use client";

import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import CustomOrdersTab from "@/components/orders/CustomOrdersTab";

type OrdersViewProps = {
  embedded?: boolean;
  initialOrderId?: string | null;
  initialOrderType?: "custom" | "retail" | null;
};

export default function OrdersView({
  embedded = false,
  initialOrderId = null,
}: OrdersViewProps) {
  const t = useTranslations("OrdersPage");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

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

      <div className="min-h-60 sm:min-h-72 lg:min-h-80">
        <CustomOrdersTab locale={locale} initialOrderId={initialOrderId} />
      </div>
    </div>
  );
}
