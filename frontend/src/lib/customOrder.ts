import type { FabricListItem } from "@/lib/fabrics";
import { resolveFabricImage } from "@/lib/fabrics";
import type { TailorDesignListItem, TailorShopListItem } from "@/lib/tailors";
import { resolveDesignImage } from "@/lib/tailors";

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
  pricePerMeter: number;
  image?: string;
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
  tailoringFee: number;
  estimatedMeters: number;
  estimatedDays?: number;
  image?: string;
}

export interface CustomOrderSelectedDesign extends CustomOrderDesignSelection {
  tailor: CustomOrderTailorSelection;
}

export type FabricUnit = "meters" | "wara";

export interface CustomOrderLineItem {
  id: string;
  design: CustomOrderDesignSelection;
  tailor: CustomOrderTailorSelection;
  fabric: CustomOrderFabricSelection | null;
  fabricMeters: number | null;
  fabricUnit: FabricUnit;
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
}

export interface CustomOrderDraft {
  firstStep: CustomOrderFirstStep | null;
  fabricSource: FabricSource | null;
  selectedFabrics: CustomOrderFabricSelection[];
  selectedDesigns: CustomOrderSelectedDesign[];
  lineItems: CustomOrderLineItem[];
  measurements: CustomOrderMeasurements;
  deliveryAddress: Partial<CustomOrderDeliveryAddress>;
}

export interface CustomOrderPreviewItemPayload {
  designId: string;
  fabricId?: string;
  fabricMeters: number;
}

export interface CustomOrderPreviewPayload {
  fabricSource: FabricSource;
  items: CustomOrderPreviewItemPayload[];
}

export interface CustomOrderPricingBreakdown {
  designBase: number;
  fabricMeters: number;
  fabricPricePerMeter: number;
  fabricCost: number;
  tailoringFee: number;
  deliveryFee: number;
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
  };
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
  if (draft.firstStep === "fabric") return "/custom-order/tailor";
  if (isTailorStepComplete(draft)) return "/custom-order/meters";
  return "/custom-order/tailor";
}

export function getNextPathAfterTailor(draft: CustomOrderDraft): string {
  if (draft.firstStep === "tailor") return "/custom-order/fabric";
  if (isFabricStepComplete(draft)) return "/custom-order/meters";
  return "/custom-order/fabric";
}

export function getBackPathFromMeters(
  firstStep: CustomOrderFirstStep | null,
): string {
  return firstStep === "tailor"
    ? "/custom-order/fabric"
    : "/custom-order/tailor";
}

export function getCustomOrderEntryPath(
  firstStep: CustomOrderFirstStep | null,
): string {
  return firstStep === "tailor"
    ? "/custom-order/tailor"
    : "/custom-order/fabric";
}

