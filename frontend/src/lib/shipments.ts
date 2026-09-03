import type { CustomOrderShipmentSummary } from "@/lib/customOrders";

const MOTD_INBOUND_TYPES = new Set([
  "tailor_to_motd",
  "addon_to_motd",
  "retail_to_motd",
]);

export function isBillableShipmentType(type: string): boolean {
  return !MOTD_INBOUND_TYPES.has(type);
}

export function isBillableShipment(
  shipment: Pick<CustomOrderShipmentSummary, "type" | "billable">,
): boolean {
  if (typeof shipment.billable === "boolean") {
    return shipment.billable;
  }
  return isBillableShipmentType(shipment.type);
}

export function filterBillableShipments(
  shipments?: CustomOrderShipmentSummary[] | null,
): CustomOrderShipmentSummary[] {
  if (!Array.isArray(shipments)) return [];
  return shipments.filter(isBillableShipment);
}

export function filterShipmentsForVisibility(
  shipments: CustomOrderShipmentSummary[] | null | undefined,
  visibility: "customer" | "internal",
): CustomOrderShipmentSummary[] {
  const list = Array.isArray(shipments) ? shipments : [];
  return visibility === "customer" ? filterBillableShipments(list) : list;
}

export const SHIPMENT_TYPE_LABELS: Record<
  string,
  { en: string; ar: string }
> = {
  fabric_to_tailor: {
    en: "Fabric to tailor",
    ar: "القماش إلى الخياط",
  },
  customer_fabric_to_tailor: {
    en: "Your fabric to tailor",
    ar: "قماشك إلى الخياط",
  },
  addon_to_customer: {
    en: "Delivery to you",
    ar: "التوصيل إليك",
  },
  tailor_to_customer: {
    en: "Delivery to you",
    ar: "التوصيل إليك",
  },
  retail_to_customer: {
    en: "Delivery to you",
    ar: "التوصيل إليك",
  },
  tailor_to_motd: {
    en: "Tailor → MOTD",
    ar: "الخياط → MOTD",
  },
  addon_to_motd: {
    en: "Add-on → MOTD",
    ar: "الإضافة → MOTD",
  },
  retail_to_motd: {
    en: "Shop → MOTD",
    ar: "المتجر → MOTD",
  },
  motd_to_customer: {
    en: "Delivery to you",
    ar: "التوصيل إليك",
  },
};

export function getShipmentTypeLabel(
  type: string,
  locale: "en" | "ar",
  fallbackLabel?: string,
): string {
  const mapped = SHIPMENT_TYPE_LABELS[type];
  if (mapped) return locale === "ar" ? mapped.ar : mapped.en;
  if (fallbackLabel?.trim()) return fallbackLabel.trim();
  return type.replace(/_/g, " ");
}

export const SHIPMENT_STATUS_LABELS: Record<
  string,
  { en: string; ar: string }
> = {
  planned: { en: "Planned", ar: "مخطط" },
  created: { en: "Label created", ar: "تم إنشاء البوليصة" },
  in_transit: { en: "In transit", ar: "في الطريق" },
  out_for_delivery: { en: "Out for delivery", ar: "في التوصيل" },
  delivered: { en: "Delivered", ar: "تم التسليم" },
  failed: { en: "Failed", ar: "فشل" },
  cancelled: { en: "Cancelled", ar: "ملغى" },
};

export function getShipmentStatusLabel(
  status: string,
  locale: "en" | "ar",
): string {
  const mapped = SHIPMENT_STATUS_LABELS[status];
  if (mapped) return locale === "ar" ? mapped.ar : mapped.en;
  return status.replace(/_/g, " ");
}
