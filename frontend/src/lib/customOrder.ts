import type { FabricListItem, FabricCutEntry } from "@/lib/fabrics";
import { resolveFabricImage, isFabricInStock } from "@/lib/fabrics";
import type { TailorDesignListItem, TailorShopListItem } from "@/lib/tailors";
import { resolveDesignImage } from "@/lib/tailors";
import {
  convertToMeters,
  convertToWar,
  cutValueToMeters,
  getDisplayUnit,
  normalizeFabricUnit,
  WAR_TO_METER,
  WARA_TO_METERS,
  type FabricUnit,
} from "@/lib/fabricUnits";

export type { FabricUnit };
export {
  convertToMeters,
  convertToWar,
  getDisplayUnit,
  WAR_TO_METER,
  WARA_TO_METERS,
} from "@/lib/fabricUnits";

export type FabricSource = "storefront" | "self";

export const CUSTOM_ORDER_STEPS = [
  "fabric",
  "tailor",
  "meters",
  "measurements",
  "review",
] as const;

export type CustomOrderStep = (typeof CUSTOM_ORDER_STEPS)[number];

export type CustomOrderFirstStep = "fabric" | "tailor";

export const CUSTOM_ORDER_TOTAL_STEPS = 5;

export interface CustomOrderFabricSelection {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  material?: string;
  pricePerMeter?: number;
  cuts?: FabricCutEntry[];
  image?: string;
  stockInMeters?: number;
  fabricShopId?: string;
}

export interface CustomOrderTailorSelection {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  logo?: string;
  coverImage?: string;
  city?: string;
  location?: string;
}

export interface CustomOrderDesignSelection {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  category: string;
  basePrice: number;
  priceType?: "fixed" | "per_meter";
  tailoringFee: number;
  minCutId?: string;
  minCutSnapshot?: {
    name: string;
    nameAr?: string;
    lengthInMeters: number;
  };
  minCut?: {
    name: string;
    nameAr?: string;
    lengthInMeters: number;
  };
  estimatedMeters: number;
  estimatedDays?: number;
  image?: string;
}

export interface CustomOrderSelectedDesign extends CustomOrderDesignSelection {
  tailor: CustomOrderTailorSelection;
}

export interface CustomOrderSelectedCut {
  cutId: string;
  name: string;
  nameAr?: string;
  lengthInMeters: number;
  price: number;
  stock?: number;
  unit?: string;
  value?: number;
}

export interface CustomOrderLineItem {
  id: string;
  design: CustomOrderDesignSelection;
  tailor: CustomOrderTailorSelection;
  fabric: CustomOrderFabricSelection | null;
  fabricMeters: number | null;
  fabricUnit: FabricUnit;
  /** @deprecated Prefer cutSelections — kept for draft migration */
  cutId?: string | null;

  selectedCuts?: CustomOrderSelectedCut[];

  /** @deprecated Prefer cutSelections — kept for draft migration */
  cutIds?: string[];
  /** Selected cut quantities: cutId -> pieces (1..stock) */
  cutSelections?: Record<string, number>;

}

export const CUSTOM_ORDER_MEASUREMENT_FIELD_KEYS = [
  "totalLength",
  "shoulderWidth",
  "armLength",
  "chestWidth",
  "waist",
  "hips",
  "neckWidth",
  "neckDepth",
  "armholeHeight",
  "sleeveOpeningWidth",
  "cuffWidth",
  "cuffLength",
] as const;

export type CustomOrderMeasurementField =
  (typeof CUSTOM_ORDER_MEASUREMENT_FIELD_KEYS)[number];

export interface CustomOrderMeasurements {
  totalLength: number | null;
  shoulderWidth: number | null;
  armLength: number | null;
  chestWidth: number | null;
  waist: number | null;
  hips: number | null;
  neckWidth: number | null;
  neckDepth: number | null;
  armholeHeight: number | null;
  sleeveOpeningWidth: number | null;
  cuffWidth: number | null;
  cuffLength: number | null;
  notes: string;
}

export interface CustomOrderDeliveryAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  emirate: string;
  postalCode?: string;
}