export function getCustomOrderResumePath(draft: CustomOrderDraft): string {
  if (!isFabricStepComplete(draft)) return "/custom-order/fabric";
  if (!isTailorStepComplete(draft)) return "/custom-order/tailor";
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
    image: fabric.image,
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

export const WARA_TO_METERS = 0.9914;

// lib/customOrder.ts

export function convertToMeters(value: number, unit: FabricUnit): number {
  let result: number;
  if (unit === "wara") {
    result = value * WARA_TO_METERS;
  } else {
    result = value;
  }
  return Number(result.toFixed(2)); // Round to 2 decimals
}

export function convertToWara(value: number): number {
  return Number((value / WARA_TO_METERS).toFixed(2));
}

export function getDisplayUnit(unit: FabricUnit): string {
  return unit === "wara" ? "Wara" : "Meters";
}

function normalizeFabricUnit(value: unknown): FabricUnit {
  return value === "wara" ? "wara" : "meters";
}

function normalizeLineItem(value: unknown): CustomOrderLineItem | null {
  if (!value || typeof value !== "object") return null;

  const item = value as Partial<CustomOrderLineItem>;
  const design = normalizeDesign(item.design);
  const tailor = normalizeTailor(item.tailor);
  const fabric = item.fabric ? normalizeFabric(item.fabric) : null;

  if (!item.id || !design || !tailor) return null;

  const meters = normalizeNumber(item.fabricMeters);

  return {
    id: item.id,
    design,
    tailor,
    fabric,
    fabricMeters: meters,
    fabricUnit: normalizeFabricUnit(item.fabricUnit),
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
    selectedFabrics: fabricSource === "self" ? [] : migrated.selectedFabrics,
    selectedDesigns: migrated.selectedDesigns,
    lineItems: migrated.lineItems,
    measurements: normalizeMeasurements(draft.measurements),
    deliveryAddress: normalizeDeliveryAddress(draft.deliveryAddress),
  };
}

export function useOwnFabric(draft: CustomOrderDraft): boolean {
  return draft.fabricSource === "self";
}

export function toCustomOrderFabricSelection(
  item: FabricListItem,
): CustomOrderFabricSelection {
  return {
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    material: item.material,
    pricePerMeter: item.pricePerMeter,
    image: resolveFabricImage(item.images?.[0]),
  };
}

export function isFabricStepComplete(draft: CustomOrderDraft): boolean {
  if (draft.fabricSource === "self") return true;
  if (draft.fabricSource === "storefront" && draft.selectedFabrics.length > 0) {
    return true;
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
  return {
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    category: item.category,
    basePrice: item.basePrice,
    tailoringFee: item.tailoringFee,
    estimatedMeters: item.estimatedMeters,
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

  if (unit === "wara") {
    const metersInMeters = rounded * WARA_TO_METERS;
    return metersInMeters >= 2 && metersInMeters <= 7;
  }

  return rounded >= 2 && rounded <= 7;
}

export function isLineItemComplete(
  item: CustomOrderLineItem,
  fabricSource: FabricSource | null,
): boolean {
  if (!isLineItemMetersValid(item.fabricMeters)) return false;
  if (fabricSource === "storefront" && !item.fabric) return false;
  return true;
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

export function getSuggestedMetersForDesign(
  design: CustomOrderDesignSelection,
): number {
  const estimated = design.estimatedMeters;
  if (!estimated || estimated <= 0) return 3;
  return Math.min(7, Math.max(2, estimated));
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
    fabricMeters: getSuggestedMetersForDesign(design),
    fabricUnit: "meters",
  };
}

/** Auto-pair when one side has a single selection; skip N×N to avoid cartesian explosion. */
export function buildAutoLineItemsFromSelections(
  selectedFabrics: CustomOrderFabricSelection[],
  selectedDesigns: CustomOrderSelectedDesign[],
  fabricSource: FabricSource | null,
): CustomOrderLineItem[] {
  if (selectedDesigns.length === 0) return [];

  const usingOwnFabric = fabricSource === "self";
  if (!usingOwnFabric && selectedFabrics.length === 0) return [];

  if (selectedDesigns.length === 1) {
    const design = selectedDesigns[0];
    if (usingOwnFabric) {
      return [buildAutoLineItem(design, null)];
    }
    return selectedFabrics.map((fabric) => buildAutoLineItem(design, fabric));
  }

  if (usingOwnFabric || selectedFabrics.length === 1) {
    const fabric = usingOwnFabric ? null : selectedFabrics[0];
    return selectedDesigns.map((design) => buildAutoLineItem(design, fabric));
  }

  return [];
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
    if (item.fabricUnit === "wara") {
      metersInMeters = item.fabricMeters * WARA_TO_METERS;
    }
    // Round to 2 decimal places
    metersInMeters = Number(metersInMeters.toFixed(2));

    items.push({
      designId: item.design._id,
      fabricMeters: metersInMeters, // always in meters
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
  paymentMethod: "cod" | "apple_pay";
  addPocket?: boolean;
  addBottomWideFold?: boolean;
}

export function buildCustomOrderCreatePayload(
  draft: CustomOrderDraft,
  deliveryAddress: CustomOrderDeliveryAddress,
  paymentMethod: "cod" | "apple_pay" = "cod",
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
  if (exists) {
    return fabrics.filter((entry) => entry._id !== fabric._id);
  }
  return [...fabrics, fabric];
}

export function toggleDesignInList(
  designs: CustomOrderSelectedDesign[],
  design: CustomOrderSelectedDesign,
): CustomOrderSelectedDesign[] {
  const exists = designs.some((entry) => entry._id === design._id);
  if (exists) {
    return designs.filter((entry) => entry._id !== design._id);
  }
  return [...designs, design];
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
