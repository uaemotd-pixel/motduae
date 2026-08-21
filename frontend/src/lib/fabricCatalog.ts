import { api, type ApiError } from "@/lib/api/client";

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
  colors: string[];
  tag: string;
  tagAr: string;
  pricePerMeter: number;
  stockInMeters: number;
  minAge: number | null;
  maxAge: number | null;
  storePickupAddress?: PickupAddress;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  variants?: FabricVariantProfile[];
}

export type FabricVariantProfile = Omit<
  FabricProfile,
  "minAge" | "maxAge" | "variants"
>;

export type FabricVariantFormData = Omit<FabricFormData, "minAge" | "maxAge">;

export interface FabricFormData {
  _id?: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  images: string[];
  material: FabricMaterial | "";
  materialAr: string;
  colors: string[];
  tag: string;
  tagAr: string;
  pricePerMeter: number;
  stockInMeters: number;
  minAge: number | null;
  maxAge: number | null;
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
    colors: [],
    tag: "",
    tagAr: "",
    pricePerMeter: 0,
    stockInMeters: 0,
    minAge: null,
    maxAge: null,
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
  return {
    _id: fabric._id,
    name: fabric.name ?? "",
    nameAr: fabric.nameAr ?? "",
    slug: fabric.slug ?? "",
    description: fabric.description ?? "",
    descriptionAr: fabric.descriptionAr ?? "",
    images: fabric.images?.length ? [...fabric.images] : [""],
    material: (FABRIC_MATERIALS.includes(fabric.material as FabricMaterial)
      ? fabric.material
      : "") as FabricMaterial | "",
    materialAr: fabric.materialAr ?? "",
    colors: fabric.colors?.length ? [...fabric.colors] : [],
    tag: fabric.tag ?? "",
    tagAr: fabric.tagAr ?? "",
    pricePerMeter: fabric.pricePerMeter ?? 0,
    stockInMeters: fabric.stockInMeters ?? 0,
    minAge:
      fabric.minAge !== undefined && fabric.minAge !== null
        ? Number(fabric.minAge)
        : null,
    maxAge:
      fabric.maxAge !== undefined && fabric.maxAge !== null
        ? Number(fabric.maxAge)
        : null,
    storePickupAddress: {
      emirate: fabric.storePickupAddress?.emirate ?? "",
      city: fabric.storePickupAddress?.city ?? "",
      street: fabric.storePickupAddress?.street ?? "",
      building: fabric.storePickupAddress?.building ?? "",
      phone: fabric.storePickupAddress?.phone ?? "",
    },
    isActive: fabric.isActive ?? true,
    variants:
      fabric.variants?.map((variant) => {
        const { minAge: _, maxAge: __, ...variantWithoutAge } =
          fabricToForm(variant as FabricProfile);
        return variantWithoutAge;
      }) ?? [],
  };
}

export function toFabricPayload(form: FabricFormData): Record<string, unknown> {
  return {
    name: form.name.trim(),
    nameAr: form.nameAr.trim(),
    slug: form.slug.trim().toLowerCase(),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    images: form.images.map((image) => image.trim()).filter(Boolean),
    material: form.material,
    materialAr: form.materialAr.trim(),
    colors: form.colors.map((c) => c.trim()).filter(Boolean),
    tag: form.tag.trim(),
    tagAr: form.tagAr.trim(),
    pricePerMeter: Number(form.pricePerMeter),
    stockInMeters: Number(form.stockInMeters),
    minAge: form.minAge,
    maxAge: form.maxAge,
    storePickupAddress: {
      emirate: form.storePickupAddress.emirate.trim(),
      city: form.storePickupAddress.city.trim(),
      street: form.storePickupAddress.street.trim(),
      building: form.storePickupAddress.building.trim(),
      phone: form.storePickupAddress.phone.trim(),
    },
    isActive: form.isActive,
    variants: form.variants?.map(v => ({
      _id: v._id,
      name: v.name.trim(),
      nameAr: v.nameAr.trim(),
      slug: v.slug.trim().toLowerCase(),
      description: v.description.trim(),
      descriptionAr: v.descriptionAr.trim(),
      images: v.images.map((image) => image.trim()).filter(Boolean),
      material: v.material,
      materialAr: v.materialAr.trim(),
      colors: v.colors.map((c) => c.trim()).filter(Boolean),
      tag: v.tag.trim(),
      tagAr: v.tagAr.trim(),
      pricePerMeter: Number(v.pricePerMeter),
      stockInMeters: Number(v.stockInMeters),
      isActive: v.isActive,
    }))
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
  return (error as ApiError)?.status === 404;
}

export function getFabricAgeFieldErrors(
  form: Pick<FabricFormData, "minAge" | "maxAge">,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (form.minAge != null && (isNaN(form.minAge) || form.minAge < 0)) {
    errors.minAge = "Min age must be a positive number";
  }
  if (form.maxAge != null && (isNaN(form.maxAge) || form.maxAge < 0)) {
    errors.maxAge = "Max age must be a positive number";
  }
  if (
    form.minAge != null &&
    form.maxAge != null &&
    form.minAge > form.maxAge
  ) {
    errors.minAge = "Min age cannot exceed max age";
    errors.maxAge = "Max age cannot be smaller than min age";
  }

  return errors;
}

export function mapFabricApiErrorToFieldErrors(
  message: string,
): Record<string, string> {
  const trimmedMessage = message.trim();

  if (
    trimmedMessage === "Max age must be greater than or equal to min age" ||
    trimmedMessage === "Max age cannot be smaller than min age" ||
    trimmedMessage === "Min age cannot exceed max age"
  ) {
    return {
      minAge: "Min age cannot exceed max age",
      maxAge: "Max age cannot be smaller than min age",
    };
  }

  return {};
}
