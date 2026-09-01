import type { Locale } from "@/i18n/routing";

const localeToIntl: Record<Locale, string> = {
  en: "en-AE",
  ar: "ar-AE",
};

export function formatCurrency(amount: number, locale: Locale): string {
  return new Intl.NumberFormat(localeToIntl[locale], {
    style: "currency",
    currency: "AED",
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatPhoneE164(localDigits: string): string {
  const digits = localDigits.replace(/\D/g, "");
  return digits.startsWith("971") ? `+${digits}` : `+971${digits}`;
}

/** Turn slug-style catalog values (e.g. silk-velvet) into readable labels. */
export function formatFilterLabel(value: string): string {
  return value.replace(/-/g, " ").trim();
}

export function getFilterOptionLabel(
  option: { name: string; nameAr?: string },
  isAr: boolean,
): string {
  if (isAr && option.nameAr?.trim()) {
    return option.nameAr.trim();
  }
  return formatFilterLabel(option.name);
}

export function getDefaultProductTagLabel(isAr: boolean): string {
  return isAr ? "الأكثر مبيعاً" : "Bestselling";
}

export function getProductTagLabel(
  raw: string | undefined,
  isAr: boolean,
  catalogTags: { _id: string; name: string; nameAr?: string }[],
): string {
  const value = raw?.trim();
  if (!value) {
    const defaultTag = catalogTags.find((tag) => tag.name === "bestselling");
    if (defaultTag) return getFilterOptionLabel(defaultTag, isAr);
    return getDefaultProductTagLabel(isAr);
  }

  const catalogTag = catalogTags.find(
    (tag) => tag._id === value || tag.name === value,
  );
  if (catalogTag) return getFilterOptionLabel(catalogTag, isAr);
  return formatFilterLabel(value);
}