export interface CustomOrderDraft {
  firstStep: CustomOrderFirstStep | null;
  fabricSource: FabricSource | null;
  selectedFabrics: CustomOrderFabricSelection[];
  selectedDesigns: CustomOrderSelectedDesign[];
  lineItems: CustomOrderLineItem[];
  measurements: CustomOrderMeasurements;
  deliveryAddress: Partial<CustomOrderDeliveryAddress>;
  addonIds: string[];
}

export interface CustomOrderPreviewItemPayload {
  designId: string;
  fabricId?: string;
  fabricMeters: number;
  cutId?: string;
  cutIds?: string[];
  cutSelections?: { cutId: string; quantity: number }[];
}

export interface CustomOrderPreviewPayload {
  fabricSource: FabricSource;
  items: CustomOrderPreviewItemPayload[];
}

export interface CustomOrderDeliveryBreakdownLine {
  key: string;
  type: string;
  label: string;
  fee: number;
  billable?: boolean;
  from?: { kind?: string; id?: string | null; label?: string };
  to?: { kind?: string; id?: string | null; label?: string };
}

export interface CustomOrderPricingBreakdown {
  designBase: number;
  fabricMeters: number;
  fabricPricePerMeter: number;
  fabricCost: number;
  tailoringFee: number;
  deliveryFee: number;
  parcelCount?: number;
  perParcelFee?: number;
  deliveryBreakdown?: CustomOrderDeliveryBreakdownLine[];
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  total: number;
  currency: string;
  itemCount?: number;
}

export const CUSTOM_ORDER_STORAGE_KEY = "motdCustomOrderDraft";
export const CUSTOM_ORDER_DELIVERY_TYPE_KEY = "motdCustomOrderDeliveryType";

export const EMPTY_MEASUREMENTS: CustomOrderMeasurements = {
  totalLength: null,
  shoulderWidth: null,
  armLength: null,
  chestWidth: null,
  waist: null,
  hips: null,
  neckWidth: null,
  neckDepth: null,
  armholeHeight: null,
  sleeveOpeningWidth: null,
  cuffWidth: null,
  cuffLength: null,
  notes: "",
};

export function createEmptyCustomOrderDraft(
  firstStep: CustomOrderFirstStep | null = null,
): CustomOrderDraft {
  return {
    firstStep,
    fabricSource: null,
    selectedFabrics: [],
    selectedDesigns: [],
    lineItems: [],
    measurements: { ...EMPTY_MEASUREMENTS },
    deliveryAddress: {},
    addonIds: [],
  };
}

export function isDraftEmpty(draft: CustomOrderDraft): boolean {
  return (
    draft.selectedFabrics.length === 0 &&
    draft.selectedDesigns.length === 0 &&
    draft.lineItems.length === 0
  );
}

function normalizeFirstStep(value: unknown): CustomOrderFirstStep | null {
  return value === "fabric" || value === "tailor" ? value : null;
}

export function areInitialStepsComplete(draft: CustomOrderDraft): boolean {
  return isFabricStepComplete(draft) && isTailorStepComplete(draft);
}

export function getCustomOrderStepNumber(
  step: CustomOrderStep | "review",
  firstStep: CustomOrderFirstStep | null,
): number {
  const order: Array<CustomOrderStep | "review"> =
    firstStep === "tailor"
      ? ["tailor", "fabric", "meters", "measurements", "review"]
      : ["fabric", "tailor", "meters", "measurements", "review"];

  const index = order.indexOf(step);
  return index >= 0 ? index + 1 : 1;
}

export function getNextPathAfterFabric(draft: CustomOrderDraft): string {
  if (isTailorStepComplete(draft)) {
    return "/custom-order/meters";
  }
  return "/custom-order/tailor";
}

export function getNextPathAfterTailor(draft: CustomOrderDraft): string {
  if (draft.fabricSource === "self" || isFabricStepComplete(draft)) {
    return "/custom-order/meters";
  }
  return "/custom-order/fabric";
}

export function buildCustomOrderHrefFromDesign(
  designSlug: string,
  tailorSlug?: string,
): string {
  const params = new URLSearchParams({ designSlug });
  if (tailorSlug) params.set("tailorSlug", tailorSlug);
  return `/custom-order/fabric?${params.toString()}`;
}

