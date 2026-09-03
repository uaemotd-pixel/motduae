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
    material: design.material ?? "",
    materialAr: design.materialAr ?? "",
    season: design.season ?? "",
    seasonAr: design.seasonAr ?? "",
    pattern: design.pattern ?? "",
    patternAr: design.patternAr ?? "",
    tag: design.tag ?? "",
    tagAr: design.tagAr ?? "",
    basePrice: design.tailoringFee ?? design.basePrice ?? 0,
    priceType: "fixed",
    tailoringFee: design.tailoringFee ?? design.basePrice ?? DEFAULT_TAILORING_FEE,
    minCutId,
    estimatedMeters:
      design.minCutSnapshot?.lengthInMeters ?? design.estimatedMeters ?? 3.5,
    estimatedDays: design.estimatedDays ?? 7,
    isActive: design.isActive ?? true,
  };
}

export function toTailorDesignPayload(
  form: TailorDesignFormData,
): Record<string, unknown> {
  const name = form.name.trim();
  const fee = Number(form.tailoringFee || form.basePrice || 0);
  return {
    name,
    nameAr: form.nameAr.trim(),
    slug: slugifyDesignName(name),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    images: form.images.map((image) => image.trim()).filter(Boolean),
    category: form.category,
    material: form.material.trim(),
    materialAr: form.materialAr.trim(),
    season: form.season.trim(),
    seasonAr: form.seasonAr.trim(),
    pattern: form.pattern.trim(),
    patternAr: form.patternAr.trim(),
    tag: form.tag.trim(),
    tagAr: form.tagAr.trim(),
    basePrice: fee,
    priceType: "fixed",
    tailoringFee: fee,
    minCutId: form.minCutId,
    estimatedMeters: form.estimatedMeters ? Number(form.estimatedMeters) : undefined,
    estimatedDays: Number(form.estimatedDays),
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
  const data = await api.get<DesignCategoryOption[]>("/api/filters/categories");
  return Array.isArray(data) ? data : [];
}

async function fetchFilterOptions(endpoint: string): Promise<DesignFilterOption[]> {
  const data = await api.get<DesignFilterOption[]>(endpoint);
  return Array.isArray(data) ? data : [];
}

export const fetchDesignMaterials = () =>
  fetchFilterOptions("/api/filters/materials");

export const fetchDesignPatterns = () =>
  fetchFilterOptions("/api/filters/patterns");

export const fetchDesignSeasons = () =>
  fetchFilterOptions("/api/filters/seasons");

export const fetchDesignTags = () => fetchFilterOptions("/api/filters/tags");
