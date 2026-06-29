import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";
import { resolveMediaUrl } from "@/lib/media";

export type FabricMaterial = "wool" | "silk" | "linen" | "cashmere" | "cotton";

export type FabricFilter = "all" | FabricMaterial;

export interface FabricStoreInfo {
  _id: string;
  name: string;
  role?: string;
}

export interface FabricPickupAddress {
  emirate: string;
  city: string;
  street?: string;
  building?: string;
  phone?: string;
}

export interface FabricListItem {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  images?: string[];
  material: FabricMaterial;
  color?: string[];
  city?: string;
  tag?: string;
  tagColor?: string;
  pricePerMeter: number;
  listedByStore?: string | FabricStoreInfo | null;
  stockInMeters: number;
}

export interface FabricDetailItem extends FabricListItem {
  storePickupAddress: FabricPickupAddress;
  listedByStore: FabricStoreInfo | null;
}


// lib/fabrics.ts – add/update helpers if missing
function isUploadedImage(url: string): boolean {
  if (!url) return false;
  return url.startsWith("/uploads/") || url.includes("uploads/");
}

function resolveMediaUrl(raw: string): string {
  if (!raw) return "";
  if (raw.startsWith("http")) return raw;
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "";
  const clean = raw.replace(/^\//, "");
  return `${base}/${clean}`;
}

export const DEFAULT_FABRIC_IMAGE = "/images/placeholder-fabric.jpg";

export function resolveFabricImage(images?: string | string[]): string {
  let raw = DEFAULT_FABRIC_IMAGE;

  // Handle array or single
  const firstImage = Array.isArray(images) ? images[0] : images;
  const image = firstImage?.trim() || "";

  if (isUploadedImage(image)) {
    raw = image;
  } else if (image) {
    raw = image; // fallback to raw (maybe absolute URL)
  }

  const resolved = resolveMediaUrl(raw);
  return resolved || DEFAULT_FABRIC_IMAGE;
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
  const resolved = LEGACY_IMAGE_PATHS[url] ?? url;
  return resolveMediaUrl(resolved) || "/images/fab1.png";

}

export function getFabricDisplayFields(
  item: Pick<
    FabricListItem,
    "name" | "nameAr" | "description" | "descriptionAr" | "city"
  >,
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

export function formatPricePerMeter(
  pricePerMeter: number,
  locale: Locale,
): string {
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

export function formatMaterialLabel(material: string, locale: Locale): string {
  const labels: Record<FabricMaterial, { en: string; ar: string }> = {
    wool: { en: "Wool", ar: "صوف" },
    silk: { en: "Silk", ar: "حرير" },
    linen: { en: "Linen", ar: "كتان" },
    cashmere: { en: "Cashmere", ar: "كشمير" },
    cotton: { en: "Cotton", ar: "قطن" },
  };

  const entry = labels[material as FabricMaterial];
  if (!entry) return material;
  return locale === "ar" ? entry.ar : entry.en;
}

export function formatPickupAddress(
  address: FabricPickupAddress,
  locale: Locale,
): string {
  const parts = [
    address.building,
    address.street,
    address.city,
    address.emirate,
  ].filter((part) => part?.trim());

  return parts.join(locale === "ar" ? "، " : ", ");
}
