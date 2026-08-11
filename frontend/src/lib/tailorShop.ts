import { api, type ApiError } from "@/lib/api/client";

export interface TailorShopProfile {
  _id: string;
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  logo: string;
  coverImage: string;
  location: string;
  city: string;
  phone: string;
  rating?: number;
  reviewCount?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TailorShopFormData {
  name: string;
  nameAr: string;
  slug: string;
  description: string;
  descriptionAr: string;
  logo: string;
  coverImage: string;
  location: string;
  city: string;
  phone: string;
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function emptyTailorShopForm(): TailorShopFormData {
  return {
    name: "",
    nameAr: "",
    slug: "",
    description: "",
    descriptionAr: "",
    logo: "",
    coverImage: "",
    location: "",
    city: "",
    phone: "",
  };
}

export function tailorShopToForm(shop: TailorShopProfile): TailorShopFormData {
  return {
    name: shop.name ?? "",
    nameAr: shop.nameAr ?? "",
    slug: shop.slug ?? "",
    description: shop.description ?? "",
    descriptionAr: shop.descriptionAr ?? "",
    logo: shop.logo ?? "",
    coverImage: shop.coverImage ?? "",
    location: shop.location ?? "",
    city: shop.city ?? "",
    phone: shop.phone ?? "",
  };
}

export function slugifyShopName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function normalizePhoneNumber(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";

  if (digits.length === 9) return `+971${digits}`;
  if (digits.length === 12 && digits.startsWith("971")) return `+${digits}`;

  return trimmed.startsWith("+") ? trimmed : trimmed;
}

export function toTailorShopPayload(
  form: TailorShopFormData,
): TailorShopFormData {
  return {
    name: form.name.trim(),
    nameAr: form.nameAr.trim(),
    slug: form.slug.trim().toLowerCase(),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    logo: form.logo.trim(),
    coverImage: form.coverImage.trim(),
    location: form.location.trim(),
    city: form.city.trim(),
    phone: normalizePhoneNumber(form.phone),
  };
}

export async function fetchOwnTailorShop(): Promise<TailorShopProfile | null> {
  try {
    const response = await api.get<{
      success: boolean;
      item: TailorShopProfile;
    }>("/api/tailor/shop");
    return response.item;
  } catch (error) {
    if ((error as ApiError).status === 404) {
      return null;
    }
    throw error;
  }
}

export async function createTailorShop(
  form: TailorShopFormData,
): Promise<TailorShopProfile> {
  const response = await api.post<{
    success: boolean;
    item: TailorShopProfile;
  }>("/api/tailor/shop", toTailorShopPayload(form));
  return response.item;
}

export async function updateTailorShop(
  form: TailorShopFormData,
): Promise<TailorShopProfile> {
  const response = await api.put<{ success: boolean; item: TailorShopProfile }>(
    "/api/tailor/shop",
    toTailorShopPayload(form),
  );
  return response.item;
}
