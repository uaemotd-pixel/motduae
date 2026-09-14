import { api } from "@/lib/api/client";

export const DEFAULT_TAILOR_COMMISSION = 12;
export const DEFAULT_FABRIC_COMMISSION = 15;

/** Add MOTD commission on top of the partner's price (100 + 20% → 120). */
export function applyMotdCommission(
  netAmount: number,
  commissionPercent = 0,
): number {
  const net = Number(Math.max(0, Number(netAmount) || 0).toFixed(2));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  if (percent <= 0) return net;
  return Number((net * (1 + percent / 100)).toFixed(2));
}

/** Reverse of applyMotdCommission: 120 at 20% → partner 100, MOTD 20. */
export function splitMotdCommission(
  grossAmount: number,
  commissionPercent = 0,
): { gross: number; commission: number; net: number; percent: number } {
  const gross = Number(Math.max(0, Number(grossAmount) || 0).toFixed(2));
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  if (percent <= 0) {
    return { gross, commission: 0, net: gross, percent };
  }
  const net = Number((gross / (1 + percent / 100)).toFixed(2));
  const commission = Number((gross - net).toFixed(2));
  return { gross, commission, net, percent };
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
