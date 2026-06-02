// components/ui/GlobalProgressBar.tsx
"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";

const EXCLUDED_PAGES = [
    "/auth/login",
    "/auth/register"
];

export const GlobalProgressBar = () => {
    const pathname = usePathname();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    const shouldShow = !EXCLUDED_PAGES.some(
        (page) => pathname === page || pathname?.startsWith(page + "/")
    );

    if (!shouldShow) return null;

    return (
        <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50 origin-left"
            style={{ scaleX }}
        />
    );
};