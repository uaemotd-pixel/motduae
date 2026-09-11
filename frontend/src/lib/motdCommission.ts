import { api } from "@/lib/api/client";

export const DEFAULT_TAILOR_COMMISSION = 12;
export const DEFAULT_FABRIC_COMMISSION = 15;

/** Convert a partner net price into the customer-facing gross (commission % of sale). */
export function applyMotdCommission(
  netAmount: number,
  commissionPercent = 0,
): number {
  const net = Number(Math.max(0, Number(netAmount) || 0).toFixed(2));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  if (percent <= 0 || percent >= 100) return net;
  return Number((net / (1 - percent / 100)).toFixed(2));
}

export function formatMotdFinalPrice(
  netAmount: number,
  commissionPercent: number,
): string {
  if (!Number.isFinite(netAmount) || netAmount <= 0) return "";
  return applyMotdCommission(netAmount, commissionPercent).toFixed(2);
}

export async function fetchMotdCommissionPercents(): Promise<{
  tailor: number;
  fabricStore: number;
}> {
  try {
    const data = await api.get<{
      motdCommissionFromTailor?: number;
      motdCommissionFromFabricStore?: number;
    }>("/api/orders/settings");
    const tailor = Number(data?.motdCommissionFromTailor);
    const fabricStore = Number(data?.motdCommissionFromFabricStore);
    return {
      tailor: Number.isFinite(tailor) ? tailor : DEFAULT_TAILOR_COMMISSION,
      fabricStore: Number.isFinite(fabricStore)
        ? fabricStore
        : DEFAULT_FABRIC_COMMISSION,
    };
  } catch {
    return {
      tailor: DEFAULT_TAILOR_COMMISSION,
      fabricStore: DEFAULT_FABRIC_COMMISSION,
    };
  }
}
