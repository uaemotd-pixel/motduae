/** Chart / UI palette aligned with brand dashboard CSS tokens */
export const DASH_PALETTE = {
  gold: "#000000",
  goldSoft: "#FFFFFF",
  goldMuted: "rgba(0, 0, 0, 0.35)",
  charcoal: "#000000",
  charcoalDeep: "#1A1A1A",
  sand: "#FFFDF9",
  sandDeep: "#E8E8E4",
  muted: "#5A5A56",
  surface: "#FFFFFF",
  success: "#3F7D5A",
  danger: "#B54A3F",
  series: ["#000000", "#1A1A1A", "#5A5A56", "#A8A29A", "#E8E8E4", "#57534E"],
} as const;

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
