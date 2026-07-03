import { resolveMediaUrl } from "@/lib/media";

export interface ReadyMadeListItem {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  finalSellingPriceAED: number; // used for display
  images?: string[];
  tag?: string;
  tagAr?: string;
  tagColor?: string;
  tagColorAr?: string;
  colors?: string[];
  // additional fields (optional, if needed)
  fabricType?: string;
  fabricTypeAr?: string;
  tailorName?: string;
  tailorNameAr?: string;
  metersPerFabric?: number;
  fabricPriceAED?: number;
  mukhawarPriceAED?: number;
  availableFabricStock?: number;
  isActive?: boolean;
}

// Legacy image path mapping (if needed)
const LEGACY_IMAGE_PATHS: Record<string, string> = {
  "/images/fab-1.png": "/images/fab1.png",
  "/images/fab-2.png": "/images/fab2.png",
  "/images/fab-3.png": "/images/fab3.png",
};

export function resolveReadyMadeImage(url: string | undefined): string {
  if (!url) return "/images/fab1.png";
  const normalized = LEGACY_IMAGE_PATHS[url] ?? url;
  return resolveMediaUrl(normalized) || "/images/fab1.png";
}

/**
 * Returns the localized title and description for a ready‑made item.
 */
export function getReadyMadeDisplayFields(
  item: Pick<
    ReadyMadeListItem,
    "name" | "nameAr" | "description" | "descriptionAr"
  >,
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