export function buildCustomOrderHrefFromFabric(fabricSlug: string): string {
  return `/custom-order/tailor?fabricSlug=${encodeURIComponent(fabricSlug)}`;
}

export function getBackPathFromMeters(draft: CustomOrderDraft): string {
  if (draft.firstStep === "tailor") {
    return "/custom-order/fabric";
  }
  return "/custom-order/tailor";
}

export function getCustomOrderEntryPath(
  firstStep: CustomOrderFirstStep | null,
): string {
  return firstStep === "tailor"
    ? "/custom-order/tailor"
    : "/custom-order/fabric";
}

export function getCustomOrderResumePath(draft: CustomOrderDraft): string {
  if (draft.firstStep === "tailor") {
    if (!isTailorStepComplete(draft)) return "/custom-order/tailor";
    if (!isFabricStepComplete(draft)) return "/custom-order/fabric";
  } else {
    if (!isFabricStepComplete(draft)) return "/custom-order/fabric";
    if (!isTailorStepComplete(draft)) return "/custom-order/tailor";
  }
  if (!isMetersStepComplete(draft)) return "/custom-order/meters";
  return "/custom-order/review";
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function normalizeFabric(value: unknown): CustomOrderFabricSelection | null {
  if (!value || typeof value !== "object") return null;

  const fabric = value as Partial<CustomOrderFabricSelection>;
  if (!fabric._id || !fabric.slug || !fabric.name) return null;

  return {
    _id: fabric._id,
    slug: fabric.slug,
    name: fabric.name,
    nameAr: fabric.nameAr,
    material: fabric.material,
    pricePerMeter: Number(fabric.pricePerMeter) || 0,
    cuts: Array.isArray(fabric.cuts) ? fabric.cuts : undefined,
    image: fabric.image,
    stockInMeters:
      fabric.stockInMeters !== undefined
        ? Number(fabric.stockInMeters)
        : undefined,
  };
}

function normalizeTailor(value: unknown): CustomOrderTailorSelection | null {
  if (!value || typeof value !== "object") return null;

  const tailor = value as Partial<CustomOrderTailorSelection>;
  if (!tailor._id || !tailor.slug || !tailor.name) return null;

  return {
    _id: tailor._id,
    slug: tailor.slug,
    name: tailor.name,
    nameAr: tailor.nameAr,
    logo: tailor.logo,
    coverImage: tailor.coverImage,
    city: tailor.city,
    location: tailor.location,
  };
}

function normalizeDesign(value: unknown): CustomOrderDesignSelection | null {
  if (!value || typeof value !== "object") return null;

  const design = value as Partial<CustomOrderDesignSelection>;
  if (!design._id || !design.slug || !design.name) return null;

  return {
    _id: design._id,
    slug: design.slug,
    name: design.name,
    nameAr: design.nameAr,
    category: design.category || "",
    basePrice: Number(design.basePrice) || 0,
    priceType: design.priceType || "fixed",
    tailoringFee: Number(design.tailoringFee) || 0,
    estimatedMeters: Number(design.estimatedMeters) || 0,
    estimatedDays: design.estimatedDays,
    image: design.image,
  };
}

function normalizeSelectedDesign(
  value: unknown,
): CustomOrderSelectedDesign | null {
  if (!value || typeof value !== "object") return null;

  const entry = value as Partial<CustomOrderSelectedDesign>;
  const design = normalizeDesign(entry);
  const tailor = normalizeTailor(entry.tailor);

  if (!design || !tailor) return null;

  return { ...design, tailor };
}

function normalizeLineItem(value: unknown): CustomOrderLineItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<CustomOrderLineItem>;
  const design = normalizeDesign(item.design);
  const tailor = normalizeTailor(item.tailor);
  const fabric = item.fabric ? normalizeFabric(item.fabric) : null;

  if (!item.id || !design || !tailor) return null;

  const meters = normalizeNumber(item.fabricMeters);

  const legacyCutId = typeof item.cutId === "string" ? item.cutId : null;
  const legacyCutIds = Array.isArray(item.cutIds)
    ? item.cutIds.filter((id): id is string => typeof id === "string" && id.length > 0)
    : legacyCutId
      ? [legacyCutId]
      : [];

  let cutSelections: Record<string, number> = {};
  if (
    item.cutSelections &&
    typeof item.cutSelections === "object" &&
    !Array.isArray(item.cutSelections)
  ) {
    for (const [cutId, quantity] of Object.entries(item.cutSelections)) {
      const qty = Math.floor(Number(quantity));
      if (cutId && Number.isFinite(qty) && qty > 0) {
        cutSelections[cutId] = qty;
      }
    }
  } else if (Array.isArray(item.cutSelections)) {
    for (const entry of item.cutSelections as { cutId?: string; quantity?: number }[]) {
      const cutId = typeof entry?.cutId === "string" ? entry.cutId : "";
      const qty = Math.floor(Number(entry?.quantity));
      if (cutId && Number.isFinite(qty) && qty > 0) {
        cutSelections[cutId] = (cutSelections[cutId] || 0) + qty;
      }
    }
  } else {
    for (const cutId of legacyCutIds) {
      cutSelections[cutId] = (cutSelections[cutId] || 0) + 1;
    }
  }

  const cutIds = Object.keys(cutSelections);

  return {
    id: item.id,
    design,
    tailor,
    fabric,
    fabricMeters: meters,
    fabricUnit: normalizeFabricUnit(item.fabricUnit),
    cutId: cutIds[0] ?? null,
    cutIds,
    cutSelections,
  };
}

