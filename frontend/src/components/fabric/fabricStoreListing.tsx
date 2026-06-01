"use client";

import { useState, useEffect } from "react";
import * as images from '../../../public/images/ImageIndex';

// Types
interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
    color: string;
    material: string;
    inStock: boolean;
    image: string;
    description: string;
    origin: string;
}

// Mock Products Data - Expanded to show pagination better
const products: Product[] = [
    { id: 1, name: "Royal Gold Damask", price: 1200, category: "silk", color: "gold", material: "Silk Brocade", inStock: true, image: images.fab1.src, description: "Exquisite gold damask silk brocade handcrafted by master artisans", origin: "Dubai, UAE" },
    { id: 2, name: "Midnight Floral", price: 950, category: "velvet", color: "black", material: "Premium Velvet", inStock: true, image: images.fab2.src, description: "Deep midnight floral velvet with subtle shimmer", origin: "Abu Dhabi, UAE" },
    { id: 3, name: "Diamond Geometric", price: 680, category: "cotton", color: "ivory", material: "Washable Cotton", inStock: true, image: images.fab3.src, description: "Contemporary geometric pattern on breathable cotton", origin: "Sharjah, UAE" },
    { id: 4, name: "Golden Peony", price: 1450, category: "embroidered", color: "gold", material: "Embroidered Tulle", inStock: true, image: images.fab4.src, description: "Hand-embroidered peony motifs on fine tulle", origin: "Dubai, UAE" },
    { id: 5, name: "Pearl Lattice", price: 1100, category: "silk", color: "ivory", material: "Silk Jacquard", inStock: true, image: images.fab5.src, description: "Pearlescent lattice pattern on premium silk jacquard", origin: "Ras Al Khaimah, UAE" },
    { id: 6, name: "Charcoal Shadow", price: 980, category: "velvet", color: "black", material: "Luxury Velvet", inStock: true, image: images.fab6.src, description: "Subtle charcoal shadow effect on luxury velvet", origin: "Ajman, UAE" },
    { id: 7, name: "Pristine Twill", price: 550, category: "cotton", color: "ivory", material: "Egyptian Cotton", inStock: true, image: images.fab1.src, description: "Premium Egyptian cotton twill, breathable and refined", origin: "Umm Al Quwain, UAE" },
    { id: 8, name: "Vintage Rose", price: 1320, category: "embroidered", color: "gold", material: "Embroidered Silk", inStock: true, image: images.fab2.src, description: "Romantic vintage rose embroidery on pure silk", origin: "Fujairah, UAE" },
    { id: 9, name: "Opal Damask", price: 1250, category: "silk", color: "ivory", material: "Premium Silk", inStock: true, image: images.fab3.src, description: "Iridescent opal damask pattern on premium silk", origin: "Dubai, UAE" },
    { id: 10, name: "Obsidian Floral", price: 1020, category: "velvet", color: "black", material: "Embossed Velvet", inStock: true, image: images.fab4.src, description: "Dark obsidian floral embossed pattern on velvet", origin: "Abu Dhabi, UAE" },
    { id: 11, name: "Alabaster Maze", price: 620, category: "cotton", color: "ivory", material: "Fine Cotton", inStock: true, image: images.fab4.src, description: "Intricate maze pattern on fine alabaster cotton", origin: "Sharjah, UAE" },
    { id: 12, name: "Gilded Flora", price: 1580, category: "embroidered", color: "gold", material: "Hand-Stitched Silk", inStock: true, image: images.fab6.src, description: "Luxurious hand-stitched gilded floral motifs", origin: "Dubai, UAE" },
    { id: 13, name: "Crimson Velvet", price: 890, category: "velvet", color: "red", material: "Premium Velvet", inStock: true, image: images.fab1.src, description: "Rich crimson velvet for luxurious draping", origin: "Dubai, UAE" },
    { id: 14, name: "Sapphire Silk", price: 1350, category: "silk", color: "blue", material: "Pure Silk", inStock: true, image: images.fab2.src, description: "Deep sapphire blue silk with subtle sheen", origin: "Abu Dhabi, UAE" },
    { id: 15, name: "Emerald Linen", price: 720, category: "linen", color: "green", material: "Pure Linen", inStock: true, image: images.fab3.src, description: "Natural emerald green linen for summer", origin: "Sharjah, UAE" },
    { id: 16, name: "Amber Brocade", price: 1480, category: "embroidered", color: "gold", material: "Silk Brocade", inStock: true, image: images.fab4.src, description: "Amber and gold brocade with intricate patterns", origin: "Dubai, UAE" },
    { id: 17, name: "Platinum Jacquard", price: 1650, category: "silk", color: "silver", material: "Silk Jacquard", inStock: true, image: images.fab5.src, description: "Platinum silver jacquard with geometric patterns", origin: "Dubai, UAE" },
    { id: 18, name: "Rose Gold Chiffon", price: 980, category: "chiffon", color: "pink", material: "Silk Chiffon", inStock: true, image: images.fab6.src, description: "Delicate rose gold chiffon for evening wear", origin: "Abu Dhabi, UAE" },
    { id: 19, name: "Midnight Tweed", price: 850, category: "wool", color: "black", material: "Wool Tweed", inStock: true, image: images.fab1.src, description: "Classic midnight tweed for tailoring", origin: "Dubai, UAE" },
    { id: 20, name: "Pearl Satin", price: 1120, category: "silk", color: "ivory", material: "Silk Satin", inStock: true, image: images.fab2.src, description: "Lustrous pearl satin for bridal wear", origin: "Sharjah, UAE" },
    { id: 21, name: "Copper Organza", price: 780, category: "organza", color: "copper", material: "Silk Organza", inStock: true, image: images.fab3.src, description: "Crisp copper organza for structural designs", origin: "Ajman, UAE" },
    { id: 22, name: "Slate Crepe", price: 920, category: "crepe", color: "gray", material: "Silk Crepe", inStock: true, image: images.fab4.src, description: "Fluid slate crepe for elegant draping", origin: "Dubai, UAE" },
    { id: 23, name: "Ivory Lace", price: 1750, category: "lace", color: "ivory", material: "French Lace", inStock: true, image: images.fab5.src, description: "Exquisite French lace with floral motifs", origin: "Dubai, UAE" },
    { id: 24, name: "Charcoal Flannel", price: 690, category: "wool", color: "gray", material: "Wool Flannel", inStock: true, image: images.fab6.src, description: "Soft charcoal flannel for suiting", origin: "Ras Al Khaimah, UAE" },
];

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

