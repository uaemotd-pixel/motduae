"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import * as images from "../../../public/images/ImageIndex";

// Fabric Collection Data
const collectionItems = [
    {
        id: 1,
        titleEn: "Emirati Silver Kandura",
        titleAr: "كندارة إماراتية فضية",
        locationEn: "DUBAI, UAE",
        locationAr: "دبي، الإمارات",
        price: "AED 850",
        img: images.fab1,
        tagEn: "BESTSELLER",
        tagAr: "الأكثر مبيعاً",
        tagColor: "bg-[#5B4A3A]",
        descEn: "Classic white kandura crafted from premium Egyptian cotton. Perfect for daily wear and formal occasions.",
        descAr: "كندارة بيضاء كلاسيكية مصنوعة من القطن المصري الفاخر. مثالية للارتداء اليومي والمناسبات الرسمية.",
        category: "pure-cotton",
    },
    {
        id: 2,
        titleEn: "Luxury Orange Abaya",
        titleAr: "عباية برتقالية فاخرة",
        locationEn: "ABU DHABI, UAE",
        locationAr: "أبو ظبي، الإمارات",
        price: "AED 1,250",
        img: images.fab2,
        tagEn: "ARTISANAL",
        tagAr: "حرفي",
        tagColor: "bg-[#C8A97E]",
        descEn: "Elegant black abaya with subtle embroidery details. Made from lightweight crepe fabric.",
        descAr: "عباية سوداء أنيقة بتفاصيل تطريز دقيقة. مصنوعة من قماش الكريب الخفيف.",
        category: "harir-armani-silk",
    },
    {
        id: 3,
        titleEn: "Royal Blue Bisht",
        titleAr: "بشت أزرق ملكي",
        locationEn: "SHARJAH, UAE",
        locationAr: "الشارقة، الإمارات",
        price: "AED 3,900",
        img: images.fab3,
        tagEn: "PREMIUM",
        tagAr: "فاخر",
        tagColor: "bg-[#5B4A3A]",
        descEn: "Ceremonial bisht with gold zari work. Worn for weddings and official ceremonies.",
        descAr: "بشت احتفالي بتطريز الزري الذهبي. يُلبس في حفلات الزفاف والمناسبات الرسمية.",
        category: "harir-armani-silk",
    },
    {
        id: 4,
        titleEn: "Embroidered Jalabiya",
        titleAr: "جلابية مطرزة",
        locationEn: "DUBAI, UAE",
        locationAr: "دبي، الإمارات",
        price: "AED 1,890",
        img: images.fab4,
        tagEn: "NEW",
        tagAr: "جديد",
        tagColor: "bg-[#8B6F47]",
        descEn: "Beautifully embroidered jalabiya in midnight blue. Perfect for evening gatherings.",
        descAr: "جلابية مطرزة بشكل جميل باللون الأزرق الداكن. مثالية للتجمعات المسائية.",
        category: "organza",
    },
    {
        id: 5,
        titleEn: "Summer Caftan",
        titleAr: "قفطان صيفي",
        locationEn: "RAS AL KHAIMAH, UAE",
        locationAr: "رأس الخيمة، الإمارات",
        price: "AED 1,450",
        img: images.fab5,
        tagEn: "BREATHABLE",
        tagAr: "قابل للتنفس",
        tagColor: "bg-[#9C6B3C]",
        descEn: "Lightweight caftan in soft pastel tones. Ideal for beach and resort wear.",
        descAr: "قفطان خفيف الوزن بألوان الباستيل الناعمة. مثالي لملابس الشاطئ والمنتجعات.",
        category: "pure-cotton",
    },
    {
        id: 6,
        titleEn: "Special Mukhawar",
        titleAr: "مخوار خاص",
        locationEn: "DUBAI, UAE",
        locationAr: "دبي، الإمارات",
        price: "AED 2,500",
        img: images.fab6,
        tagEn: "EXCLUSIVE",
        tagAr: "حصري",
        tagColor: "bg-[#A0522D]",
        descEn: "Modern tailored suit in navy blue. Made from Italian wool blend fabric.",
        descAr: "بدلة عصرية مفصلة باللون الأزرق الداكن. مصنوعة من قماش مزيج الصوف الإيطالي.",
        category: "organza",
    },
];