function normalizeMeasurements(value: unknown): CustomOrderMeasurements {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_MEASUREMENTS };
  }

  const measurements = value as Partial<CustomOrderMeasurements>;

  return {
    totalLength: normalizeNumber(measurements.totalLength),
    shoulderWidth: normalizeNumber(measurements.shoulderWidth),
    armLength: normalizeNumber(measurements.armLength),
    chestWidth: normalizeNumber(measurements.chestWidth),
    waist: normalizeNumber(measurements.waist),
    hips: normalizeNumber(measurements.hips),
    neckWidth: normalizeNumber(measurements.neckWidth),
    neckDepth: normalizeNumber(measurements.neckDepth),
    armholeHeight: normalizeNumber(measurements.armholeHeight),
    sleeveOpeningWidth: normalizeNumber(measurements.sleeveOpeningWidth),
    cuffWidth: normalizeNumber(measurements.cuffWidth),
    cuffLength: normalizeNumber(measurements.cuffLength),
    notes: typeof measurements.notes === "string" ? measurements.notes : "",
  };
}

function normalizeDeliveryAddress(
  value: unknown,
): Partial<CustomOrderDeliveryAddress> {
  if (!value || typeof value !== "object") return {};

  const address = value as Partial<CustomOrderDeliveryAddress>;

  return {
    fullName:
      typeof address.fullName === "string" ? address.fullName : undefined,
    phone: typeof address.phone === "string" ? address.phone : undefined,
    line1: typeof address.line1 === "string" ? address.line1 : undefined,
    line2: typeof address.line2 === "string" ? address.line2 : undefined,
    city: typeof address.city === "string" ? address.city : undefined,
    emirate: typeof address.emirate === "string" ? address.emirate : undefined,
  };
}

function normalizeFabricArray(value: unknown): CustomOrderFabricSelection[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeFabric(entry))
      .filter((entry): entry is CustomOrderFabricSelection => entry !== null);
  }
  return [];
}

function normalizeSelectedDesignArray(
  value: unknown,
): CustomOrderSelectedDesign[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeSelectedDesign(entry))
      .filter((entry): entry is CustomOrderSelectedDesign => entry !== null);
  }
  return [];
}

function normalizeLineItemArray(value: unknown): CustomOrderLineItem[] {
  if (Array.isArray(value)) {
    return value
      .map((entry) => normalizeLineItem(entry))
      .filter((entry): entry is CustomOrderLineItem => entry !== null);
  }
  return [];
}

