import { splitMotdCommission } from "@/lib/motdCommission";

/** Split fabric gross into MOTD commission and store net payout. */
export function splitFabricCommission(
  grossAmount: number,
  commissionPercent = 15,
): { gross: number; commission: number; net: number; percent: number } {
  return splitMotdCommission(grossAmount, commissionPercent);
}
