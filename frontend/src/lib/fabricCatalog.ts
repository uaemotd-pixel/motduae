import { api, type ApiError } from "@/lib/api/client";
import { isShopIncompleteError } from "@/lib/shopProfile";
import {
  createEmptyFabricCutRow,
  mapApiCutsArray,
  serializeFabricCuts,
  type FabricCutFormEntry,
} from "@/lib/createFabricAdmin";
import { normalizeUaePhone } from "@/lib/uaePhone";

export const FABRIC_MATERIALS = ["chiffon", "silk velvet", "tana linen cotton"] as const;
export type FabricMaterial = (typeof FABRIC_MATERIALS)[number];

export interface PickupAddress {
  emirate: string;
  city: string;
  street: string;
  building: string;
  phone: string;
}

export interface FabricProfile {
  _id: string;
  slug: string;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  images: string[];
  material: FabricMaterial | string;
  materialAr: string;
  category: string;
  categoryAr: string;
  pattern: string;
  patternAr: string;
  season: string;
  seasonAr: string;
  colors: string[];
  tag: string;
  tagAr: string;
  cuts?: FabricCutFormEntry[];
  pricePerMeter?: number;
  stockInMeters?: number;
  storePickupAddress?: PickupAddress;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  variants?: FabricVariantProfile[];
}

export type FabricVariantProfile = Omit<FabricProfile, "variants">;

export type FabricVariantFormData = FabricFormData;

