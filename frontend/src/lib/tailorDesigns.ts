import { api, type ApiError } from "@/lib/api/client";
import { isShopIncompleteError } from "@/lib/shopProfile";

export interface DesignCategoryOption {
  _id: string;
  name: string;
  nameAr: string;
  isActive: boolean;
}

export interface DesignFilterOption {
  _id: string;
  name: string;
  nameAr: string;
}

export interface TailorDesignProfile {
  _id: string;
  tailorShopId: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  images: string[];
  category: string;
  categoryAr: string;
  material: string;
  materialAr: string;
  season: string;
  seasonAr: string;
  pattern: string;
  patternAr: string;
  tag: string;
  tagAr: string;
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
  estimatedMeters?: number;
  estimatedDays: number;
  minAge: number;
  maxAge: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TailorDesignFormData {
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  images: string[];
  category: string;
  categoryAr: string;
  material: string;
  materialAr: string;
  season: string;
  seasonAr: string;
  pattern: string;
  patternAr: string;
  tag: string;
  tagAr: string;
  basePrice: number;
  priceType: "fixed" | "per_meter";
  tailoringFee: number;
  minCutId: string;
  estimatedMeters?: number;
  estimatedDays: number;
  minAge: number;
  maxAge: number;
  isActive: boolean;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const DEFAULT_TAILORING_FEE = 150;

export async function fetchDefaultTailoringFee(): Promise<number> {
  try {
    const data = await api.get<{ defaultTailoringFee?: number }>(
      "/api/orders/settings",
    );
    const fee = Number(data?.defaultTailoringFee);
    return Number.isFinite(fee) && fee >= 0 ? fee : DEFAULT_TAILORING_FEE;
  } catch {
    return DEFAULT_TAILORING_FEE;
  }
}

export function emptyTailorDesignForm(
  defaultTailoringFee: number = DEFAULT_TAILORING_FEE,
): TailorDesignFormData {
  return {
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    descriptionAr: "",
    images: [""],
    category: "",
    categoryAr: "",
    material: "",
    materialAr: "",
    season: "",
    seasonAr: "",
    pattern: "",
    patternAr: "",
    tag: "",
    tagAr: "",
    basePrice: 0,
    priceType: "fixed",
    tailoringFee: defaultTailoringFee,
    minCutId: "",
    estimatedMeters: 3.5,
    estimatedDays: 7,
    minAge: 0,
    maxAge: 0,
    isActive: true,
  };
}

export function slugifyDesignName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function designToForm(
  design: TailorDesignProfile,
): TailorDesignFormData {
  const minCutId =
    typeof design.minCutId === "object" && (design.minCutId as any)?._id
      ? String((design.minCutId as any)._id)
      : design.minCutId
        ? String(design.minCutId)
        : "";

  return {
    name: design.name ?? "",
    nameAr: design.nameAr ?? "",
    slug: design.slug ?? "",
    description: design.description ?? "",
    descriptionAr: design.descriptionAr ?? "",
    images: design.images?.length ? [...design.images] : [""],
    category: design.category ?? "",
    categoryAr: design.categoryAr ?? "",
    material: design.material ?? "",
    materialAr: design.materialAr ?? "",
    season: design.season ?? "",
    seasonAr: design.seasonAr ?? "",
    pattern: design.pattern ?? "",
    patternAr: design.patternAr ?? "",
    tag: design.tag ?? "",
    tagAr: design.tagAr ?? "",
    basePrice: design.basePrice ?? 0,
    priceType: "fixed",
    tailoringFee: design.tailoringFee ?? DEFAULT_TAILORING_FEE,
    minCutId,
    estimatedMeters:
      design.minCutSnapshot?.lengthInMeters ?? design.estimatedMeters ?? 3.5,
    estimatedDays: design.estimatedDays ?? 7,
    minAge: Number.isFinite(Number(design.minAge)) ? Number(design.minAge) : 0,
    maxAge: Number.isFinite(Number(design.maxAge)) ? Number(design.maxAge) : 0,
    isActive: design.isActive ?? true,
  };
}

export function toTailorDesignPayload(
  form: TailorDesignFormData,
): Record<string, unknown> {
  const name = form.name.trim();
  const basePrice = Number(form.basePrice || 0);
  const tailoringFee = Number(form.tailoringFee ?? DEFAULT_TAILORING_FEE);
  return {
    name,
    nameAr: form.nameAr.trim(),
    slug: slugifyDesignName(name),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    images: form.images.map((image) => image.trim()).filter(Boolean),
    category: form.category,
    categoryAr: form.categoryAr.trim(),
    material: form.material.trim(),
    materialAr: form.materialAr.trim(),
    season: form.season.trim(),
    seasonAr: form.seasonAr.trim(),
    pattern: form.pattern.trim(),
    patternAr: form.patternAr.trim(),
    tag: form.tag.trim(),
    tagAr: form.tagAr.trim(),
    basePrice,
    priceType: "fixed",
    tailoringFee,
    minCutId: form.minCutId,
    estimatedMeters: form.estimatedMeters ? Number(form.estimatedMeters) : undefined,
    estimatedDays: Number(form.estimatedDays),
    minAge: Number(form.minAge),
    maxAge: Number(form.maxAge),
    isActive: form.isActive,
  };
}

export async function fetchTailorDesigns(): Promise<TailorDesignProfile[]> {
  const response = await api.get<{
    success: boolean;
    items: TailorDesignProfile[];
  }>("/api/tailor/designs");
  return response.items ?? [];
}

export async function fetchTailorDesign(
  id: string,
): Promise<TailorDesignProfile> {
  const designs = await fetchTailorDesigns();
  const design = designs.find((item) => item._id === id);
  if (!design) {
    throw { status: 404, message: "Design not found" } as ApiError;
  }
  return design;
}

export async function createTailorDesign(
  form: TailorDesignFormData,
): Promise<TailorDesignProfile> {
  const response = await api.post<{
    success: boolean;
    item: TailorDesignProfile;
  }>("/api/tailor/designs", toTailorDesignPayload(form));
  return response.item;
}

export async function updateTailorDesign(
  id: string,
  form: TailorDesignFormData,
): Promise<TailorDesignProfile> {
  const response = await api.put<{
    success: boolean;
    item: TailorDesignProfile;
  }>(`/api/tailor/designs/${id}`, toTailorDesignPayload(form));
  return response.item;
}

export async function deleteTailorDesign(id: string): Promise<void> {
  await api.delete(`/api/tailor/designs/${id}`);
}

export function isShopMissingError(error: unknown): boolean {
  if ((error as ApiError)?.status === 404) return true;
  return isShopIncompleteError(error);
}

export async function fetchDesignCategories(): Promise<DesignCategoryOption[]> {
  const data = await api.get<DesignCategoryOption[]>(
    "/api/filters/categories?domain=designs",
  );
  return Array.isArray(data) ? data : [];
}

async function fetchFilterOptions(endpoint: string): Promise<DesignFilterOption[]> {
  const data = await api.get<DesignFilterOption[]>(endpoint);
  return Array.isArray(data) ? data : [];
}

export const fetchDesignMaterials = () =>
  fetchFilterOptions("/api/filters/materials?domain=designs");

export const fetchDesignPatterns = () =>
  fetchFilterOptions("/api/filters/patterns?domain=designs");

export const fetchDesignSeasons = () =>
  fetchFilterOptions("/api/filters/seasons?domain=designs");

export const fetchDesignTags = () =>
  fetchFilterOptions("/api/filters/tags?domain=designs");
