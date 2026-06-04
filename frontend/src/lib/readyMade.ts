export interface ReadyMadeListItem {
    _id: string;
    slug: string;
    name: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    price: number;
    size: string;
    style?: string;
    images?: string[];
    countInStock?: number;
    condition?: string;
    city?: string;
    tag?: string;
    tagColor?: string;
}

const LEGACY_IMAGE_PATHS: Record<string, string> = {
    "/images/fab-1.png": "/images/fab1.png",
    "/images/fab-2.png": "/images/fab2.png",
    "/images/fab-3.png": "/images/fab3.png",
};

export function resolveReadyMadeImage(url: string | undefined): string {
    if (!url) return "/images/fab1.png";
    return LEGACY_IMAGE_PATHS[url] ?? url;
}

export function getReadyMadeDisplayFields(
    item: Pick<ReadyMadeListItem, "name" | "nameAr" | "description" | "descriptionAr">,
    locale: "en" | "ar",
) {
    const isAr = locale === "ar";
    return {
        title: isAr ? item.nameAr || item.name : item.name,
        description: isAr
            ? item.descriptionAr || item.description || ""
            : item.description || "",
    };
}
