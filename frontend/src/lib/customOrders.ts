import type { Locale } from "@/i18n/routing";

export const CUSTOM_ORDER_STATUSES = [
    "pending",
    "confirmed",
    "fabric_pickup_scheduled",
    "at_tailor",
    "in_production",
    "ready",
    "out_for_delivery",
    "delivered",
] as const;

export type CustomOrderStatus = (typeof CUSTOM_ORDER_STATUSES)[number];

export interface CustomOrderDesignSummary {
    name: string;
    nameAr?: string;
    slug?: string;
    category?: string;
}

export interface CustomOrderTailorSummary {
    _id: string;
    name: string;
    nameAr?: string;
    slug?: string;
}

export interface CustomOrderListItem {
    id: string;
    date: string;
    status: CustomOrderStatus;
    fabricSource: "storefront" | "self";
    total?: number;
    currency?: string;
    design: CustomOrderDesignSummary | null;
    tailorShop: CustomOrderTailorSummary | null;
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
    pricing?: {
        total: number;
        currency: string;
    };
    tailorShopId?: CustomOrderTailorSummary | string;
}

export interface RetailOrderListItem {
    id: string;
    date: string;
    status: string;
    totalPrice?: number;
    currency?: string;
    firstItem?: {
        name: string;
        image?: string;
        size?: string;
    } | null;
}

export function getCustomOrderStatusIndex(status: CustomOrderStatus): number {
    return CUSTOM_ORDER_STATUSES.indexOf(status);
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
