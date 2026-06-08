import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";

export type FabricMaterial =
    | "wool"
    | "silk"
    | "linen"
    | "cashmere"
    | "cotton";

export type FabricFilter = "all" | FabricMaterial;

export interface FabricListItem {
    _id: string;
    slug: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    images?: string[];
    material: FabricMaterial;
    color?: string;
    city?: string;
    tag?: string;
    tagColor?: string;
    pricePerMeter: number;
    listedByStore?: string;
}

const LEGACY_IMAGE_PATHS: Record<string, string> = {
    "/images/dress-1.png": "/images/fab1.png",
    "/images/dress-2.png": "/images/fab2.png",
    "/images/dress-3.png": "/images/fab3.png",
    "/images/dress-4.png": "/images/fab4.png",
    "/images/dress-5.png": "/images/fab5.png",
};

export function resolveFabricImage(url: string | undefined): string {
    if (!url) return "/images/fab1.png";
    return LEGACY_IMAGE_PATHS[url] ?? url;
}

export function getFabricDisplayFields(
    item: Pick<FabricListItem, "name" | "nameAr" | "description" | "descriptionAr" | "city">,
    locale: Locale,
) {
    const isAr = locale === "ar";
    const city = item.city?.trim() || "";

    return {
        title: isAr ? item.nameAr || item.name : item.name,
        description: isAr
            ? item.descriptionAr || item.description || ""
            : item.description || "",
        location: city
            ? isAr
                ? `${city}، الإمارات`
                : `${city.toUpperCase()}, UAE`
            : isAr
              ? "الإمارات"
              : "UAE",
    };
}

export function formatPricePerMeter(pricePerMeter: number, locale: Locale): string {
    return `${formatCurrency(pricePerMeter, locale)}/m`;
}

export function filterFabricsByMaterial(
    items: FabricListItem[],
    filter: FabricFilter,
): FabricListItem[] {
    if (filter === "all") return items;
    return items.filter((item) => item.material === filter);
}

export const FABRIC_FILTER_OPTIONS: FabricMaterial[] = [
    "wool",
    "silk",
    "linen",
    "cashmere",
    "cotton",
];
