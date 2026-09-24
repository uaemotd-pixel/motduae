/** Stripe (and similar) fields run in a cross-origin iframe. Clicking them
 *  blurs/focuses the parent window, which must not refetch cart/auth. */
export function isSecureIframeFocused() {
  if (typeof document === "undefined") return false;
  return document.activeElement?.tagName === "IFRAME";
}
