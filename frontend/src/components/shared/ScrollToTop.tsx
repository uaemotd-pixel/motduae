"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";

const SCROLL_THRESHOLD = 200;

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          onClick={scrollToTop}
          aria-label="Scroll to top"
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="fixed bottom-4 right-4 xs:bottom-5 xs:right-5 sm:bottom-6 sm:right-6 md:bottom-8 md:right-8 z-50 flex h-10 w-10 xs:h-10 xs:w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 items-center justify-center rounded-full border border-white/20 bg-black text-white shadow-lg shadow-black/20 backdrop-blur-sm transition-colors duration-300 hover:bg-white hover:text-black active:scale-95 active:bg-white active:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] hover:cursor-pointer touch-manipulation"
        >
          <ChevronUp
            className="h-4 w-4 xs:h-4 xs:w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5"
            strokeWidth={1.5}
          />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