function migrateLegacyDraft(
  draft: Record<string, unknown>,
  fabricSource: FabricSource | null,
): Pick<CustomOrderDraft, "selectedFabrics" | "selectedDesigns" | "lineItems"> {
  let selectedFabrics = normalizeFabricArray(draft.selectedFabrics);
  let selectedDesigns = normalizeSelectedDesignArray(draft.selectedDesigns);
  let lineItems = normalizeLineItemArray(draft.lineItems);

  const legacyFabric = normalizeFabric(draft.fabric);
  const legacyDesign = normalizeDesign(draft.design);
  const legacyTailor = normalizeTailor(draft.tailor);
  const legacyMeters = normalizeNumber(draft.fabricMeters);
  const legacyFabricUnit = normalizeFabricUnit(draft.fabricUnit);

  if (selectedFabrics.length === 0 && legacyFabric) {
    selectedFabrics = [legacyFabric];
  }

  if (selectedDesigns.length === 0 && legacyDesign && legacyTailor) {
    selectedDesigns = [{ ...legacyDesign, tailor: legacyTailor }];
  }

  if (lineItems.length === 0 && legacyDesign && legacyTailor) {
    lineItems = [
      {
        id: `${legacyDesign._id}-${legacyFabric?._id ?? "self"}`,
        design: legacyDesign,
        tailor: legacyTailor,
        fabric: fabricSource === "self" ? null : legacyFabric,
        fabricMeters: legacyMeters,
        fabricUnit: legacyFabricUnit,
      },
    ];
  }

  return { selectedFabrics, selectedDesigns, lineItems };
}

export function normalizeCustomOrderDraft(value: unknown): CustomOrderDraft {
  const empty = createEmptyCustomOrderDraft();
  if (!value || typeof value !== "object") return empty;

  const draft = value as Record<string, unknown>;
  const fabricSource =
    draft.fabricSource === "storefront" || draft.fabricSource === "self"
      ? draft.fabricSource
      : null;

  const migrated = migrateLegacyDraft(draft, fabricSource);

  return {
    firstStep: normalizeFirstStep(draft.firstStep),
    fabricSource:
      fabricSource ??
      (migrated.selectedFabrics.length > 0 ? "storefront" : null),
    selectedFabrics:
      fabricSource === "self" ? [] : migrated.selectedFabrics.slice(0, 1),
    selectedDesigns: migrated.selectedDesigns.slice(0, 1),
    lineItems: migrated.lineItems.slice(0, 1),
    measurements: normalizeMeasurements(draft.measurements),
    deliveryAddress: normalizeDeliveryAddress(draft.deliveryAddress),
    addonIds: Array.isArray(draft.addonIds) ? (draft.addonIds as string[]) : [],
  };
}

export function useOwnFabric(draft: CustomOrderDraft): boolean {
  return draft.fabricSource === "self";
}

export function toCustomOrderFabricSelection(
  item: FabricListItem,
): CustomOrderFabricSelection {
  const storeId =
    item.fabricShopId ||
    (typeof item.listedByStore === "object" && item.listedByStore
      ? item.listedByStore._id
      : typeof item.listedByStore === "string"
        ? item.listedByStore
        : undefined);

  return {
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    material: item.material,
    pricePerMeter: item.pricePerMeter,
    cuts: item.cuts,
    image: resolveFabricImage(item.images?.[0]),
    stockInMeters: item.stockInMeters,
    fabricShopId: storeId ? String(storeId) : undefined,
  };
}

export function isFabricStepComplete(draft: CustomOrderDraft): boolean {
  if (draft.fabricSource === "self") return true;
  if (draft.fabricSource === "storefront" && draft.selectedFabrics.length > 0) {
    const hasOutOfStock = draft.selectedFabrics.some((f) => !isFabricInStock(f));
    return !hasOutOfStock;
  }
  return false;
}

export function toCustomOrderTailorSelection(
  item: TailorShopListItem,
): CustomOrderTailorSelection {
  return {
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    logo: item.logo,
    coverImage: item.coverImage,
    city: item.city,
    location: item.location,
  };
}