const categoryOptions = [
    { id: "silk", label: "PURE SILK", count: 6 },
    { id: "velvet", label: "VELVET", count: 3 },
    { id: "cotton", label: "COTTON", count: 3 },
    { id: "embroidered", label: "HAUTE EMBROIDERY", count: 3 },
    { id: "linen", label: "LINEN", count: 1 },
    { id: "chiffon", label: "CHIFFON", count: 1 },
    { id: "wool", label: "WOOL", count: 2 },
    { id: "organza", label: "ORGANZA", count: 1 },
    { id: "crepe", label: "CREPE", count: 1 },
    { id: "lace", label: "LACE", count: 1 },
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
    const [mounted, setMounted] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);
    const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
    const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
    const [sortBy, setSortBy] = useState("newest");
    const [filters, setFilters] = useState<FilterState>({
        categories: [],
        colors: [],
        priceRange: null,
        inStockOnly: false,
    });

    useEffect(() => {
        setMounted(true);
    }, []);

    const productsPerPage = 12;

    // ── Filtering and Sorting ─────────────────────────────────────────────────────────────
    let filteredProducts = products.filter(p => {
        if (filters.categories.length > 0 && !filters.categories.includes(p.category)) return false;
        if (filters.colors.length > 0 && !filters.colors.includes(p.color)) return false;
        if (filters.priceRange) {
            const range = priceRanges.find(r => r.id === filters.priceRange);
            if (range && (p.price < range.min || p.price > range.max)) return false;
        }
        if (filters.inStockOnly && !p.inStock) return false;
        return true;
    });

    // Sorting
    switch (sortBy) {
        case "price-low":
            filteredProducts.sort((a, b) => a.price - b.price);
            break;
        case "price-high":
            filteredProducts.sort((a, b) => b.price - a.price);
            break;
        case "newest":
        default:
            // Assuming higher ID means newer for demo
            filteredProducts.sort((a, b) => b.id - a.id);
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
                    {filteredProducts.length === 0 ? (
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
                                {paginatedProducts.map((product) => (
                                    <div
                                        key={product.id}
                                        className="group"
                                        onMouseEnter={() => setHoveredProduct(product.id)}
                                        onMouseLeave={() => setHoveredProduct(null)}
                                    >
                                        <div className="relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300">
                                            {product.price > 1500 && (
                                                <span className="absolute top-4 left-4 z-10 bg-black text-white text-[8px] tracking-[0.16em] uppercase px-2.5 py-1 rounded-full">
                                                    Premium
                                                </span>
                                            )}

                                            <div className="p-4 text-left">
                                                <a href="#" className="block">
                                                    <img
                                                        src={product.image}
                                                        alt={product.name}
                                                        className="w-full h-48 object-cover mb-4 transition-transform duration-300 group-hover:scale-105"
                                                    />
                                                    <h3 className="font-display text-xs xs:text-sm sm:text-base font-normal leading-relaxed tracking-tight text-black mb-1 line-clamp-2">
                                                        {product.name}
                                                    </h3>
                                                </a>

                                                <div className="flex justify-start gap-2 mb-3">
                                                    <span className="text-[8px] tracking-[0.12em] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                        {product.category}
                                                    </span>
                                                    <span className="text-[8px] tracking-[0.12em] uppercase bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                                        {product.material.split(' ')[0]}
                                                    </span>
                                                </div>

                                                <div className="border-t border-[#E4E0D8] my-3"></div>

                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-md font-normal text-black">
                                                            AED {product.price.toLocaleString()}
                                                        </span>
                                                        {product.price > 1500 && (
                                                            <span className="text-xs text-gray-400 line-through">
                                                                AED {(product.price * 1.2).toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => setQuickViewProduct(product)}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-red-600 transition-colors hover:cursor-pointer"
                                                            aria-label="Add to wishlist"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                            </svg>
                                                        </button>
                                                        <button
                                                            onClick={() => setQuickViewProduct(product)}
                                                            className="w-8 h-8 rounded-full flex items-center justify-center hover:text-black transition-colors hover:cursor-pointer"
                                                            aria-label="Quick view"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-1.5 6M17 13l1.5 6M9 21h6M12 15v6" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
                        <button onClick={() => setQuickViewProduct(null)} className="absolute top-4 right-4 hover:opacity-50 transition-opacity flex items-center justify-center">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="aspect-square bg-[#F0EBE3] rounded-2xl overflow-hidden">
                                <img src={quickViewProduct.image} alt={quickViewProduct.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h2 className="font-serif text-2xl mb-2">{quickViewProduct.name}</h2>
                                <p className="text-[11px] tracking-[0.16em] uppercase text-[#8A8A80] font-mono mb-4">{quickViewProduct.material}</p>
                                <p className="text-2xl font-mono mb-4">AED {quickViewProduct.price.toLocaleString()}</p>
                                <p className="text-[13px] text-[#6A6A62] leading-relaxed mb-4">{quickViewProduct.description}</p>
                                <div className="space-y-2 mb-6">
                                    <p><span className="text-[10px] tracking-[0.16em] uppercase font-mono">Origin:</span> {quickViewProduct.origin}</p>
                                    <p><span className="text-[10px] tracking-[0.16em] uppercase font-mono">Availability:</span> {quickViewProduct.inStock ? "In Stock" : "Out of Stock"}</p>
                                </div>
                                <button className="w-full py-3 bg-black text-white text-[11px] tracking-[0.22em] uppercase rounded-full hover:bg-[#2A2A28] transition-colors">
                                    Request Sample
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}