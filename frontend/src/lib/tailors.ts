import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";
import { resolveFabricImage } from "@/lib/fabrics";
import { resolveMediaUrl } from "@/lib/media";

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
  | "hand-embroidered"
  | "crystal-embellished"
  | "non-crystal"
  | "talli"
  | "khous"
  | "beaded";

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
  priceType?: "fixed" | "per_meter";
  tailoringFee: number;
  estimatedMeters: number;
  estimatedDays: number;
  tailorSlug?: string;
  tailorName?: string;
  tailorNameAr?: string;
  tailorShopId?: string;
}

const DEFAULT_TAILOR_IMAGE = "/images/tailor-1.png";

function isUploadedImage(path?: string): boolean {
  return !!path?.trim().startsWith("/uploads/");
}

/**
 * Pick the best shop image for cards/heroes.
 * Custom uploads beat seeded /images/* defaults so a new logo is not hidden by an old cover path.
 */
export function resolveTailorImage(logo?: string, coverImage?: string): string {
  const cover = coverImage?.trim() || "";
  const logoPath = logo?.trim() || "";

  let raw = DEFAULT_TAILOR_IMAGE;

  if (isUploadedImage(cover) && isUploadedImage(logoPath)) {
    raw = cover;
  } else if (isUploadedImage(cover)) {
    raw = cover;
  } else if (isUploadedImage(logoPath)) {
    raw = logoPath;
  } else if (cover || logoPath) {
    raw = cover || logoPath;
  }

  return resolveMediaUrl(raw) || DEFAULT_TAILOR_IMAGE;
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
  const raw = url?.trim();
  if (!raw) return resolveFabricImage(undefined);
  const resolved = resolveMediaUrl(raw);
  return resolved || resolveFabricImage(undefined);
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
    "hand-embroidered": { en: "Hand Embroidered", ar: "شغل يد" },
    "crystal-embellished": { en: "Crystal Embellished", ar: "مع فصوص" },
    "non-crystal": { en: "Non-Crystal", ar: "بدون فصوص" },
    talli: { en: "Talli", ar: "تلّي" },
    khous: { en: "Khous", ar: "خوص" },
    beaded: { en: "Beaded", ar: "مع خرز" },
  };

  const entry = labels[category as DesignCategory];
  if (!entry) return category;
  return locale === "ar" ? entry.ar : entry.en;
}

export function formatDesignBasePrice(
  basePrice: number,
  locale: Locale,
  priceType?: string,
): string {
  const formatted = formatCurrency(basePrice, locale);
  if (priceType === "per_meter") {
    return locale === "ar" ? `${formatted} / متر` : `${formatted} / meter`;
  }
  return formatted;
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