export function toCustomOrderDesignSelection(
  item: TailorDesignListItem,
): CustomOrderDesignSelection {
  const cutSnapshot = item.minCutSnapshot || item.minCut;
  return {
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    category: item.category,
    basePrice: item.basePrice,
    priceType: item.priceType,
    tailoringFee: item.tailoringFee,
    minCutId: item.minCutId,
    minCutSnapshot: cutSnapshot,
    minCut: cutSnapshot,
    estimatedMeters: cutSnapshot?.lengthInMeters ?? item.estimatedMeters,
    estimatedDays: item.estimatedDays,
    image: resolveDesignImage(item.images?.[0]),
  };
}

export function toCustomOrderSelectedDesign(
  item: TailorDesignListItem,
): CustomOrderSelectedDesign | null {
  const design = toCustomOrderDesignSelection(item);
  if (!item.tailorShopId || !item.tailorSlug || !item.tailorName) return null;

  return {
    ...design,
    tailor: {
      _id: item.tailorShopId,
      slug: item.tailorSlug,
      name: item.tailorName,
      nameAr: item.tailorNameAr,
    },
  };
}

export function isTailorStepComplete(draft: CustomOrderDraft): boolean {
  return draft.selectedDesigns.length > 0;
}

export function isLineItemMetersValid(
  meters: number | null,
  unit: FabricUnit = "meters",
): boolean {
  if (meters === null) return false;

  const rounded = Number(meters.toFixed(2));

  if (unit === "war" || unit === "wara") {
    const metersInMeters = rounded * WAR_TO_METER;
    return metersInMeters >= 2 && metersInMeters <= 7;
  }

  return rounded >= 2 && rounded <= 7;
}

export function getLineItemCutSelections(
  item: CustomOrderLineItem,
): Record<string, number> {
  if (item.cutSelections && Object.keys(item.cutSelections).length > 0) {
    const next: Record<string, number> = {};
    for (const [cutId, quantity] of Object.entries(item.cutSelections)) {
      const qty = Math.floor(Number(quantity));
      if (cutId && Number.isFinite(qty) && qty > 0) {
        next[cutId] = qty;
      }
    }
    return next;
  }

  const legacyIds = Array.isArray(item.cutIds)
    ? item.cutIds
    : item.cutId
      ? [item.cutId]
      : [];
  const next: Record<string, number> = {};
  for (const cutId of legacyIds) {
    if (!cutId) continue;
    next[cutId] = (next[cutId] || 0) + 1;
  }
  return next;
}

export function getLineItemCutIds(item: CustomOrderLineItem): string[] {
  return Object.keys(getLineItemCutSelections(item));
}

export function getFabricCutStock(
  fabric: CustomOrderFabricSelection | null | undefined,
  cutId: string,
): number {
  const entry = fabric?.cuts?.find((cut) => cut.cutId === cutId);
  if (!entry) return 0;
  return Math.max(0, Math.floor(Number(entry.stockPieces ?? entry.stock) || 0));
}

export function getFabricCutLengthInMeters(
  fabric: CustomOrderFabricSelection | null | undefined,
  cutId: string,
): number {
  const entry = fabric?.cuts?.find((cut) => cut.cutId === cutId);
  if (!entry?.cut) return 0;
  return cutValueToMeters(entry.cut.value, entry.cut.unit);
}

export function getSelectedCutsLengthInMeters(
  item: CustomOrderLineItem,
): number {
  const selections = getLineItemCutSelections(item);
  const cutIds = Object.keys(selections);
  if (cutIds.length === 0) return 0;
  return Number(
    cutIds
      .reduce(
        (sum, cutId) =>
          sum +
          getFabricCutLengthInMeters(item.fabric, cutId) *
            (selections[cutId] || 0),
        0,
      )
      .toFixed(2),
  );
}

export function buildCutSelectionsPayload(
  item: CustomOrderLineItem,
): { cutId: string; quantity: number }[] {
  return Object.entries(getLineItemCutSelections(item)).map(
    ([cutId, quantity]) => ({ cutId, quantity }),
  );
}

export function expandCutIdsFromSelections(
  selections: Record<string, number>,
): string[] {
  const ids: string[] = [];
  for (const [cutId, quantity] of Object.entries(selections)) {
    const qty = Math.max(0, Math.floor(quantity));
    for (let i = 0; i < qty; i += 1) {
      ids.push(cutId);
    }
  }
  return ids;
}

