"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { X } from "lucide-react";

const CLOSE_DISTANCE_PX = 96;
const CLOSE_VELOCITY_PX_MS = 0.45;
const BODY_PULL_ACTIVATE_PX = 10;

type MobileSheetProps = {
  open: boolean;
  onClose: () => void;
  id: string;
  ariaLabel: string;
  refineLabel: string;
  title: string;
  closeLabel: string;
  activeCount?: number;
  footer: ReactNode;
};

type CatalogFilterSidebarProps = {
  children: ReactNode;
  /** When set, also renders the mobile bottom-sheet (drag down to close). */
  mobile?: MobileSheetProps;
};

type DragState = {
  pointerId: number | null;
  startY: number;
  lastY: number;
  lastTs: number;
  velocity: number;
  pendingBody: boolean;
  active: boolean;
};

/**
 * Desktop catalog filter column + optional mobile bottom sheet.
 * Stays put while the product grid scrolls on lg+, and on mobile the sheet
 * dismisses when dragged downward.
 */
export default function CatalogFilterSidebar({
  children,
  mobile,
}: CatalogFilterSidebarProps) {
  const asideRef = useRef<HTMLElement>(null);
  const scrollTopRef = useRef(0);

  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(mobile?.onClose);
  onCloseRef.current = mobile?.onClose;

  const dragRef = useRef<DragState>({
    pointerId: null,
    startY: 0,
    lastY: 0,
    lastTs: 0,
    velocity: 0,
    pendingBody: false,
    active: false,
  });

  const listenersRef = useRef<{
    move: ((event: PointerEvent) => void) | null;
    up: ((event: PointerEvent) => void) | null;
  }>({ move: null, up: null });

  const detachWindowListeners = useCallback(() => {
    const { move, up } = listenersRef.current;
    if (move) window.removeEventListener("pointermove", move);
    if (up) {
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    }
    listenersRef.current = { move: null, up: null };
  }, []);

  const resetDrag = useCallback(() => {
    dragRef.current.active = false;
    dragRef.current.pendingBody = false;
    dragRef.current.pointerId = null;
    setDragging(false);
  }, []);

  useEffect(() => {
    if (!mobile?.open) {
      setDragY(0);
      resetDrag();
      detachWindowListeners();
    }
  }, [mobile?.open, resetDrag, detachWindowListeners]);

  useEffect(() => {
    return () => detachWindowListeners();
  }, [detachWindowListeners]);

  const endDrag = useCallback(
    (clientY: number) => {
      const state = dragRef.current;
      if (!state.active && !state.pendingBody) return;

      const dy = Math.max(0, clientY - state.startY);
      const wasActive = state.active;
      const shouldClose =
        wasActive &&
        (dy >= CLOSE_DISTANCE_PX || state.velocity >= CLOSE_VELOCITY_PX_MS);

      resetDrag();
      detachWindowListeners();

      if (shouldClose) {
        setDragY(
          Math.max(dy, (sheetRef.current?.offsetHeight ?? 400) * 0.85),
        );
        onCloseRef.current?.();
      } else {
        setDragY(0);
      }
    },
    [detachWindowListeners, resetDrag],
  );

  const attachWindowListeners = useCallback(() => {
    detachWindowListeners();

    const onMove = (event: PointerEvent) => {
      const state = dragRef.current;
      if (state.pointerId !== event.pointerId) return;

      const deltaY = event.clientY - state.startY;

      if (state.pendingBody && !state.active) {
        if (bodyRef.current && bodyRef.current.scrollTop > 1) {
          resetDrag();
          detachWindowListeners();
          return;
        }
        if (deltaY < BODY_PULL_ACTIVATE_PX) {
          if (deltaY < -6) {
            resetDrag();
            detachWindowListeners();
          }
          return;
        }
        state.pendingBody = false;
        state.active = true;
        state.startY = event.clientY;
        state.lastY = event.clientY;
        state.lastTs = performance.now();
        state.velocity = 0;
        setDragging(true);
        setDragY(0);
        return;
      }

      if (!state.active) return;

      const now = performance.now();
      const dy = Math.max(0, event.clientY - state.startY);
      const dt = Math.max(1, now - state.lastTs);
      state.velocity = Math.max(0, (event.clientY - state.lastY) / dt);
      state.lastY = event.clientY;
      state.lastTs = now;
      setDragY(dy);

      if (dy > 4) event.preventDefault();
    };

    const onUp = (event: PointerEvent) => {
      const state = dragRef.current;
      if (state.pointerId !== event.pointerId) return;
      endDrag(event.clientY);
    };

    listenersRef.current = { move: onMove, up: onUp };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  }, [detachWindowListeners, endDrag, resetDrag]);

  const onHandlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!mobile?.open || event.button !== 0) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTs: performance.now(),
      velocity: 0,
      pendingBody: false,
      active: true,
    };
    setDragging(true);
    setDragY(0);
    attachWindowListeners();
  };

  const onBodyPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!mobile?.open || event.button !== 0) return;
    if (bodyRef.current && bodyRef.current.scrollTop > 1) return;

    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
      lastTs: performance.now(),
      velocity: 0,
      pendingBody: true,
      active: false,
    };
    attachWindowListeners();
  };

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

  const backdropOpacity = mobile?.open ? Math.max(0, 1 - dragY / 280) : 0;

  return (
    <>
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

      {mobile ? (
        <div
          className={`lg:hidden fixed inset-0 z-50 ${
            mobile.open ? "pointer-events-auto" : "pointer-events-none"
          }`}
          aria-hidden={!mobile.open}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px] cursor-pointer"
            style={{
              opacity: backdropOpacity,
              transition: dragging ? "none" : "opacity 300ms",
            }}
            onClick={() => {
              if (dragging || dragY > 8) return;
              mobile.onClose();
            }}
          />

          <div
            ref={sheetRef}
            id={mobile.id}
            role="dialog"
            aria-modal="true"
            aria-label={mobile.ariaLabel}
            className="absolute inset-x-0 bottom-0 flex max-h-[min(92dvh,920px)] flex-col rounded-t-2xl border border-[#E4E0D8] border-b-0 bg-white shadow-[0_-12px_40px_rgba(0,0,0,0.18)] will-change-transform"
            style={{
              transform: mobile.open
                ? `translateY(${dragY}px)`
                : "translateY(100%)",
              transition: dragging
                ? "none"
                : "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div
              className="shrink-0 touch-none select-none cursor-grab active:cursor-grabbing"
              onPointerDown={onHandlePointerDown}
            >
              <div
                className="mx-auto mt-3 flex h-6 w-full max-w-[6rem] items-start justify-center"
                aria-hidden
              >
                <span className="mt-1 h-1 w-10 rounded-full bg-[#D8D4CC]" />
              </div>

              <div className="flex items-center justify-between gap-3 border-b border-[#E4E0D8] px-5 pb-4 pt-1">
                <div className="min-w-0">
                  <p className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.22em] text-[#7A7A72]">
                    {mobile.refineLabel}
                  </p>
                  <h2 className="[font-family:var(--font-display)] text-[18px] xs:text-[20px] sm:text-[22px] leading-tight text-black">
                    {mobile.title}
                    {(mobile.activeCount ?? 0) > 0 ? (
                      <span className="ms-2 [font-family:var(--font-ui)] text-[10px] sm:text-[11px] tracking-[0.14em] text-[#7A7A72]">
                        ({mobile.activeCount})
                      </span>
                    ) : null}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={mobile.onClose}
                  onPointerDown={(event) => event.stopPropagation()}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-[#E4E0D8] text-black transition-colors hover:border-black hover:bg-black hover:text-white cursor-pointer"
                  aria-label={mobile.closeLabel}
                >
                  <X className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            </div>

            <div
              ref={bodyRef}
              data-lenis-prevent
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 touch-pan-y"
              onPointerDown={onBodyPointerDown}
            >
              {children}
            </div>

            <div className="shrink-0 border-t border-[#E4E0D8] bg-white px-5 pt-3 pb-[max(0.75rem,var(--safe-bottom))]">
              {mobile.footer}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
