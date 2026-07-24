"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import {
  type FabricListItem,
  formatMaterialLabel,
  getFabricDisplayFields,
  resolveFabricImage,
} from "@/lib/fabrics";
import { Share2, ChevronDown, ChevronUp } from "lucide-react";
import FadeInSection from "@/components/shared/fadeInSection";

interface FilterOption {
  _id: string;
  name: string;
  nameAr?: string;
  isActive?: boolean;
}

const colorOptions = [
  { name: "Aqua", value: "aqua", bg: "#00FFFF" },
  { name: "Aquamarine", value: "aquamarine", bg: "#7FFFD4" },
  { name: "Beige", value: "beige", bg: "#F5F5DC" },
  { name: "Bisque", value: "bisque", bg: "#FFE4C4" },
  { name: "Black", value: "black", bg: "#000000" },
  { name: "Blue", value: "blue", bg: "#0000FF" },
  { name: "Blue Violet", value: "blueviolet", bg: "#8A2BE2" },
  { name: "Brown", value: "brown", bg: "#A52A2A" },
  { name: "Burlywood", value: "burlywood", bg: "#DEB887" },
  { name: "Cadet Blue", value: "cadetblue", bg: "#5F9EA0" },
  { name: "Chocolate", value: "chocolate", bg: "#D2691E" },
  { name: "Coral", value: "coral", bg: "#FF7F50" },
  { name: "Cornflower Blue", value: "cornflowerblue", bg: "#6495ED" },
  { name: "Cornsilk", value: "cornsilk", bg: "#FFF8DC" },
  { name: "Crimson", value: "crimson", bg: "#DC143C" },
  { name: "Cyan", value: "cyan", bg: "#00FFFF" },
  { name: "Dark Blue", value: "darkblue", bg: "#00008B" },
  { name: "Dark Cyan", value: "darkcyan", bg: "#008B8B" },
  { name: "Dark Goldenrod", value: "darkgoldenrod", bg: "#B8860B" },
  { name: "Dark Gray", value: "darkgray", bg: "#A9A9A9" },
  { name: "Dark Green", value: "darkgreen", bg: "#006400" },
  { name: "Dark Khaki", value: "darkkhaki", bg: "#BDB76B" },
  { name: "Dark Magenta", value: "darkmagenta", bg: "#8B008B" },
  { name: "Dark Orchid", value: "darkorchid", bg: "#9932CC" },
  { name: "Dark Red", value: "darkred", bg: "#8B0000" },
  { name: "Dark Salmon", value: "darksalmon", bg: "#E9967A" },
  { name: "Dark Sea Green", value: "darkseagreen", bg: "#8FBC8F" },
  { name: "Dark Slate Blue", value: "darkslateblue", bg: "#483D8B" },
  { name: "Dark Slate Gray", value: "darkslategray", bg: "#2F4F4F" },
  { name: "Dark Turquoise", value: "darkturquoise", bg: "#00CED1" },
  { name: "Dark Violet", value: "darkviolet", bg: "#9400D3" },
  { name: "Deep Pink", value: "deeppink", bg: "#FF1493" },
  { name: "Deep Sky Blue", value: "deepskyblue", bg: "#00BFFF" },
  { name: "Dim Gray", value: "dimgray", bg: "#696969" },
  { name: "Dodger Blue", value: "dodgerblue", bg: "#1E90FF" },
  { name: "Firebrick", value: "firebrick", bg: "#B22222" },
  { name: "Fuchsia", value: "fuchsia", bg: "#FF00FF" },
  { name: "Gainsboro", value: "gainsboro", bg: "#DCDCDC" },
  { name: "Gold", value: "gold", bg: "#FFD700" },
  { name: "Goldenrod", value: "goldenrod", bg: "#DAA520" },
  { name: "Gray", value: "gray", bg: "#808080" },
  { name: "Green", value: "green", bg: "#008000" },
  { name: "Green Yellow", value: "greenyellow", bg: "#ADFF2F" },
  { name: "Grey", value: "grey", bg: "#808080" },
  { name: "Hot Pink", value: "hotpink", bg: "#FF69B4" },
  { name: "Indian Red", value: "indianred", bg: "#CD5C5C" },
  { name: "Indigo", value: "indigo", bg: "#4B0082" },
  { name: "Ivory", value: "ivory", bg: "#FFFFF0" },
  { name: "Khaki", value: "khaki", bg: "#F0E68C" },
  { name: "Lavender", value: "lavender", bg: "#E6E6FA" },
  { name: "Light Blue", value: "lightblue", bg: "#ADD8E6" },
  { name: "Light Gray", value: "lightgray", bg: "#D3D3D3" },
  { name: "Light Green", value: "lightgreen", bg: "#90EE90" },
  { name: "Light Pink", value: "lightpink", bg: "#FFB6C1" },
  { name: "Light Salmon", value: "lightsalmon", bg: "#FFA07A" },
  { name: "Light Sea Green", value: "lightseagreen", bg: "#20B2AA" },
  { name: "Light Sky Blue", value: "lightskyblue", bg: "#87CEFA" },
  { name: "Light Slate Gray", value: "lightslategray", bg: "#778899" },
  { name: "Light Steel Blue", value: "lightsteelblue", bg: "#B0C4DE" },
  { name: "Maroon", value: "maroon", bg: "#800000" },
  { name: "Medium Blue", value: "mediumblue", bg: "#0000CD" },
  { name: "Medium Purple", value: "mediumpurple", bg: "#9370DB" },
  { name: "Medium Sea Green", value: "mediumseagreen", bg: "#3CB371" },
  { name: "Medium Slate Blue", value: "mediumslateblue", bg: "#7B68EE" },
  { name: "Medium Turquoise", value: "mediumturquoise", bg: "#48D1CC" },
  { name: "Medium Violet Red", value: "mediumvioletred", bg: "#C71585" },
  { name: "Midnight Blue", value: "midnightblue", bg: "#191970" },
  { name: "Moccasin", value: "moccasin", bg: "#FFE4B5" },
  { name: "Navy", value: "navy", bg: "#000080" },
  { name: "Olive", value: "olive", bg: "#808000" },
  { name: "Olive Drab", value: "olivedrab", bg: "#6B8E23" },
  { name: "Orange", value: "orange", bg: "#FFA500" },
  { name: "Orchid", value: "orchid", bg: "#DA70D6" },
  { name: "Pale Goldenrod", value: "palegoldenrod", bg: "#EEE8AA" },
  { name: "Pale Green", value: "palegreen", bg: "#98FB98" },
  { name: "Pale Turquoise", value: "paleturquoise", bg: "#AFEEEE" },
  { name: "Pale Violet Red", value: "palevioletred", bg: "#DB7093" },
  { name: "Peach Puff", value: "peachpuff", bg: "#FFDAB9" },
  { name: "Pink", value: "pink", bg: "#FFC0CB" },
  { name: "Plum", value: "plum", bg: "#DDA0DD" },
  { name: "Powder Blue", value: "powderblue", bg: "#B0E0E6" },
  { name: "Purple", value: "purple", bg: "#800080" },
  { name: "Rebecca Purple", value: "rebeccapurple", bg: "#663399" },
  { name: "Red", value: "red", bg: "#FF0000" },
  { name: "Rosy Brown", value: "rosybrown", bg: "#BC8F8F" },
  { name: "Royal Blue", value: "royalblue", bg: "#4169E1" },
  { name: "Saddle Brown", value: "saddlebrown", bg: "#8B4513" },
  { name: "Salmon", value: "salmon", bg: "#FA8072" },
  { name: "Sandy Brown", value: "sandybrown", bg: "#F4A460" },
  { name: "Sea Green", value: "seagreen", bg: "#2E8B57" },
  { name: "Silver", value: "silver", bg: "#C0C0C0" },
  { name: "Sky Blue", value: "skyblue", bg: "#87CEEB" },
  { name: "Slate Blue", value: "slateblue", bg: "#6A5ACD" },
  { name: "Slate Gray", value: "slategray", bg: "#708090" },
  { name: "Steel Blue", value: "steelblue", bg: "#4682B4" },
  { name: "Tan", value: "tan", bg: "#D2B48C" },
  { name: "Teal", value: "teal", bg: "#008080" },
  { name: "Thistle", value: "thistle", bg: "#D8BFD8" },
  { name: "Tomato", value: "tomato", bg: "#FF6347" },
  { name: "Turquoise", value: "turquoise", bg: "#40E0D0" },
  { name: "Violet", value: "violet", bg: "#EE82EE" },
  { name: "Wheat", value: "wheat", bg: "#F5DEB3" },
  { name: "White", value: "white", bg: "#FFFFFF" },
  { name: "Yellow", value: "yellow", bg: "#FFFF00" },
  { name: "Yellow Green", value: "yellowgreen", bg: "#9ACD32" },
];

