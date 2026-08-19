"use client";

import type { Locale } from "@/i18n/routing";
import type {
  CustomOrderStatus,
  CustomOrderStatusHistoryEntry,
  CustomOrderShipmentSummary,
} from "@/lib/customOrders";
import OrderTimeline from "@/components/orders/OrderTimeline";
import RetailOrderTimeline from "@/components/orders/RetailOrderTimeline";
import ShipmentList from "@/components/orders/ShipmentList";

type OrderProgressPanelProps = {
  variant: "custom" | "retail";
  currentStatus: string;
  statusHistory: CustomOrderStatusHistoryEntry[];
  shipments?: CustomOrderShipmentSummary[] | null;
  locale: Locale;
  visibility?: "customer" | "internal";
  hasReturnItems?: boolean;
  compact?: boolean;
};

export default function OrderProgressPanel({
  variant,
  currentStatus,
  statusHistory,
  shipments,
  locale,
  visibility = "customer",
  hasReturnItems = false,
  compact = false,
}: OrderProgressPanelProps) {
  return (
    <div
      className={`grid grid-cols-1 ${
        compact ? "lg:grid-cols-2 gap-4" : "md:grid-cols-2 gap-6"
      }`}
    >
      <div>
        {variant === "custom" ? (
          <OrderTimeline
            currentStatus={currentStatus as CustomOrderStatus}
            statusHistory={statusHistory}
            locale={locale}
            hasReturnItems={hasReturnItems}
          />
        ) : (
          <RetailOrderTimeline
            currentStatus={currentStatus}
            statusHistory={statusHistory}
            locale={locale}
          />
        )}
      </div>
      <ShipmentList
        shipments={shipments}
        locale={locale}
        visibility={visibility}
        compact={compact}
      />
    </div>
  );
}
