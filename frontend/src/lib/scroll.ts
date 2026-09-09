type LenisLike = {
  scrollTo: (
    target: number | string | HTMLElement,
    options?: {
      offset?: number;
      immediate?: boolean;
      duration?: number;
      force?: boolean;
    },
  ) => void;
  resize: () => void;
};

function getLenis(): LenisLike | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { lenis?: LenisLike }).lenis;
}

function getNavOffset(): number {
  if (typeof document === "undefined") return 80;
  const styles = getComputedStyle(document.documentElement);
  const nav = Number.parseFloat(styles.getPropertyValue("--nav-height")) || 72;
  const safe = Number.parseFloat(styles.getPropertyValue("--safe-top")) || 0;
  return nav + safe;
}

function isScrollable(el: HTMLElement): boolean {
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll") {
    return false;
  }
  return el.scrollHeight > el.clientHeight + 1;
}

function getScrollableParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node && node !== document.body && node !== document.documentElement) {
    if (isScrollable(node)) return node;
    node = node.parentElement;
  }
  return null;
}

function nativeScrollTo(top: number, container: HTMLElement | null) {
  if (container) {
    container.scrollTo({ top: Math.max(0, top), behavior: "auto" });
    return;
  }
  window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
}

/**
 * Jump to catalog listings (or page top) after pagination/filter changes.
 * Uses Lenis when present, otherwise native/overflow-container scroll.
 * Immediate (not smooth) so a shorter next page cannot leave the footer in view.
 */
export function scrollToCatalogListings(target?: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const run = () => {
    const lenis = getLenis();
    lenis?.resize();

    const offset = getNavOffset();

    if (target) {
      const top = target.getBoundingClientRect().top;
      const distanceFromAnchor = Math.abs(top - offset);
      if (distanceFromAnchor < window.innerHeight * 0.75) return;
    }

    if (lenis) {
      if (target) {
        lenis.scrollTo(target, { offset: -offset, immediate: true, force: true });
      } else {
        lenis.scrollTo(0, { immediate: true, force: true });
      }
      return;
    }

    const container = getScrollableParent(target ?? null);

    if (target) {
      if (container) {
        const delta =
          target.getBoundingClientRect().top -
          container.getBoundingClientRect().top;
        nativeScrollTo(container.scrollTop + delta - 16, container);
        return;
      }
      nativeScrollTo(
        target.getBoundingClientRect().top + window.scrollY - offset,
        null,
      );
      return;
    }

    nativeScrollTo(0, container);
    window.scrollTo({ top: 0, behavior: "auto" });
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}

export function scrollPageToTop(fromEl?: HTMLElement | null) {
  if (typeof window === "undefined") return;

  const run = () => {
    const lenis = getLenis();
    lenis?.resize();
    if (lenis) {
      lenis.scrollTo(0, { immediate: true, force: true });
      return;
    }

    const container = getScrollableParent(fromEl ?? null);
    if (container) {
      container.scrollTo({ top: 0, behavior: "auto" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "auto" });
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(run);
  });
}
