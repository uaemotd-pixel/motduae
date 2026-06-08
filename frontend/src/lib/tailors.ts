import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";
import { resolveFabricImage } from "@/lib/fabrics";

export interface TailorShopListItem {
    _id: string;
    slug: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    logo?: string;
    coverImage?: string;
    location?: string;
    city?: string;
    phone?: string;
    rating?: number;
    reviewCount?: number;
    ownerId?: string;
}

export interface TailorShopOwner {
    _id: string;
    name: string;
    role?: string;
}

export interface TailorShopDetailItem extends TailorShopListItem {
    owner: TailorShopOwner | null;
    createdAt?: string;
    updatedAt?: string;
}

export type DesignCategory =
    | "kandura"
    | "thob"
    | "jalabiya"
    | "abaya"
    | "bisht"
    | "mukhawar";

export interface TailorDesignListItem {
    _id: string;
    slug: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    images?: string[];
    category: string;
    basePrice: number;
    tailoringFee: number;
    estimatedMeters: number;
    estimatedDays: number;
}

const DEFAULT_TAILOR_IMAGE = "/images/tailor-1.png";

export function resolveTailorImage(
    logo?: string,
    coverImage?: string,
): string {
    return logo?.trim() || coverImage?.trim() || DEFAULT_TAILOR_IMAGE;
}

export function getTailorDisplayFields(
    item: Pick<
        TailorShopListItem,
        "name" | "nameAr" | "description" | "descriptionAr" | "city" | "location"
    >,
    locale: Locale,
) {
    const isAr = locale === "ar";
    const city = item.city?.trim() || "";
    const location = item.location?.trim() || "";

    const locationParts = [city, location].filter(Boolean);

    return {
        name: isAr ? item.nameAr || item.name : item.name,
        description: isAr
            ? item.descriptionAr || item.description || ""
            : item.description || "",
        location: isAr
            ? locationParts.join("، ")
            : locationParts.join(", ").toUpperCase(),
        badge: city ? (isAr ? city : city.toUpperCase()) : "",
    };
}

export function formatTailorRating(rating = 0): string {
    return Number(rating).toFixed(1);
}

export function resolveDesignImage(url: string | undefined): string {
    return resolveFabricImage(url);
}

export function getDesignDisplayFields(
    item: Pick<
        TailorDesignListItem,
        "name" | "nameAr" | "description" | "descriptionAr" | "category"
    >,
    locale: Locale,
) {
    const isAr = locale === "ar";

    return {
        name: isAr ? item.nameAr || item.name : item.name,
        description: isAr
            ? item.descriptionAr || item.description || ""
            : item.description || "",
        category: formatDesignCategory(item.category, locale),
    };
}

export function formatDesignCategory(category: string, locale: Locale): string {
    const labels: Record<DesignCategory, { en: string; ar: string }> = {
        kandura: { en: "Kandura", ar: "كندورة" },
        thob: { en: "Thob", ar: "ثوب" },
        jalabiya: { en: "Jalabiya", ar: "جلابية" },
        abaya: { en: "Abaya", ar: "عباية" },
        bisht: { en: "Bisht", ar: "بشت" },
        mukhawar: { en: "Mukhawar", ar: "مخاوَر" },
    };

    const entry = labels[category as DesignCategory];
    if (!entry) return category;
    return locale === "ar" ? entry.ar : entry.en;
}

export function formatDesignBasePrice(basePrice: number, locale: Locale): string {
    return formatCurrency(basePrice, locale);
}

export function buildCustomOrderDesignHref(
    tailorSlug: string,
    designSlug: string,
): string {
    const params = new URLSearchParams({
        tailorSlug,
        designSlug,
    });
    return `/custom-order/tailor?${params.toString()}`;
}
