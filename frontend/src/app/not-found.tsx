"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const SUPPORTED_LOCALES = ["en", "ar"] as const;

export default function GlobalNotFound() {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean);
  const firstSegment = segments?.[0] || "";
  const locale = SUPPORTED_LOCALES.includes(
    firstSegment as (typeof SUPPORTED_LOCALES)[number],
  )
    ? firstSegment
    : "en";
  const isAr = locale === "ar";

  return (
    <main
      className="grid min-h-screen place-items-center bg-[#FFFDF9] px-4 py-16 sm:px-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-xl text-center">
        <p className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80]">
          404
        </p>
        <h1 className="mt-4 [font-family:var(--font-display)] text-4xl font-light tracking-tight sm:text-5xl">
          {isAr ? "الصفحة غير موجودة" : "Page not found"}
        </h1>
        <p className="mt-4 [font-family:var(--font-body)] text-base leading-relaxed text-[#5A5A56]">
          {isAr
            ? "عذراً، لم نتمكن من العثور على الصفحة التي تبحثين عنها."
            : "Sorry, we couldn’t find the page you’re looking for."}
        </p>
        <div className="mt-8 flex items-center justify-center">
          <Link
            href={`/${locale}`}
            className="[font-family:var(--font-ui)] bg-black px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-white"
          >
            {isAr ? "الصفحة الرئيسية" : "Go home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
