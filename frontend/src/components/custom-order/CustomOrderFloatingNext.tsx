"use client";

import { useEffect, useState, type RefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type CustomOrderFloatingNextProps = {
  enabled: boolean;
  onClick: () => void;
  ariaLabel: string;
  footerRef: RefObject<HTMLElement | null>;
};

export default function CustomOrderFloatingNext({
  enabled,
  onClick,
  ariaLabel,
  footerRef,
}: CustomOrderFloatingNextProps) {
  const locale = useLocale();
  const t = useTranslations("CustomOrderJourney");
  const isRtl = locale === "ar";
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) {
      setFooterVisible(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0.35, rootMargin: "0px 0px -8px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [footerRef, enabled]);

  const show = enabled && !footerVisible;

  return (
    <AnimatePresence>
      {show ? (
        <motion.button
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-5 py-3 text-white shadow-[0_10px_30px_rgba(0,0,0,0.28)] hover:bg-[#2A2A28] transition [font-family:var(--font-ui)] text-[10px] tracking-[0.22em] uppercase hover:cursor-pointer mb-[var(--safe-bottom)]"
        >
          <span>{t("nextStep")}</span>
          <ChevronRight
            className={`w-4 h-4 ${isRtl ? "rotate-180" : ""}`}
            strokeWidth={1.75}
          />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
