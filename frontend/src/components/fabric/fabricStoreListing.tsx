"use client";

import { useMemo, useState, useEffect } from "react";
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
    { name: "Pearl Ivory", value: "ivory", bg: "#F5F0E8" },
    { name: "Desert Sand", value: "sand", bg: "#E8E4DC" },
    { name: "Midnight Oil", value: "black", bg: "#1A1A18" },
    { name: "Royal Gold", value: "gold", bg: "#C9A96E" },
    { name: "Crimson", value: "red", bg: "#DC143C" },
    { name: "Sapphire", value: "blue", bg: "#0F52BA" },
    { name: "Emerald", value: "green", bg: "#50C878" },
    { name: "Platinum", value: "silver", bg: "#E5E4E2" },
    { name: "Rose Gold", value: "pink", bg: "#B76E79" },
    { name: "Copper", value: "copper", bg: "#B87333" },
    { name: "Slate", value: "gray", bg: "#708090" },
];


const priceRanges = [
    { id: "under-500", label: "UNDER AED 500", min: 0, max: 500 },
    { id: "500-1000", label: "AED 500 – 1,000", min: 500, max: 1000 },
    { id: "1000-1500", label: "AED 1,000 – 1,500", min: 1000, max: 1500 },
    { id: "above-1500", label: "ABOVE AED 1,500", min: 1500, max: Infinity },
];

interface FilterState {
    categories: string[];
    colors: string[];
    priceRange: string | null;
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M3 3l18 18M10 5a5 5 0 014.9 6.02M6.34 6.34A5 5 0 0010 15a5 5 0 003.66-1.59" />
    </svg>
);

// ─── Checkbox component ──────────────────────────────────────────────────────
const CustomCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
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
            <svg
                className="w-2.5 h-2.5 text-white"
                viewBox="0 0 10 8"
                fill="none"
            >
                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        )}
    </button>
);

// ─── Radio component ─────────────────────────────────────────────────────────
const CustomRadio = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
    <button
        type="button"
        role="radio"
        aria-checked={checked}
        onClick={onChange}
        className={`
      w-4 h-4 shrink-0 rounded-full border transition-all duration-150 flex items-center justify-center
      ${checked ? "border-black" : "border-[#C8C4BC] hover:border-black"}
    `}
    >
        {checked && (
            <span className="w-2 h-2 rounded-full bg-black block" />
        )}
    </button>
);

// ─── Section label ────────────────────────────────────────────────────────────
const FilterLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] tracking-[0.22em] font-normal text-black uppercase mb-3 pb-2.5 border-b border-[#E4E0D8] w-full">
        {children}
    </p>
);

// ─── Pagination Component ─────────────────────────────────────────────────────
const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center justify-center gap-2 mt-12 pt-8 border-t border-[#E4E0D8]">
            {/* Previous Button */}
            <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="group relative w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4E0D8] bg-white text-black disabled:opacity-40 disabled:cursor-not-allowed hover:border-black hover:bg-black hover:text-white transition-all duration-200"
                aria-label="Previous page"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
            </button>

            {/* Page Numbers */}
            {getPageNumbers().map((page, index) => (
                <button
                    key={index}
                    onClick={() => typeof page === 'number' && onPageChange(page)}
                    disabled={page === '...'}
                    className={`
                        min-w-10 h-10 px-2 flex items-center justify-center rounded-lg font-mono text-[13px] tracking-wide
                        transition-all duration-200
                        ${page === currentPage
                            ? 'bg-black text-white border-black'
                            : page === '...'
                                ? 'border-transparent cursor-default text-[#8A8A80]'
                                : 'border border-[#E4E0D8] bg-white text-black hover:border-black hover:bg-black hover:text-white'
                        }
                    `}
                >
                    {page}
                </button>
            ))}

            {/* Next Button */}
            <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="group relative w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4E0D8] bg-white text-black disabled:opacity-40 disabled:cursor-not-allowed hover:border-black hover:bg-black hover:text-white transition-all duration-200"
                aria-label="Next page"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
            </button>
        </div>
    );
};

