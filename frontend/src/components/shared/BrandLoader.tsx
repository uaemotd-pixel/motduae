"use client";

import { useEffect, useState } from "react";
import * as images from "../../../public/images/ImageIndex";

export default function BrandLoader() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-[#FFFDF9] px-6">
      <div className="flex flex-col items-center text-center">
        <div className="relative w-24 sm:w-28 md:w-32 lg:w-36 xl:w-40">
          <img
            src={images.brand_loading_logo.src}
            alt="MOTD Loading"
            width={160}
            height={160}
            className="block w-full h-auto select-none pointer-events-none animate-brand"
            style={{
              transformOrigin: "center center",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
            loading="eager"
            decoding="async"
          />
        </div>

        <div className="mt-6 relative">
          <p className="text-xs sm:text-sm tracking-[0.25em] uppercase text-neutral-500 animate-pulse">
            Loading..
          </p>
          <div className="absolute -bottom-1 left-0 right-0 h-1px bg-linear-to-r from-transparent via-neutral-300 to-transparent opacity-50" />
        </div>
      </div>
    </div>
  );
}
