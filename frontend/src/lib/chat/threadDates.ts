/** WhatsApp-style thread date chips shared by admin / fabric / customer live chat. */

export function messageDayKey(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

type FormatOpts = {
  locale?: string;
  isAr?: boolean;
};

/** Today / Yesterday / weekday / full date. */
export function formatThreadDateBadge(iso: string, opts: FormatOpts = {}) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round(
    (startToday.getTime() - startMsg.getTime()) / 86_400_000,
  );
  const isAr = Boolean(opts.isAr);
  const loc = opts.locale || (isAr ? "ar-AE" : "en-AE");

  if (diffDays === 0) return isAr ? "اليوم" : "Today";
  if (diffDays === 1) return isAr ? "أمس" : "Yesterday";
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString(loc, { weekday: "long" });
  }
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(loc, { day: "numeric", month: "long" });
  }
  return d.toLocaleDateString(loc, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