// Filter options
const filterOptions = [
    { key: "all", labelEn: "All Styles", labelAr: "جميع الأنماط", value: "all" },
    { key: "pure-cotton", labelEn: "Pure Cotton", labelAr: "قطن خالص", value: "pure-cotton" },
    { key: "harir-armani-silk", labelEn: "Harir Armani Silk", labelAr: "حرير أرماني", value: "harir-armani-silk" },
    { key: "organza", labelEn: "Organza", labelAr: "أورجانزا", value: "organza" },
];

type FilterValue = string;

export function PremiumFabrics() {
    const t = useTranslations("PremiumFabrics");
    const [selectedFilter, setSelectedFilter] = useState<FilterValue>("all");
    const [currentLanguage, setCurrentLanguage] = useState<"en" | "ar">("en");

    // Filter designs based on selected category
    const filteredItems =
        selectedFilter === "all"
            ? collectionItems
            : collectionItems.filter((item) => item.category === selectedFilter);

    // Embla Carousel configuration - slidesToScroll: 1 for all breakpoints (same as TrendingDesigns)
    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            align: "start",
            containScroll: "trimSnaps",
            dragFree: false,
            loop: true,
            slidesToScroll: 1, // Only 1 slide scrolls on arrow click
            breakpoints: {
                "(max-width: 480px)": {
                    slidesToScroll: 1,
                },
                "(min-width: 481px) and (max-width: 640px)": {
                    slidesToScroll: 1,
                },
                "(min-width: 641px) and (max-width: 768px)": {
                    slidesToScroll: 1,
                },
                "(min-width: 769px) and (max-width: 1024px)": {
                    slidesToScroll: 1,
                },
                "(min-width: 1025px) and (max-width: 1280px)": {
                    slidesToScroll: 1,
                },
                "(min-width: 1281px) and (max-width: 1536px)": {
                    slidesToScroll: 1,
                },
                "(min-width: 1537px)": {
                    slidesToScroll: 1,
                },
            },
        },
        [Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })]
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
        [emblaApi]
    );

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        setScrollSnaps(emblaApi.scrollSnapList());
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
    }, [emblaApi, onSelect]);

    // Reset carousel when filter changes
    useEffect(() => {
        if (emblaApi) {
            emblaApi.reInit();
        }
    }, [filteredItems, emblaApi]);

    // Detect language changes
    useEffect(() => {
        const checkLanguage = () => {
            const htmlLang = document.documentElement.getAttribute("lang");
            const hasRtlClass = document.body.classList.contains("rtl");
            setCurrentLanguage(htmlLang === "ar" || hasRtlClass ? "ar" : "en");
        };

        checkLanguage();
        window.addEventListener("languageChanged", checkLanguage);
        return () => window.removeEventListener("languageChanged", checkLanguage);
    }, []);

    return (
        <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
            <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 xs:mb-10 sm:mb-12 md:mb-14 lg:mb-(--space-64) gap-4 xs:gap-5 sm:gap-6 md:gap-(--space-24)">
                    <div>
                        <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3">
                            <span className="block w-3 xs:w-4 sm:w-5 h-px bg-(--color-grey-muted)"></span>
                            <span>{t("eyebrow")}</span>
                        </span>
                        <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[56px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black">
                            {t("title")}
                        </h2>
                    </div>
                    <Link
                        href="/#all-fabrics"
                        className="[font-family:var(--font-ui)] text-[9px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 xs:pb-1 hover:opacity-50 transition-all duration-200 whitespace-nowrap font-normal"
                    >
                        {t("exploreLink")} →
                    </Link>
                </div>

                {/* Filter Chips */}
                <div className="flex gap-2 xs:gap-2.5 sm:gap-3 mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-(--space-40) overflow-x-auto pb-2 xs:pb-3">
                    {filterOptions.map((filter) => (
                        <button
                            key={filter.key}
                            onClick={() => setSelectedFilter(filter.value)}
                            className={`px-3 xs:px-4 py-1.5 xs:py-2 border border-(--color-border) text-[9px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.24em] whitespace-nowrap [font-family:var(--font-ui)] transition-all font-normal ${selectedFilter === filter.value
                                ? "bg-black) text-white"
                                : "text-black) hover:bg-black hover:text-white"
                                }`}
                        >
                            {currentLanguage === "en" ? filter.labelEn : filter.labelAr}
                        </button>
                    ))}
                </div>

                {/* Carousel */}
                <div className="relative group/carousel">
                    {/* Previous Arrow */}
                    <button
                        onClick={scrollPrev}
                        disabled={!prevBtnEnabled}
                        className={`hidden sm:flex absolute left-2 xs:left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/carousel:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/prev ${!prevBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        aria-label="Previous slide"
                    >
                        <svg
                            className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#1A2A3A] group-hover/prev:text-white transition-colors duration-200"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M15 18l-6-6 6-6" />
                        </svg>
                    </button>

                    {/* Next Arrow */}
                    <button
                        onClick={scrollNext}
                        disabled={!nextBtnEnabled}
                        className={`hidden sm:flex absolute right-2 xs:right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/carousel:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/next ${!nextBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                        aria-label="Next slide"
                    >
                        <svg
                            className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#1A2A3A] group-hover/next:text-white transition-colors duration-200"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </button>

                    {/* Embla Carousel Viewport */}
                    <div className="overflow-hidden" ref={emblaRef}>
                        <div className="flex will-change-transform gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                            {filteredItems.map((item) => {
                                const displayTitle = currentLanguage === "ar" ? item.titleAr : item.titleEn;
                                const displayLocation = currentLanguage === "ar" ? item.locationAr : item.locationEn;
                                const displayTag = currentLanguage === "ar" ? item.tagAr : item.tagEn;
                                const displayDesc = currentLanguage === "ar" ? item.descAr : item.descEn;
                                const buttonText = currentLanguage === "ar" ? "تسوق الآن" : "Shop Now";

                                return (
                                    <div
                                        key={item.id}
                                        className={`
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
                                        <div className="bg-(--bg-page) border border-(--color-border) overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                                            <div className="aspect-9/9 relative overflow-hidden">
                                                <img
                                                    src={
                                                        typeof item.img === "string"
                                                            ? item.img
                                                            : item.img.src
                                                    }
                                                    className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                                                    alt={displayTitle}
                                                />
                                                {item.tagEn && (
                                                    <div className="absolute top-2 xs:top-3 left-2 xs:left-3 z-10">
                                                        <span className={`${item.tagColor} text-white px-1.5 xs:px-2 py-0.5 xs:py-1 text-[8px] xs:text-[10px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-normal`}>
                                                            {displayTag}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-(--space-24) flex flex-col grow">
                                                {/* Title and Price Row */}
                                                <div className="flex flex-col justify-between items-start gap-2 mb-1 xs:mb-1.5 sm:mb-2">
                                                    <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] md:text-[20px] lg:text-[22px] xl:text-[24px] 2xl:text-[26px] font-normal leading-[1.2] xs:leading-[1.25] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                                                        {displayTitle}
                                                    </h3>
                                                    <span className="[font-family:var(--font-ui)] text-[12px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] tracking-[0.24em] text-black font-normal whitespace-nowrap">
                                                        {item.price}
                                                    </span>
                                                </div>

                                                {/* Location */}
                                                <p className="[font-family:var(--font-ui)] text-[8px] xs:text-[7px] sm:text-[8px] md:text-[7px] lg:text-[8px] xl:text-[9px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2 xs:mb-2.5 sm:mb-3 font-normal">
                                                    {displayLocation}
                                                </p>

                                                {/* Description */}
                                                <p className="[font-family:var(--font-body)] text-[11px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[13px] leading-relaxed xs:leading-[1.5] sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 mb-3 xs:mb-3.5 sm:mb-4 grow font-normal">
                                                    {displayDesc}
                                                </p>

                                                {/* Shop Now Button */}
                                                <button className="[font-family:var(--font-body)] w-full mt-2 xs:mt-2.5 sm:mt-3 py-2 xs:py-2.5 sm:py-3 border border-(--color-border) text-[10px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] uppercase tracking-[0.24em] xs:tracking-[0.28em] text--black hover:bg-black hover:text-white transition-all duration-300 font-normal">
                                                    {buttonText}
                                                </button>
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
                            className={`w-1.5 h-1.5 xs:w-2 xs:h-2 rounded-full transition-all mx-0.5 xs:mx-1 ${index === selectedIndex
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