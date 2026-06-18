import type { FabricListItem } from "@/lib/fabrics";
import { resolveFabricImage } from "@/lib/fabrics";
import type {
    TailorDesignListItem,
    TailorShopListItem,
} from "@/lib/tailors";
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
    fabric: CustomOrderFabricSelection | null;
    tailor: CustomOrderTailorSelection | null;
    design: CustomOrderDesignSelection | null;
    fabricMeters: number | null;
    measurements: CustomOrderMeasurements;
    deliveryAddress: Partial<CustomOrderDeliveryAddress>;
}

export interface CustomOrderPreviewPayload {
    designId: string;
    fabricSource: FabricSource;
    fabricId?: string;
    fabricMeters: number;
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
}

export const CUSTOM_ORDER_STORAGE_KEY = "motdCustomOrderDraft";

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
    cuffLength: null,
    notes: "",
};

export function createEmptyCustomOrderDraft(
    firstStep: CustomOrderFirstStep | null = null,
): CustomOrderDraft {
    return {
        firstStep,
        fabricSource: null,
        fabric: null,
        tailor: null,
        design: null,
        fabricMeters: null,
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
        fullName: typeof address.fullName === "string" ? address.fullName : undefined,
        phone: typeof address.phone === "string" ? address.phone : undefined,
        line1: typeof address.line1 === "string" ? address.line1 : undefined,
        line2: typeof address.line2 === "string" ? address.line2 : undefined,
        city: typeof address.city === "string" ? address.city : undefined,
        emirate: typeof address.emirate === "string" ? address.emirate : undefined,
    };
}

export function normalizeCustomOrderDraft(value: unknown): CustomOrderDraft {
    const empty = createEmptyCustomOrderDraft();
    if (!value || typeof value !== "object") return empty;

    const draft = value as Partial<CustomOrderDraft>;
    const fabricSource =
        draft.fabricSource === "storefront" || draft.fabricSource === "self"
            ? draft.fabricSource
            : null;

    const fabric = normalizeFabric(draft.fabric);
    const tailor = normalizeTailor(draft.tailor);
    const design = normalizeDesign(draft.design);

    return {
        firstStep: normalizeFirstStep(draft.firstStep),
        fabricSource,
        fabric: fabricSource === "self" ? null : fabric,
        tailor,
        design,
        fabricMeters: normalizeNumber(draft.fabricMeters),
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
    if (draft.fabricSource === "storefront" && draft.fabric) return true;
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

export function isTailorStepComplete(draft: CustomOrderDraft): boolean {
    return Boolean(draft.tailor && draft.design);
}

export function isMetersStepComplete(draft: CustomOrderDraft): boolean {
    return draft.fabricMeters !== null && draft.fabricMeters >= 3 && draft.fabricMeters <= 7;
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

export function buildCustomOrderPreviewPayload(
    draft: CustomOrderDraft,
): CustomOrderPreviewPayload | null {
    if (!draft.design?._id || !draft.fabricSource || !draft.fabricMeters) {
        return null;
    }

    if (draft.fabricSource === "storefront" && !draft.fabric?._id) {
        return null;
    }

    return {
        designId: draft.design._id,
        fabricSource: draft.fabricSource,
        fabricMeters: draft.fabricMeters,
        ...(draft.fabricSource === "storefront"
            ? { fabricId: draft.fabric!._id }
            : {}),
    };
}

export interface CustomOrderCreatePayload extends CustomOrderPreviewPayload {
    measurements: CustomOrderMeasurements;
    customerDeliveryAddress: CustomOrderDeliveryAddress;
    pickupAddress?: CustomOrderDeliveryAddress;
    paymentMethod: "cod";
}

export function buildCustomOrderCreatePayload(
    draft: CustomOrderDraft,
    deliveryAddress: CustomOrderDeliveryAddress,
): CustomOrderCreatePayload | null {
    const preview = buildCustomOrderPreviewPayload(draft);
    if (!preview) return null;

    const payload: CustomOrderCreatePayload = {
        ...preview,
        measurements: draft.measurements,
        customerDeliveryAddress: deliveryAddress,
        paymentMethod: "cod",
    };

    if (draft.fabricSource === "self") {
        payload.pickupAddress = deliveryAddress;
    }

    return payload;
}
