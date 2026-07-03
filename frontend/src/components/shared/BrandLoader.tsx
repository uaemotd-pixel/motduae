"use client";

import * as images from "../../../public/images/ImageIndex";

export default function BrandLoader() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#FFFDF9] px-6">
      <div className="flex flex-col items-center text-center">
        <img
          src={images.brand_loading_logo.src}
          alt="MOTD Loading"
          className="animate-brand w-24 sm:w-28 md:w-32 lg:w-36 xl:w-40 h-auto select-none pointer-events-none"
        />

        <p className="mt-6 text-xs sm:text-sm tracking-[0.25em] uppercase text-neutral-500">
          Loading...
        </p>
      </div>
    </div>
  );
}
