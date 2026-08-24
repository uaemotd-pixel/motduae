/** Split fabric gross into MOTD commission and store net payout. */
export function splitFabricCommission(
  grossAmount: number,
  commissionPercent = 15,
): { gross: number; commission: number; net: number; percent: number } {
  const gross = Math.max(0, Number(grossAmount) || 0);
  const percent = Math.min(100, Math.max(0, Number(commissionPercent) || 0));
  const commission = Number(((gross * percent) / 100).toFixed(2));
  const net = Number((gross - commission).toFixed(2));
  return { gross: Number(gross.toFixed(2)), commission, net, percent };
}
