export type PartnerExperience = {
  years: number;
  months: number;
  yearsOperating?: string;
};

export function formatPartnerExperience(
  experience: PartnerExperience | null | undefined,
  labels: {
    year: string;
    years: string;
    month: string;
    months: string;
  },
): string {
  if (!experience) return "";
  const years = Math.max(0, Math.floor(Number(experience.years) || 0));
  const months = Math.max(0, Math.floor(Number(experience.months) || 0));
  if (years === 0 && months === 0) {
    return `0 ${labels.months}`;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(`${years} ${years === 1 ? labels.year : labels.years}`);
  }
  if (months > 0 || years === 0) {
    parts.push(`${months} ${months === 1 ? labels.month : labels.months}`);
  }
  return parts.join(" ");
}
