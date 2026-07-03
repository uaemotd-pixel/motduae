import { api, type ApiError } from "@/lib/api/client";

export interface FabricShopProfile {
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

export interface FabricShopFormData {
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

export function emptyFabricShopForm(): FabricShopFormData {
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

export function fabricShopToForm(shop: FabricShopProfile): FabricShopFormData {
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

export function toFabricShopPayload(form: FabricShopFormData): FabricShopFormData {
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
        phone: form.phone.trim(),
    };
}

export async function fetchOwnFabricShop(): Promise<FabricShopProfile | null> {
    try {
        const response = await api.get<{ success: boolean; item: FabricShopProfile }>(
            "/api/fabric/shop",
        );
        return response.item;
    } catch (error) {
        if ((error as ApiError).status === 404) {
            return null;
        }
        throw error;
    }
}

export async function createFabricShop(
    form: FabricShopFormData,
): Promise<FabricShopProfile> {
    const response = await api.post<{ success: boolean; item: FabricShopProfile }>(
        "/api/fabric/shop",
        toFabricShopPayload(form),
    );
    return response.item;
}

export async function updateFabricShop(
    form: FabricShopFormData,
): Promise<FabricShopProfile> {
    const response = await api.put<{ success: boolean; item: FabricShopProfile }>(
        "/api/fabric/shop",
        toFabricShopPayload(form),
    );
    return response.item;
}
