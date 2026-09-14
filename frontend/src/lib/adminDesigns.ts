import { api, type ApiError } from "@/lib/api/client";
import {
  designToForm,
  toTailorDesignPayload,
  type TailorDesignFormData,
  type TailorDesignProfile,
} from "@/lib/tailorDesigns";

export type AdminTailorShopOption = {
  _id: string;
  name: string;
  nameAr?: string;
  phone?: string;
  ownerId?: { email?: string; name?: string } | string;
};

export type AdminDesignShopRef = {
  _id: string;
  name?: string;
  nameAr?: string;
};

export type AdminDesignProfile = Omit<TailorDesignProfile, "tailorShopId"> & {
  tailorShopId: string | AdminDesignShopRef;
};

export type AdminDesignListResponse = {
  success: boolean;
  items: AdminDesignProfile[];
  total: number;
  page: number;
  totalPages: number;
};

export function getDesignTailorShopId(
  design: AdminDesignProfile | TailorDesignProfile,
): string {
  const shop = design.tailorShopId;
  if (!shop) return "";
  if (typeof shop === "object" && shop !== null && "_id" in shop) {
    return String((shop as { _id: string })._id);
  }
  return String(shop);
}

export function getDesignTailorShopName(
  design: AdminDesignProfile,
  locale: string = "en",
): string {
  const shop = design.tailorShopId;
  if (!shop || typeof shop !== "object") return "—";
  if (locale === "ar" && shop.nameAr) return shop.nameAr;
  return shop.name || "—";
}

export async function fetchAdminTailorShops(): Promise<AdminTailorShopOption[]> {
  const res = await api.get<{
    success?: boolean;
    items?: AdminTailorShopOption[];
  }>("/api/admin/tailors?page=1&limit=1000");
  return Array.isArray(res?.items) ? res.items : [];
}

export async function fetchAdminDesigns(params: {
  page?: number;
  limit?: number;
  search?: string;
  tailorShopId?: string;
}): Promise<AdminDesignListResponse> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.tailorShopId) query.set("tailorShopId", params.tailorShopId);

  return api.get<AdminDesignListResponse>(
    `/api/admin/designs?${query.toString()}`,
  );
}

export async function fetchAdminDesign(
  id: string,
): Promise<AdminDesignProfile> {
  const res = await api.get<{ success: boolean; item: AdminDesignProfile }>(
    `/api/admin/designs/${id}`,
  );
  if (!res?.item) {
    throw { status: 404, message: "Design not found" } as ApiError;
  }
  return res.item;
}

export async function createAdminDesign(
  form: TailorDesignFormData,
  tailorShopId: string,
): Promise<AdminDesignProfile> {
  const res = await api.post<{ success: boolean; item: AdminDesignProfile }>(
    "/api/admin/designs",
    {
      ...toTailorDesignPayload(form),
      tailorShopId,
    },
  );
  return res.item;
}

export async function updateAdminDesign(
  id: string,
  form: TailorDesignFormData,
  tailorShopId?: string,
): Promise<AdminDesignProfile> {
  const payload: Record<string, unknown> = {
    ...toTailorDesignPayload(form),
  };
  if (tailorShopId) payload.tailorShopId = tailorShopId;

  const res = await api.put<{ success: boolean; item: AdminDesignProfile }>(
    `/api/admin/designs/${id}`,
    payload,
  );
  return res.item;
}

export async function deleteAdminDesign(id: string): Promise<void> {
  await api.delete(`/api/admin/designs/${id}`);
}

export { designToForm };
