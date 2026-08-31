/** Chart / UI palette — black/white brand with functional data colors */
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
  success: "#2F9E6B",
  danger: "#D64545",
  teal: "#0F766E",
  indigo: "#4F46E5",
  sky: "#0284C7",
  amber: "#D97706",
  rose: "#E11D48",
  /** Brighter multi-series (use sparingly) */
  series: ["#111111", "#0F766E", "#4F46E5", "#0284C7", "#D97706", "#E11D48"],
  /**
   * Black/white–first series with a soft teal accent —
   * for doughnut/pie charts that shouldn't look rainbow.
   */
  seriesMuted: [
    "#111111",
    "#2E2E2C",
    "#555552",
    "#0F766E",
    "#8A8A86",
    "#C4C4C0",
  ],
} as const;

export type DashAccent = "ink" | "teal" | "indigo" | "sky" | "amber" | "rose";

export const DASH_ACCENTS: Record<
  DashAccent,
  { hex: string; soft: string; shadow: string }
> = {
  ink: {
    hex: "#111111",
    soft: "#F3F3F1",
    shadow: "0 14px 28px -10px rgba(0, 0, 0, 0.16)",
  },
  teal: {
    hex: "#0F766E",
    soft: "#D9F2EE",
    shadow: "0 14px 28px -10px rgba(15, 118, 110, 0.28)",
  },
  indigo: {
    hex: "#4F46E5",
    soft: "#E0E0FB",
    shadow: "0 14px 28px -10px rgba(79, 70, 229, 0.24)",
  },
  sky: {
    hex: "#0284C7",
    soft: "#D6EEF9",
    shadow: "0 14px 28px -10px rgba(2, 132, 199, 0.24)",
  },
  amber: {
    hex: "#D97706",
    soft: "#FBEAD2",
    shadow: "0 14px 28px -10px rgba(217, 119, 6, 0.28)",
  },
  rose: {
    hex: "#E11D48",
    soft: "#FBD5DC",
    shadow: "0 14px 28px -10px rgba(225, 29, 72, 0.24)",
  },
};

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
