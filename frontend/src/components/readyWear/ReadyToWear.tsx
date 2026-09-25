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
import WishlistButton from "../shared/wishlistButton";
import AddToCartButton from "../shared/addToCartButton";
import { Share2 } from "lucide-react";
import { useMeasurementUnit } from "@/hooks/useMeasurementUnit";
import { HomeSectionSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";

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

export function ReadyToWearSection() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const t = getTranslation(locale);
  const { isWara, formatLength } = useMeasurementUnit();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [products, setProducts] = useState<ReadyMadeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          items: ReadyMadeListItem[];
        }>("/api/ready-made");

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

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.location.hash === "#ready-made"
    ) {
      const timer = setTimeout(() => {
        const element = document.getElementById("ready-made");
        if ((window as any).lenis) {
          (window as any).lenis.scrollTo(element || "#ready-made", {
            offset: -80,
            duration: 1.2,
          });
        } else if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, []);

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
  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi],
  );

  // Cap dots at 5; active indicator loops as slides advance.
  const MAX_DOTS = 5;
  const snapCount = scrollSnaps.length;
  const dotCount = Math.min(MAX_DOTS, snapCount);
  const activeDot =
    dotCount > 0 ? ((selectedIndex % dotCount) + dotCount) % dotCount : 0;
  const scrollToDot = useCallback(
    (dotIndex: number) => {
      if (dotCount <= 0) return;
      if (snapCount <= dotCount) {
        scrollTo(dotIndex);
        return;
      }
      const blockStart = selectedIndex - activeDot;
      const inBlock = blockStart + dotIndex;
      if (dotIndex !== activeDot && inBlock >= 0 && inBlock < snapCount) {
        scrollTo(inBlock);
        return;
      }
      const startOffset = dotIndex === activeDot ? 1 : 0;
      for (let step = startOffset; step < snapCount; step++) {
        const idx = (selectedIndex + step) % snapCount;
        if (idx % dotCount === dotIndex) {
          scrollTo(idx);
          return;
        }
      }
    },
    [activeDot, dotCount, scrollTo, selectedIndex, snapCount],
  );

  const isMobile = useCallback(() => {
    if (typeof window === "undefined") return false;
    return "ontouchstart" in window || navigator.maxTouchPoints > 0;
  }, []);

  const getFullUrl = useCallback(
    (hrefPath: string) => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const basePath = locale === "ar" ? "/ar" : "/en";
      return `${origin}${basePath}${hrefPath}`;
    },
    [locale],
  );

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
  }, []);

  const handleShare = useCallback(
    async (hrefPath: string) => {
      const fullUrl = getFullUrl(hrefPath);

      const shareData = {
        title: "MOTD",
        text: locale === "ar" ? "اطلع على المنتج" : "Check this product",
        url: fullUrl,
      };

      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await navigator.share(shareData as any);
          return;
        }
      } catch {
        // ignore and fallback to copy/prompt
      }

      try {
        await navigator.clipboard.writeText(fullUrl);
        showToast(locale === "ar" ? "تم نسخ الرابط!" : "Link copied!");
      } catch {
        const copied = window.prompt(
          locale === "ar" ? "انسخ الرابط:" : "Copy link:",
          fullUrl,
        );
        if (copied !== null) {
          showToast(locale === "ar" ? "تم نسخ الرابط!" : "Link copied!");
        }
      }
    },
    [getFullUrl, locale, showToast],
  );

  if (loading) {
    return (
      <section
        id="ready-made"
        className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16 scroll-mt-20"
      >
        <HomeSectionSkeleton showFilters={false} cardCount={4} />
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
    <section
      id="ready-made"
      className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16 scroll-mt-20"
    >
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-black text-white px-4 py-2.5 rounded-lg shadow-lg [font-family:var(--font-ui)] text-xs sm:text-sm tracking-wide animate-fade-in-up max-w-[calc(100vw-24px)] text-center pointer-events-none mb-(--safe-bottom)">
          {toastMessage}
        </div>
      )}

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
            href="/ready-made"
            className="[font-family:var(--font-ui)] text-[9px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 xs:pb-1 hover:opacity-50 transition-all duration-200 whitespace-nowrap font-normal"
          >
            {t.readyToWear.exploreLink}
          </Link>
        </div>

        <div className="relative group/carousel">
          <button
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
            className={`hidden sm:flex absolute left-2 xs:left-3 sm:left-4 top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/carousel:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/prev ${
              !prevBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
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
            className={`hidden sm:flex absolute right-2 xs:right-3 sm:right-4 top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/carousel:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] group/next ${
              !nextBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
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

          <div className="overflow-hidden py-8 -my-8" ref={emblaRef}>
            <div className="flex will-change-transform -mx-1 xs:-mx-1.5 sm:-mx-2 md:-mx-2.5 lg:-mx-3">
              {products.map((item) => {
                const { title, description } = getReadyMadeDisplayFields(
                  item,
                  locale,
                );
                const image = resolveReadyMadeImage(item.images?.[0]);
                const tag = locale === "ar" ? item.tagAr || item.tag : item.tag;
                const price = item.finalSellingPriceAED ?? 0;
                const { bg, text } = getTagStyles(item.tag);
                const hrefPath = `/ready-made/${item.slug}`;

                return (
                  <div
                    key={item._id}
                    className="flex-[0_0_85%] xs:flex-[0_0_55%] sm:flex-[0_0_42%] md:flex-[0_0_33%] lg:flex-[0_0_28%] xl:flex-[0_0_24%] 2xl:flex-[0_0_20%] px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 group py-4"
                  >
                    <Link
                      href={hrefPath}
                      className="bg-(--bg-page) border border-(--color-border) rounded-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full flex flex-col hover:cursor-pointer"
                    >
                      <div className="aspect-4/5 relative overflow-hidden rounded-t-lg">
                        <img
                          src={image}
                          alt={title}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {/* Action Buttons Container */}
                        <div className="absolute top-2 xs:top-3 right-2 xs:right-3 z-20 flex items-center gap-1.5 xs:gap-2">
                          <button
                            type="button"
                            aria-label={locale === "ar" ? "مشاركة" : "Share"}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await handleShare(hrefPath);
                            }}
                            className="p-1.5 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer border-0 flex items-center justify-center w-7 h-7 xs:w-8 xs:h-8"
                          >
                            <Share2 className="w-3.5 h-3.5 text-black" />
                          </button>

                          <WishlistButton
                            item={{
                              id: item._id,
                              name: title,
                              image: image,
                              price: item.finalSellingPriceAED || 0,
                              slug: item.slug,
                              size: formatLength(item.metersPerFabric),
                              type: "readyMade",
                              quantity: 1,
                              ...(Number.isFinite(item.availableFabricStock)
                                ? { maxStock: item.availableFabricStock }
                                : {}),
                            }}
                            inline={true}
                            className="p-1.5 rounded-full bg-white/85 backdrop-blur-sm shadow-sm border-0 flex h-7 w-7 items-center justify-center xs:h-8 xs:w-8"
                            iconClassName="h-3.5 w-3.5"
                          />

                          <AddToCartButton
                            item={{
                              id: item._id,
                              slug: item.slug,
                              name: title,
                              image,
                              price,
                              size: formatLength(item.metersPerFabric),
                              itemType: "readyMade",
                              maxStock: item.availableFabricStock ?? 0,
                            }}
                            inline
                            className="p-1.5 rounded-full bg-white/85 backdrop-blur-sm shadow-sm border-0 flex h-7 w-7 items-center justify-center xs:h-8 xs:w-8"
                            iconClassName="h-3.5 w-3.5"
                          />
                        </div>

                        {tag && (
                          <Tag
                            elevated
                            truncate
                            className="absolute top-1.5 left-1.5 z-10 max-w-[calc(100%-8.5rem)]"
                            style={{ backgroundColor: bg, color: text }}
                          >
                            {tag}
                          </Tag>
                        )}
                      </div>

                      <div className="p-2.5 xs:p-3 sm:p-4 md:p-4 lg:p-5 flex flex-col grow">
                        <h3 className="[font-family:var(--font-display)] text-[14px] xs:text-[15px] sm:text-[16px] md:text-[17px] lg:text-[18px] xl:text-[19px] 2xl:text-[20px] font-normal leading-[1.2] xs:leading-tight tracking-[-0.01em] text-black mb-1 line-clamp-2">
                          {title}
                        </h3>
                        <span className="[font-family:var(--font-ui)] text-[11px] xs:text-[12px] sm:text-[12px] md:text-[12px] lg:text-[13px] xl:text-[13px] 2xl:text-[14px] tracking-[0.08em] text-black font-normal mb-1">
                          AED {price.toFixed(2)}
                        </span>
                        {(() => {
                          const storeName =
                            locale === "ar"
                              ? item.fabricShop?.nameAr ||
                                item.fabricShop?.name ||
                                ""
                              : item.fabricShop?.name || "";
                          const fallback = String(item.ownerName || "").trim();
                          const label =
                            String(storeName || "").trim() ||
                            (fallback.toLowerCase() === "motd admin"
                              ? ""
                              : fallback);
                          return label ? (
                            <p className="[font-family:var(--font-ui)] text-[7px] xs:text-[7px] sm:text-[7px] md:text-[7px] lg:text-[8px] xl:text-[8px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-1.5 xs:mb-2 sm:mb-2.5 font-normal">
                              {locale === "ar" ? "المتجر: " : "Store: "}
                              {label}
                            </p>
                          ) : null;
                        })()}
                        <p className="[font-family:var(--font-body)] text-[10px] xs:text-[10px] sm:text-[10px] md:text-[10px] lg:text-[11px] xl:text-[11px] 2xl:text-[12px] leading-relaxed xs:leading-normal sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 font-normal grow">
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

        {dotCount > 0 && (
          <div className="mt-6 flex justify-center gap-1.5 xs:mt-8 sm:mt-10 md:mt-12 lg:mt-(--space-32)">
            {Array.from({ length: dotCount }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToDot(index)}
                className={`h-1.5 rounded-full transition-all duration-300 hover:cursor-pointer ${
                  index === activeDot
                    ? "w-5 bg-black"
                    : "w-1.5 bg-black/25 hover:bg-black/45"
                }`}
                aria-label={`Go to slide group ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
