import type { Locale } from "@/i18n/routing";

export const CUSTOM_ORDER_STATUSES = [
  // Orders flow
  "pending", // Order Placed
  "confirmed", // Order Confirmed
  "fabric_delivered", // Fabric delivered to tailor
  "at_tailor", // Tailor Received Fabric

  "in_production", // Stitching in Progress
  "ready", // Ready for handoff
  "out_for_delivery", // Out for delivery
  "delivered", // Delivered

  // Returns & refunds flow
  "return_requested", // Return requested
  "return_approved", // Return approved
  "refund_processed", // Refund processed
] as const;

export type CustomOrderStatus = (typeof CUSTOM_ORDER_STATUSES)[number];

export interface CustomOrderDesignSummary {
  name: string;
  nameAr?: string;
  slug?: string;
  category?: string;
  images?: string[];
}

export interface CustomOrderTailorSummary {
  _id: string;
  name: string;
  nameAr?: string;
  slug?: string;
}

export interface CustomOrderFabricSummary {
  name: string;
  nameAr?: string;
  material?: string;
  images?: string[];
}

export interface CustomOrderLineItemSummary {
  design: CustomOrderDesignSummary | null;
  fabric: CustomOrderFabricSummary | null;
  fabricMeters: number;
  tailorShop: CustomOrderTailorSummary | null;
}

export interface CustomOrderListItem {
  id: string;
  date: string;
  status: CustomOrderStatus;
  fabricSource: "storefront" | "self";
  total?: number;
  currency?: string;
  itemCount: number;
  items: CustomOrderLineItemSummary[];
  design: CustomOrderDesignSummary | null;
  tailorShop: CustomOrderTailorSummary | null;
  addons?: Array<{
    addonId: string;
    name: string;
    nameAr: string;
    price: number;
    thumbnailImage: string;
  }>;
}

export interface CustomOrderStatusHistoryEntry {
  status: CustomOrderStatus;
  note?: string;
  changedAt: string;
}

export interface CustomOrderDetail {
  _id: string;
  createdAt: string;
  status: CustomOrderStatus;
  fabricSource: "storefront" | "self";
  fabricMeters?: number;
  statusHistory: CustomOrderStatusHistoryEntry[];
  designSnapshot?: CustomOrderDesignSummary & { basePrice?: number };
  items?: CustomOrderLineItemSummary[];
  pricing?: {
    total: number;
    currency: string;
  };
  tailorShopId?: CustomOrderTailorSummary | string;
  addons?: Array<{
    addonId: string;
    name: string;
    nameAr: string;
    price: number;
    thumbnailImage: string;
  }>;
}

// lib/customOrders.ts
export type RetailOrderListItem = {
  id: string;
  date: Date;
  status: string;
  totalPrice: number;
  currency: string;
  items: Array<{
    name: string;
    image: string;
    size?: string;
    price: number;
    quantity: number;
  }>;
};

export function getCustomOrderStatusIndex(status: CustomOrderStatus): number {
  return CUSTOM_ORDER_STATUSES.indexOf(status);
}

export function isCustomOrderStatus(
  status: string,
): status is CustomOrderStatus {
  return CUSTOM_ORDER_STATUSES.includes(status as CustomOrderStatus);
}

export function getNextCustomOrderStatus(
  status: string,
): CustomOrderStatus | null {
  if (!isCustomOrderStatus(status)) return null;
  const index = getCustomOrderStatusIndex(status);
  if (index < 0 || index >= CUSTOM_ORDER_STATUSES.length - 1) return null;
  return CUSTOM_ORDER_STATUSES[index + 1];
}

export function getPreviousCustomOrderStatus(
  status: string,
): CustomOrderStatus | null {
  if (!isCustomOrderStatus(status)) return null;
  const index = getCustomOrderStatusIndex(status);
  if (index <= 0) return null;
  return CUSTOM_ORDER_STATUSES[index - 1];
}

export function getHistoryEntryForStatus(
  history: CustomOrderStatusHistoryEntry[],
  status: CustomOrderStatus,
): CustomOrderStatusHistoryEntry | undefined {
  return history.find((entry) => entry.status === status);
}

export function formatOrderDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatOrderDateTime(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date));
}

export function getDesignDisplayName(
  design: CustomOrderDesignSummary | null | undefined,
  locale: Locale,
): string {
  if (!design) return "";
  return locale === "ar" ? design.nameAr || design.name : design.name;
}

export function getTailorDisplayName(
  tailor: CustomOrderTailorSummary | null | undefined,
  locale: Locale,
): string {
  if (!tailor || typeof tailor === "string") return "";
  return locale === "ar" ? tailor.nameAr || tailor.name : tailor.name;
}

export function shortenOrderId(id: string): string {
  return id.slice(-8).toUpperCase();
}

export function getFabricDisplayName(
  fabric: CustomOrderFabricSummary | null | undefined,
  locale: Locale,
): string {
  if (!fabric) return "";
  return locale === "ar" ? fabric.nameAr || fabric.name : fabric.name;
}

export function getOrderItemsSummary(
  order: Pick<CustomOrderListItem, "items" | "itemCount">,
): CustomOrderLineItemSummary[] {
  return order.items?.length ? order.items : [];
}

export function getOrderHeadline(
  order: Pick<CustomOrderListItem, "design" | "itemCount" | "items">,
  locale: Locale,
  labels: { singleFallback: string; multiple: (count: number) => string },
): string {
  const items = getOrderItemsSummary(order);
  if (items.length > 1) {
    return labels.multiple(items.length);
  }

  const designName = getDesignDisplayName(order.design, locale);
  return designName || labels.singleFallback;
}
