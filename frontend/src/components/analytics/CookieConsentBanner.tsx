"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  clearCookieConsent,
  readCookieConsent,
  writeCookieConsent,
  type CookieConsentStatus,
} from "@/lib/cookieConsent";

type BannerMode = "hidden" | "prompt" | "manage";

export default function CookieConsentBanner() {
  const locale = useLocale();
  const isAr = locale === "ar";
  const [mode, setMode] = useState<BannerMode>("hidden");

  useEffect(() => {
    const existing = readCookieConsent();
    setMode(existing ? "hidden" : "prompt");

    const onOpenPreferences = () => {
      clearCookieConsent();
      setMode("manage");
    };

    window.addEventListener("motd:open-cookie-preferences", onOpenPreferences);
    return () =>
      window.removeEventListener(
        "motd:open-cookie-preferences",
        onOpenPreferences,
      );
  }, []);

  const choose = (status: CookieConsentStatus) => {
    writeCookieConsent(status);
    setMode("hidden");
  };

  if (mode === "hidden") return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={isAr ? "موافقة ملفات تعريف الارتباط" : "Cookie consent"}
      className="fixed inset-x-0 bottom-0 z-[10000] p-4 sm:p-6"
    >
      <div
        className="mx-auto max-w-3xl border border-[#1a1a1a] bg-white"
        style={{ boxShadow: "0 -12px 40px rgba(0,0,0,0.18)" }}
      >
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 sm:py-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl space-y-2">
            <p className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80]">
              {isAr ? "الخصوصية" : "Privacy"}
            </p>
            <h2 className="[font-family:var(--font-display)] text-xl font-light tracking-tight text-black sm:text-2xl">
              {isAr ? "ملفات تعريف الارتباط" : "Cookies on MOTD"}
            </h2>
            <p className="[font-family:var(--font-body)] text-sm leading-relaxed text-[#5A5A56]">
              {isAr
                ? "نستخدم ملفات أساسية لتشغيل الحساب والسلة. ملفات التحليلات اختيارية وتساعدنا على تحسين الموقع — ولا تُحمَّل إلا بموافقتك."
                : "We use essential cookies for account and checkout. Analytics cookies are optional and help us improve the site — they load only if you accept."}{" "}
              <Link
                href="/cookies"
                className="underline underline-offset-4 decoration-[#C5C5BE] hover:decoration-black"
              >
                {isAr ? "سياسة ملفات تعريف الارتباط" : "Cookie policy"}
              </Link>
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => choose("rejected")}
              className="[font-family:var(--font-ui)] border border-[#1a1a1a] bg-white px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-black transition-colors hover:bg-[#F5F5F0]"
            >
              {isAr ? "أساسية فقط" : "Essential only"}
            </button>
            <button
              type="button"
              onClick={() => choose("accepted")}
              className="[font-family:var(--font-ui)] bg-black px-5 py-3 text-[11px] uppercase tracking-[0.22em] text-white transition-opacity hover:opacity-90"
            >
              {isAr ? "قبول الكل" : "Accept all"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function openCookiePreferences(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("motd:open-cookie-preferences"));
}
