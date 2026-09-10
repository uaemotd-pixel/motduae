"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { scrollPageToTop } from "@/lib/scroll";

type GlobalPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
  showItemsPerPage?: boolean;
  itemsPerPage?: number;
  onItemsPerPageChange?: (items: number) => void;
  itemsPerPageOptions?: number[];
  totalItems?: number;
};

export default function GlobalPagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  className = "",
  showItemsPerPage = false,
  itemsPerPage = 10,
  onItemsPerPageChange,
  itemsPerPageOptions = [1, 2, 3, 5, 10, 20, 50, 100], // Include 1, 2, 3 for testing
  totalItems,
}: GlobalPaginationProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  if (totalPages <= 1 && !showItemsPerPage) return null;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
      scrollPageToTop(rootRef.current);
    }
  };

  const getPageNumbers = () => {
    const totalNumbers = siblingCount * 2 + 3;
    const totalSlots = totalNumbers + 2;

    if (totalPages <= totalSlots) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftRange = Array.from(
        { length: 3 + siblingCount * 2 },
        (_, i) => i + 1,
      );
      return [...leftRange, "...", totalPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightRange = Array.from(
        { length: 3 + siblingCount * 2 },
        (_, i) => totalPages - (3 + siblingCount * 2) + 1 + i,
      );
      return [1, "...", ...rightRange];
    }

    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i,
    );
    return [1, "...", ...middleRange, "...", totalPages];
  };

  const startItem = totalItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = totalItems
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : 0;

  return (
    <div
      ref={rootRef}
      className={`flex w-full flex-col items-center gap-3 sm:gap-4 pt-4 border-t border-gray-100 ${className}`}
    >
      {totalPages > 1 && (
        <div className="flex w-full flex-wrap items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="Previous page"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 hover:cursor-pointer sm:w-auto sm:px-3"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex flex-wrap items-center justify-center gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`dots-${index}`}
                    className="flex h-9 w-9 items-center justify-center text-sm text-gray-400"
                  >
                    …
                  </span>
                );
              }

              const isActive = page === currentPage;

              return (
                <button
                  type="button"
                  key={page}
                  onClick={() => goToPage(Number(page))}
                  className={`inline-flex h-9 w-9 items-center justify-center text-sm font-medium rounded-lg transition-all hover:cursor-pointer ${
                    isActive
                      ? "bg-black text-white shadow-sm"
                      : "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="Next page"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 hover:cursor-pointer sm:w-auto sm:px-3"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex w-full flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
          <label className="flex items-center justify-center gap-2 text-sm text-gray-600">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Show
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                onItemsPerPageChange(newValue);
                scrollPageToTop(rootRef.current);
              }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-offset-1 hover:cursor-pointer bg-white transition-shadow"
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">per page</span>
          </label>
          {totalItems !== undefined && totalItems > 0 && (
            <p className="text-center text-xs text-gray-400">
              <span className="font-medium text-gray-600">{startItem}</span>
              <span> – </span>
              <span className="font-medium text-gray-600">{endItem}</span>
              <span> of </span>
              <span className="font-medium text-gray-600">{totalItems}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
