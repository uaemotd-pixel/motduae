"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";

/**
 * Desktop catalog filter column. Stays put while the product grid scrolls,
 * and captures wheel events so hovering the filters never moves the page.
 */
export default function CatalogFilterSidebar({
  children,
}: {
  children: ReactNode;
}) {
  const asideRef = useRef<HTMLElement>(null);
  const scrollTopRef = useRef(0);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const toolbar = document.querySelector<HTMLElement>("[data-catalog-toolbar]");
    const shop = aside.closest<HTMLElement>("[data-catalog-shop]");

    const applyToolbarHeight = () => {
      const height = toolbar?.offsetHeight ?? 76;
      (shop ?? document.documentElement).style.setProperty(
        "--catalog-toolbar-height",
        `${height}px`,
      );
    };

    applyToolbarHeight();
    const observer = toolbar ? new ResizeObserver(applyToolbarHeight) : null;
    if (toolbar && observer) observer.observe(toolbar);

    return () => observer?.disconnect();
  }, []);

  useLayoutEffect(() => {
    const aside = asideRef.current;
    if (aside) aside.scrollTop = scrollTopRef.current;
  });

  useEffect(() => {
    const aside = asideRef.current;
    if (!aside) return;

    const onScroll = () => {
      scrollTopRef.current = aside.scrollTop;
    };

    const onWheel = (event: WheelEvent) => {
      event.stopPropagation();

      const canScroll = aside.scrollHeight > aside.clientHeight + 1;
      if (!canScroll) {
        event.preventDefault();
        return;
      }

      const scrollingUp = event.deltaY < 0;
      const scrollingDown = event.deltaY > 0;
      const atTop = aside.scrollTop <= 0;
      const atBottom =
        aside.scrollTop + aside.clientHeight >= aside.scrollHeight - 1;

      if ((scrollingUp && atTop) || (scrollingDown && atBottom)) {
        event.preventDefault();
      }
    };

    aside.addEventListener("scroll", onScroll, { passive: true });
    aside.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      aside.removeEventListener("scroll", onScroll);
      aside.removeEventListener("wheel", onWheel);
    };
  }, []);

  return (
    <aside
      ref={asideRef}
      data-lenis-prevent
      data-lenis-prevent-wheel
      className="hidden lg:block w-80 shrink-0 self-start border-r border-[#E4E0D8] p-8 sticky overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      style={{
        top: "calc(var(--nav-height) + var(--safe-top) + var(--catalog-toolbar-height, 4.75rem))",
        height:
          "calc(100dvh - var(--nav-height) - var(--safe-top) - var(--catalog-toolbar-height, 4.75rem))",
      }}
    >
      {children}
    </aside>
  );
}
