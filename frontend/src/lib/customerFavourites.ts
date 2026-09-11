import { api, getApiErrorMessage } from "@/lib/api/client";

export type FavouriteShopType = "tailor" | "fabricShop";

export type FavouriteShopCard = {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  logo?: string;
  coverImage?: string;
  location?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
};

export type FavouriteIdsResponse = {
  success: boolean;
  tailorIds: string[];
  fabricShopIds: string[];
};

export type FavouritesListResponse = {
  success: boolean;
  favouriteTailors: FavouriteShopCard[];
  favouriteFabricShops: FavouriteShopCard[];
};

export async function fetchFavouriteIds(): Promise<FavouriteIdsResponse> {
  return api.get<FavouriteIdsResponse>("/api/customer/favourites/ids");
}

export async function fetchFavourites(): Promise<FavouritesListResponse> {
  return api.get<FavouritesListResponse>("/api/customer/favourites");
}

export async function addFavourite(
  type: FavouriteShopType,
  id: string,
): Promise<void> {
  await api.post("/api/customer/favourites", { type, id });
}

export async function removeFavourite(
  type: FavouriteShopType,
  id: string,
): Promise<void> {
  await api.delete(`/api/customer/favourites/${type}/${id}`);
}

export function favouriteApiErrorMessage(err: unknown, fallback: string): string {
  return getApiErrorMessage(err, fallback);
}
