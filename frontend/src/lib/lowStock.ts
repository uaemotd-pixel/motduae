/** Must match backend LOW_FABRIC_CUT_STOCK_THRESHOLD. */
export const LOW_STOCK_THRESHOLD = 5;

export function isLowStockQty(stock: number) {
  return Math.floor(Number(stock) || 0) <= LOW_STOCK_THRESHOLD;
}