interface FilterState {
  categories: string[];
  colors: string[];
  materials: string[];
  patterns: string[];
  seasons: string[];
  tags: string[];
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

  const filtered = colorOptions.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const selectedCount = selected.length;

  return (
    <div ref={dropdownRef} className="relative">
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
              className={`w-full px-4 py-2.5 text-left text-[11px] tracking-[0.14em] flex items-center gap-3 hover:bg-[#EDE8E0] transition cursor-pointer ${
                selected.includes(c.value) ? "bg-[#EDE8E0]" : ""
              }`}
            >
              <span
                className="w-4 h-4 rounded-full shrink-0 border border-[#C8C4BC]"
                style={{ backgroundColor: c.bg }}
              />
              <span className="flex-1">{c.name}</span>
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
          className="w-1/2 border border-[#E4E0D8] bg-transparent px-3 py-2 text-[13px] font-mono text-black focus:outline-none focus:border-black transition cursor-pointer"
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

export default function FabricsCatalogPage() {
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
        text: isAr ? "اطلع على المنتج" : "Check this product",
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
  const [fabrics, setFabrics] = useState<FabricListItem[]>([]);
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [materials, setMaterials] = useState<FilterOption[]>([]);
  const [patterns, setPatterns] = useState<FilterOption[]>([]);
  const [seasons, setSeasons] = useState<FilterOption[]>([]);
  const [tags, setTags] = useState<FilterOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    colors: [],
    materials: [],
    patterns: [],
    seasons: [],
    tags: [],
    minPrice: 0,
    maxPrice: 100000,
    inStockOnly: false,
  });

