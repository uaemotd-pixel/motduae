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
  "return_rejected", // Return rejected
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
  pricing?: {
    designBase: number;
    fabricMeters: number;
    fabricPricePerMeter: number;
    fabricCost: number;
    tailoringFee: number;
    deliveryFee: number;
    subtotal: number;
    vatRate: number;
    vatAmount: number;
    total: number;
    currency: string;
  } | null;
}

export interface CustomOrderStatusHistoryEntry {
  status: CustomOrderStatus;
  note?: string;
  changedAt: string;
}

export interface CustomOrderShipmentSummary {
  parcelKey?: string;
  type: string;
  status: string;
  awb?: string | null;
  trackingUrl?: string;
  label?: string;
  billable?: boolean;
}

export interface CustomOrderDetail {
  _id: string;
  createdAt: string;
  status: CustomOrderStatus;
  fabricSource: "storefront" | "self";
  fabricMeters?: number;
  returnItems?: unknown[];
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
  shipments?: CustomOrderShipmentSummary[];
}

// lib/customOrders.ts
export type RetailOrderListItem = {
  id: string;
  date: Date;
  status: string;
  totalPrice: number;
  currency: string;
  itemsPrice?: number;
  shippingPrice?: number;
  vatAmount?: number;
  vatRate?: number;
  items: Array<{
    name: string;
    nameAr?: string;
    image: string;
    size?: string;
    price: number;
    quantity: number;
    fabricName?: string;
    fabricNameAr?: string;
    fabricImage?: string;
    fabricSlug?: string;
    designName?: string;
    designNameAr?: string;
    designImage?: string;
    designSlug?: string;
  }>;
};

export const CUSTOM_ORDER_BASE_STATUSES = CUSTOM_ORDER_STATUSES.slice(
  0,
  8,
) as CustomOrderStatus[];

export function getCustomOrderStatusIndex(status: CustomOrderStatus): number {
  return CUSTOM_ORDER_STATUSES.indexOf(status);
}

export function isCustomOrderStatus(
  status: string,
): status is CustomOrderStatus {
  return CUSTOM_ORDER_STATUSES.includes(status as CustomOrderStatus);
}

export function getCustomOrderTimelineStatuses(
  currentStatus: CustomOrderStatus,
  _statusHistory: CustomOrderStatusHistoryEntry[] = [],
  _hasReturnItems = false,
): CustomOrderStatus[] {
  const baseStatuses = CUSTOM_ORDER_BASE_STATUSES;

  if (currentStatus === "return_rejected") {
    return [...baseStatuses, "return_requested", "return_rejected"];
  }

  if (
    currentStatus === "return_approved" ||
    currentStatus === "refund_processed"
  ) {
    return [
      ...baseStatuses,
      "return_requested",
      "return_approved",
      "refund_processed",
    ];
  }

  if (currentStatus === "return_requested") {
    return [...baseStatuses, "return_requested"];
  }

  return baseStatuses;
}

export function getAdminTimelineNeighbors(
  currentStatus: CustomOrderStatus,
  statusHistory: CustomOrderStatusHistoryEntry[] = [],
  hasReturnItems = false,
): { previous: CustomOrderStatus | null; next: CustomOrderStatus | null } {
  const displayed = getCustomOrderTimelineStatuses(
    currentStatus,
    statusHistory,
    hasReturnItems,
  );
  const index = displayed.indexOf(currentStatus);

  return {
    previous: index > 0 ? displayed[index - 1] : null,
    next:
      index >= 0 && index < displayed.length - 1 ? displayed[index + 1] : null,
  };
}

export function getAdminAssignableStatuses(
  currentStatus: CustomOrderStatus,
  statusHistory: CustomOrderStatusHistoryEntry[] = [],
  hasReturnItems = false,
): CustomOrderStatus[] {
  const displayed = getCustomOrderTimelineStatuses(
    currentStatus,
    statusHistory,
    hasReturnItems,
  );

  if (currentStatus === "return_requested") {
    return [...displayed, "return_approved", "return_rejected"];
  }

  return displayed;
}

export function getNextCustomOrderStatus(
  status: string,
): CustomOrderStatus | null {
  if (!isCustomOrderStatus(status)) return null;

  if (
    status === "delivered" ||
    status === "return_requested" ||
    status === "return_rejected" ||
    status === "refund_processed"
  ) {
    return null;
  }

  if (status === "return_approved") {
    return "refund_processed";
  }

  const index = CUSTOM_ORDER_BASE_STATUSES.indexOf(status);
  if (index < 0 || index >= CUSTOM_ORDER_BASE_STATUSES.length - 1) {
    return null;
  }

  return CUSTOM_ORDER_BASE_STATUSES[index + 1];
}

export function getPreviousCustomOrderStatus(
  status: string,
): CustomOrderStatus | null {
  if (!isCustomOrderStatus(status)) return null;

  if (status === "return_requested") return "delivered";
  if (status === "return_approved" || status === "return_rejected") {
    return "return_requested";
  }
  if (status === "refund_processed") return "return_approved";

  const index = CUSTOM_ORDER_BASE_STATUSES.indexOf(status);
  if (index <= 0) return null;
  return CUSTOM_ORDER_BASE_STATUSES[index - 1];
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

const CUSTOMER_BOUND_SHIPMENT_TYPES = new Set([
  "motd_to_customer",
  "tailor_to_customer",
  "addon_to_customer",
  "retail_to_customer",
]);

/** True when Shipa customer parcels exist and webhook owns `delivered`. */
export function hasActiveCustomerShipments(
  shipments?: CustomOrderShipmentSummary[] | null,
): boolean {
  if (!Array.isArray(shipments) || shipments.length === 0) return false;
  return shipments.some(
    (shipment) =>
      CUSTOMER_BOUND_SHIPMENT_TYPES.has(shipment.type) &&
      shipment.status !== "cancelled" &&
      shipment.status !== "delivered",
  );
}
