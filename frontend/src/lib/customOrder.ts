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

export interface CustomOrderMeasurements {
    chest: number | null;
    waist: number | null;
    hips: number | null;
    inseam: number | null;
    sleeveLength: number | null;
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

export const CUSTOM_ORDER_STORAGE_KEY = "motdCustomOrderDraft";

export const EMPTY_MEASUREMENTS: CustomOrderMeasurements = {
    chest: null,
    waist: null,
    hips: null,
    inseam: null,
    sleeveLength: null,
    notes: "",
};

export function createEmptyCustomOrderDraft(): CustomOrderDraft {
    return {
        fabricSource: null,
        fabric: null,
        tailor: null,
        design: null,
        fabricMeters: null,
        measurements: { ...EMPTY_MEASUREMENTS },
        deliveryAddress: {},
    };
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
        chest: normalizeNumber(measurements.chest),
        waist: normalizeNumber(measurements.waist),
        hips: normalizeNumber(measurements.hips),
        inseam: normalizeNumber(measurements.inseam),
        sleeveLength: normalizeNumber(measurements.sleeveLength),
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
    return draft.fabricMeters !== null && draft.fabricMeters > 0;
}

export function isMeasurementsStepComplete(_draft: CustomOrderDraft): boolean {
    return true;
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
