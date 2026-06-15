// src/components/shared/RTLProvider.tsx (or anywhere you like)
"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function RTLProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    // Extract locale from first segment of the path
    const segments = pathname.split("/").filter(Boolean);
    const locale = segments[0] === "ar" ? "ar" : "en";
    const dir = locale === "ar" ? "rtl" : "ltr";

    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", locale);
  }, [pathname]);

  return <>{children}</>;
}
