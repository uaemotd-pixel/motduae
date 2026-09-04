// components/providers/LenisProvider.tsx
"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

const LENIS_DISABLED_PATHS = ["/admin", "/tailor", "/fabric"];

function shouldDisableLenis(pathname: string) {
    if (LENIS_DISABLED_PATHS.some((segment) => pathname.includes(segment))) {
        return true;
    }

    // Touch devices already have native momentum scrolling, so Lenis only adds
    // a permanent requestAnimationFrame loop and repeated resize passes. On
    // low-end Android that competes with image decoding for the main thread and
    // is a large part of why scrolling feels rough there.
    if (typeof window !== "undefined") {
        const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
        const noHover = window.matchMedia("(hover: none)").matches;
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (coarsePointer || noHover || reducedMotion) return true;
    }

    return false;
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

        (window as any).lenis = lenis;

        if (typeof window !== "undefined" && window.location.hash) {
            const hash = window.location.hash;
            const scrollToHash = () => {
                try {
                    const target = document.querySelector(hash);
                    if (target) {
                        lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.2 });
                    }
                } catch {
                    // Ignore invalid selector
                }
            };
            setTimeout(scrollToHash, 150);
            setTimeout(scrollToHash, 500);
        } else {
            lenis.scrollTo(0, { immediate: true });
        }

        const handleHashChange = () => {
            if (typeof window !== "undefined" && window.location.hash) {
                try {
                    const target = document.querySelector(window.location.hash);
                    if (target) {
                        lenis.scrollTo(target as HTMLElement, { offset: -80, duration: 1.2 });
                    }
                } catch {
                    // Ignore invalid selector
                }
            }
        };
        window.addEventListener("hashchange", handleHashChange);

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
            window.removeEventListener("hashchange", handleHashChange);
            resizeTimeouts.forEach((id) => window.clearTimeout(id));
            delete (window as any).lenis;
            lenis.destroy();
            resetScrollStyles();
        };
    }, [pathname]);

    return <>{children}</>;
}