  const fabricsPerPage = 12;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch fabrics
  useEffect(() => {
    const fetchFabrics = async () => {
      try {
        setLoading(true);
        setFetchError(null);
        const data = await api.get<{
          success: boolean;
          items: FabricListItem[];
        }>("/api/fabrics");

        if (!data?.success) {
          throw new Error("Failed to load fabrics");
        }
        setFabrics(data.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Something went wrong");
        setFetchError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchFabrics();
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
    return categories.map((cat) => ({
      id: cat._id,
      label: isAr ? cat.nameAr || cat.name : cat.name,
      count: fabrics.filter((f) => f.material === cat.name).length,
    }));
  }, [categories, fabrics, isAr]);

  const matchesColorFilter = (
    fabricColors: string[] | string | undefined,
    selectedColors: string[],
  ) => {
    if (selectedColors.length === 0) return true;
    if (!fabricColors) return false;
    const colorsArray = Array.isArray(fabricColors)
      ? fabricColors
      : [fabricColors];
    return colorsArray.some((col) => {
      const normalized = col.toLowerCase();
      return selectedColors.some(
        (value) => normalized.includes(value) || value.includes(normalized),
      );
    });
  };

  let filteredFabrics = fabrics.filter((item) => {
    // Category filter
    if (filters.categories.length > 0) {
      if (!item.material) return false;
      const isMatch = filters.categories.some(
        (catId) =>
          catId === item.material ||
          categories.some((c) => c._id === catId && c.name === item.material),
      );
      if (!isMatch) return false;
    }

    // Color filter
    if (!matchesColorFilter(item.color, filters.colors)) return false;

    // Material filter
    if (filters.materials.length > 0) {
      const itemMat = item.material;
      if (!itemMat) return false;
      const isMatch = filters.materials.some(
        (matId) =>
          matId === itemMat ||
          materials.some((m) => m._id === matId && m.name === itemMat),
      );
      if (!isMatch) return false;
    }

    // Pattern filter
    if (filters.patterns.length > 0) {
      const itemPat = (item as any).pattern;
      if (!itemPat) return false;
      const isMatch = filters.patterns.some(
        (patId) =>
          patId === itemPat ||
          patterns.some((p) => p._id === patId && p.name === itemPat),
      );
      if (!isMatch) return false;
    }

    // Season filter
    if (filters.seasons.length > 0) {
      const itemSeason = (item as any).season;
      if (!itemSeason) return false;
      const isMatch = filters.seasons.some(
        (seaId) =>
          seaId === itemSeason ||
          seasons.some((s) => s._id === seaId && s.name === itemSeason),
      );
      if (!isMatch) return false;
    }

    // Tags filter
    if (filters.tags.length > 0) {
      const itemTags = (item as any).tags;
      if (!itemTags || !Array.isArray(itemTags)) return false;
      const hasTag = itemTags.some((t: string) =>
        filters.tags.some(
          (tagId) =>
            tagId === t ||
            tags.some((tag) => tag._id === tagId && tag.name === t),
        ),
      );
      if (!hasTag) return false;
    }

    // Price filter
    const price = item.pricePerMeter ?? 0;
    if (price < filters.minPrice || price > filters.maxPrice) {
      return false;
    }

    // Stock filter
    if (filters.inStockOnly) {
      if (item.stockInMeters === 0) {
        return false;
      }
    }
    return true;
  });

  switch (sortBy) {
    case "price-low":
      filteredFabrics.sort(
        (a, b) => (a.pricePerMeter || 0) - (b.pricePerMeter || 0),
      );
      break;
    case "price-high":
      filteredFabrics.sort(
        (a, b) => (b.pricePerMeter || 0) - (a.pricePerMeter || 0),
      );
      break;
    case "newest":
    default:
      filteredFabrics = [...filteredFabrics];
      break;
  }

  const totalPages = Math.ceil(filteredFabrics.length / fabricsPerPage);
  const startIndex = (currentPage - 1) * fabricsPerPage;
  const paginatedFabrics = filteredFabrics.slice(
    startIndex,
    startIndex + fabricsPerPage,
  );
  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.colors.length > 0 ||
    filters.materials.length > 0 ||
    filters.patterns.length > 0 ||
    filters.seasons.length > 0 ||
    filters.tags.length > 0 ||
    filters.minPrice > 0 ||
    filters.maxPrice < 100000 ||
    filters.inStockOnly;

  const toggleCategory = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      categories: prev.categories.includes(id)
        ? prev.categories.filter((c) => c !== id)
        : [...prev.categories, id],
    }));
    setCurrentPage(1);
  };

  const toggleMaterial = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      materials: prev.materials.includes(id)
        ? prev.materials.filter((m) => m !== id)
        : [...prev.materials, id],
    }));
    setCurrentPage(1);
  };

  const togglePattern = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      patterns: prev.patterns.includes(id)
        ? prev.patterns.filter((p) => p !== id)
        : [...prev.patterns, id],
    }));
    setCurrentPage(1);
  };

  const toggleSeason = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      seasons: prev.seasons.includes(id)
        ? prev.seasons.filter((s) => s !== id)
        : [...prev.seasons, id],
    }));
    setCurrentPage(1);
  };

  const toggleTag = (id: string) => {
    setFilters((prev) => ({
      ...prev,
      tags: prev.tags.includes(id)
        ? prev.tags.filter((t) => t !== id)
        : [...prev.tags, id],
    }));
    setCurrentPage(1);
  };

  const setColorFilter = (values: string[]) => {
    setFilters((prev) => ({
      ...prev,
      colors: values,
    }));
    setCurrentPage(1);
  };

  const setMinPrice = (value: number) => {
    setFilters((prev) => ({
      ...prev,
      minPrice: value,
    }));
    setCurrentPage(1);
  };

  const setMaxPrice = (value: number) => {
    setFilters((prev) => ({
      ...prev,
      maxPrice: value,
    }));
    setCurrentPage(1);
  };

  const toggleInStock = () => {
    setFilters((prev) => ({ ...prev, inStockOnly: !prev.inStockOnly }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setFilters({
      categories: [],
      colors: [],
      materials: [],
      patterns: [],
      seasons: [],
      tags: [],
      minPrice: 0,
      maxPrice: 100000,
      inStockOnly: false,
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

      {/* Colors - 2nd */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "اللون" : "Color"}</FilterLabel>
        <ColorDropdown
          selected={filters.colors}
          onChange={setColorFilter}
          isAr={isAr}
        />
      </div>

      {/* Materials - 3rd */}
      {materials.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "الخامة" : "Material"}
          count={filters.materials.length}
        >
          <div className="flex flex-col gap-2">
            {materials.map((mat) => (
              <label
                key={mat._id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.materials.includes(mat._id)}
                  onChange={() => toggleMaterial(mat._id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {isAr ? mat.nameAr || mat.name : mat.name}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Patterns - 4th */}
      {patterns.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "النقش" : "Pattern"}
          count={filters.patterns.length}
        >
          <div className="flex flex-col gap-2">
            {patterns.map((pat) => (
              <label
                key={pat._id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.patterns.includes(pat._id)}
                  onChange={() => togglePattern(pat._id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {isAr ? pat.nameAr || pat.name : pat.name}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Seasons - 5th */}
      {seasons.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "الموسم" : "Season"}
          count={filters.seasons.length}
        >
          <div className="flex flex-col gap-2">
            {seasons.map((sea) => (
              <label
                key={sea._id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.seasons.includes(sea._id)}
                  onChange={() => toggleSeason(sea._id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {isAr ? sea.nameAr || sea.name : sea.name}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Tags - 6th */}
      {tags.length > 0 && (
        <CollapsibleFilter
          label={isAr ? "الوسم" : "Tag"}
          count={filters.tags.length}
        >
          <div className="flex flex-col gap-2">
            {tags.map((tag) => (
              <label
                key={tag._id}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <CustomCheckbox
                  checked={filters.tags.includes(tag._id)}
                  onChange={() => toggleTag(tag._id)}
                />
                <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                  {isAr ? tag.nameAr || tag.name : tag.name}
                </span>
              </label>
            ))}
          </div>
        </CollapsibleFilter>
      )}

      {/* Price Range - 7th */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "نطاق السعر" : "Price Range"}</FilterLabel>
        <PriceRangeSlider
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
        />
      </div>

      {/* Availability - 8th (last) */}
      <div className="border-b border-[#E4E0D8] pb-4">
        <FilterLabel>{isAr ? "التوفر" : "Availability"}</FilterLabel>
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

      {/* Clear */}
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
    <FadeInSection>
      <div className="min-h-screen bg-[#FDFAF5]">
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
              {isAr ? "الأقمشة" : "Fabrics"}
            </h1>
            <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] leading-normal xs:leading-[1.6] text-[#7A7A72] max-w-2xl">
              {isAr
                ? "تصفح مجموعتنا الحصرية من الأقمشة الفاخرة."
                : "Explore our exclusive collection of luxury fabrics."}
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="sticky top-16 z-30 bg-[#FDFAF5] border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
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
                    {filters.categories.map((cat) => (
                      <span
                        key={cat}
                        className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                      >
                        {cat}
                        <button
                          onClick={() => toggleCategory(cat)}
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
                    {filters.colors.map((color) => {
                      const colorObj = colorOptions.find(
                        (c) => c.value === color,
                      );
                      return (
                        <span
                          key={color}
                          className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full"
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-white/30"
                            style={{
                              backgroundColor: colorObj?.bg || "#000",
                            }}
                          />
                          {color}
                          <button
                            onClick={() => {
                              setFilters((prev) => ({
                                ...prev,
                                colors: prev.colors.filter((c) => c !== color),
                              }));
                              setCurrentPage(1);
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
                      );
                    })}
                    {(filters.minPrice > 0 || filters.maxPrice < 100000) && (
                      <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                        AED {filters.minPrice.toLocaleString()} - AED{" "}
                        {filters.maxPrice.toLocaleString()}
                        <button
                          onClick={() => {
                            setMinPrice(0);
                            setMaxPrice(100000);
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
                    {filters.inStockOnly && (
                      <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                        {isAr ? "في المخزن" : "In Stock"}
                        <button
                          onClick={toggleInStock}
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
                    ? `عرض ${startIndex + 1}-${Math.min(startIndex + fabricsPerPage, filteredFabrics.length)} من ${filteredFabrics.length} منتج`
                    : `Showing ${startIndex + 1}-${Math.min(startIndex + fabricsPerPage, filteredFabrics.length)} of ${filteredFabrics.length} products`}
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

        {/* Mobile Filters Drawer */}
        {mobileFiltersOpen && (
          <div className="lg:hidden border-b border-[#E4E0D8] bg-[#FDFAF5] px-4 sm:px-8 lg:px-12 py-8 overflow-hidden">
            {sidebarContent}
          </div>
        )}

        {/* Main Content */}
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
              <div className="flex items-center justify-center py-28">
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-[#7A7A72]">
                  {isAr ? "جاري تحميل الأقمشة..." : "Loading fabrics..."}
                </p>
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center text-center py-28">
                <h3 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                  {isAr ? "تعذر تحميل المنتجات" : "Unable to Load Products"}
                </h3>
                <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed">
                  {fetchError}
                </p>
              </div>
            ) : filteredFabrics.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-28">
                <SearchOffIcon />
                <h3 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                  {isAr ? "لم يتم العثور على أي منتج" : "No Products Found"}
                </h3>
                <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed mb-8">
                  {isAr
                    ? "حاول ضبط الفلاتر أو شروط البحث للعثور على ما تبحث عنه."
                    : "Try adjusting your filters or search terms to find what you're looking for."}
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
                  {paginatedFabrics.map((fabric) => {
                    const { title, description } = getFabricDisplayFields(
                      fabric,
                      locale,
                    );
                    const image = resolveFabricImage(
                      fabric.images ?? undefined,
                    );
                    const material = fabric.material
                      ? formatMaterialLabel(fabric.material, locale)
                      : null;
                    const price = fabric.pricePerMeter ?? 0;

                    return (
                      <div
                        key={fabric._id}
                        className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-500 flex flex-col h-full"
                      >
                        <div className="p-4 flex flex-col grow text-left">
                          <Link
                            href={`/fabrics/${fabric.slug}`}
                            className="block relative overflow-hidden mb-4 aspect-4/5 bg-[#F5F5F0] rounded-lg"
                          >
                            <img
                              src={image}
                              alt={title}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />

                            <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                            <button
                              type="button"
                              aria-label={isAr ? "مشاركة" : "Share"}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await handleShare(`/fabrics/${fabric.slug}`);
                              }}
                              className="absolute top-2 xs:top-3 right-2 z-20 p-2 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Share2 className="w-4 h-4 text-black" />
                            </button>
                          </Link>

                          <Link
                            href={`/fabrics/${fabric.slug}`}
                            className="block hover:opacity-75 transition-opacity"
                          >
                            <h3 className="[font-family:var(--font-display)] text-[16px] sm:text-[18px] font-normal leading-relaxed tracking-tight text-black mb-1 line-clamp-2">
                              {title}
                            </h3>
                          </Link>

                          <span className="[font-family:var(--font-ui)] text-[14px] sm:text-[15px] tracking-[0.08em] text-black font-normal mb-1">
                            AED {price.toFixed(2)}
                          </span>

                          {/* Color swatches */}
                          <div className="flex items-center gap-1.5 my-2 flex-wrap">
                            {fabric.color && Array.isArray(fabric.color) ? (
                              fabric.color.slice(0, 4).map((color, index) => {
                                const colorObj = colorOptions.find(
                                  (c) =>
                                    c.value.toLowerCase() ===
                                    color.toLowerCase(),
                                );
                                return (
                                  <span
                                    key={index}
                                    className="w-5 h-5 rounded-full border border-[#E4E0D8]"
                                    style={{
                                      backgroundColor:
                                        colorObj?.bg || "#CCCCCC",
                                    }}
                                    title={color}
                                  />
                                );
                              })
                            ) : (
                              <span className="text-[10px] text-[#8A8A80] font-mono">
                                {isAr ? "بدون لون" : "No color"}
                              </span>
                            )}
                            {fabric.color &&
                              Array.isArray(fabric.color) &&
                              fabric.color.length > 4 && (
                                <span className="text-[9px] text-[#8A8A80] font-mono">
                                  +{fabric.color.length - 4}
                                </span>
                              )}
                          </div>

                          {material && (
                            <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.24em] text-[#8A8A80] mb-2 font-normal">
                              {isAr ? "المادة: " : "MATERIAL: "}
                              {material.toUpperCase()}
                            </p>
                          )}

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
  );
}
