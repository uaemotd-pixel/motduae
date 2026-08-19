"use client";

import { ExternalLink, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import type { CustomOrderShipmentSummary } from "@/lib/customOrders";
import {
  filterShipmentsForVisibility,
  getShipmentStatusLabel,
  getShipmentTypeLabel,
} from "@/lib/shipments";

type ShipmentListProps = {
  shipments?: CustomOrderShipmentSummary[] | null;
  locale: Locale;
  visibility?: "customer" | "internal";
  compact?: boolean;
};

function statusTone(status: string): string {
  switch (status) {
    case "delivered":
      return "bg-green-50 text-green-700 border-green-200";
    case "failed":
    case "cancelled":
      return "bg-red-50 text-red-700 border-red-200";
    case "out_for_delivery":
    case "in_transit":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-gray-50 text-gray-600 border-gray-200";
  }
}

export default function ShipmentList({
  shipments,
  locale,
  visibility = "customer",
  compact = false,
}: ShipmentListProps) {
  const t = useTranslations("OrdersPage.shipments");
  const lang = locale === "ar" ? "ar" : "en";
  const visibleShipments = filterShipmentsForVisibility(shipments, visibility);

  if (visibleShipments.length === 0) {
    return (
      <div
        className={`rounded-xl border border-dashed border-gray-200 bg-white/60 ${
          compact ? "p-3" : "p-4"
        }`}
      >
        <p className="text-xs text-gray-500 [font-family:var(--font-body)]">
          {t("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      <p
        className={`[font-family:var(--font-ui)] uppercase tracking-[0.16em] text-gray-400 ${
          compact ? "text-[9px]" : "text-[10px]"
        }`}
      >
        {t("title")}
      </p>
      <ul className={compact ? "space-y-2" : "space-y-3"} aria-label={t("title")}>
        {visibleShipments.map((shipment, index) => {
          const typeLabel = getShipmentTypeLabel(
            shipment.type,
            lang,
            shipment.label,
          );
          const statusLabel = getShipmentStatusLabel(shipment.status, lang);
          const key = shipment.parcelKey || `${shipment.type}-${index}`;

          return (
            <li
              key={key}
              className={`rounded-xl border border-gray-200 bg-white ${
                compact ? "p-3" : "p-4"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <Package
                    className={`shrink-0 text-gray-400 ${
                      compact ? "w-3.5 h-3.5 mt-0.5" : "w-4 h-4 mt-0.5"
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p
                      className={`font-medium text-black truncate [font-family:var(--font-body)] ${
                        compact ? "text-xs" : "text-sm"
                      }`}
                    >
                      {typeLabel}
                    </p>
                    {shipment.awb && (
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">
                        {t("awb")}: {shipment.awb}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.12em] font-semibold ${statusTone(
                    shipment.status,
                  )}`}
                >
                  {statusLabel}
                </span>
              </div>

              {shipment.trackingUrl && (
                <a
                  href={shipment.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-[11px] uppercase tracking-[0.12em] text-black/70 hover:text-black transition [font-family:var(--font-ui)]"
                >
                  {t("track")}
                  <ExternalLink className="w-3 h-3" aria-hidden />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
