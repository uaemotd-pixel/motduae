// src/components/shared/LocaleSwitcher.tsx

"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

const LocaleSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean);
  const currentLocale =
    segments[0] === "ar" || segments[0] === "en" ? segments[0] : "en";
  const isArabic = currentLocale === "ar";

  const switchLanguage = () => {
    const newLocale = isArabic ? "en" : "ar";
    segments[0] = newLocale;
    router.push("/" + segments.join("/"));
  };

  return (
    <button
      onClick={switchLanguage}
      aria-label="Switch language"
      dir="ltr"
      className="
        relative
        isolate
        grid
        grid-cols-2
        items-center
        shrink-0
        h-8
        w-14
        p-[3px]
        rounded-full
        border
        border-[#D7D2C9]
        bg-linear-to-b
        from-[#FFFDF9]
        to-[#F2EEE8]
        shadow-sm
        hover:shadow-md
        transition-shadow
        duration-300
        cursor-pointer
      "
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute top-[3px] bottom-[3px] left-[3px] w-[calc(50%-3px)] rounded-full bg-black"
        initial={false}
        animate={{ x: isArabic ? "100%" : "0%" }}
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 35,
        }}
      />

      <span
        className={`
          relative z-10 text-center
          text-[9px] tracking-[0.08em] font-medium leading-none
          transition-colors duration-300
          ${!isArabic ? "text-white" : "text-[#6F6B63]"}
        `}
      >
        EN
      </span>

      <span
        className={`
          relative z-10 text-center
          text-[9px] tracking-[0.08em] font-medium leading-none
          transition-colors duration-300
          ${isArabic ? "text-white" : "text-[#6F6B63]"}
        `}
      >
        AR
      </span>
    </button>
  );
};

export default LocaleSwitcher;