export function isLineItemComplete(
  item: CustomOrderLineItem,
  fabricSource: FabricSource | null,
): boolean {

  if (fabricSource === "storefront") {
    if (!item.fabric) return false;
    if (item.selectedCuts && item.selectedCuts.length > 0) {
      return true;
    }
    return item.fabricMeters !== null && item.fabricMeters > 0;
  }

  if (!isFabricLengthSufficientForDesign(item)) return false;
  if (fabricSource === "storefront" && !item.fabric) return false;

  if (isStorefrontCutSelectionRequired(item, fabricSource)) {
    return getLineItemCutIds(item).length > 0;
  }


  return isLineItemMetersValid(item.fabricMeters, item.fabricUnit);
}

export function isMetersStepComplete(draft: CustomOrderDraft): boolean {
  if (draft.lineItems.length === 0) return false;
  return draft.lineItems.every((item) =>
    isLineItemComplete(item, draft.fabricSource),
  );
}

export function isMeasurementsStepComplete(_draft: CustomOrderDraft): boolean {
  return true;
}

export function isReviewStepComplete(
  draft: CustomOrderDraft,
  hasPricing: boolean,
): boolean {
  return buildCustomOrderPreviewPayload(draft) !== null && hasPricing;
}

export function createLineItemId(
  designId: string,
  fabricId: string | null,
): string {
  return `${designId}-${fabricId ?? "self"}`;
}

export function getMinimumMetersForDesign(
  design: CustomOrderDesignSelection,
): number {
  const fromSnapshot =
    design.minCutSnapshot?.lengthInMeters ?? design.minCut?.lengthInMeters;
  if (typeof fromSnapshot === "number" && fromSnapshot > 0) {
    return fromSnapshot;
  }
  const estimated = design.estimatedMeters;
  if (typeof estimated === "number" && estimated > 0) {
    return estimated;
  }
  return 2;
}

export function getLineItemFabricLengthInMeters(
  item: CustomOrderLineItem,
): number | null {
  if (item.fabricMeters === null) return null;
  if (item.fabricUnit === "war" || item.fabricUnit === "wara") {
    return Number((item.fabricMeters * WAR_TO_METER).toFixed(2));
  }
  return Number(item.fabricMeters.toFixed(2));
}

export function isFabricLengthSufficientForDesign(
  item: CustomOrderLineItem,
): boolean {
  const selected = getLineItemFabricLengthInMeters(item);
  if (selected === null) return false;
  const required = getMinimumMetersForDesign(item.design);
  return selected + 0.009 >= required;
}

export function isStorefrontCutSelectionRequired(
  item: CustomOrderLineItem,
  fabricSource: FabricSource | null,
): boolean {
  return (
    fabricSource === "storefront" &&
    Boolean(item.fabric?.cuts && item.fabric.cuts.length > 0)
  );
}

export function getSuggestedMetersForDesign(
  design: CustomOrderDesignSelection,
): number {
  const minimum = getMinimumMetersForDesign(design);
  return Math.min(7, Math.max(2, minimum));
}

export function buildAutoLineItem(
  design: CustomOrderSelectedDesign,
  fabric: CustomOrderFabricSelection | null,
): CustomOrderLineItem {
  return {
    id: createLineItemId(design._id, fabric?._id ?? null),
    design,
    tailor: design.tailor,
    fabric,
    fabricMeters: null,
    fabricUnit: "meters",
    cutId: null,
    cutIds: [],
    cutSelections: {},
  };
}

/** One design + one fabric (or own fabric) per order. */
export function buildAutoLineItemsFromSelections(
  selectedFabrics: CustomOrderFabricSelection[],
  selectedDesigns: CustomOrderSelectedDesign[],
  fabricSource: FabricSource | null,
): CustomOrderLineItem[] {
  if (selectedDesigns.length === 0) return [];

  const design = selectedDesigns[0];
  const usingOwnFabric = fabricSource === "self";
  if (usingOwnFabric) {
    return [buildAutoLineItem(design, null)];
  }

  const fabric = selectedFabrics[0];
  if (!fabric) return [];
  return [buildAutoLineItem(design, fabric)];
}

