import { splitMotdCommission } from "./motdCommission.js";

/** Integer fils (AED × 100). Legal money for partner payouts. */

export function roundFils(aed) {
  const n = Number(aed);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function filsToAed(fils) {
  const n = Number(fils) || 0;
  return Number((n / 100).toFixed(2));
}

/**
 * Split customer-gross AED into MOTD commission and partner net (fils).
 * Same markup reverse as splitMotdCommission: 120 at 20% → net 100, MOTD 20.
 */
export function splitCommissionFils(grossAed, percent = 0) {
  const split = splitMotdCommission(grossAed, percent);
  const grossFils = roundFils(split.gross);
  const netFils = roundFils(split.net);
  const commissionFils = Math.max(0, grossFils - netFils);
  return { grossFils, commissionFils, netFils, percent: split.percent };
}

export function isDuplicateKeyError(err) {
  return Boolean(err && (err.code === 11000 || err.code === 11001));
}
