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
        h-6
        w-10
        p-0.5
        sm:h-7
        sm:w-12
        lg:h-8
        lg:w-14
        lg:p-0.75
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
        className="pointer-events-none absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-black lg:top-0.75 lg:bottom-0.75 lg:left-0.75 lg:w-[calc(50%-3px)]"
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
          text-[7px] xs:text-[8px] lg:text-[9px] tracking-[0.08em] font-medium leading-none
          transition-colors duration-300
          ${!isArabic ? "text-white" : "text-[#6F6B63]"}
        `}
      >
        EN
      </span>

      <span
        className={`
          relative z-10 text-center
          text-[7px] xs:text-[8px] lg:text-[9px] tracking-[0.08em] font-medium leading-none
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
