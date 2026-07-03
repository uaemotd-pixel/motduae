import type { Locale } from "@/i18n/routing";
import { formatCurrency } from "@/lib/format";

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
  fabricUnit: FabricUnitValue;
  pricePerUnit: number;
}

export interface FabricDetailItem extends FabricListItem {
  storePickupAddress: FabricPickupAddress;
  listedByStore: FabricStoreInfo | null;
}

import { resolveMediaUrl } from "@/lib/media";

// lib/fabrics.ts – add/update helpers if missing
function isUploadedImage(url: string): boolean {
  if (!url) return false;
  return (
    url.startsWith("/uploads/") ||
    url.includes("uploads/") ||
    url.startsWith("uploads\\") ||
    url.includes("uploads\\")
  );
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

export type FabricUnit = "meters" | "wara";

export const FABRIC_UNITS = [
  { value: "meters", en: "Meters", ar: "متر" },
  { value: "wara", en: "Wara", ar: "وارة" },
] as const;
export type FabricUnitValue = (typeof FABRIC_UNITS)[number]["value"];

export const WARA_TO_METERS = 0.9144; // 1 wara = 0.9144 meters

export function formatPricePerMeter(
  pricePerMeter: number,
  locale: Locale,
): string {
  return `${formatCurrency(pricePerMeter, locale)}/m`;
}

export function formatPricePerUnit(
  price: number,
  unit: FabricUnitValue,
  locale: Locale,
): string {
  const unitLabel = unit === "wara" ? "wara" : "m";
  return `${formatCurrency(price, locale)}/${unitLabel}`;
}

export function formatStockDisplay(
  stockInMeters: number,
  unit: FabricUnitValue,
): string {
  if (unit === "wara") {
    const wara = stockInMeters / WARA_TO_METERS;
    return `${wara.toFixed(2)} wara (${stockInMeters.toFixed(2)} m)`;
  }
  return `${stockInMeters.toFixed(2)} m`;
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
