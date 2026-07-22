// components/ui/GlobalProgressBar.tsx
"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import { usePathname } from "next/navigation";

const EXCLUDED_AUTH_SEGMENTS = ["/auth/login", "/auth/register"];

function isExcludedAuthPath(pathname: string | null): boolean {
    if (!pathname) return false;
    const withoutLocale = pathname.replace(/^\/(en|ar)(?=\/|$)/, "");
    return EXCLUDED_AUTH_SEGMENTS.some(
        (segment) =>
            withoutLocale === segment || withoutLocale.startsWith(segment + "/")
    );
}

export const GlobalProgressBar = () => {
    const pathname = usePathname();
    const { scrollYProgress } = useScroll();
    const scaleX = useSpring(scrollYProgress, {
        stiffness: 100,
        damping: 30,
        restDelta: 0.001,
    });

    const shouldShow = !isExcludedAuthPath(pathname);

    if (!shouldShow) return null;

    return (
        <motion.div
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/50 origin-left"
            style={{ scaleX }}
        />
    );
};