export interface FabricFormData {
  _id?: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  images: string[];
  material: FabricMaterial | string | "";
  materialAr: string;
  category: string;
  categoryAr: string;
  pattern: string;
  patternAr: string;
  season: string;
  seasonAr: string;
  colors: string[];
  tag: string;
  tagAr: string;
  cuts: FabricCutFormEntry[];
  storePickupAddress: PickupAddress;
  isActive: boolean;
  variants?: FabricVariantFormData[];
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function emptyFabricForm(): FabricFormData {
  return {
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    descriptionAr: "",
    images: [""],
    material: "",
    materialAr: "",
    category: "",
    categoryAr: "",
    pattern: "",
    patternAr: "",
    season: "",
    seasonAr: "",
    colors: [],
    tag: "",
    tagAr: "",
    cuts: [createEmptyFabricCutRow()],
    storePickupAddress: {
      emirate: "",
      city: "",
      street: "",
      building: "",
      phone: "",
    },
    isActive: true,
  };
}

export function slugifyFabricName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fabricToForm(fabric: FabricProfile): FabricFormData {
  const mappedCuts = mapApiCutsArray(fabric.cuts);
  return {
    _id: fabric._id,
    name: fabric.name ?? "",
    nameAr: fabric.nameAr ?? "",
    slug: fabric.slug ?? "",
    description: fabric.description ?? "",
    descriptionAr: fabric.descriptionAr ?? "",
    images: fabric.images?.length ? [...fabric.images] : [""],
    material: fabric.material ?? "",
    materialAr: fabric.materialAr ?? "",
    category: fabric.category ?? "",
    categoryAr: fabric.categoryAr ?? "",
    pattern: fabric.pattern ?? "",
    patternAr: fabric.patternAr ?? "",
    season: fabric.season ?? "",
    seasonAr: fabric.seasonAr ?? "",
    colors: fabric.colors?.length ? [...fabric.colors] : [],
    tag: fabric.tag ?? "",
    tagAr: fabric.tagAr ?? "",
    cuts: mappedCuts.length > 0 ? mappedCuts : [createEmptyFabricCutRow()],
    storePickupAddress: {
      emirate: fabric.storePickupAddress?.emirate ?? "",
      city: fabric.storePickupAddress?.city ?? "",
      street: fabric.storePickupAddress?.street ?? "",
      building: fabric.storePickupAddress?.building ?? "",
      phone: normalizeUaePhone(fabric.storePickupAddress?.phone ?? ""),
    },
    isActive: fabric.isActive ?? true,
    variants:
      fabric.variants?.map((variant) =>
        fabricToForm(variant as FabricProfile),
      ) ?? [],
  };
}

export function toFabricPayload(form: FabricFormData): Record<string, unknown> {
  return {
    name: form.name.trim(),
    nameAr: form.nameAr.trim(),
    slug: slugifyFabricName(form.name),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    images: form.images.map((image) => image.trim()).filter(Boolean),
    material: form.material.trim() || "Fabric",
    materialAr: form.materialAr?.trim() || "",
    category: form.category?.trim() || "",
    categoryAr: form.categoryAr?.trim() || "",
    pattern: form.pattern?.trim() || "",
    patternAr: form.patternAr?.trim() || "",
    season: form.season?.trim() || "",
    seasonAr: form.seasonAr?.trim() || "",
    colors: form.colors.map((c) => c.trim()).filter(Boolean),
    tag: form.tag?.trim() || "",
    tagAr: form.tagAr?.trim() || "",
    cuts: serializeFabricCuts(form.cuts || []),
    storePickupAddress: {
      emirate: form.storePickupAddress.emirate.trim(),
      city: form.storePickupAddress.city.trim(),
      street: form.storePickupAddress.street.trim(),
      building: form.storePickupAddress.building.trim(),
      phone: normalizeUaePhone(form.storePickupAddress.phone.trim()),
    },
    isActive: form.isActive,
    variants: form.variants?.map((v) => ({
      _id: v._id,
      name: v.name.trim(),
      nameAr: v.nameAr.trim(),
      slug: slugifyFabricName(v.name),
      description: v.description.trim(),
      descriptionAr: v.descriptionAr.trim(),
      images: v.images.map((image) => image.trim()).filter(Boolean),
      category: v.category?.trim() || "",
      categoryAr: v.categoryAr?.trim() || "",
      pattern: v.pattern?.trim() || "",
      patternAr: v.patternAr?.trim() || "",
      season: v.season?.trim() || "",
      seasonAr: v.seasonAr?.trim() || "",
      colors: v.colors.map((c) => c.trim()).filter(Boolean),
      tag: v.tag?.trim() || "",
      tagAr: v.tagAr?.trim() || "",
      cuts: serializeFabricCuts(v.cuts || []),
      isActive: v.isActive,
    })),
  };
}

export async function fetchFabricItems(): Promise<FabricProfile[]> {
  const response = await api.get<{
    success: boolean;
    items: FabricProfile[];
  }>("/api/fabric/fabrics");
  return response.items ?? [];
}

export async function fetchFabricItem(id: string): Promise<FabricProfile> {
  const response = await api.get<{
    success: boolean;
    item: FabricProfile;
  }>(`/api/fabric/fabrics/${id}`);
  return response.item;
}

export async function createFabricItem(
  form: FabricFormData,
): Promise<FabricProfile> {
  const response = await api.post<{
    success: boolean;
    item: FabricProfile;
  }>("/api/fabric/fabrics", toFabricPayload(form));
  return response.item;
}

export async function updateFabricItem(
  id: string,
  form: FabricFormData,
): Promise<FabricProfile> {
  const response = await api.put<{
    success: boolean;
    item: FabricProfile;
  }>(`/api/fabric/fabrics/${id}`, toFabricPayload(form));
  return response.item;
}

export async function deleteFabricItem(id: string): Promise<void> {
  await api.delete(`/api/fabric/fabrics/${id}`);
}

export function isShopMissingError(error: unknown): boolean {
  if ((error as ApiError)?.status === 404) return true;
  return isShopIncompleteError(error);
}

export function mapFabricApiErrorToFieldErrors(
  message: string,
): Record<string, string> {
  const trimmedMessage = message.trim();

  if (trimmedMessage.includes("At least one cut")) {
    return { cuts: trimmedMessage };
  }

  if (trimmedMessage.startsWith("Variant ")) {
    return { cuts: trimmedMessage };
  }

  return {};
}
