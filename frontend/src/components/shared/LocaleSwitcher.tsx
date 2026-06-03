// src/components/shared/LocaleSwitcher.tsx

"use client";

import { motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";

const LocaleSwitcher = () => {
  const pathname = usePathname();
  const router = useRouter();

  const segments = pathname.split("/").filter(Boolean);
  const currentLocale = segments[0] === "ar" || segments[0] === "en" ? segments[0] : "en";
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
      className="
        relative
        flex
        items-center
        w-17.5
        h-8
        p-0.5
        rounded-full
        border
        border-[#D7D2C9]
        bg-linear-to-b
        from-[#FFFDF9]
        to-[#F2EEE8]
        shadow-sm
        hover:shadow-md
        transition-all
        duration-300
        cursor-pointer
      "
    >
      <motion.div
        layout
        transition={{
          type: "spring",
          stiffness: 500,
          damping: 35,
        }}
        className="
          absolute
          top-0.5
          bottom-0.5
          w-7
          rounded-full
          bg-black
        "
        animate={{
          x: isArabic ? 36 : 0,
        }}
      />

      <div className="flex justify-between items-center w-full px-2 relative z-10">
        <span
          className={`
            text-[9px]
            tracking-[0.16em]
            font-medium
            transition-colors
            duration-300
            ${!isArabic ? "text-white" : "text-[#6F6B63]"}
          `}
        >
          EN
        </span>

        <span
          className={`
            text-[9px]
            tracking-[0.16em]
            font-medium
            transition-colors
            duration-300
            ${isArabic ? "text-white" : "text-[#6F6B63]"}
          `}
        >
          AR
        </span>
      </div>
    </button>
  );
};

export default LocaleSwitcher;