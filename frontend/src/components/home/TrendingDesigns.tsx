"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import * as images from "../../../public/images/ImageIndex";
import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";

// Trending Designs Data
const trendingDesigns = [
  {
    id: 1,
    nameEn: "Abstract Floral Stonework",
    nameAr: "زهور مجردة منقوشة",
    image: images.des1,
    tagEn: "BESTSELLER",
    tagAr: "الأكثر مبيعاً",
    tagColor: "bg-[#9C6B3C]",
    category: "abstract-floral-stonework",
  },
  {
    id: 2,
    nameEn: "Geometric Royal Grid",
    nameAr: "شبكة ملكية هندسية",
    image: images.des2,
    tagEn: "TRENDING",
    tagAr: "رائج",
    tagColor: "bg-[#C9A96E]",
    category: "geometric-royal-grid",
  },
  {
    id: 3,
    nameEn: "Double Sleeve Crystal Cascade",
    nameAr: "شلال كريستالي بالأكمام المزدوجة",
    image: images.des3,
    tagEn: "PREMIUM",
    tagAr: "فاخر",
    tagColor: "bg-[#5B4A3A]",
    category: "double-sleeve-crystal-cascade",
  },
  {
    id: 4,
    nameEn: "Vibrant Floral Neck (Khaka)",
    nameAr: "رقبة زهرية نابضة بالحياة (خكة)",
    image: images.des4,
    tagEn: "NEW",
    tagAr: "جديد",
    tagColor: "bg-[#8B6F47]",
    category: "vibrant-floral-neck",
  },
  {
    id: 5,
    nameEn: "Peacock Border Motif",
    nameAr: "زخرفة حدود الطاووس",
    image: images.des5,
    tagEn: "BREATHABLE",
    tagAr: "قابل للتنفس",
    tagColor: "bg-[#9C6B3C]",
    category: "peacock-border-motif",
  },
  {
    id: 6,
    nameEn: "Botanical Creep Vine",
    nameAr: "كرمة زاحفة نباتية",
    image: images.des6,
    tagEn: "EXCLUSIVE",
    tagAr: "حصري",
    tagColor: "bg-[#A0522D]",
    category: "botanical-creep-vine",
  },
  {
    id: 7,
    nameEn: "Al-Khousah",
    nameAr: "الخصوصة",
    image: images.des7,
    tagEn: "ARTISANAL",
    tagAr: "حرفي",
    tagColor: "bg-[#C8A97E]",
    category: "al-khousah",
  },
];

// Filter options
const filterOptions = [
  {
    key: "all",
    labelEn: "All Designs",
    labelAr: "جميع التصاميم",
    value: "all",
  },
  {
    key: "abstract-floral-stonework",
    labelEn: "Abstract Floral Stonework",
    labelAr: "زهور مجردة منقوشة",
    value: "abstract-floral-stonework",
  },
  {
    key: "geometric-royal-grid",
    labelEn: "Geometric Royal Grid",
    labelAr: "شبكة ملكية هندسية",
    value: "geometric-royal-grid",
  },
  {
    key: "double-sleeve-crystal-cascade",
    labelEn: "Double Sleeve Crystal Cascade",
    labelAr: "شلال كريستالي بالأكمام المزدوجة",
    value: "double-sleeve-crystal-cascade",
  },
  {
    key: "al-khousah",
    labelEn: "Al-Khousah",
    labelAr: "الخصوصة",
    value: "al-khousah",
  },
  {
    key: "al-halaj-coin-dot",
    labelEn: "Al-Halaj Coin Dot",
    labelAr: "الهلالج كوين دوت",
    value: "al-halaj-coin-dot",
  },
];

type FilterValue = string;

