import type { Locale } from "@/i18n/routing";
import { formatFilterLabel } from "@/lib/format";
import { formatCurrency } from "@/lib/format";
import {
  formatCutLabel,
  type CutUnit,
} from "@/lib/fabricUnits";

export type FabricMaterial = string;

export type FabricFilter = "all" | string;

export const FABRIC_FILTER_OPTIONS = [
  "chiffon",
  "silk velvet",
  "tana linen cotton",
] as const;

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

export interface FabricCutMeta {
  _id: string;
  name: string;
  nameAr?: string;
  value: number;
  unit: CutUnit;
  lengthInMeters?: number;
}

export interface FabricCutEntry {
  cutId: string;
  price: number;
  stock: number;
  stockPieces?: number;
  inStock?: boolean;
  cut?: FabricCutMeta | null;
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
  cuts?: FabricCutEntry[];
  /** Computed legacy listing metric when cuts are present */
  pricePerMeter?: number;
  listedByStore?: string | FabricStoreInfo | null;
  fabricShopId?: string | null;
  stockInMeters?: number;
  fabricUnit?: FabricUnitValue;
  pricePerUnit?: number;
}

export interface FabricDetailItem extends FabricListItem {
  storePickupAddress: FabricPickupAddress;
  listedByStore: FabricStoreInfo | null;
  variations?: FabricListItem[];
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

// Use an existing public asset as the fallback so broken images never appear.
export const DEFAULT_FABRIC_IMAGE = "/images/fab1.png";

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

export function formatPriceWithUnit(
  pricePerMeter: number,
  unit: FabricUnitValue,
  locale: Locale,
): string {
  if (unit === "wara") {
    const waraPrice = pricePerMeter / WARA_TO_METERS;
    return `${formatCurrency(waraPrice, locale)}/wara`;
  }
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

export function getFabricCuts(
  item: Pick<FabricListItem, "cuts">,
): FabricCutEntry[] {
  return item.cuts ?? [];
}

export function isFabricInStock(
  item: Pick<FabricListItem, "cuts" | "stockInMeters">,
): boolean {
  const cuts = getFabricCuts(item);
  if (cuts.length > 0) {
    return cuts.some((entry) => (entry.stock ?? 0) > 0);
  }
  return (item.stockInMeters ?? 0) > 0;
}

export function getFabricMinListingPrice(
  item: Pick<FabricListItem, "cuts" | "pricePerMeter">,
): number {
  const cuts = getFabricCuts(item);
  if (cuts.length > 0) {
    return Math.min(...cuts.map((entry) => Number(entry.price) || 0));
  }
  return item.pricePerMeter ?? 0;
}

export function getFabricMinPriceCut(
  item: Pick<FabricListItem, "cuts">,
): FabricCutEntry | null {
  const cuts = getFabricCuts(item);
  if (!cuts.length) return null;
  return cuts.reduce((min, entry) =>
    Number(entry.price) < Number(min.price) ? entry : min,
  );
}

/** First cut in catalog order — used for listing cards when multiple cuts exist. */
export function getFabricPrimaryCut(
  item: Pick<FabricListItem, "cuts">,
): FabricCutEntry | null {
  const cuts = getFabricCuts(item);
  return cuts[0] ?? null;
}

export function getFabricDefaultCut(
  item: Pick<FabricListItem, "cuts">,
): FabricCutEntry | null {
  return getFabricPrimaryCut(item);
}

export function getCutDisplayName(
  entry: FabricCutEntry,
  locale: Locale,
): string {
  const cut = entry.cut;
  if (cut) {
    const label = locale === "ar" ? cut.nameAr || cut.name : cut.name;
    if (label?.trim()) return label.trim();
    return formatCutLabel(cut.value, cut.unit, locale);
  }
  return locale === "ar" ? "قطعة" : "cut";
}

export function formatFabricCutPrice(
  entry: FabricCutEntry,
  locale: Locale,
): string {
  const name = getCutDisplayName(entry, locale);
  return `${formatCurrency(Number(entry.price), locale)}/${name}`;
}

export function formatFabricListingPrice(
  item: Pick<FabricListItem, "cuts" | "pricePerMeter">,
  locale: Locale,
): string {
  const cuts = getFabricCuts(item);
  if (cuts.length > 0) {
    const primaryCut = getFabricPrimaryCut(item);
    if (!primaryCut) return formatCurrency(0, locale);
    const formatted = formatFabricCutPrice(primaryCut, locale);
    if (cuts.length > 1) {
      const prefix = locale === "ar" ? "من " : "From ";
      return prefix + formatted;
    }
    return formatted;
  }
  return formatPricePerMeter(item.pricePerMeter ?? 0, locale);
}

export function formatFabricStockSummary(
  item: Pick<FabricListItem, "cuts" | "stockInMeters">,
  locale: Locale,
): string {
  const cuts = getFabricCuts(item);
  if (cuts.length > 0) {
    const inStock = cuts.filter((entry) => (entry.stock ?? 0) > 0);
    if (inStock.length === 0) {
      return locale === "ar" ? "نفذت الكمية" : "Out of stock";
    }
    const parts = inStock.map((entry) => {
      const name = getCutDisplayName(entry, locale);
      return `${entry.stock} ${name}`;
    });
    return parts.join(locale === "ar" ? "، " : ", ");
  }

  const stock = item.stockInMeters ?? 0;
  if (stock <= 0) {
    return locale === "ar" ? "نفذت الكمية" : "Out of stock";
  }
  return `${stock.toFixed(2)} m`;
}

export function buildFabricCutCartId(
  fabricId: string,
  cutId: string,
): string {
  return `${fabricId}::${cutId}`;
}

export function parseFabricCutCartId(cartId: string): {
  fabricId: string;
  cutId?: string;
} {
  const separatorIndex = cartId.indexOf("::");
  if (separatorIndex === -1) {
    return { fabricId: cartId };
  }
  return {
    fabricId: cartId.slice(0, separatorIndex),
    cutId: cartId.slice(separatorIndex + 2) || undefined,
  };
}

export function isFabricCutCartId(id: string): boolean {
  return id.includes("::");
}

export function getCutLengthLabel(
  entry: FabricCutEntry,
  locale: Locale,
): string {
  const cut = entry.cut;
  if (!cut) return "";
  return formatCutLabel(cut.value, cut.unit, locale);
}

export function buildRetailCheckoutItem(item: {
  id: string;
  size: string;
  quantity: number;
}): {
  productId: string;
  cutId?: string;
  size: string;
  quantity: number;
} {
  const { fabricId, cutId } = parseFabricCutCartId(item.id);
  return {
    productId: fabricId,
    size: item.size,
    quantity: item.quantity,
    ...(cutId ? { cutId } : {}),
  };
}

export function filterPublicFabrics(items: FabricListItem[]): FabricListItem[] {
  return items.filter(
    (item) => (item.cuts?.length ?? 0) > 0 && isFabricInStock(item),
  );
}

export function buildInitialFabricCutSelections(
  item: Pick<FabricListItem, "cuts">,
): Record<string, number> {
  const defaultCut = getFabricDefaultCut(item);
  if (!defaultCut || defaultCut.stock <= 0) return {};
  return { [defaultCut.cutId]: 1 };
}

export function getSelectedFabricCutEntries(
  item: Pick<FabricListItem, "cuts">,
  selections: Record<string, number>,
): FabricCutEntry[] {
  const cuts = getFabricCuts(item);
  return cuts.filter((entry) => (selections[entry.cutId] ?? 0) > 0);
}

export function filterFabricsByMaterial(
  items: FabricListItem[],
  filter: FabricFilter,
): FabricListItem[] {
  if (filter === "all") return items;
  return items.filter((item) => item.material === filter);
}

export function formatMaterialLabel(material: string, locale: Locale): string {
  void locale;
  return formatFilterLabel(material);
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
