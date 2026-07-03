"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

const SUPPORTED_LOCALES = ["en", "ar"];

export default function GlobalNotFound() {
  const pathname = usePathname();

  // Detect locale from URL
  const segments = pathname?.split("/").filter(Boolean);
  const firstSegment = segments?.[0] || "";
  const locale = SUPPORTED_LOCALES.includes(firstSegment) ? firstSegment : "en";

  return (
    <main className="grid min-h-full place-items-center bg-white/80 px-4 py-16 sm:px-6 sm:py-24 lg:py-32 lg:px-8">
      <div className="text-center max-w-2xl mx-auto w-full">
        <p className="text-2xl font-medium text-black [font-family:var(--font-display)]">
          404
          </p>
        <h1 className="mt-4 text-4xl sm:text-5xl lg:text-7xl tracking-tight text-balance text-black uppercase [font-family:var(--font-display)] font-regular">
          Page not found
        </h1>
        <p className="mt-6 text-base sm:text-lg lg:text-xl font-medium text-pretty text-gray-500 [font-family:var(--font-body)]">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <div className="mt-8 sm:mt-10 flex items-center justify-center">
          <Link
            href={`/${locale}`}
            className="rounded-md bg-black/90 px-8 py-2.5 text-sm font-medium text-white shadow-xs hover:bg-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 w-full sm:w-auto [font-family:var(--font-body)] uppercase"
          >
            Go to home
          </Link>
        </div>
      </div>
    </main>
  );
}
