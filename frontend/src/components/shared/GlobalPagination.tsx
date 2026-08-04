"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

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
  if (totalPages <= 1 && !showItemsPerPage) return null;

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
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
      className={`flex flex-col items-center gap-4 pt-4 border-t border-gray-100 ${className}`}
    >
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 hover:cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex gap-1">
            {getPageNumbers().map((page, index) => {
              if (page === "...") {
                return (
                  <span
                    key={`dots-${index}`}
                    className="flex items-center justify-center w-9 h-9 text-sm text-gray-400"
                  >
                    …
                  </span>
                );
              }

              const isActive = page === currentPage;

              return (
                <button
                  key={page}
                  onClick={() => goToPage(Number(page))}
                  className={`flex items-center justify-center w-9 h-9 text-sm font-medium rounded-lg transition-all hover:cursor-pointer ${
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
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 hover:cursor-pointer"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {showItemsPerPage && onItemsPerPageChange && (
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Show
            </span>
            <select
              value={itemsPerPage}
              onChange={(e) => {
                const newValue = Number(e.target.value);
                onItemsPerPageChange(newValue);
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
          </div>
          {totalItems !== undefined && totalItems > 0 && (
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <span className="font-medium text-gray-600">{startItem}</span>
              <span>–</span>
              <span className="font-medium text-gray-600">{endItem}</span>
              <span>of</span>
              <span className="font-medium text-gray-600">{totalItems}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
