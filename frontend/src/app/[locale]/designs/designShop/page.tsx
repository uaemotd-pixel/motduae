"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import { Share2, ChevronDown, ChevronUp } from "lucide-react";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import WishlistButton from "@/components/shared/wishlistButton";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";

import {
  getDesignDisplayFields,
  resolveDesignImage,
  type TailorDesignListItem,
} from "@/lib/tailors";
import { formatDesignBasePrice } from "@/lib/tailors";
import {
  getFilterOptionLabel,
  formatFilterLabel,
  getProductTagLabel,
} from "@/lib/format";

interface DesignCatalogItem extends TailorDesignListItem {
  material?: string;
  materialAr?: string;
  pattern?: string;
  patternAr?: string;
  season?: string;
  seasonAr?: string;
  tag?: string;
  tagAr?: string;
  minAge?: number | null;
  maxAge?: number | null;
}

const PRICE_MAX = 100000;
const AGE_MAX = 120;

interface FilterOption {
  _id: string;
  name: string;
  nameAr?: string;
  isActive?: boolean;
}

function designMatchesCategory(
  design: DesignCatalogItem,
  category: FilterOption,
): boolean {
  return design.category === category._id || design.category === category.name;
}

function designMatchesCatalogOption(
  design: DesignCatalogItem,
  option: FilterOption,
  field: "material" | "pattern" | "season" | "tag",
): boolean {
  const values: Record<typeof field, { value?: string; valueAr?: string }> = {
    material: { value: design.material, valueAr: design.materialAr },
    pattern: { value: design.pattern, valueAr: design.patternAr },
    season: { value: design.season, valueAr: design.seasonAr },
    tag: { value: design.tag, valueAr: design.tagAr },
  };
  const { value, valueAr } = values[field];

  if (!value && !valueAr) return false;

  return (
    option._id === value ||
    option.name === value ||
    (!!valueAr && (option.nameAr === valueAr || option.name === valueAr))
  );
}

const CATEGORY_COLOR_PALETTE = [
  "#8B6B4D",
  "#1A2A3A",
  "#5A6B5A",
  "#B8860B",
  "#4A3A2A",
  "#6B2A5A",
  "#2A5A6B",
  "#6B4A2A",
  "#4A6B2A",
  "#6B2A2A",
];

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

const CollapsibleFilter = ({
  label,
  children,
  count,
}: {
  label: string;
  children: React.ReactNode;
  count?: number;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[#E4E0D8] pb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between py-2 hover:opacity-70 transition-opacity cursor-pointer"
      >
        <span className="text-[10px] tracking-[0.22em] font-normal text-black uppercase">
          {label} {count !== undefined && `(${count})`}
        </span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#8A8A80]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#8A8A80]" />
        )}
      </button>
      {isOpen && <div className="mt-3 flex flex-col gap-2">{children}</div>}
    </div>
  );
};

const RangeSlider = ({
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  formatValue,
}: {
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  onMinChange: (value: number) => void;
  onMaxChange: (value: number) => void;
  formatValue?: (value: number) => string;
}) => {
  const format = formatValue ?? ((value: number) => String(value));
  const span = max - min || 1;
  const minPercent = ((minValue - min) / span) * 100;
  const maxPercent = ((maxValue - min) / span) * 100;

  const thumbClass =
    "pointer-events-none absolute inset-0 w-full h-5 appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-black [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-black [&::-moz-range-thumb]:cursor-pointer";

  return (
    <div className="space-y-3">
      <div className="flex justify-between text-[11px] font-mono text-[#7A7A72]">
        <span>{format(minValue)}</span>
        <span>{format(maxValue)}</span>
      </div>

      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[#E4E0D8]" />
        <div
          className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-black"
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(maxPercent - minPercent, 0)}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={minValue}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isNaN(next)) return;
            onMinChange(Math.min(next, maxValue));
          }}
          className={`${thumbClass} z-10`}
          aria-label="Minimum value"
          aria-valuemin={min}
          aria-valuemax={maxValue}
          aria-valuenow={minValue}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={maxValue}
          onChange={(e) => {
            const next = Number(e.target.value);
            if (Number.isNaN(next)) return;
            onMaxChange(Math.max(next, minValue));
          }}
          className={`${thumbClass} z-20`}
          aria-label="Maximum value"
          aria-valuemin={minValue}
          aria-valuemax={max}
          aria-valuenow={maxValue}
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

