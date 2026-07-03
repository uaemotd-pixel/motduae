"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import BrandLoader from "./BrandLoader";

const MIN_DURATION = 800;

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, MIN_DURATION);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <>
      {loading && <BrandLoader />}

      <div
        className={`transition-opacity duration-500 ${
          loading ? "opacity-0" : "opacity-100"
        }`}
      >
        {children}
      </div>
    </>
  );
}