export function TrendingSection() {
  const params = useParams();
  const localParams = params.locale as string;
  const isArabic = localParams === "ar";
  const t = getTranslation(localParams);
  const [selectedFilter, setSelectedFilter] = useState<FilterValue>("all");

  const filteredDesigns =
    selectedFilter === "all"
      ? trendingDesigns
      : trendingDesigns.filter((design) => design.category === selectedFilter);

  // Embla Carousel with RTL direction support
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: false,
      loop: true,
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

  // --- Dynamic Arabic font size classes ---
  const eyebrowClass = `[font-family:var(--font-ui)] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3 ${
    isArabic
      ? "text-[14px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[12px] xl:text-[14px]"
      : "text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[9px] xl:text-[10px]"
  }`;

  const titleClass = `[font-family:var(--font-display)] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black ${
    isArabic
      ? "text-[38px] xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[44px] xl:text-[52px] 2xl:text-[58px]"
      : "text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[36px] xl:text-[42px] 2xl:text-[48px]"
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

  const designTitleClass = `[font-family:var(--font-display)] font-normal leading-[1.2] xs:leading-[1.25] tracking-[-0.01em] text-black mb-1 line-clamp-2 ${
    isArabic
      ? "text-[18px] xs:text-[20px] sm:text-[22px] md:text-[22px] lg:text-[24px] xl:text-[28px] 2xl:text-[28px]"
      : "text-[16px] xs:text-[18px] sm:text-[20px] md:text-[20px] lg:text-[22px] xl:text-[24px] 2xl:text-[26px]"
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

  return (
    <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
      <div className="w-full px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) mx-auto">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 xs:mb-10 sm:mb-12 pb-4 xs:pb-5 sm:pb-6 border-b border-(--color-border) gap-4 sm:gap-0">
          <div>
            <span className={eyebrowClass}>
              <span className="block w-4 xs:w-5 h-px bg-(--color-grey-muted)"></span>
              <span>{t.trendingDesigns.eyebrow}</span>
            </span>
            <h2 className={titleClass}>{t.trendingDesigns.title}</h2>
          </div>
          <Link href="/#all-designs" className={exploreLinkClass}>
            {t.trendingDesigns.exploreLink}
          </Link>
        </div>

        {/* Filter Chips */}
        <div className="flex gap-2 xs:gap-2.5 sm:gap-3 mb-6 xs:mb-8 sm:mb-10 md:mb-12 overflow-x-auto pb-2 xs:pb-3 scrollbar-thin">
          {filterOptions.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.value)}
              className={filterChipClass(selectedFilter === filter.value)}
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
            className={`hidden sm:flex absolute ${
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
            className={`hidden sm:flex absolute ${
              isArabic ? "left-0" : "right-0"
            } top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/trending:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/next ${
              !nextBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            aria-label="Next slide"
          >
            <NextArrowIcon />
          </button>

          {/* Embla Carousel Viewport */}
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {filteredDesigns.map((design) => {
                const displayName = isArabic ? design.nameAr : design.nameEn;
                const displayTag = isArabic ? design.tagAr : design.tagEn;

                return (
                  <div
                    key={design.id}
                    className={`
                    mx-2
                      flex-[0_0_calc(100%-8px)] 
                      xs:flex-[0_0_calc(66.666%-12px)] 
                      sm:flex-[0_0_calc(50%-16px)] 
                      md:flex-[0_0_calc(40%-20px)] 
                      lg:flex-[0_0_calc(33.333%-24px)]
                      xl:flex-[0_0_calc(28.571%-28px)]
                      2xl:flex-[0_0_calc(25%-32px)]
                      group overflow-hidden rounded-lg
                    `}
                  >
                    <div className="bg-(--bg-page) border border-(--color-border) overflow-hidden transition-all duration-300 hover:shadow-lg h-full">
                      <div className="aspect-9/9 relative overflow-hidden">
                        <img
                          src={
                            typeof design.image === "string"
                              ? design.image
                              : design.image.src
                          }
                          className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                          alt={displayName}
                        />
                        <div className="absolute top-2 xs:top-3 left-2 xs:left-3">
                          <span
                            className={`${design.tagColor} text-white px-1.5 xs:px-2 py-0.5 xs:py-1 text-[8px] xs:text-[10px] uppercase whitespace-nowrap`}
                          >
                            {displayTag}
                          </span>
                        </div>
                      </div>
                      <div className="p-3 xs:p-4">
                        <h3 className={designTitleClass}>
                          {displayName.slice(0, 20) + "..."}
                        </h3>
                        {/* "Explore Now" button removed */}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Dots Navigation */}
        <div className="flex justify-center gap-1.5 xs:gap-2 sm:gap-2.5 md:gap-3 mt-6 xs:mt-8 sm:mt-10 md:mt-12 lg:mt-(--space-32)">
          {scrollSnaps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollTo(index)}
              className={`w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full transition-all mx-0.5 xs:mx-1 ${
                index === selectedIndex
                  ? "bg-black scale-125"
                  : "bg-gray-400 hover:bg-gray-600"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
