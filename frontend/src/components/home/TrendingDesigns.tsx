"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";
import { api, type ApiError } from "@/lib/api/client";
import {
  resolveDesignImage,
  getDesignDisplayFields,
  formatDesignBasePrice,
  formatDesignCategory,
} from "@/lib/tailors";
import { DESIGN_CATEGORIES } from "@/lib/tailorDesigns";

const CATEGORY_COLORS: Record<string, string> = {
  "hand-embroidered": "#8B6B4D",
  "crystal-embellished": "#1A2A3A",
  "non-crystal": "#5A6B5A",
  talli: "#B8860B",
  khous: "#4A3A2A",
  beaded: "#6B2A5A",
};
import { Share2 } from "lucide-react";
import { usePathname } from "next/navigation";

interface TailorDesignExtended {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  images?: string[];
  category: string;
  basePrice: number;
  priceType?: "fixed" | "per_meter";
  tailoringFee: number;
  estimatedMeters: number;
  estimatedDays: number;
  tailorSlug: string;
  tailorName: string;
  tailorNameAr?: string;
}

type FilterValue = string;

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") return;
  await navigator.clipboard.writeText(text);
}

function buildShareUrl(basePath: string, href: string) {
  // href is already a path like /designs/slug (no locale). basePath includes locale.
  // Example: /en + /designs/abc => /en/designs/abc
  const trimmedBase = basePath.replace(/\/+$/, "");
  const trimmedHref = href.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedHref}`;
}

export function TrendingSection() {
  const params = useParams();
  const localParams = params.locale as string;
  const isArabic = localParams === "ar";
  const t = getTranslation(localParams);
  const pathname = usePathname();

  const [designs, setDesigns] = useState<TailorDesignExtended[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterValue>("all");

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.get<{
          success: boolean;
          items: TailorDesignExtended[];
        }>("/api/tailors/designs/all?limit=100");
        if (!data?.success) {
          throw new Error("Failed to load designs");
        }
        setDesigns(data.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load designs");
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    fetchDesigns();
  }, []);

  const filterOptions = useMemo(
    () => [
      {
        key: "all",
        labelEn: "All Designs",
        labelAr: "جميع التصاميم",
        value: "all",
      },
      ...DESIGN_CATEGORIES.map((cat) => ({
        key: cat,
        labelEn: cat.charAt(0).toUpperCase() + cat.slice(1),
        labelAr: formatDesignCategory(cat, localParams as any),
        value: cat,
      })),
    ],
    [localParams],
  );

  const filteredDesigns = useMemo(
    () =>
      selectedFilter === "all"
        ? designs
        : designs.filter((design) => design.category === selectedFilter),
    [designs, selectedFilter],
  );

  // Embla Carousel with RTL direction support
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: false,
      loop: filteredDesigns.length > 1,
      slidesToScroll: 1,
      direction: isArabic ? "rtl" : "ltr",
      breakpoints: {
        "(max-width: 480px)": { slidesToScroll: 1 },
        "(min-width: 481px) and (max-width: 640px)": { slidesToScroll: 1 },
        "(min-width: 641px) and (max-width: 768px)": { slidesToScroll: 1 },
        "(min-width: 769px) and (max-width: 1024px)": { slidesToScroll: 1 },
        "(min-width: 1025px) and (max-width: 1280px)": { slidesToScroll: 1 },
        "(min-width: 1281px) and (max-width: 1536px)": { slidesToScroll: 1 },
        "(min-width: 1537px)": { slidesToScroll: 1 },
      },
    },
    [
      Autoplay({
        delay: 2000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
      }),
    ],
  );

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) {
      emblaApi.reInit();
    }
  }, [filteredDesigns, emblaApi]);

  const eyebrowClass = `[font-family:var(--font-ui)] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3 ${
    isArabic
      ? "text-[14px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[12px] xl:text-[14px]"
      : "text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[9px] xl:text-[10px]"
  }`;

  const exploreLinkClass = `[font-family:var(--font-ui)] uppercase tracking-[0.24em] text-black flex items-center gap-2 shrink-0 pb-0.5 xs:pb-[3px] border-b border-black hover:opacity-50 transition-opacity duration-150 self-start sm:self-auto ${
    isArabic
      ? "text-[11px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[11px] xl:text-[12px]"
      : "text-[9px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[9px] xl:text-[10px]"
  }`;

  const filterChipClass = (isActive: boolean) =>
    `px-3 xs:px-4 py-1.5 xs:py-2 border border-(--color-border) uppercase tracking-[0.24em] whitespace-nowrap [font-family:var(--font-ui)] transition-all ${
      isActive
        ? "bg-black text-white"
        : "text-black hover:bg-black hover:text-white"
    } ${
      isArabic
        ? "text-[12px] xs:text-[11px] sm:text-[12px] md:text-[12px] lg:text-[14px] xl:text-[16px]"
        : "text-[9px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px]"
    }`;

  const PrevArrowIcon = () => (
    <svg
      className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#1A2A3A] group-hover/prev:text-white transition-colors duration-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isArabic ? <path d="M9 18l6-6-6-6" /> : <path d="M15 18l-6-6 6-6" />}
    </svg>
  );

  const NextArrowIcon = () => (
    <svg
      className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#1A2A3A] group-hover/next:text-white transition-colors duration-200"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {isArabic ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 18l6-6-6-6" />}
    </svg>
  );

  const getLocaleBasePath = () => {
    // pathname is like /en/something; locale base path is /en (or /ar)
    // Fallback to "" if pathname is unavailable.
    const p = pathname || "";
    const parts = p.split("/").filter(Boolean);
    const maybeLocale = parts[0];
    if (maybeLocale === "en" || maybeLocale === "ar") return `/${maybeLocale}`;
    return `/${localParams || "en"}`;
  };

  const handleShare = useCallback(
    async (hrefPath: string) => {
      const basePath = getLocaleBasePath();
      const relativeUrl = buildShareUrl(basePath, hrefPath);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = origin ? `${origin}${relativeUrl}` : relativeUrl;

      const shareData = {
        title: "MOTD",
        text: isArabic ? "اطلع على التصميم" : "Check this design",
        url: fullUrl,
      };

      try {
        // Prefer native share (works well on mobile)
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await navigator.share(shareData as any);
          return;
        }
      } catch {
        // If user cancels native share, fall back to copy.
      }

      try {
        await copyToClipboard(fullUrl);
      } catch {
        // Last resort: open prompt
        // eslint-disable-next-line no-alert
        window.prompt("Copy link:", fullUrl);
      }
    },
    [isArabic, pathname, localParams],
  );

  if (loading) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24">
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {isArabic ? "جاري تحميل التصاميم..." : "Loading designs..."}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24">
        <div className="text-center text-red-500 px-4">{error}</div>
      </section>
    );
  }

  if (designs.length === 0) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24">
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {isArabic ? "لا توجد تصاميم متاحة" : "No designs available"}
        </div>
      </section>
    );
  }

  return (
    <section
      id="designs"
      className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16"
    >
      <div className="w-full px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 xs:mb-10 sm:mb-12 gap-4 sm:gap-0">
          <div>
            <span className={eyebrowClass}>
              <span className="block w-4 xs:w-5 h-px bg-(--color-grey-muted)"></span>
              <span>{t.trendingDesigns.eyebrow}</span>
            </span>
            <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[56px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black">
              {t.trendingDesigns.title}
            </h2>
          </div>
          <Link href="/designs/designShop" className={exploreLinkClass}>
            {t.trendingDesigns.exploreLink}
          </Link>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 xs:gap-2.5 sm:gap-3 mb-6 xs:mb-8 sm:mb-10 md:mb-12 overflow-x-auto pb-2 xs:pb-3 scrollbar-thin">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.value)}
              className={`${filterChipClass(selectedFilter === filter.value)} hover:cursor-pointer`}
            >
              {isArabic ? filter.labelAr : filter.labelEn}
            </button>
          ))}
        </div>

        {/* Carousel */}
        <div className="relative group/trending">
          {/* Previous Arrow */}
          <button
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
            className={`hidden sm:flex absolute hover:cursor-pointer ${
              isArabic ? "right-0" : "left-0"
            } top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/trending:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/prev ${
              !prevBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label="Previous slide"
          >
            <PrevArrowIcon />
          </button>

          {/* Next Arrow */}
          <button
            onClick={scrollNext}
            disabled={!nextBtnEnabled}
            className={`hidden sm:flex absolute hover:cursor-pointer ${
              isArabic ? "left-0" : "right-0"
            } top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/trending:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/next ${
              !nextBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label="Next slide"
          >
            <NextArrowIcon />
          </button>

          {/* Embla Carousel Viewport */}
          <div className="overflow-hidden py-8 -my-8" ref={emblaRef}>
            <div className="flex -mx-1 xs:-mx-1.5 sm:-mx-2 md:-mx-2.5 lg:-mx-3">
              {filteredDesigns.map((design) => {
                const { name, description, category } = getDesignDisplayFields(
                  design,
                  localParams as any,
                );
                const imageUrl = resolveDesignImage(design.images?.[0]);
                const tailorName = isArabic
                  ? design.tailorNameAr || design.tailorName
                  : design.tailorName;
                const priceText = formatDesignBasePrice(
                  design.basePrice,
                  localParams as any,
                  design.priceType,
                );

                const hrefPath = `/designs/${design.slug}`;

                return (
                  <div
                    key={design._id}
                    className="flex-[0_0_100%] xs:flex-[0_0_66.666%] sm:flex-[0_0_50%] md:flex-[0_0_40%] lg:flex-[0_0_33.333%] xl:flex-[0_0_28.571%] 2xl:flex-[0_0_25%] px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 group py-4"
                  >
                    <Link
                      href={hrefPath}
                      className="bg-(--bg-page) border border-(--color-border) rounded-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full flex flex-col hover:cursor-pointer text-left"
                    >
                      <div className="aspect-9/9 relative overflow-hidden bg-[#F5F4F0] rounded-t-lg">
                        <img
                          src={imageUrl}
                          className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                          alt={name}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Top-right Share button */}
                        <button
                          type="button"
                          aria-label={isArabic ? "مشاركة" : "Share"}
                          onClick={async (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            await handleShare(hrefPath);
                          }}
                          className="absolute top-2 xs:top-3 right-2 z-20 p-2 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer"
                        >
                          <Share2 className="w-4 h-4 text-black" />
                        </button>

                        <div className="absolute top-2 xs:top-3 left-2 xs:left-3 z-10">
                          <span
                            className="text-white px-2.5 xs:px-3 py-1 xs:py-1.25 text-[10px] xs:text-[12px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-bold"
                            style={{ backgroundColor: CATEGORY_COLORS[design.category] || '#000000' }}
                          >
                            {category}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-(--space-24) flex flex-col grow">
                        <div className="flex flex-col justify-between items-start gap-2 mb-1 xs:mb-1.5 sm:mb-2">
                          <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] md:text-[20px] lg:text-[22px] xl:text-[24px] 2xl:text-[26px] font-normal leading-[1.2] xs:leading-[1.25] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                            {name}
                          </h3>
                          <span className="[font-family:var(--font-ui)] text-[12px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] tracking-[0.24em] text-black font-normal whitespace-nowrap">
                            {priceText}
                          </span>
                        </div>

                        <p className="[font-family:var(--font-ui)] text-[8px] xs:text-[7px] sm:text-[8px] md:text-[7px] lg:text-[8px] xl:text-[9px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2 xs:mb-2.5 sm:mb-3 font-normal">
                          {isArabic ? "الخياط: " : "Tailor: "}
                          {tailorName}
                        </p>

                        <p className="[font-family:var(--font-body)] text-[11px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[13px] leading-relaxed xs:leading-[1.5] sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 font-normal grow text-justify">
                          {description}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dots Navigation */}
        {scrollSnaps.length > 0 && (
          <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 mt-6 xs:mt-8 sm:mt-10 md:mt-12 lg:mt-(--space-32)">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full transition-all mx-0.5 xs:mx-1 hover:cursor-pointer ${
                  index === selectedIndex
                    ? "bg-black scale-125"
                    : "bg-gray-400 hover:bg-gray-600"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
