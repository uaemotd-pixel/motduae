import { api, type ApiError } from "@/lib/api/client";
import { normalizeUaePhone } from "@/lib/uaePhone";

export const SHOP_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Ras Al Khaimah",
  "Fujairah",
  "Umm Al Quwain",
] as const;

export interface ShopPickupAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  emirate: string;
}

export function emptyShopPickupAddress(): ShopPickupAddress {
  return {
    fullName: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    emirate: "",
  };
}

export function toUaeLocalPhoneDigits(phone?: string | null): string {
  let digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("971")) {
    digits = digits.slice(3);
  }
  return digits.slice(0, 9);
}

/**
 * Map shop profile → courier pickupAddress shape used by ready-made / add-ons.
 */
export function shopToCourierPickup(
  shop?:
    | (Pick<FabricShopProfile, "name" | "pickupAddress"> &
        Partial<Pick<FabricShopProfile, "city" | "location" | "phone">>)
    | null,
): ShopPickupAddress {
  const pickup = normalizeShopPickupAddress(shop?.pickupAddress);
  if (
    pickup.fullName ||
    pickup.phone ||
    pickup.line1 ||
    pickup.city ||
    pickup.emirate
  ) {
    return {
      ...pickup,
      fullName: pickup.fullName || shop?.name?.trim() || "",
      phone: pickup.phone || toUaeLocalPhoneDigits(shop?.phone),
      city: pickup.city || shop?.city?.trim() || "",
    };
  }

  return {
    fullName: shop?.name?.trim() || "",
    phone: toUaeLocalPhoneDigits(shop?.phone),
    line1: shop?.location?.trim() || "",
    line2: "",
    city: shop?.city?.trim() || "",
    emirate: "",
  };
}

/**
 * Map shop courier pickupAddress → fabric.storePickupAddress shape
 * (emirate, city, street, building, phone).
 */
export function shopPickupToFabricStorePickup(
  shop?:
    | (Pick<FabricShopProfile, "pickupAddress"> &
        Partial<Pick<FabricShopProfile, "city" | "location" | "phone">>)
    | null,
): {
  emirate: string;
  city: string;
  street: string;
  building: string;
  phone: string;
} {
  const pickup = shop?.pickupAddress;
  if (
    pickup?.emirate?.trim() ||
    pickup?.city?.trim() ||
    pickup?.line1?.trim() ||
    pickup?.phone?.trim()
  ) {
    return {
      emirate: pickup.emirate?.trim() || "",
      city: pickup.city?.trim() || "",
      street: pickup.line1?.trim() || "",
      building: pickup.line2?.trim() || "",
      phone: normalizeUaePhone(pickup.phone || ""),
    };
  }

  return {
    emirate: "",
    city: shop?.city?.trim() || "",
    street: shop?.location?.trim() || "",
    building: "",
    phone: normalizeUaePhone(shop?.phone || ""),
  };
}

export function normalizeShopPickupAddress(
  address?: Partial<ShopPickupAddress> | null,
): ShopPickupAddress {
  return {
    fullName: address?.fullName?.trim() || "",
    phone: toUaeLocalPhoneDigits(address?.phone),
    line1: address?.line1?.trim() || "",
    line2: address?.line2?.trim() || "",
    city: address?.city?.trim() || "",
    emirate: address?.emirate?.trim() || "",
  };
}

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
  pickupAddress?: ShopPickupAddress;
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
  pickupAddress: ShopPickupAddress;
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
    pickupAddress: emptyShopPickupAddress(),
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
    pickupAddress: normalizeShopPickupAddress(shop.pickupAddress),
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
    slug: slugifyShopName(form.name),
    description: form.description.trim(),
    descriptionAr: form.descriptionAr.trim(),
    logo: form.logo.trim(),
    coverImage: form.coverImage.trim(),
    location: form.location.trim(),
    city: form.city.trim(),
    phone: form.phone.trim(),
    pickupAddress: normalizeShopPickupAddress(form.pickupAddress),
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
