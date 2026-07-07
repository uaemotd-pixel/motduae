"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import {
  FABRIC_FILTER_OPTIONS,
  type FabricListItem,
  formatMaterialLabel,
  getFabricDisplayFields,
  resolveFabricImage,
} from "@/lib/fabrics";

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
  minPrice: number;
  maxPrice: number;
  inStockOnly: boolean;
}

// ─── Search-off SVG ───────────────────────────────────────────────────────────
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

// ─── Checkbox component ──────────────────────────────────────────────────────
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

// ─── Section label ────────────────────────────────────────────────────────────
const FilterLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] tracking-[0.22em] font-normal text-black uppercase mb-3 pb-2.5 border-b border-[#E4E0D8] w-full">
    {children}
  </p>
);

// ─── Color Dropdown with Checkboxes ──────────────────────────────────────────
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
        className="w-full border border-[#E4E0D8] bg-transparent px-4 py-3 text-[11px] tracking-[0.14em] uppercase font-mono flex items-center justify-between hover:border-black transition"
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
            className="w-full px-4 py-2.5 text-left text-[11px] tracking-[0.14em] uppercase hover:bg-[#EDE8E0] transition"
          >
            {isAr ? "إلغاء الكل" : "Clear All"}
          </button>
          {filtered.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleColor(c.value)}
              className={`w-full px-4 py-2.5 text-left text-[11px] tracking-[0.14em] flex items-center gap-3 hover:bg-[#EDE8E0] transition ${
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

// ─── Price Range Slider ──────────────────────────────────────────────────────
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
  isAr: boolean;
}) => {
  const [localMin, setLocalMin] = useState(String(minPrice));
  const [localMax, setLocalMax] = useState(String(maxPrice));
  const minTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalMin(String(minPrice));
  }, [minPrice]);

  useEffect(() => {
    setLocalMax(String(maxPrice));
  }, [maxPrice]);

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
    const clamped = Math.min(Math.max(0, parsed), Number.isNaN(maxVal) ? 100000 : maxVal, 100000);
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

// ─── Pagination Component ─────────────────────────────────────────────────────
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

export default function FabricsCatalogPage() {
  const colorMap: Record<string, string> = {
    red: "#EF4444",
    blue: "#3B82F6",
    green: "#22C55E",
    black: "#000000",
    white: "#FFFFFF",
    gold: "#F59E0B",
    silver: "#9CA3AF",
    ivory: "#F5F0E8",
    sand: "#E8E4DC",
    pink: "#B76E79",
    copper: "#B87333",
    gray: "#708090",
  };

  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [mounted, setMounted] = useState(false);
  const [fabrics, setFabrics] = useState<FabricListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("newest");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    colors: [],
    minPrice: 0,
    maxPrice: 100000,
    inStockOnly: false,
  });

  const fabricsPerPage = 12;

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    fabrics.forEach((item) => {
      const material = item.material || "Other";
      counts.set(material, (counts.get(material) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([category, count]) => ({
      id: category,
      label: category.toUpperCase(),
      count,
    }));
  }, [fabrics]);

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
    const category = item.material || "Other";
    if (filters.categories.length > 0) {
      if (!filters.categories.includes(category)) {
        return false;
      }
    }
    if (!matchesColorFilter(item.color, filters.colors)) return false;

    const price = item.pricePerMeter ?? 0;
    if (price < filters.minPrice || price > filters.maxPrice) {
      return false;
    }

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
    <div className="flex flex-col gap-8">
      {/* Category */}
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

      {/* Color - Dropdown with Checkboxes */}
      <div>
        <FilterLabel>{isAr ? "اللون" : "Color"}</FilterLabel>
        <ColorDropdown
          selected={filters.colors}
          onChange={setColorFilter}
          isAr={isAr}
        />
      </div>

      {/* Price Range - Slider */}
      <div>
        <FilterLabel>{isAr ? "نطاق السعر" : "Price Range"}</FilterLabel>
        <PriceRangeSlider
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onMinChange={setMinPrice}
          onMaxChange={setMaxPrice}
          isAr={isAr}
        />
      </div>

      {/* Availability */}
      <div>
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
          className="w-full py-3 px-4 border border-black text-[10px] tracking-[0.2em] uppercase font-normal transition-all duration-200 hover:bg-black hover:text-white"
        >
          {isAr ? "مسح جميع الفلاتر" : "Clear All Filters"}
        </button>
      )}
    </div>
  );

  return (
    <>
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
                            onClick={() => setColorFilter([])}
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
                    {filters.inStockOnly && (
                      <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                        {isAr ? "في المخزن" : "In Stock"}
                        <button
                          onClick={toggleInStock}
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
            className="hidden lg:block w-80 shrink-0 border-r border-[#E4E0D8] p-8 h-screen sticky top-34 overflow-y-auto"
          >
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
                  className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition-colors duration-200 rounded-full"
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
                    // resolveFabricImage expects an image source (string | string[] | undefined)
                    // pass the fabric.image field (or undefined) instead of the whole fabric object
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
    </>
  );
}
