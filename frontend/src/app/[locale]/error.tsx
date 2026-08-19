"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function LocaleError({ error, reset }: Props) {
  const params = useParams();
  const locale = params?.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main
      className="grid min-h-[70vh] place-items-center bg-white px-4 py-16 sm:px-6"
      dir={isAr ? "rtl" : "ltr"}
    >
      <div className="w-full max-w-xl text-center">
        <p className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.28em] text-[#8A8A80]">
          MOTD
        </p>
        <h1 className="mt-4 [font-family:var(--font-display)] text-4xl font-light tracking-tight sm:text-5xl">
          {isAr ? "حدث خطأ ما" : "Something went wrong"}
        </h1>
        <p className="mt-4 [font-family:var(--font-body)] text-base leading-relaxed text-[#5A5A56]">
          {isAr
            ? "تعذّر تحميل هذه الصفحة بسبب خطأ غير متوقع. يمكنك المحاولة مرة أخرى أو العودة إلى الصفحة الرئيسية."
            : "An unexpected error stopped this page from loading. You can try again, or return home."}
        </p>
        {error.digest ? (
          <p className="mt-3 [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-[#8A8A80]">
            {isAr ? "المرجع" : "Ref"} {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="[font-family:var(--font-ui)] w-full bg-black px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-white sm:w-auto"
          >
            {isAr ? "حاول مجدداً" : "Try again"}
          </button>
          <Link
            href="/"
            className="[font-family:var(--font-ui)] w-full border border-black px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-black sm:w-auto"
          >
            {isAr ? "الصفحة الرئيسية" : "Go home"}
          </Link>
        </div>
      </div>
    </main>
  );
}
