import { api, type ApiError } from "@/lib/api/client";

export const DESIGN_CATEGORIES = [
  "kandura",
  "abaya",
  "bisht",
  "mukhawar",
  "jalabiya",
  "kaftan",
  "thob",
] as const;

export type DesignCategory = (typeof DESIGN_CATEGORIES)[number];

export interface TailorDesignProfile {
  _id: string;
  tailorShopId: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  images: string[];
  category: DesignCategory | string;
  basePrice: number;
  tailoringFee: number;
  estimatedMeters: number;
  estimatedDays: number;
  ageMin: number;
  ageMax: number;
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
  category: DesignCategory;
  basePrice: number;
  tailoringFee: number;
  estimatedMeters: number;
  estimatedDays: number;
  ageMin: number;
  ageMax: number;
  isActive: boolean;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const DEFAULT_TAILORING_FEE = 150;

export function emptyTailorDesignForm(): TailorDesignFormData {
  return {
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    descriptionAr: "",
    images: [""],
    category: "kandura",
    basePrice: 0,
    tailoringFee: DEFAULT_TAILORING_FEE,
    estimatedMeters: 3.5,
    estimatedDays: 7,
    ageMin: 0,
    ageMax: 150,
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
  return {
    name: design.name ?? "",
    nameAr: design.nameAr ?? "",
    slug: design.slug ?? "",
    description: design.description ?? "",
    descriptionAr: design.descriptionAr ?? "",
    images: design.images?.length ? [...design.images] : [""],
    category: (DESIGN_CATEGORIES.includes(design.category as DesignCategory)
      ? design.category
      : "kandura") as DesignCategory,
    basePrice: design.basePrice ?? 0,
    tailoringFee: design.tailoringFee ?? DEFAULT_TAILORING_FEE,
    estimatedMeters: design.estimatedMeters ?? 3.5,
    estimatedDays: design.estimatedDays ?? 7,
    ageMin: design.ageMin ?? 0,
    ageMax: design.ageMax ?? 150,
    isActive: design.isActive ?? true,
  };
}

export function toTailorDesignPayload(
  form: TailorDesignFormData,
): Record<string, unknown> {
  return {
    name: form.name.trim(),
    nameAr: form.nameAr.trim(),
    slug: form.slug.trim().toLowerCase(),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    images: form.images.map((image) => image.trim()).filter(Boolean),
    category: form.category,
    basePrice: Number(form.basePrice),
    tailoringFee: Number(form.tailoringFee),
    estimatedMeters: Number(form.estimatedMeters),
    estimatedDays: Number(form.estimatedDays),
    ageMin: form.ageMin,
    ageMax: form.ageMax,
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
  return (error as ApiError)?.status === 404;
}
