import { api } from "@/lib/api/client";

export type SupportChatAvailability = {
  agentsOnline: number;
};

export type LiveChatSessionKind = "support" | "fabric";

export type ActiveLiveSession = {
  id: string;
  status: "waiting" | "active" | "ended";
  agentName?: string | null;
  locale?: string;
  lastActivityAt?: number;
  sessionKind?: LiveChatSessionKind;
  fabricStoreOwnerId?: string | null;
  fabricShopId?: string | null;
  fabricStoreName?: string;
};

export type DealtWithFabricStore = {
  shopId: string;
  ownerId: string;
  name: string;
  nameAr?: string;
  logo?: string;
  slug?: string;
};

export function getAvailability() {
  return api.get<SupportChatAvailability>("/api/support-chat/availability");
}

export function getActiveLiveSession(opts?: {
  kind?: LiveChatSessionKind;
  fabricStoreOwnerId?: string;
}) {
  const kind = opts?.kind === "fabric" ? "fabric" : "support";
  const params = new URLSearchParams({ kind });
  if (kind === "fabric" && opts?.fabricStoreOwnerId) {
    params.set("fabricStoreOwnerId", opts.fabricStoreOwnerId);
  }
  return api.get<{ session: ActiveLiveSession | null }>(
    `/api/support-chat/active-session?${params.toString()}`,
  );
}

export function listDealtWithFabricStores() {
  return api.get<{ stores: DealtWithFabricStore[] }>(
    "/api/support-chat/fabric-stores",
  );
}
