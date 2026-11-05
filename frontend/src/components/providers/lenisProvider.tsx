// components/providers/LenisProvider.tsx
"use client";
import {
  useCallback,
  useEffect,
  useRef,
  type RefObject,
} from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

const LENIS_DISABLED_PATHS = ["/admin", "/tailor", "/fabric"];

const CHAT_LENIS_OPTIONS = {
  duration: 1.2,
  easing: (t: number) => 1 - Math.pow(1 - t, 4),
  smoothWheel: true,
  autoRaf: true,
  autoResize: true,
  overscroll: false,
} as const;

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
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (coarsePointer || noHover || reducedMotion) return true;
  }

  return false;
}

/** Nested chat threads: only honor reduced-motion (chat panes are small). */
function shouldDisableNestedLenis() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function resetScrollStyles() {
  document.documentElement.classList.remove(
    "lenis",
    "lenis-smooth",
    "lenis-stopped",
  );
  document.documentElement.style.overflow = "";
  document.documentElement.style.height = "";
  document.body.style.overflow = "";
  document.body.style.height = "";
}

/**
 * Smooth-scroll a chatbot message thread (overflow container).
 * Expects a single content child inside `wrapperRef` for Lenis to measure.
 *
 * Put `data-lenis-prevent` on a *parent* of the thread (e.g. the chat panel),
 * not on the Lenis wrapper itself — otherwise wheel handling can fight the
 * page-level Lenis instance.
 */
export function useChatThreadLenis(
  wrapperRef: RefObject<HTMLElement | null>,
  enabled = true,
  remountKey?: string | number | boolean | null,
) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (!enabled) {
      lenisRef.current?.destroy();
      lenisRef.current = null;
      return;
    }

    if (shouldDisableNestedLenis()) {
      lenisRef.current = null;
      return;
    }

    let cancelled = false;
    let lenis: Lenis | null = null;
    let ro: ResizeObserver | null = null;
    let raf = 0;
    let tries = 0;

    const teardown = () => {
      if (raf) cancelAnimationFrame(raf);
      ro?.disconnect();
      ro = null;
      lenis?.destroy();
      if (lenisRef.current === lenis) lenisRef.current = null;
      lenis = null;
    };

    const mount = () => {
      if (cancelled) return;
      const wrapper = wrapperRef.current;
      if (!wrapper) {
        // Panel may still be entering via AnimatePresence.
        if (tries++ < 60) raf = requestAnimationFrame(mount);
        return;
      }

      const content = wrapper.firstElementChild as HTMLElement | null;
      if (!content) {
        if (tries++ < 60) raf = requestAnimationFrame(mount);
        return;
      }

      // Wait until the flex pane has a real height (spring open animation).
      if (wrapper.clientHeight < 8) {
        if (tries++ < 60) raf = requestAnimationFrame(mount);
        return;
      }

      teardown();
      if (cancelled) return;

      lenis = new Lenis({
        wrapper,
        content,
        eventsTarget: wrapper,
        ...CHAT_LENIS_OPTIONS,
      });
      lenisRef.current = lenis;

      const resize = () => {
        try {
          lenis?.resize();
        } catch {
          /* ignore */
        }
      };
      ro = new ResizeObserver(resize);
      ro.observe(wrapper);
      ro.observe(content);
      resize();
    };

    mount();

    return () => {
      cancelled = true;
      teardown();
    };
  }, [enabled, remountKey, wrapperRef]);

  const scrollToBottom = useCallback(
    (immediate = true) => {
      const wrapper = wrapperRef.current;
      const lenis = lenisRef.current;
      if (lenis) {
        try {
          lenis.resize();
          lenis.scrollTo(lenis.limit, { immediate });
          return;
        } catch {
          /* fall through */
        }
      }
      if (wrapper) wrapper.scrollTop = wrapper.scrollHeight;
    },
    [wrapperRef],
  );

  return { scrollToBottom };
}

export default function LenisProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  useEffect(() => {
    if (shouldDisableLenis(pathname)) {
      resetScrollStyles();
      return;
    }

    const lenis = new Lenis({
      ...CHAT_LENIS_OPTIONS,
      // Let nested chat panes own their wheel when marked with data-lenis-prevent.
      overscroll: true,
    });

    (window as Window & { lenis?: Lenis }).lenis = lenis;

    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash;
      const scrollToHash = () => {
        try {
          const target = document.querySelector(hash);
          if (target) {
            lenis.scrollTo(target as HTMLElement, {
              offset: -80,
              duration: 1.2,
            });
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
            lenis.scrollTo(target as HTMLElement, {
              offset: -80,
              duration: 1.2,
            });
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
      delete (window as Window & { lenis?: Lenis }).lenis;
      lenis.destroy();
      resetScrollStyles();
    };
  }, [pathname]);

  return <>{children}</>;
}