export function buildCustomOrderPreviewPayload(
  draft: CustomOrderDraft,
): CustomOrderPreviewPayload | null {
  if (!draft.fabricSource || !isMetersStepComplete(draft)) {
    return null;
  }

  const items: CustomOrderPreviewItemPayload[] = [];

  for (const item of draft.lineItems) {
    if (!isLineItemComplete(item, draft.fabricSource) || !item.fabricMeters) {
      return null;
    }

    // Convert to meters before sending to backend
    let metersInMeters = item.fabricMeters;
    if (item.fabricUnit === "war" || item.fabricUnit === "wara") {
      metersInMeters = item.fabricMeters * WAR_TO_METER;
    }
    // Round to 2 decimal places
    metersInMeters = Number(metersInMeters.toFixed(2));

    const cutSelectionsPayload = buildCutSelectionsPayload(item);
    const expandedCutIds = expandCutIdsFromSelections(
      getLineItemCutSelections(item),
    );

    items.push({
      designId: item.design._id,
      fabricMeters: metersInMeters, // always in meters
      ...(cutSelectionsPayload.length > 0
        ? {
            cutId: cutSelectionsPayload[0].cutId,
            cutIds: expandedCutIds,
            cutSelections: cutSelectionsPayload,
          }
        : {}),
      ...(draft.fabricSource === "storefront" && item.fabric
        ? { fabricId: item.fabric._id }
        : {}),
    });
  }

  if (items.length === 0) return null;

  return {
    fabricSource: draft.fabricSource,
    items,
  };
}

export interface CustomOrderCreatePayload extends CustomOrderPreviewPayload {
  measurements: CustomOrderMeasurements;
  customerDeliveryAddress: CustomOrderDeliveryAddress;
  pickupAddress?: CustomOrderDeliveryAddress;
  paymentMethod: "apple_pay" | "card";
  addPocket?: boolean;
  addBottomWideFold?: boolean;
}

export function buildCustomOrderCreatePayload(
  draft: CustomOrderDraft,
  deliveryAddress: CustomOrderDeliveryAddress,
  paymentMethod: "apple_pay" | "card" = "card",
): CustomOrderCreatePayload | null {
  const preview = buildCustomOrderPreviewPayload(draft);
  if (!preview) return null;

  const payload: CustomOrderCreatePayload = {
    ...preview,
    measurements: draft.measurements,
    customerDeliveryAddress: deliveryAddress,
    paymentMethod,
  };

  if (draft.fabricSource === "self") {
    payload.pickupAddress = deliveryAddress;
  }

  return payload;
}

export function toggleFabricInList(
  fabrics: CustomOrderFabricSelection[],
  fabric: CustomOrderFabricSelection,
): CustomOrderFabricSelection[] {
  const exists = fabrics.some((entry) => entry._id === fabric._id);
  if (exists) return [];
  return [fabric];
}

export function toggleDesignInList(
  designs: CustomOrderSelectedDesign[],
  design: CustomOrderSelectedDesign,
): CustomOrderSelectedDesign[] {
  const exists = designs.some((entry) => entry._id === design._id);
  if (exists) return [];
  return [design];
}

export function pruneLineItemsForSelections(
  lineItems: CustomOrderLineItem[],
  selectedFabrics: CustomOrderFabricSelection[],
  selectedDesigns: CustomOrderSelectedDesign[],
  fabricSource: FabricSource | null,
): CustomOrderLineItem[] {
  const fabricIds = new Set(selectedFabrics.map((fabric) => fabric._id));
  const designIds = new Set(selectedDesigns.map((design) => design._id));

  return lineItems.filter((item) => {
    if (!designIds.has(item.design._id)) return false;
    if (fabricSource === "storefront") {
      return item.fabric ? fabricIds.has(item.fabric._id) : false;
    }
    return true;
  });
}

export function getLineItemPairKey(
  designId: string,
  fabricId: string | null,
): string {
  return `${designId}::${fabricId ?? "self"}`;
}
