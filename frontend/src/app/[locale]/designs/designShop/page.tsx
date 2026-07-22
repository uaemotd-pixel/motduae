"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { Share2 } from "lucide-react";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

import {
  getDesignDisplayFields,
  resolveDesignImage,
  formatDesignCategory,
  type TailorDesignListItem,
} from "@/lib/tailors";

import { formatDesignBasePrice } from "@/lib/tailors";

const CATEGORY_COLORS: Record<string, string> = {
  "hand-embroidered": "#8B6B4D",
  "crystal-embellished": "#1A2A3A",
  "non-crystal": "#5A6B5A",
  talli: "#B8860B",
  khous: "#4A3A2A",
  beaded: "#6B2A5A",
};

const SearchOffIcon = () => (
  <svg
    className="w-12 h-12 text-[#8A8A80] mb-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-4.35-4.35M3 3l18 18M10 5a5 5 0 014.9 6.02M6.34 6.34A5 5 0 0010 15a5 5 0 003.66-1.59"
    />
  </svg>
);

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") return;
  await navigator.clipboard.writeText(text);
}

function buildShareUrl(basePath: string, href: string) {
  const trimmedBase = basePath.replace(/\/+$/, "");
  const trimmedHref = href.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedHref}`;
}

const CustomCheckbox = ({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    role="checkbox"
    aria-checked={checked}
    onClick={onChange}
    className={`
      w-4 h-4 shrink-0 border transition-all duration-150 flex items-center justify-center
      ${checked ? "bg-black border-black" : "bg-transparent border-[#C8C4BC] hover:border-black"}
    `}
  >
    {checked && (
      <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
        <path
          d="M1 4l3 3 5-6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);

const FilterLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] tracking-[0.22em] font-normal text-black uppercase mb-3 pb-2.5 border-b border-[#E4E0D8] w-full">
    {children}
  </p>
);

const PriceRangeSlider = ({
  minPrice,
  maxPrice,
  onMinChange,
  onMaxChange,
}: {
  minPrice: number;
  maxPrice: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
}) => {
  const [localMin, setLocalMin] = useState(String(minPrice));
  const [localMax, setLocalMax] = useState(String(maxPrice));
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setLocalMin(String(minPrice)), [minPrice]);
  useEffect(() => setLocalMax(String(maxPrice)), [maxPrice]);

  useEffect(() => {
    return () => {
      if (minTimerRef.current) clearTimeout(minTimerRef.current);
      if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    };
  }, []);

  const debouncedMinChange = (value: number) => {
    if (minTimerRef.current) clearTimeout(minTimerRef.current);
    minTimerRef.current = setTimeout(() => onMinChange(value), 300);
  };

  const debouncedMaxChange = (value: number) => {
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    maxTimerRef.current = setTimeout(() => onMaxChange(value), 300);
  };

  const commitMin = (raw: string) => {
    const parsed = raw === "" ? minPrice : Number(raw);
    if (Number.isNaN(parsed)) {
      setLocalMin(String(minPrice));
      return;
    }

    const maxVal = Number(localMax);
    const clamped = Math.min(
      Math.max(0, parsed),
      Number.isNaN(maxVal) ? 100000 : maxVal,
      100000,
    );

    setLocalMin(String(clamped));
    if (minTimerRef.current) clearTimeout(minTimerRef.current);
    onMinChange(clamped);
  };

  const commitMax = (raw: string) => {
    const parsed = raw === "" ? maxPrice : Number(raw);
    if (Number.isNaN(parsed)) {
      setLocalMax(String(maxPrice));
      return;
    }

    const minVal = Number(localMin);
    const clamped = Math.max(
      Math.min(parsed, 100000),
      Number.isNaN(minVal) ? 0 : minVal,
    );

    setLocalMax(String(clamped));
    if (maxTimerRef.current) clearTimeout(maxTimerRef.current);
    onMaxChange(clamped);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between text-[13px] font-mono text-[#7A7A72]">
        <span>AED 0</span>
        <span>AED 100000</span>
      </div>

      <div className="flex gap-2 pt-1">
        <input
          type="number"
          min={0}
          max={100000}
          step={1}
          value={localMin}
          onChange={(e) => {
            const raw = e.target.value;
            setLocalMin(raw);
            if (raw === "") return;
            const val = Number(raw);
            const maxVal = Number(localMax);
            if (
              !Number.isNaN(val) &&
              val >= 0 &&
              val <= 100000 &&
              (Number.isNaN(maxVal) || val <= maxVal)
            ) {
              debouncedMinChange(val);
            }
          }}
          onBlur={() => commitMin(localMin)}
          className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition"
        />

        <input
          type="number"
          min={0}
          max={100000}
          step={1}
          value={localMax}
          onChange={(e) => {
            const raw = e.target.value;
            setLocalMax(raw);
            if (raw === "") return;
            const val = Number(raw);
            const minVal = Number(localMin);
            if (
              !Number.isNaN(val) &&
              val <= 100000 &&
              (Number.isNaN(minVal) || val >= minVal)
            ) {
              debouncedMaxChange(val);
            }
          }}
          onBlur={() => commitMax(localMax)}
          className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition"
        />
      </div>
    </div>
  );
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-[#E4E0D8]">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="group relative w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4E0D8] bg-transparent text-black disabled:opacity-40 disabled:cursor-not-allowed hover:border-black hover:bg-black hover:text-white transition-all duration-200"
        aria-label="Previous page"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === "number" && onPageChange(page)}
          disabled={page === "..."}
          className={`
            min-w-10 h-10 px-2 flex items-center justify-center rounded-lg font-mono text-[13px] tracking-wide
            transition-all duration-200
            ${
              page === currentPage
                ? "bg-black text-white border-black"
                : page === "..."
                  ? "border-transparent cursor-default text-[#8A8A80]"
                  : "border border-[#E4E0D8] bg-transparent text-black hover:border-black hover:bg-black hover:text-white"
            }
          `}
        >
          {page}
        </button>
      ))}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="group relative w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4E0D8] bg-transparent text-black disabled:opacity-40 disabled:cursor-not-allowed hover:border-black hover:bg-black hover:text-white transition-all duration-200"
        aria-label="Next page"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
};

type FilterState = {
  categories: string[];
  minPrice: number;
  maxPrice: number;
  ageMin: number;
  ageMax: number;
};

export default function DesignShopCatalogPage() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const getLocaleBasePath = () => `/${locale}`;

  const handleShare = useCallback(
    async (hrefPath: string) => {
      const basePath = getLocaleBasePath();
      const relativeUrl = buildShareUrl(basePath, hrefPath);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = origin ? `${origin}${relativeUrl}` : relativeUrl;

      const shareData = {
        title: "MOTD",
        text: isAr ? "اطلع على التصميم" : "Check this design",
        url: fullUrl,
      };

      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await navigator.share(shareData as any);
          return;
        }
      } catch {
        // fall back
      }

      try {
        await copyToClipboard(fullUrl);
      } catch {
        window.prompt("Copy link:", fullUrl);
      }
    },
    [isAr, locale],
  );

  const [mounted, setMounted] = useState(false);
  const [designs, setDesigns] = useState<TailorDesignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    minPrice: 0,
    maxPrice: 100000,
    ageMin: 0,
    ageMax: 120,
  });

  const setAgeMin = (value: number) => {
    setFilters((prev) => {
      const clampedMin = Math.max(0, Math.min(120, value));
      const clampedMax = Math.max(clampedMin, Math.min(120, prev.ageMax));
      return { ...prev, ageMin: clampedMin, ageMax: clampedMax };
    });
    setCurrentPage(1);
  };

  const setAgeMax = (value: number) => {
    setFilters((prev) => {
      const clampedMax = Math.max(0, Math.min(120, value));
      const clampedMin = Math.min(clampedMax, Math.max(0, prev.ageMin));
      return { ...prev, ageMax: clampedMax, ageMin: clampedMin };
    });
    setCurrentPage(1);
  };

  const productsPerPage = 12;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        // GET /api/tailors/designs/all
        const data = await api.get<{
          success: boolean;
          items: TailorDesignListItem[];
        }>("/api/tailors/designs/all");

        if (!data?.success) throw new Error("Failed to load designs");
        setDesigns(data.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Something went wrong");
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchDesigns();
  }, []);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    designs.forEach((item) => {
      const active = item.category;
      if (active) counts.set(active, (counts.get(active) || 0) + 1);
    });

    return Array.from(counts.entries()).map(([cat, count]) => ({
      id: cat,
      label: formatDesignCategory(cat, locale as any),
      count,
    }));
  }, [designs, locale]);

  let filteredDesigns = designs.filter((item) => {
    if (filters.categories.length > 0) {
      if (!item.category || !filters.categories.includes(item.category))
        return false;
    }

    const price = item.basePrice ?? 0;
    if (price < filters.minPrice || price > filters.maxPrice) return false;

    const hasAgeFilter = filters.ageMin !== 0 || filters.ageMax !== 120;
    const ageValueRaw = (item as any).estimatedDays;
    const ageValue: number | null =
      typeof ageValueRaw === "number" && Number.isFinite(ageValueRaw)
        ? ageValueRaw
        : null;

    if (hasAgeFilter) {
      if (ageValue === null) return false;
      if (ageValue < filters.ageMin || ageValue > filters.ageMax) return false;
    }

    return true;
  });

  switch (sortBy) {
    case "price-low":
      filteredDesigns = [...filteredDesigns].sort(
        (a, b) => (a.basePrice || 0) - (b.basePrice || 0),
      );
      break;
    case "price-high":
      filteredDesigns = [...filteredDesigns].sort(
        (a, b) => (b.basePrice || 0) - (a.basePrice || 0),
      );
      break;
    case "newest":
    default:
      filteredDesigns = [...filteredDesigns];
      break;
  }

  const totalPages = Math.ceil(filteredDesigns.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedDesigns = filteredDesigns.slice(
    startIndex,
    startIndex + productsPerPage,
  );

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.minPrice > 0 ||
    filters.maxPrice < 100000 ||
    filters.ageMin > 0 ||
    filters.ageMax < 120;

  const toggleCategory = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id],
    }));
    setCurrentPage(1);
  };

  const setMinPrice = (value: number) => {
    setFilters((prev) => ({ ...prev, minPrice: value }));
    setCurrentPage(1);
  };

  const setMaxPrice = (value: number) => {
    setFilters((prev) => ({ ...prev, maxPrice: value }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      minPrice: 0,
      maxPrice: 100000,
      ageMin: 0,
      ageMax: 120,
    });
    setCurrentPage(1);
  };

  const handlePageChange = (value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!mounted) return null;

  const sidebarContent = (
    <div className="flex flex-col gap-8">
      <div>
        <FilterLabel>{isAr ? "الفئة" : "Category"}</FilterLabel>
        <div className="flex flex-col gap-3">
          {categoryOptions.map((cat) => (
            <label
              key={cat.id}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <CustomCheckbox
                checked={filters.categories.includes(cat.id)}
                onChange={() => toggleCategory(cat.id)}
              />
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{
                  backgroundColor: CATEGORY_COLORS[cat.id] || "#000000",
                }}
              />
              <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                {cat.label}
              </span>
              <span className="text-[10px] text-[#8A8A80] font-mono">
                ({cat.count})
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <FilterLabel>{isAr ? "نطاق السعر" : "Price Range"}</FilterLabel>
        <PriceRangeSlider
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
        />
      </div>

      <div>
        <FilterLabel>{isAr ? "عمر التصميم" : "Age Range"}</FilterLabel>
        <div className="space-y-4">
          <div className="flex justify-between text-[13px] font-mono text-[#7A7A72]">
            <span>0</span>
            <span>120</span>
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="number"
              min={0}
              max={120}
              step={1}
              value={filters.ageMin}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? 0 : Number(raw);
                if (!Number.isNaN(val)) setAgeMin(val);
              }}
              onBlur={() => setAgeMin(filters.ageMin)}
              className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition"
            />

            <input
              type="number"
              min={0}
              max={120}
              step={1}
              value={filters.ageMax}
              onChange={(e) => {
                const raw = e.target.value;
                const val = raw === "" ? 120 : Number(raw);
                if (!Number.isNaN(val))
                  setAgeMax(Math.max(0, Math.min(120, val)));
              }}
              onBlur={() => {
                if (filters.ageMax < 0) setAgeMax(0);
                if (filters.ageMax > 120) setAgeMax(120);
              }}
              className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition"
            />
          </div>
        </div>
      </div>

      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-normal transition-all duration-200 hover:bg-black hover:text-white"
        >
          {isAr ? "مسح جميع الفلاتر" : "Clear All Filters"}
        </button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <FadeInSection>
        <div className="min-h-screen bg-[#FDFAF5]">
          <div className="py-12 sm:py-16 lg:py-24 border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
            <div className="w-full text-left">
              <div className="mb-4 xs:mb-6">
                <div className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.28em] text-[#7A7A72] flex items-center justify-start gap-2 xs:gap-3">
                  <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                  <span>{isAr ? "استكشف التصاميم" : "Explore Designs"}</span>
                  <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                </div>
              </div>
              <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black mb-3 xs:mb-4">
                {isAr ? "تصاميم الخياط" : "Trending Designs"}
              </h1>
              <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] leading-normal xs:leading-[1.6] text-[#7A7A72] max-w-2xl">
                {isAr
                  ? "تصفح مجموعة تصاميم الخياط مع فلاتر حديثة."
                  : "Browse Trending Tailor Designs with modern filters."}
              </p>
            </div>
          </div>

          <div className="sticky top-16 z-30 bg-[#FDFAF5] border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
            <div className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="lg:hidden flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase hover:text-black/60 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    {isAr ? "الفلاتر" : "Filters"}
                    {hasActiveFilters && (
                      <span className="w-1.5 h-1.5 rounded-full bg-black" />
                    )}
                  </button>

                  {hasActiveFilters && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {filters.categories.map((cat) => (
                        <span
                          key={cat}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          {cat}
                          <button
                            onClick={() => toggleCategory(cat)}
                            className="hover:opacity-70 flex items-center justify-center"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      ))}
                      {(filters.minPrice > 0 || filters.maxPrice < 100000) && (
                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                          AED {filters.minPrice.toLocaleString()} - AED{" "}
                          {filters.maxPrice.toLocaleString()}
                          <button
                            onClick={() => {
                              setMinPrice(0);
                              setMaxPrice(100000);
                            }}
                            className="hover:opacity-70 flex items-center justify-center"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-6">
                  <span className="text-[11px] tracking-[0.18em] uppercase text-[#7A7A72] font-mono">
                    {isAr
                      ? `عرض ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredDesigns.length)} من ${filteredDesigns.length} تصميم`
                      : `Showing ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredDesigns.length)} of ${filteredDesigns.length} designs`}
                  </span>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-[11px] tracking-[0.18em] uppercase font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
                    <option value="price-low">
                      {isAr ? "السعر: من الأقل للأعلى" : "Price: Low to High"}
                    </option>
                    <option value="price-high">
                      {isAr ? "السعر: من الأعلى للأقل" : "Price: High to Low"}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {mobileFiltersOpen && (
            <div className="lg:hidden border-b border-[#E4E0D8] bg-[#FDFAF5] px-4 sm:px-8 lg:px-12 py-8 overflow-hidden">
              {sidebarContent}
            </div>
          )}

          <div className="flex flex-col lg:flex-row min-h-screen relative">
            <aside
              data-lenis-prevent
              className="hidden lg:block w-80 shrink-0 border-r border-[#E4E0D8] p-8 h-screen sticky top-34 overflow-y-auto"
            >
              {sidebarContent}
            </aside>

            <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
              {loading ? (
                <div className="flex items-center justify-center py-28">
                  <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-[#7A7A72]">
                    {isAr ? "جاري تحميل التصاميم..." : "Loading designs..."}
                  </p>
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center text-center py-28">
                  <h3 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                    {isAr ? "تعذر تحميل التصاميم" : "Unable to Load Designs"}
                  </h3>
                  <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed">
                    {fetchError}
                  </p>
                </div>
              ) : filteredDesigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-28">
                  <SearchOffIcon />
                  <h3 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                    {isAr ? "لم يتم العثور على أي تصميم" : "No Designs Found"}
                  </h3>
                  <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed mb-8">
                    {isAr
                      ? "حاول تعديل الفلاتر للعثور على ما تبحث عنه."
                      : "Try adjusting your filters to find what you’re looking for."}
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition-colors duration-200 rounded-full"
                  >
                    {isAr ? "مسح جميع الفلاتر" : "Clear All Filters"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedDesigns.map((design) => {
                      const { name, description, category } =
                        getDesignDisplayFields(design, locale as any);
                      const image = resolveDesignImage(design.images?.[0]);
                      const priceText = formatDesignBasePrice(
                        design.basePrice,
                        locale as any,
                        design.priceType,
                      );

                      return (
                        <div
                          key={design._id}
                          className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full"
                        >
                          <Link href={`/designs/${design.slug}`}>
                            {(category || design.category) && (
                              <span
                                className="absolute top-4 left-4 z-10 px-2.5 xs:px-3 py-1 xs:py-1.25 text-[10px] xs:text-[12px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-bold shadow-sm text-white"
                                style={{
                                  backgroundColor:
                                    CATEGORY_COLORS[design.category] ||
                                    "#000000",
                                }}
                              >
                                {category}
                              </span>
                            )}

                            <div className="absolute top-2 right-2 z-20 flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={isAr ? "مشاركة" : "Share"}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await handleShare(`/designs/${design.slug}`);
                                }}
                                className="absolute top-3 xs:top-3 right-3 z-20 p-2 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer"
                              >
                                <Share2 className="w-3 h-3 text-black" />
                              </button>
                            </div>

                            <div className="p-4 flex flex-col grow text-left">
                              <div className="block relative overflow-hidden mb-4 aspect-4/5 bg-[#F5F5F0] rounded-lg">
                                <img
                                  src={image}
                                  alt={name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              </div>

                              <h3 className="block hover:opacity-75 transition-opacity [font-family:var(--font-display)] text-[16px] sm:text-[18px] font-normal leading-relaxed tracking-tight text-black mb-1 line-clamp-2">
                                {name}
                              </h3>

                              <span className="[font-family:var(--font-ui)] text-[14px] sm:text-[15px] tracking-[0.08em] text-black font-normal mb-1">
                                {priceText}
                              </span>

                              <p className="[font-family:var(--font-body)] text-[12px] sm:text-[13px] leading-relaxed text-[#8A8A80] line-clamp-2 font-normal grow">
                                {description}
                              </p>

                              <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.24em] text-[#8A8A80] mt-3 font-normal">
                                {isAr
                                  ? `توقع ${design.estimatedDays} أيام`
                                  : `Estimated ${design.estimatedDays} days`}
                              </p>
                            </div>
                          </Link>
                        </div>
                      );
                    })}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </FadeInSection>
    </MainLayout>
  );
}
