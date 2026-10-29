import { api } from "@/lib/api/client";

export type SupportChatAvailability = {
  agentsOnline: number;
};

export type ActiveLiveSession = {
  id: string;
  status: "waiting" | "active";
  agentName?: string | null;
  locale?: string;
  lastActivityAt?: number;
};

export function getAvailability() {
  return api.get<SupportChatAvailability>("/api/support-chat/availability");
}

export function getActiveLiveSession() {
  return api.get<{ session: ActiveLiveSession | null }>(
    "/api/support-chat/active-session",
  );
}
