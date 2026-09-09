"use client";

import { type RefObject, useEffect, useRef } from "react";
import { scrollToCatalogListings } from "@/lib/scroll";

/**
 * After the initial paint, jump to the catalog listings whenever page,
 * filters, or sort change so the footer is not left in view.
 */
export function useCatalogScrollReset(
  enabled: boolean,
  targetRef: RefObject<HTMLElement | null> | undefined,
  currentPage: number,
  sortBy: string,
  filters: object,
) {
  const skipFirst = useRef(true);

  useEffect(() => {
    if (!enabled) return;

    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    scrollToCatalogListings(targetRef?.current ?? null);
  }, [enabled, currentPage, sortBy, filters, targetRef]);
}
