import { DASH_PALETTE, withAlpha } from "./palette";

export const chartTooltip = {
  backgroundColor: "rgba(0, 0, 0, 0.92)",
  titleColor: "#FFFFFF",
  bodyColor: "#E8E8E4",
  borderColor: "#2A2A2A",
  borderWidth: 1,
  padding: 12,
  cornerRadius: 8,
};

export const chartLegend = {
  labels: {
    usePointStyle: true as const,
    pointStyle: "circle" as const,
    padding: 16,
    font: { family: "inherit", size: 11, weight: 500 as const },
    color: DASH_PALETTE.muted,
  },
};

export const chartGridColor = withAlpha(DASH_PALETTE.charcoal, 0.06);

export function formatCompact(val: number) {
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}K`;
  return String(val);
}
