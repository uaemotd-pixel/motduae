// components/providers/LenisProvider.tsx
"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

export default function LenisProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname.includes("/admin") || pathname.includes("/tailor")) {
            document.documentElement.classList.remove("lenis", "lenis-smooth");
            document.documentElement.style.overflow = "";
            document.documentElement.style.height = "";
            document.body.style.overflow = "";
            document.body.style.height = "";
            return;
        }

        const lenis = new Lenis({
            duration: 1.2,
            easing: (t) => 1 - Math.pow(1 - t, 4),
            smoothWheel: true,
            overscroll: false,    // ← stops Lenis fighting native scroll
        });

        const raf = (time: number) => {
            lenis.raf(time);
            requestAnimationFrame(raf);
        };

        const rafId = requestAnimationFrame(raf);

        return () => {
            cancelAnimationFrame(rafId); // ← was missing, caused memory leak too
            lenis.destroy();
        };
    }, [pathname]);

    return <>{children}</>;
}