"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { Share2, ChevronDown, ChevronUp } from "lucide-react";
import FadeInSection from "@/components/shared/fadeInSection";
import MainLayout from "../main/layout";
import colors from "@/components/shared/colors";
import WishlistButton from "@/components/shared/wishlistButton";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { resolveMediaUrl } from "@/lib/media";

interface AddOnListItem {
  _id: string;
  name: string;
  nameAr?: string;
  slug: string;
  price: number;
  stock: number;
  thumbnailImage: string;
  images?: string[];
  tag?: string;
  tagAr?: string;
  description?: string;
  descriptionAr?: string;
}

interface FilterState {
  colors: string[];
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
}

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
      w-4 h-4 shrink-0 border transition-all duration-150 flex items-center justify-center cursor-pointer
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

const ColorDropdown = ({
  selected,
  onChange,
  isAr,
}: {
  selected: string[];
  onChange: (value: string[]) => void;
  isAr: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleColor = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((c) => c !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  const filtered = colors.filter((c) =>
    c.en.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCount = selected.length;

  return (
    <div ref={dropdownRef} className="relative text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-[#E4E0D8] bg-transparent px-4 py-3 text-[11px] tracking-[0.14em] uppercase font-mono flex items-center justify-between hover:border-black transition cursor-pointer"
      >
        <span>
          {selectedCount > 0
            ? `${selectedCount} ${isAr ? "لون" : "color"}${selectedCount > 1 ? (isAr ? "" : "s") : ""}`
            : isAr
              ? "اختر الألوان"
              : "Select Colors"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 border border-[#E4E0D8] shadow-lg max-h-64 overflow-y-auto bg-[#FDFAF5]">
          <input
            type="text"
            placeholder={isAr ? "ابحث عن لون..." : "Search color..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-2.5 text-[11px] tracking-[0.14em] font-mono border-b border-[#E4E0D8] focus:outline-none sticky top-0 bg-[#FDFAF5]"
          />
          <button
            onClick={() => {
              onChange([]);
              setSearch("");
            }}
            className="w-full px-4 py-2.5 text-left text-[11px] tracking-[0.14em] uppercase hover:bg-[#EDE8E0] transition cursor-pointer"
          >
            {isAr ? "إلغاء الكل" : "Clear All"}
          </button>
          {filtered.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleColor(c.value)}
              className={`w-full px-4 py-2.5 text-left text-[11px] tracking-[0.14em] flex items-center gap-3 hover:bg-[#EDE8E0] transition cursor-pointer ${selected.includes(c.value) ? "bg-[#EDE8E0]" : ""
                }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-[#C8C4BC]"
                style={{ backgroundColor: c.hex }}
              />
              <span className="flex-1">{isAr ? c.ar : c.en}</span>
              {selected.includes(c.value) && (
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-[11px] text-[#8A8A80]">
              {isAr ? "لم يتم العثور على ألوان" : "No colors found"}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

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
    const finalVal = Math.max(0, parsed);
    setLocalMin(String(finalVal));
    debouncedMinChange(finalVal);
  };

  const commitMax = (raw: string) => {
    const parsed = raw === "" ? maxPrice : Number(raw);
    if (Number.isNaN(parsed)) {
      setLocalMax(String(maxPrice));
      return;
    }
    const finalVal = Math.max(minPrice, parsed);
    setLocalMax(String(finalVal));
    debouncedMaxChange(finalVal);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between text-[11px] text-[#8A8A80] font-mono">
        <span>AED {minPrice}</span>
        <span>AED {maxPrice}</span>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localMin}
          onChange={(e) => setLocalMin(e.target.value.replace(/\D/g, ""))}
          onBlur={() => commitMin(localMin)}
          className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition cursor-pointer"
        />
        <span className="text-[#8A8A80]">-</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localMax}
          onChange={(e) => setLocalMax(e.target.value.replace(/\D/g, ""))}
          onBlur={() => commitMax(localMax)}
          className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition cursor-pointer"
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
        className="group relative w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4E0D8] bg-transparent text-black disabled:opacity-40 disabled:cursor-not-allowed hover:border-black hover:bg-black hover:text-white transition-all duration-200 cursor-pointer"
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
            transition-all duration-200 cursor-pointer
            ${page === currentPage
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
        className="group relative w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4E0D8] bg-transparent text-black disabled:opacity-40 disabled:cursor-not-allowed hover:border-black hover:bg-black hover:text-white transition-all duration-200 cursor-pointer"
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

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#2D5A3D", text: "#FFFFFF" },
  bestseller: { bg: "#8B7355", text: "#FFFFFF" },
  premium: { bg: "#4A4A4A", text: "#FFFFFF" },
  limited: { bg: "#8B3A3A", text: "#FFFFFF" },
  exclusive: { bg: "#C4A47A", text: "#000000" },
  trending: { bg: "#3A5A78", text: "#FFFFFF" },
  handmade: { bg: "#6B4F3C", text: "#FFFFFF" },
};

const getTagStyles = (tagValue?: string) => {
  if (!tagValue) return { bg: "#1A1A1A", text: "#FFFFFF" };
  const key = tagValue.toLowerCase().trim();
  return TAG_COLORS[key] || { bg: "#1A1A1A", text: "#FFFFFF" };
};

export default function AddOnsCatalogPage() {
  const params = useParams();
  const router = useRouter();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [addons, setAddons] = useState<AddOnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  const [mounted, setMounted] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filters State
  const [filters, setFilters] = useState<FilterState>({
    colors: [],
    minPrice: 0,
    maxPrice: 100000,
    inStockOnly: false,
  });

  const [sortBy, setSortBy] = useState("newest"); // newest, price-low, price-high
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  const handleShare = useCallback(
    async (hrefPath: string) => {
      const relativeUrl = `/${locale}${hrefPath}`;
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = origin ? `${origin}${relativeUrl}` : relativeUrl;

      const shareData = {
        title: "MOTD",
        text: isAr ? "اطلع على هذا الملحق" : "Check this accessory",
        url: fullUrl,
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(fullUrl);
          setToastMessage(isAr ? "تم نسخ الرابط!" : "Link copied to clipboard!");
        }
      } catch (err) {
        console.error("Error sharing:", err);
      }
    },
    [locale, isAr]
  );

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch all addons from API
  useEffect(() => {
    const fetchAddons = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const data = await api.get<{
          success: boolean;
          items: AddOnListItem[];
        }>("/api/addons?limit=100");

        if (!data?.success) {
          throw new Error("Failed to load addons");
        }
        setAddons(data.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Something went wrong");
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchAddons();
  }, []);

  // Filter Actions
  const setColorFilter = (values: string[]) => {
    setFilters((prev) => ({ ...prev, colors: values }));
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

  const toggleInStock = () => {
    setFilters((prev) => ({ ...prev, inStockOnly: !prev.inStockOnly }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      colors: [],
      minPrice: 0,
      maxPrice: 100000,
      inStockOnly: false,
    });
    setCurrentPage(1);
  };

  const hasActiveFilters = useMemo(() => {
    return (
      filters.colors.length > 0 ||
      filters.minPrice > 0 ||
      filters.maxPrice < 100000 ||
      filters.inStockOnly
    );
  }, [filters]);

  // Client-side filtering & sorting
  const filteredProducts = useMemo(() => {
    let result = [...addons];

    // Colors client-side filtering (Check if color name is in title since AddOn schema lacks formal color array)
    if (filters.colors.length > 0) {
      result = result.filter((item) => {
        return filters.colors.some((colorVal) => {
          const colorObj = colors.find((c) => c.value === colorVal);
          if (!colorObj) return false;
          const nameLower = item.name.toLowerCase();
          const nameArLower = item.nameAr ? item.nameAr.toLowerCase() : "";
          return (
            nameLower.includes(colorObj.en.toLowerCase()) ||
            (colorObj.ar && nameArLower.includes(colorObj.ar))
          );
        });
      });
    }

    // Price range filtering
    result = result.filter(
      (item) => item.price >= filters.minPrice && item.price <= filters.maxPrice
    );

    // In stock filtering
    if (filters.inStockOnly) {
      result = result.filter((item) => item.stock > 0);
    }

    // Sorting
    if (sortBy === "price-low") {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else {
      // Default: newest
      result.sort((a, b) => b._id.localeCompare(a._id));
    }

    return result;
  }, [addons, filters, sortBy]);

  // Pagination calculation
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, startIndex + productsPerPage);
  }, [filteredProducts, startIndex]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const handlePageChange = (value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!mounted) return null;

  const sidebarContent = (
    <div className="flex flex-col gap-4 text-left">
      {/* Colors */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "اللون" : "Color"}</FilterLabel>
        <ColorDropdown
          selected={filters.colors}
          onChange={setColorFilter}
          isAr={isAr}
        />
      </div>

      {/* Price Range */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "نطاق السعر" : "Price Range"}</FilterLabel>
        <PriceRangeSlider
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
        />
      </div>

      {/* Availability */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "المتوفر" : "Availability"}</FilterLabel>
        <label className="flex items-center gap-3 cursor-pointer group">
          <CustomCheckbox
            checked={filters.inStockOnly}
            onChange={toggleInStock}
          />
          <span className="text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
            {isAr ? "المتوفر فقط" : "In Stock Only"}
          </span>
        </label>
      </div>

      {/* Clear Filters */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-normal transition-all duration-200 hover:bg-black hover:text-white mt-2 cursor-pointer bg-transparent"
        >
          {isAr ? "مسح جميع الفلاتر" : "Clear All Filters"}
        </button>
      )}
    </div>
  );

  return (
    <MainLayout>
      <FadeInSection>
        <div className="min-h-screen bg-white">
          {/* Hero Section */}
          <div className="py-12 sm:py-16 lg:py-24 border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
            <div className="w-full text-left">
              <div className="mb-4 xs:mb-6">
                <div className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.28em] text-[#7A7A72] flex items-center justify-start gap-2 xs:gap-3">
                  <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                  <span>
                    {isAr ? "اكتشف المجموعة" : "Discover the Collection"}
                  </span>
                  <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                </div>
              </div>

              <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black mb-3 xs:mb-4">
                {isAr ? "الملحقات والإضافات" : "Accessory Add-Ons"}
              </h1>
              <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] leading-normal xs:leading-[1.6] text-[#7A7A72] max-w-2xl">
                {isAr
                  ? "استكشفي مجموعتنا من الإكسسوارات و الإضافات المختارة لإكمال إطلالتك وتزيين المخواه الخاص بك."
                  : "Explore our collection of accessory pieces and optional add-ons to complete your traditional look."}
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="sticky top-16 z-30 bg-white border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
            <div className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                
                {/* Left controls: Mobile Filters trigger & active badges */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="lg:hidden flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase hover:text-black/60 transition-colors cursor-pointer bg-transparent border-0"
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
                      {filters.colors.map((color) => {
                        const colorObj = colors.find((c) => c.value === color);
                        return (
                          <span
                            key={color}
                            className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full font-mono"
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-white/30"
                              style={{
                                backgroundColor: colorObj?.hex || "#000",
                              }}
                            />
                            {isAr ? colorObj?.ar || color : color}
                            <button
                              onClick={() => {
                                setFilters((prev) => ({
                                  ...prev,
                                  colors: prev.colors.filter((c) => c !== color),
                                }));
                                setCurrentPage(1);
                              }}
                              className="hover:opacity-70 flex items-center justify-center cursor-pointer bg-transparent border-0 text-white p-0"
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
                        );
                      })}

                      {(filters.minPrice > 0 || filters.maxPrice < 100000) && (
                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full font-mono">
                          AED {filters.minPrice.toLocaleString()} - AED{" "}
                          {filters.maxPrice.toLocaleString()}
                          <button
                            onClick={() => {
                              setMinPrice(0);
                              setMaxPrice(100000);
                            }}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer bg-transparent border-0 text-white p-0"
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

                      {filters.inStockOnly && (
                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full font-mono">
                          {isAr ? "في المخزن" : "In Stock"}
                          <button
                            onClick={toggleInStock}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer bg-transparent border-0 text-white p-0"
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

                {/* Right controls: counters & sort */}
                <div className="flex items-center gap-6">
                  <span className="text-[11px] tracking-[0.18em] uppercase text-[#7A7A72] font-mono">
                    {isAr
                      ? `عرض ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredProducts.length)} من ${filteredProducts.length} إضافات`
                      : `Showing ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredProducts.length)} of ${filteredProducts.length} products`}
                  </span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-[11px] tracking-[0.18em] uppercase font-mono focus:outline-none cursor-pointer border-0"
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

          {/* Mobile Filters Drawer */}
          {mobileFiltersOpen && (
            <div className="lg:hidden border-b border-[#E4E0D8] bg-white px-4 sm:px-8 lg:px-12 py-8 overflow-hidden">
              {sidebarContent}
            </div>
          )}

          {/* Main Layout Body */}
          <div className="flex flex-col lg:flex-row min-h-screen relative">
            
            {/* Sidebar Desktop */}
            <aside
              data-lenis-prevent
              className="hidden lg:block w-80 shrink-0 border-r border-[#E4E0D8] p-8 h-screen sticky top-34 overflow-y-auto scrollbar-hide"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              {sidebarContent}
            </aside>

            {/* Grid List */}
            <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
              {loading ? (
                <ProductGridSkeleton count={8} />
              ) : fetchError ? (
                <div className="text-center py-16">
                  <p className="text-red-500 mb-4">{fetchError}</p>
                  <button
                    onClick={() => router.refresh()}
                    className="px-6 py-2.5 bg-black text-white text-[11px] uppercase tracking-[0.24em] [font-family:var(--font-ui)] hover:bg-[#2A2A28]"
                  >
                    {isAr ? "إعادة المحاولة" : "Try Again"}
                  </button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-16 flex flex-col items-center justify-center">
                  <SearchOffIcon />
                  <h3 className="[font-family:var(--font-display)] text-[20px] text-black mb-1">
                    {isAr ? "لا توجد إضافات مطابقة" : "No add-ons found"}
                  </h3>
                  <p className="text-[13px] text-gray-500 mb-6 font-normal">
                    {isAr ? "حاول تغيير كالمات البحث أو مسح فلاتر التصفية" : "Try adjusting your search filters or clearing active selections."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                    {paginatedProducts.map((product) => {
                      const title = isAr ? product.nameAr || product.name : product.name;
                      const description = isAr ? product.descriptionAr || product.description : product.description;
                      const image = resolveMediaUrl(product.thumbnailImage) || "/placeholder.png";
                      
                      const tag = isAr ? product.tagAr || product.tag : product.tag;
                      const tagStyles = getTagStyles(product.tag);
                      const price = product.price;

                      return (
                        <div
                          key={product._id}
                          className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full"
                        >
                          {tag && (
                            <span
                              className="absolute top-4 left-4 z-10 px-2.5 py-1 text-[10px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-bold shadow-sm"
                              style={{
                                backgroundColor: tagStyles.bg,
                                color: tagStyles.text,
                              }}
                            >
                              {tag}
                            </span>
                          )}

                          <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                            <button
                              type="button"
                              aria-label={isAr ? "مشاركة" : "Share"}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await handleShare(`/addons/${product.slug}`);
                              }}
                              className="flex items-center justify-center w-6 h-6 rounded-full bg-white/90 backdrop-blur-xs shadow-sm hover:scale-110 transition-transform cursor-pointer border-0 shrink-0"
                            >
                              <Share2 className="w-3.5 h-3.5 text-black" />
                            </button>

                            <WishlistButton
                              item={{
                                id: product._id,
                                name: title,
                                image: image,
                                price: price,
                                slug: product.slug,
                                size: "N/A",
                                type: "addons",
                                quantity: 1,
                                maxStock: product.stock || 0,
                              }}
                              className="relative! top-0! right-0! translate-x-0! [&>button]:w-6! [&>button]:h-6! [&>button]:min-w-0! [&>button]:min-h-0! [&>button]:p-0! [&>button]:m-0! [&>button]:bg-white/90! [&>button]:backdrop-blur-xs! [&>button]:shadow-sm! [&>button]:rounded-full!"
                            />
                          </div>

                          <div className="p-4 flex flex-col grow text-left">
                            <Link
                              href={`/addons/${product.slug}`}
                              className="block relative overflow-hidden mb-4 aspect-4/5 bg-[#F5F5F0] rounded-lg"
                            >
                              <img
                                src={image}
                                alt={title}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            </Link>

                            <Link
                              href={`/addons/${product.slug}`}
                              className="block hover:opacity-75 transition-opacity"
                            >
                              <h3 className="[font-family:var(--font-display)] text-[16px] sm:text-[18px] font-normal leading-relaxed tracking-tight text-black mb-1 line-clamp-2">
                                {title}
                              </h3>
                            </Link>

                            <span className="[font-family:var(--font-ui)] text-[14px] sm:text-[15px] tracking-[0.08em] text-black font-normal mb-3">
                              AED {price.toFixed(2)}
                            </span>

                            <p className="[font-family:var(--font-body)] text-[12px] sm:text-[13px] leading-relaxed text-[#8A8A80] line-clamp-2 font-normal grow">
                              {description}
                            </p>
                          </div>
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
