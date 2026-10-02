"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp } from "lucide-react";
import { scrollPageToTop } from "@/lib/scroll";
import { FAQ_CHAT_OPEN_EVENT } from "@/components/shared/FaqChatbot";

const SCROLL_THRESHOLD = 200;

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsVisible(window.scrollY > SCROLL_THRESHOLD);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const onChatOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ open?: boolean }>).detail;
      setChatOpen(Boolean(detail?.open));
    };

    window.addEventListener(FAQ_CHAT_OPEN_EVENT, onChatOpen);
    return () => window.removeEventListener(FAQ_CHAT_OPEN_EVENT, onChatOpen);
  }, []);

  const scrollToTop = () => {
    scrollPageToTop();
  };

  // Closed: sit next to the chat FAB (inward). Open: bottom-left corner.
  const positionClass = chatOpen
    ? "bottom-[max(0.75rem,var(--safe-bottom))] start-[max(0.75rem,var(--safe-left))] sm:bottom-5 sm:start-5 md:bottom-6 md:start-6"
    : "bottom-4 end-[4.5rem] sm:bottom-5 sm:end-[5.5rem] md:bottom-6 md:end-[5.75rem] me-(--safe-right)";

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
          className={`fixed z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black text-white shadow-[0_10px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm transition-all duration-300 hover:bg-white hover:text-black active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FFFDF9] hover:cursor-pointer touch-manipulation mb-(--safe-bottom) ${positionClass}`}
        >
          <ChevronUp className="h-5 w-5" strokeWidth={1.5} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