export default function FabricStorePage() {
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";
    const [mounted, setMounted] = useState(false);
    const [fabrics, setFabrics] = useState<FabricListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredProduct, setHoveredProduct] = useState<string | null>(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [quickViewProduct, setQuickViewProduct] = useState<FabricListItem | null>(null);
    const [sortBy, setSortBy] = useState("newest");
    const [filters, setFilters] = useState<FilterState>({
        categories: [],
        colors: [],
        priceRange: null,
        inStockOnly: false,
    });
    const router = useRouter();

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        const fetchFabrics = async () => {
            try {
                setLoading(true);
                setFetchError(null);

                const data = await api.get<{ success: boolean; items: FabricListItem[] }>(
                    "/api/fabrics?limit=100",
                );

                if (!data?.success) {
                    throw new Error("Failed to load fabrics");
                }

                setFabrics(data.items || []);
            } catch (err: unknown) {
                const message =
                    (err as ApiError)?.message ||
                    (err instanceof Error ? err.message : "Failed to load fabrics");
                setFetchError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchFabrics();
    }, []);

    const categoryOptions = useMemo(() => {
        const counts = new Map<string, number>();
        for (const fabric of fabrics) {
            counts.set(fabric.material, (counts.get(fabric.material) || 0) + 1);
        }

        return FABRIC_FILTER_OPTIONS.map((material) => ({
            id: material,
            label: formatMaterialLabel(material, locale).toUpperCase(),
            count: counts.get(material) || 0,
        })).filter((category) => category.count > 0);
    }, [fabrics, locale]);

    const productsPerPage = 12;

    const matchesColorFilter = (fabricColor: string[] | string | undefined, selectedColors: string[]) => {
        if (selectedColors.length === 0) return true;
        if (!fabricColor) return false;
        const colorsArray = Array.isArray(fabricColor) ? fabricColor : [fabricColor];
        return colorsArray.some((col) => {
            const normalized = col.toLowerCase();
            return selectedColors.some(
                (value) => normalized.includes(value) || value.includes(normalized),
            );
        });
    };

    // ── Filtering and Sorting ─────────────────────────────────────────────────────────────
    let filteredProducts = fabrics.filter((fabric) => {
        if (filters.categories.length > 0 && !filters.categories.includes(fabric.material)) {
            return false;
        }
        if (!matchesColorFilter(fabric.color, filters.colors)) return false;
        if (filters.priceRange) {
            const range = priceRanges.find((r) => r.id === filters.priceRange);
            if (range && (fabric.pricePerMeter < range.min || fabric.pricePerMeter > range.max)) {
                return false;
            }
        }
        return true;
    });

    // Sorting
    switch (sortBy) {
        case "price-low":
            filteredProducts.sort((a, b) => a.pricePerMeter - b.pricePerMeter);
            break;
        case "price-high":
            filteredProducts.sort((a, b) => b.pricePerMeter - a.pricePerMeter);
            break;
        case "newest":
        default:
            filteredProducts = [...filteredProducts];
            break;
    }

    const totalPages = Math.ceil(filteredProducts.length / productsPerPage);
    const startIndex = (currentPage - 1) * productsPerPage;
    const paginatedProducts = filteredProducts.slice(startIndex, startIndex + productsPerPage);
    const hasActiveFilters = filters.categories.length > 0 || filters.colors.length > 0 || filters.priceRange !== null || filters.inStockOnly;

    const toggleCategory = (id: string) => {
        setFilters(prev => ({ ...prev, categories: prev.categories.includes(id) ? prev.categories.filter(c => c !== id) : [...prev.categories, id] }));
        setCurrentPage(1);
    };
    const toggleColor = (val: string) => {
        setFilters(prev => ({ ...prev, colors: prev.colors.includes(val) ? prev.colors.filter(c => c !== val) : [...prev.colors, val] }));
        setCurrentPage(1);
    };
    const setPriceRange = (id: string) => {
        setFilters(prev => ({ ...prev, priceRange: prev.priceRange === id ? null : id }));
        setCurrentPage(1);
    };
    const toggleInStock = () => {
        setFilters(prev => ({ ...prev, inStockOnly: !prev.inStockOnly }));
        setCurrentPage(1);
    };
    const clearAllFilters = () => {
        setFilters({ categories: [], colors: [], priceRange: null, inStockOnly: false });
        setCurrentPage(1);
    };
    const handlePageChange = (value: number) => {
        setCurrentPage(value);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    if (!mounted) return null;

    // ── Sidebar content ───────────────────────────────────────────────────────
    const SidebarContent = () => (
        <div className="flex flex-col gap-8">
            {/* Category */}
            <div>
                <FilterLabel>Category</FilterLabel>
                <div className="flex flex-col gap-3">
                    {categoryOptions.map(cat => (
                        <label
                            key={cat.id}
                            className="flex items-center gap-3 cursor-pointer group"
                        >
                            <CustomCheckbox checked={filters.categories.includes(cat.id)} onChange={() => toggleCategory(cat.id)} />
                            <span className="flex-1 text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                                {cat.label}
                            </span>
                            <span className="text-[10px] text-[#8A8A80] font-mono">({cat.count})</span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Color */}
            <div>
                <FilterLabel>Color Palette</FilterLabel>
                <div className="flex flex-wrap gap-3">
                    {colorOptions.map(c => (
                        <button
                            key={c.value}
                            type="button"
                            title={c.name}
                            onClick={() => toggleColor(c.value)}
                            className="group relative w-8 h-8 rounded-full transition-transform duration-200 hover:scale-110"
                            style={{
                                backgroundColor: c.bg,
                                boxShadow: filters.colors.includes(c.value)
                                    ? "0 0 0 2px #000, 0 0 0 4px rgba(0,0,0,0.12)"
                                    : "0 0 0 1px #D4D0C8",
                            }}
                        >
                            {filters.colors.includes(c.value) && (
                                <span className="absolute inset-0 flex items-center justify-center">
                                    <svg className="w-3 h-3" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4l3 3 5-6" stroke={c.value === "ivory" || c.value === "sand" ? "#000" : "#fff"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Price Range */}
            <div>
                <FilterLabel>Price Range</FilterLabel>
                <div className="flex flex-col gap-3">
                    {priceRanges.map(r => (
                        <label
                            key={r.id}
                            className="flex items-center gap-3 cursor-pointer group"
                        >
                            <CustomRadio checked={filters.priceRange === r.id} onChange={() => setPriceRange(r.id)} />
                            <span className="text-[11px] tracking-[0.14em] uppercase font-mono text-black group-hover:opacity-60 transition-opacity">
                                {r.label}
                            </span>
                        </label>
                    ))}
                </div>
            </div>

            {/* Availability */}
            <div>
                <FilterLabel>Availability</FilterLabel>
                <label className="flex items-center gap-3 cursor-pointer group">
                    <CustomCheckbox checked={filters.inStockOnly} onChange={toggleInStock} />
                    <span className="text-[11px] tracking-[0.14em] uppercase text-black group-hover:opacity-60 transition-opacity">
                        In Stock Only
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
                    Clear All Filters
                </button>
            )}
        </div>
    );

    return (
        <div className="min-h-screen bg-[#FDFAF5]">

            {/* ── Hero Section - Full Width, Text Left ────────────────────────────────────── */}
            <div className="py-12 sm:py-16 lg:py-24 border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
                <div className="w-full text-left">
                    <div className="mb-4 xs:mb-6">
                        <div className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.28em] text-[#7A7A72] flex items-center justify-start gap-2 xs:gap-3">
                            <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                            <span>Discover the Collection</span>
                            <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                        </div>
                    </div>
                    <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black mb-3 xs:mb-4">
                        Mukhawar Fabrics
                    </h1>
                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] leading-normal xs:leading-[1.6] text-[#7A7A72] max-w-2xl">
                        Exquisite traditional craftsmanship met with contemporary minimalism.
                        Explore our curated selection of high-end fabrics tailored in the GCC.
                    </p>
                </div>
            </div>

            {/* ── Modern Filter Bar - Full Width ────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-[#FDFAF5] border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
                <div className="py-4">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                                className="hidden lg:flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase hover:text-black/60 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                Filters
                                {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-black" />}
                            </button>

                            {hasActiveFilters && (
                                <div className="flex items-center gap-2 flex-wrap">
                                    {filters.categories.map(cat => (
                                        <span key={cat} className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                                            {cat}
                                            <button onClick={() => toggleCategory(cat)} className="hover:opacity-70 flex items-center justify-center hover:cursor-pointer">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                    {filters.colors.map(color => (
                                        <span key={color} className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                                            {color}
                                            <button onClick={() => toggleColor(color)} className="hover:opacity-70 flex items-center justify-center hover:cursor-pointer">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    ))}
                                    {filters.priceRange && (
                                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                                            {priceRanges.find(r => r.id === filters.priceRange)?.label}
                                            <button onClick={() => filters.priceRange && setPriceRange(filters.priceRange)} className="hover:opacity-70 flex items-center justify-center">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}
                                    {filters.inStockOnly && (
                                        <span className="text-[10px] tracking-[0.14em] uppercase bg-black text-white px-3 py-1.5 flex items-center gap-2 rounded-full">
                                            In Stock
                                            <button onClick={toggleInStock} className="hover:opacity-70 flex items-center justify-center">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-6">
                            <span className="text-[11px] tracking-[0.18em] uppercase text-[#7A7A72] font-mono">
                                Showing {startIndex + 1}-{Math.min(startIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                            </span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="bg-transparent text-[11px] tracking-[0.18em] uppercase font-mono focus:outline-none cursor-pointer"
                            >
                                <option value="newest">Newest</option>
                                <option value="price-low">Price: Low to High</option>
                                <option value="price-high">Price: High to Low</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Mobile Filters Drawer ─────────────────────────────────────────── */}
            {mobileFiltersOpen && (
                <div className="lg:hidden border-b border-[#E4E0D8] bg-[#FDFAF5] px-4 sm:px-8 lg:px-12 py-8 overflow-hidden">
                    <SidebarContent />
                </div>
            )}

            {/* ── Main Content Area - Full Width ──────────────────────────────────── */}
            <div className="flex flex-col lg:flex-row min-h-screen relative">
                <aside className={`hidden lg:block w-80 shrink-0 border-r border-[#E4E0D8] p-8 h-screen sticky top-18.25 overflow-y-auto ${mobileFiltersOpen ? 'block' : 'hidden'}`}>
                    <SidebarContent />
                </aside>

                <div className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8">
                    {loading ? (
                        <div className="flex items-center justify-center py-28">
                            <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-[#7A7A72]">
                                Loading fabrics...
                            </p>
                        </div>
                    ) : fetchError ? (
                        <div className="flex flex-col items-center justify-center text-center py-28">
                            <h3 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                                Unable to Load Fabrics
                            </h3>
                            <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed">
                                {fetchError}
                            </p>
                        </div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center py-28">
                            <SearchOffIcon />
                            <h3 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">No Fabrics Found</h3>
                            <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed mb-8">
                                Try adjusting your filters or search terms to find what you're looking for.
                            </p>
                            <button
                                onClick={clearAllFilters}
                                className="px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition-colors duration-200 rounded-full hover:cursor-pointer"
                            >
                                Clear All Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                {paginatedProducts.map((product) => {
                                    const { title } = getFabricDisplayFields(product, locale);
                                    const imageUrl = resolveFabricImage(product.images?.[0]);
                                    const materialLabel = formatMaterialLabel(product.material, locale);

                                    return (
                                    <div
                                        key={product._id}
                                        className="group"
                                        onMouseEnter={() => setHoveredProduct(product._id)}
                                        onMouseLeave={() => setHoveredProduct(null)}
                                    >
                                        <div className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500">
                                            {product.pricePerMeter > 500 && (
                                                <span className="absolute top-4 left-4 z-10 bg-[#8B6F47] text-white px-2.5 xs:px-3 py-1 xs:py-1.25 text-[10px] xs:text-[12px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-bold">
                                                    Premium
                                                </span>
                                            )}

                                            <div className="p-4 text-left">
                                                <Link href={`/fabrics/${product.slug}`} className="block">
                                                    <div className="relative overflow-hidden mb-4 aspect-square bg-[#F0EBE3] rounded-sm">
                                                        <img
                                                            src={imageUrl}
                                                            alt={title}
                                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                                        />
                                                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                                    </div>
                                                    <h3 className="[font-family:var(--font-display)] text-xs xs:text-sm sm:text-base font-normal leading-relaxed tracking-tight text-black mb-1 line-clamp-2">
                                                        {title}
                                                    </h3>
                                                </Link>

                                                <div className="flex justify-start gap-2 mb-3">
                                                    <span className="[font-family:var(--font-ui)] text-[8px] tracking-[0.12em] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                        {materialLabel}
                                                    </span>
                                                    {product.color && (
                                                        <span className="[font-family:var(--font-ui)] text-[8px] tracking-[0.12em] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                            {product.color}
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="border-t border-[#E4E0D8] my-3"></div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-md font-normal text-black">
                                                            AED {product.pricePerMeter.toLocaleString()}/m
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-red-600 transition-colors hover:cursor-pointer"
                                                            aria-label="Add to wishlist"
                                                            title="Add to Wishlist"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-black transition-colors hover:cursor-pointer"
                                                            aria-label="Quick view"
                                                            title="Add to Cart"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 15v6" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setQuickViewProduct(product)}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-black transition-colors hover:cursor-pointer"
                                                            aria-label="Quick view"
                                                            title="Quick View"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                                                />
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                                                />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                            </div>

                            {/* Beautiful Pagination Component */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* ── Quick View Modal ───────────────────────────────────────────────── */}
            {quickViewProduct && (
                <>
                    <div onClick={() => setQuickViewProduct(null)} className="fixed inset-0 bg-black/50 z-50" />
                    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-2xl bg-[#FDFAF5] border border-[#E4E0D8] rounded-2xl z-50 p-8 max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 hover:opacity-50 transition-opacity flex items-center justify-center hover:cursor-pointer">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="aspect-square bg-[#F0EBE3] rounded-2xl overflow-hidden">
                                <img
                                    src={resolveFabricImage(quickViewProduct.images?.[0])}
                                    alt={getFabricDisplayFields(quickViewProduct, locale).title}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <div>
                                <h2 className="[font-family:var(--font-display)] text-2xl mb-2">
                                    {getFabricDisplayFields(quickViewProduct, locale).title}
                                </h2>
                                <p className="text-[11px] tracking-[0.16em] uppercase text-[#8A8A80] [font-family:var(--font--ui)] mb-4">
                                    {formatMaterialLabel(quickViewProduct.material, locale)}
                                </p>
                                <p className="text-[16px] [font-family:var(--font-body)] mb-4">
                                    AED {quickViewProduct.pricePerMeter.toLocaleString()}/m
                                </p>
                                <p className="text-[13px] text-[#6A6A62] leading-relaxed mb-4 [font-family:var(--font-body)]">
                                    {getFabricDisplayFields(quickViewProduct, locale).description}
                                </p>
                                <div className="space-y-2 mb-6">
                                    <p>
                                        <span className="text-[10px] tracking-[0.16em] uppercase [font-family:var(--font-body)]">City:</span>{" "}
                                        {quickViewProduct.city || "UAE"}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        router.push(`/fabrics/${quickViewProduct.slug}`);
                                        setQuickViewProduct(null);
                                    }}
                                    className="w-full py-3 bg-black text-white text-[11px] tracking-[0.22em] uppercase rounded-full hover:bg-[#2A2A28] transition-colors hover:cursor-pointer [font-family:var(--font-body)]">
                                    View Details
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}