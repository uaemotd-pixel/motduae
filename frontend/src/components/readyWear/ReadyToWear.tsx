"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import {
    getReadyMadeDisplayFields,
    ReadyMadeListItem,
    resolveReadyMadeImage,
} from "@/lib/readyMade";

export function ReadyToWearSection() {
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";
    const t = getTranslation(locale);

    const [products, setProducts] = useState<ReadyMadeListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await api.get<{ success: boolean; items: ReadyMadeListItem[] }>(
                    "/api/ready-made",
                );

                if (!data?.success) {
                    throw new Error("Failed to load products");
                }

                setProducts(data.items || []);
            } catch (err: unknown) {
                const message =
                    err instanceof Error ? err.message : "Something went wrong";
                setError(message);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const [emblaRef, emblaApi] = useEmblaCarousel(
        {
            align: "start",
            containScroll: "trimSnaps",
            dragFree: false,
            loop: products.length > 1,
            slidesToScroll: 1,
            axis: "x",
        },
        [Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })],
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

    useEffect(() => {
        if (!emblaApi) return;
        onSelect();
        setScrollSnaps(emblaApi.scrollSnapList());
        emblaApi.on("select", onSelect);
        emblaApi.on("reInit", onSelect);
    }, [emblaApi, onSelect]);

    useEffect(() => {
        if (emblaApi) emblaApi.reInit();
    }, [products, emblaApi]);

    const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
    const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
    const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

    if (loading) {
        return (
            <section className="bg-(--bg-page) py-12">
                <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
                    {t.readyToWear.loading}
                </div>
            </section>
        );
    }

    if (error) {
        return (
            <section className="bg-(--bg-page) py-12">
                <div className="text-center text-red-500">{error}</div>
            </section>
        );
    }

    if (products.length === 0) {
        return (
            <section className="bg-(--bg-page) py-12">
                <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
                    {t.readyToWear.empty}
                </div>
            </section>
        );
    }

    return (
        <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
            <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 xs:mb-10 sm:mb-12 md:mb-14 lg:mb-(--space-64) gap-4 xs:gap-5 sm:gap-6 md:gap-(--space-24)">
                    <div>
                        <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3">
                            <span className="block w-3 xs:w-4 sm:w-5 h-px bg-(--color-grey-muted)"></span>
                            <span>{t.readyToWear.eyebrow}</span>
                        </span>
                        <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[56px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black">
                            {t.readyToWear.title}
                        </h2>
                    </div>
                    <Link
                        href="/#all-fabrics"
                        className="[font-family:var(--font-ui)] text-[9px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 xs:pb-1 hover:opacity-50 transition-all duration-200 whitespace-nowrap font-normal"
                    >
                        {t.readyToWear.exploreLink}
                    </Link>
                </div>

                <div className="relative group/carousel">
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

                    <div className="overflow-hidden" ref={emblaRef}>
                        <div className="flex will-change-transform gap-2 xs:gap-3 sm:gap-4 md:gap-5 lg:gap-6">
                            {products.map((item) => {
                                const { title, description } = getReadyMadeDisplayFields(
                                    item,
                                    locale,
                                );
                                const image = resolveReadyMadeImage(item.images?.[0]);

                                return (
                                    <div
                                        key={item._id}
                                        className="flex-[0_0_calc(100%-8px)] xs:flex-[0_0_calc(66.666%-12px)] sm:flex-[0_0_calc(50%-16px)] md:flex-[0_0_calc(40%-20px)] lg:flex-[0_0_calc(33.333%-24px)] xl:flex-[0_0_calc(28.571%-28px)] 2xl:flex-[0_0_calc(25%-32px)] group overflow-hidden rounded-lg"
                                    >

                                        <Link href={`/ready-made/${item.slug}`}>
                                            {/* Card container – matching premiumFabrics style */}
                                            <div className="bg-(--bg-page) border border-(--color-border) overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col">
                                                {/* Image with aspect ratio and hover zoom */}
                                                <div className="aspect-9/9 relative overflow-hidden">
                                                    <img
                                                        src={image}
                                                        alt={title}
                                                        className="w-full h-full object-cover transition-all duration-700 hover:scale-105"
                                                    />
                                                </div>

                                                {/* Content area */}
                                                <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-(--space-24) flex flex-col grow">
                                                    <div className="flex flex-col justify-between items-start gap-2 mb-1 xs:mb-1.5 sm:mb-2">
                                                        <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] md:text-[20px] lg:text-[22px] xl:text-[24px] 2xl:text-[26px] font-normal leading-[1.2] xs:leading-[1.25] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                                                            {title}
                                                        </h3>
                                                        <span className="[font-family:var(--font-ui)] text-[12px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] tracking-[0.24em] text-black font-normal whitespace-nowrap">
                                                            {item.price} AED
                                                        </span>
                                                    </div>

                                                    <span className="border w-fit px-2 bg-(--bg-surface) [font-family:var(--font-body)] text-[11px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[13px] leading-relaxed xs:leading-[1.5] sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 mb-3 xs:mb-3.5 sm:mb-4 grow font-normal">
                                                        {t.readyToWear.sizeLabel}: {item.size}
                                                    </span>

                                                    <p className="[font-family:var(--font-body)] text-[11px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[13px] leading-relaxed xs:leading-[1.5] sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 mb-3 xs:mb-3.5 sm:mb-4 grow font-normal">
                                                        {description}
                                                    </p>

                                                    <span className="[font-family:var(--font-body)] w-full mt-2 xs:mt-2.5 sm:mt-3 py-2 xs:py-2.5 sm:py-3 border border-(--color-border) text-[10px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] uppercase tracking-[0.24em] xs:tracking-[0.28em] text-black text-center group-hover:bg-black group-hover:text-white transition-all duration-300 font-normal">
                                                        {t.readyToWear.shopNow}
                                                    </span>
                                                </div>
                                            </div>
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

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
