/** Chart / UI palette aligned with dashboard CSS tokens */
export const DASH_PALETTE = {
  gold: "#C9A227",
  goldSoft: "#E8D5A3",
  goldMuted: "rgba(201, 162, 39, 0.35)",
  charcoal: "#292524",
  charcoalDeep: "#1C1917",
  sand: "#F5F0E8",
  sandDeep: "#E7E0D4",
  muted: "#78716C",
  surface: "#FFFCF7",
  success: "#3F7D5A",
  danger: "#B54A3F",
  series: ["#C9A227", "#292524", "#A8A29A", "#78716C", "#E8D5A3", "#57534E"],
} as const;

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
