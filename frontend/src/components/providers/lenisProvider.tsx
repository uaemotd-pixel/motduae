// components/providers/LenisProvider.tsx
"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

const LENIS_DISABLED_PATHS = ["/admin", "/tailor", "/fabric"];

function shouldDisableLenis(pathname: string) {
    return LENIS_DISABLED_PATHS.some((segment) => pathname.includes(segment));
}

function resetScrollStyles() {
    document.documentElement.classList.remove("lenis", "lenis-smooth", "lenis-stopped");
    document.documentElement.style.overflow = "";
    document.documentElement.style.height = "";
    document.body.style.overflow = "";
    document.body.style.height = "";
}

export default function LenisProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        if (shouldDisableLenis(pathname)) {
            resetScrollStyles();
            return;
        }

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            smoothWheel: true,
            autoRaf: true,
            autoResize: true,
        });

        lenis.scrollTo(0, { immediate: true });

        const resizeAfterPaint = () => {
            requestAnimationFrame(() => lenis.resize());
        };

        resizeAfterPaint();
        window.addEventListener("load", resizeAfterPaint);
        window.addEventListener("resize", resizeAfterPaint);

        const resizeTimeouts = [
            window.setTimeout(() => lenis.resize(), 150),
            window.setTimeout(() => lenis.resize(), 600),
        ];

        return () => {
            window.removeEventListener("load", resizeAfterPaint);
            window.removeEventListener("resize", resizeAfterPaint);
            resizeTimeouts.forEach((id) => window.clearTimeout(id));
            lenis.destroy();
            resetScrollStyles();
        };
    }, [pathname]);

    return <>{children}</>;
}
