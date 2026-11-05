import type { Locale } from "@/i18n/routing";

const localeToIntl: Record<Locale, string> = {
  en: "en-AE",
  ar: "ar-AE",
};

/** WhatsApp-style “last seen …” for portal chat headers (not shown to customers). */
export function formatChatLastSeen(
  at: number | string | Date | null | undefined,
  locale: string = "en",
): string {
  const ar = String(locale || "")
    .toLowerCase()
    .startsWith("ar");
  if (at == null || at === "") {
    return ar ? "آخر ظهور منذ فترة" : "last seen a while ago";
  }
  const ms =
    typeof at === "number"
      ? at
      : at instanceof Date
        ? at.getTime()
        : new Date(at).getTime();
  if (!Number.isFinite(ms)) {
    return ar ? "آخر ظهور منذ فترة" : "last seen a while ago";
  }

  const now = Date.now();
  const diff = Math.max(0, now - ms);
  if (diff < 60_000) {
    return ar ? "آخر ظهور الآن" : "last seen just now";
  }

  const intlLocale = ar ? "ar-AE" : "en-AE";
  const time = new Intl.DateTimeFormat(intlLocale, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfMsg = new Date(ms);
  startOfMsg.setHours(0, 0, 0, 0);
  const dayDiff = Math.round(
    (startOfToday.getTime() - startOfMsg.getTime()) / 86_400_000,
  );

  if (dayDiff <= 0) {
    return ar ? `آخر ظهور اليوم عند ${time}` : `last seen today at ${time}`;
  }
  if (dayDiff === 1) {
    return ar
      ? `آخر ظهور أمس عند ${time}`
      : `last seen yesterday at ${time}`;
  }

  const date = new Intl.DateTimeFormat(intlLocale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(ms));
  return ar ? `آخر ظهور ${date}` : `last seen ${date}`;
}

/** Portal chat subtitle for customer presence (never used on the customer widget). */
export function formatCustomerPresenceLine(opts: {
  online?: boolean;
  lastSeenAt?: number | string | null;
  waiting?: boolean;
  locale?: string;
}): string {
  const ar = String(opts.locale || "")
    .toLowerCase()
    .startsWith("ar");
  if (opts.online) return ar ? "متصل" : "online";
  if (opts.lastSeenAt != null && opts.lastSeenAt !== "") {
    return formatChatLastSeen(opts.lastSeenAt, opts.locale);
  }
  if (opts.waiting) return ar ? "بانتظار" : "Waiting";
  return ar ? "غير متصل" : "offline";
}

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