type FilterState = {
  categories: string[];
  materials: string[];
  patterns: string[];
  seasons: string[];
  tags: string[];
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
  const [designs, setDesigns] = useState<DesignCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");

  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [patterns, setPatterns] = useState<FilterOption[]>([]);
  const [seasons, setSeasons] = useState<FilterOption[]>([]);
  const [tags, setTags] = useState<FilterOption[]>([]);

  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    materials: [],
    patterns: [],
    seasons: [],
    tags: [],
    minPrice: 0,
    maxPrice: PRICE_MAX,
    ageMin: 0,
    ageMax: AGE_MAX,
  });

  const setAgeMin = (value: number) => {
    setFilters((prev) => {
      const clampedMin = Math.max(0, Math.min(AGE_MAX, value));
      const clampedMax = Math.max(clampedMin, Math.min(AGE_MAX, prev.ageMax));
      return { ...prev, ageMin: clampedMin, ageMax: clampedMax };
    });
    setCurrentPage(1);
  };

  const setAgeMax = (value: number) => {
    setFilters((prev) => {
      const clampedMax = Math.max(0, Math.min(AGE_MAX, value));
      const clampedMin = Math.min(clampedMax, Math.max(0, prev.ageMin));
      return { ...prev, ageMax: clampedMax, ageMin: clampedMin };
    });
    setCurrentPage(1);
  };

  const productsPerPage = 12;

  useEffect(() => setMounted(true), []);

  // Fetch designs
  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        const data = await api.get<{
          success: boolean;
          items: DesignCatalogItem[];
        }>("/api/tailors/designs/all?limit=100");

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

  // Fetch all filter data from /api/filters
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const response = await api.get<{
          success: boolean;
          data: {
            categories: FilterOption[];
            materials: FilterOption[];
            patterns: FilterOption[];
            seasons: FilterOption[];
            tags: FilterOption[];
          };
        }>("/api/filters/all");

        if (response.success && response.data) {
          setCategories(
            Array.isArray(response.data.categories)
              ? response.data.categories
              : [],
          );
          setMaterials(
            Array.isArray(response.data.materials)
              ? response.data.materials
              : [],
          );
          setPatterns(
            Array.isArray(response.data.patterns) ? response.data.patterns : [],
          );
          setSeasons(
            Array.isArray(response.data.seasons) ? response.data.seasons : [],
          );
          setTags(Array.isArray(response.data.tags) ? response.data.tags : []);
        } else {
          setCategories([]);
          setMaterials([]);
          setPatterns([]);
          setSeasons([]);
          setTags([]);
        }
      } catch (err) {
        console.error("Filter fetch failed:", err);
        setCategories([]);
        setMaterials([]);
        setPatterns([]);
        setSeasons([]);
        setTags([]);
      }
    };

    fetchFilters();
  }, []);

  const categoryOptions = useMemo(() => {
    return categories.map((cat, index) => {
      return {
        id: cat._id,
        label: getFilterOptionLabel(cat, isAr),
        color: CATEGORY_COLOR_PALETTE[index % CATEGORY_COLOR_PALETTE.length],
        count: designs.filter((design) => designMatchesCategory(design, cat))
          .length,
      };
    });
  }, [categories, designs, isAr]);

  const materialOptions = useMemo(() => {
    return materials.map((mat) => ({
      id: mat._id,
      label: getFilterOptionLabel(mat, isAr),
      count: designs.filter((design) =>
        designMatchesCatalogOption(design, mat, "material"),
      ).length,
    }));
  }, [materials, designs, isAr]);

  const patternOptions = useMemo(() => {
    return patterns.map((pat) => ({
      id: pat._id,
      label: getFilterOptionLabel(pat, isAr),
      count: designs.filter((design) =>
        designMatchesCatalogOption(design, pat, "pattern"),
      ).length,
    }));
  }, [patterns, designs, isAr]);

  const seasonOptions = useMemo(() => {
    return seasons.map((sea) => ({
      id: sea._id,
      label: getFilterOptionLabel(sea, isAr),
      count: designs.filter((design) =>
        designMatchesCatalogOption(design, sea, "season"),
      ).length,
    }));
  }, [seasons, designs, isAr]);

  const tagOptions = useMemo(() => {
    return tags.map((tag) => ({
      id: tag._id,
      label: getFilterOptionLabel(tag, isAr),
      count: designs.filter((design) =>
        designMatchesCatalogOption(design, tag, "tag"),
      ).length,
    }));
  }, [tags, designs, isAr]);

  const getOptionLabel = useCallback(
    (options: FilterOption[], id: string) => {
      const found = options.find((option) => option._id === id);
      return found ? getFilterOptionLabel(found, isAr) : formatFilterLabel(id);
    },
    [isAr],
  );

  const filteredDesigns = useMemo(() => {
    let result = designs.filter((item) => {
      if (filters.categories.length > 0) {
        if (!item.category) return false;
        const isMatch = filters.categories.some(
          (catId) =>
            catId === item.category ||
            categories.some((c) => c._id === catId && c.name === item.category),
        );
        if (!isMatch) return false;
      }

      if (filters.materials.length > 0) {
        const itemMat = isAr ? item.materialAr || item.material : item.material;
        if (!itemMat) return false;
        const isMatch = filters.materials.some(
          (matId) =>
            matId === itemMat ||
            materials.some((m) => m._id === matId && m.name === itemMat),
        );
        if (!isMatch) return false;
      }

      if (filters.patterns.length > 0) {
        const itemPat = isAr ? item.patternAr || item.pattern : item.pattern;
        if (!itemPat) return false;
        const isMatch = filters.patterns.some(
          (patId) =>
            patId === itemPat ||
            patterns.some((p) => p._id === patId && p.name === itemPat),
        );
        if (!isMatch) return false;
      }

      if (filters.seasons.length > 0) {
        const itemSeason = isAr ? item.seasonAr || item.season : item.season;
        if (!itemSeason) return false;
        const isMatch = filters.seasons.some(
          (seaId) =>
            seaId === itemSeason ||
            seasons.some((s) => s._id === seaId && s.name === itemSeason),
        );
        if (!isMatch) return false;
      }

      if (filters.tags.length > 0) {
        const itemTag = isAr ? item.tagAr || item.tag : item.tag;
        if (!itemTag) return false;
        const isMatch = filters.tags.some(
          (tagId) =>
            tagId === itemTag ||
            tags.some((tag) => tag._id === tagId && tag.name === itemTag),
        );
        if (!isMatch) return false;
      }

      const price = item.basePrice ?? 0;
      if (price < filters.minPrice || price > filters.maxPrice) return false;

      const hasAgeFilter = filters.ageMin !== 0 || filters.ageMax !== AGE_MAX;
      if (hasAgeFilter) {
        const itemMin = item.minAge;
        const itemMax = item.maxAge;
        if (itemMin != null || itemMax != null) {
          const rangeMin = itemMin ?? 0;
          const rangeMax = itemMax ?? AGE_MAX;
          if (rangeMax < filters.ageMin || rangeMin > filters.ageMax) {
            return false;
          }
        }
      }

      return true;
    });

    if (sortBy === "price-low") {
      result = [...result].sort(
        (a, b) => (a.basePrice || 0) - (b.basePrice || 0),
      );
    } else if (sortBy === "price-high") {
      result = [...result].sort(
        (a, b) => (b.basePrice || 0) - (a.basePrice || 0),
      );
    }

    return result;
  }, [
    designs,
    filters,
    categories,
    materials,
    patterns,
    seasons,
    tags,
    isAr,
    sortBy,
  ]);

  const totalPages = Math.ceil(filteredDesigns.length / productsPerPage);
  const startIndex = (currentPage - 1) * productsPerPage;
  const paginatedDesigns = filteredDesigns.slice(
    startIndex,
    startIndex + productsPerPage,
  );

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.materials.length > 0 ||
    filters.patterns.length > 0 ||
    filters.seasons.length > 0 ||
    filters.tags.length > 0 ||
    filters.minPrice > 0 ||
    filters.maxPrice < PRICE_MAX ||
    filters.ageMin > 0 ||
    filters.ageMax < AGE_MAX;

  const toggleCategory = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id],
    }));
    setCurrentPage(1);
  };

  const toggleFilter = (
    key: "materials" | "patterns" | "seasons" | "tags",
    id: string,
  ) => {
    setFilters((prev) => {
      const arr = prev[key] as string[];
      return {
        ...prev,
        [key]: arr.includes(id) ? arr.filter((c) => c !== id) : [...arr, id],
      };
    });
    setCurrentPage(1);
  };

  const setMinPrice = (value: number) => {
    setFilters((prev) => {
      const clampedMin = Math.max(0, Math.min(PRICE_MAX, value));
      const clampedMax = Math.max(
        clampedMin,
        Math.min(PRICE_MAX, prev.maxPrice),
      );
      return { ...prev, minPrice: clampedMin, maxPrice: clampedMax };
    });
    setCurrentPage(1);
  };

  const setMaxPrice = (value: number) => {
    setFilters((prev) => {
      const clampedMax = Math.max(0, Math.min(PRICE_MAX, value));
      const clampedMin = Math.min(clampedMax, Math.max(0, prev.minPrice));
      return { ...prev, maxPrice: clampedMax, minPrice: clampedMin };
    });
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      materials: [],
      patterns: [],
      seasons: [],
      tags: [],
      minPrice: 0,
      maxPrice: PRICE_MAX,
      ageMin: 0,
      ageMax: AGE_MAX,
    });
    setCurrentPage(1);
  };

  const handlePageChange = (value: number) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!mounted) return null;

  const sidebarContent = (
    <div className="flex flex-col gap-4">
      {/* Categories - 1st */}
      {categories.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "الفئة" : "Category"}
          count={filters.categories.length}
        >
          <div className="flex flex-col gap-2">
            {categoryOptions.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.categories.includes(cat.id)}
                  onChange={() => toggleCategory(cat.id)}
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
        </CollapsibleFilter>
      )}

      {/* Materials */}
      {materials.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "نوع القماش" : "Material"}
          count={filters.materials.length}
        >
          <div className="flex flex-col gap-2">
            {materialOptions.map((mat) => (
              <label
                key={mat.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.materials.includes(mat.id)}
                  onChange={() => toggleFilter("materials", mat.id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {mat.label}
                </span>
                <span className="text-[10px] text-[#8A8A80] font-mono">
                  ({mat.count})
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Patterns - 3rd */}
      {patterns.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "النقشة" : "Pattern"}
          count={filters.patterns.length}
        >
          <div className="flex flex-col gap-2">
            {patternOptions.map((pat) => (
              <label
                key={pat.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.patterns.includes(pat.id)}
                  onChange={() => toggleFilter("patterns", pat.id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {pat.label}
                </span>
                <span className="text-[10px] text-[#8A8A80] font-mono">
                  ({pat.count})
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Seasons - 4th */}
      {seasons.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "الموسم" : "Season"}
          count={filters.seasons.length}
        >
          <div className="flex flex-col gap-2">
            {seasonOptions.map((sea) => (
              <label
                key={sea.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.seasons.includes(sea.id)}
                  onChange={() => toggleFilter("seasons", sea.id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {sea.label}
                </span>
                <span className="text-[10px] text-[#8A8A80] font-mono">
                  ({sea.count})
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Price Range */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "نطاق السعر" : "Price Range"}</FilterLabel>
        <RangeSlider
          min={0}
          max={PRICE_MAX}
          step={100}
          minValue={filters.minPrice}
          maxValue={filters.maxPrice}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
          formatValue={(value) => `AED ${value.toLocaleString()}`}
        />
      </div>

      {/* Age Range */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "الفئة العمرية" : "Age Range"}</FilterLabel>
        <RangeSlider
          min={0}
          max={AGE_MAX}
          step={1}
          minValue={filters.ageMin}
          maxValue={filters.ageMax}
          onMinChange={setAgeMin}
          onMaxChange={setAgeMax}
          formatValue={(value) => (isAr ? `${value} سنة` : `${value} yrs`)}
        />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "التصنيف" : "Tag"}
          count={filters.tags.length}
        >
          <div className="flex flex-col gap-2">
            {tagOptions.map((tag) => (
              <label
                key={tag.id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.tags.includes(tag.id)}
                  onChange={() => toggleFilter("tags", tag.id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {tag.label}
                </span>
                <span className="text-[10px] text-[#8A8A80] font-mono">
                  ({tag.count})
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Clear All */}
      {hasActiveFilters && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-normal transition-all duration-200 hover:bg-black hover:text-white mt-2 cursor-pointer"
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
                  ? "تصفّح تصاميم الخيّاطين الرائجة باستخدام خيارات التصفية."
                  : "Browse Trending Tailor Designs with modern filters."}
              </p>
            </div>
          </div>

          <div className="sticky sticky-below-nav z-30 bg-white border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
            <div className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                    className="lg:hidden flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase hover:text-black/60 transition-colors cursor-pointer"
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
                      {filters.categories.map((catId) => (
                        <span
                          key={catId}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          {getOptionLabel(categories, catId)}
                          <button
                            type="button"
                            onClick={() => toggleCategory(catId)}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      {filters.materials.map((matId) => (
                        <span
                          key={matId}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          {getOptionLabel(materials, matId)}
                          <button
                            type="button"
                            onClick={() => toggleFilter("materials", matId)}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      {filters.patterns.map((patId) => (
                        <span
                          key={patId}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          {getOptionLabel(patterns, patId)}
                          <button
                            type="button"
                            onClick={() => toggleFilter("patterns", patId)}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      {filters.seasons.map((seaId) => (
                        <span
                          key={seaId}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          {getOptionLabel(seasons, seaId)}
                          <button
                            type="button"
                            onClick={() => toggleFilter("seasons", seaId)}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      {filters.tags.map((tagId) => (
                        <span
                          key={tagId}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          {getOptionLabel(tags, tagId)}
                          <button
                            type="button"
                            onClick={() => toggleFilter("tags", tagId)}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      {(filters.minPrice > 0 ||
                        filters.maxPrice < PRICE_MAX) && (
                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                          AED {filters.minPrice.toLocaleString()} - AED{" "}
                          {filters.maxPrice.toLocaleString()}
                          <button
                            type="button"
                            onClick={() => {
                              setMinPrice(0);
                              setMaxPrice(PRICE_MAX);
                            }}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      {(filters.ageMin > 0 || filters.ageMax < AGE_MAX) && (
                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                          {isAr
                            ? `${filters.ageMin}-${filters.ageMax} سنة`
                            : `${filters.ageMin}-${filters.ageMax} yrs`}
                          <button
                            type="button"
                            onClick={() => {
                              setAgeMin(0);
                              setAgeMax(AGE_MAX);
                            }}
                            className="hover:opacity-70 flex items-center justify-center cursor-pointer"
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
                      ? `عرض ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredDesigns.length)} من أصل ${filteredDesigns.length} تصميم`
                      : `Showing ${startIndex + 1}-${Math.min(startIndex + productsPerPage, filteredDesigns.length)} of ${filteredDesigns.length} designs`}
                  </span>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-transparent text-[11px] tracking-[0.18em] uppercase font-mono focus:outline-none cursor-pointer"
                  >
                    <option value="newest">{isAr ? "الأحدث" : "Newest"}</option>
                    <option value="price-low">
                      {isAr
                        ? "السعر: من الأقل إلى الأعلى"
                        : "Price: Low to High"}
                    </option>
                    <option value="price-high">
                      {isAr
                        ? "السعر: من الأعلى إلى الأقل"
                        : "Price: High to Low"}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {mobileFiltersOpen && (
            <div className="lg:hidden border-b border-[#E4E0D8] bg-white px-4 sm:px-8 lg:px-12 py-8 overflow-hidden">
              {sidebarContent}
            </div>
          )}

          <div className="flex flex-col lg:flex-row min-h-screen relative">
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

            <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
              {loading ? (
                <ProductGridSkeleton count={8} />
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
                      : "Try adjusting your filters to find what you're looking for."}
                  </p>
                  <button
                    onClick={clearAllFilters}
                    className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition-colors duration-200 rounded-full cursor-pointer"
                  >
                    {isAr ? "مسح جميع الفلاتر" : "Clear All Filters"}
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {paginatedDesigns.map((design) => {
                      const { name, description } = getDesignDisplayFields(
                        design,
                        locale as any,
                      );
                      const image = resolveDesignImage(design.images?.[0]);
                      const priceText = formatDesignBasePrice(
                        design.basePrice,
                        locale as any,
                        design.priceType,
                      );
                      const tagLabel = getProductTagLabel(
                        isAr ? design.tagAr || design.tag : design.tag,
                        isAr,
                        tags,
                      );

                      return (
                        <div
                          key={design._id}
                          className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full"
                        >
                          <Link href={`/designs/${design.slug}`}>
                            <div className="p-4 flex flex-col grow text-left">
                              <div className="block relative overflow-hidden mb-4 aspect-4/5 bg-[#F5F5F0] rounded-lg">
                                <img
                                  src={image}
                                  alt={name}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                <span className="absolute top-1.5 left-1.5 z-10 px-1.5 py-px text-[8px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.14em] font-bold shadow-sm text-white bg-black max-w-[calc(100%-3.75rem)] truncate">
                                  {tagLabel}
                                </span>

                                <div className="absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    aria-label={isAr ? "مشاركة" : "Share"}
                                    onClick={async (e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      await handleShare(
                                        `/designs/${design.slug}`,
                                      );
                                    }}
                                    className="flex items-center justify-center w-6 h-6 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform cursor-pointer border-0 shrink-0"
                                  >
                                    <Share2 className="w-2.5 h-2.5 text-black" />
                                  </button>

                                  <WishlistButton
                                    item={{
                                      id: design._id,
                                      name,
                                      image,
                                      price: design.basePrice,
                                      slug: design.slug,
                                      size: "N/A",
                                      quantity: 1,
                                      type: "design",
                                    }}
                                    inline
                                    className="flex items-center justify-center w-6 h-6 rounded-full bg-white/85 backdrop-blur-sm shadow-sm border-0 shrink-0 p-0"
                                    iconClassName="w-2.5 h-2.5"
                                  />
                                </div>
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
