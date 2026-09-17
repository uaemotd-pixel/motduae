/**
 * Predicates for cancel compensation and stale payout-request close.
 * Ledger void is a money movement only when a payout debit already exists.
 */

export function shouldWritePayoutVoidCredit(hasPayoutDebit) {
  return Boolean(hasPayoutDebit);
}

/**
 * A pending ticket may auto-close only when ready-to-pay is already 0
 * (a later release consumed all available). Partial FIFO leaves it pending.
 */
export function shouldCloseStalePayoutRequest(availableFils) {
  return (Number(availableFils) || 0) <= 0;
}
