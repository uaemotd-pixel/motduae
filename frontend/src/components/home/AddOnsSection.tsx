"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { useParams } from "next/navigation";
import { api } from "@/lib/api/client";
import { resolveMediaUrl } from "@/lib/media";
import { Share2 } from "lucide-react";
import WishlistButton from "../shared/wishlistButton";
import { HomeSectionSkeleton } from "@/components/ui/Skeleton";

interface AddOnListItem {
  _id: string;
  name: string;
  nameAr: string;
  slug: string;
  price: number;
  stock: number;
  thumbnailImage: string;
  tag?: string;
  tagAr?: string;
  description?: string;
  descriptionAr?: string;
}

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

export function AddOnsSection() {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";

  const [products, setProducts] = useState<AddOnListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
          items: AddOnListItem[];
        }>("/api/addons");

        if (!data?.success) {
          throw new Error("Failed to load addons");
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
    [
      Autoplay({
        delay: 2500,
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
        title: "MOTD Add-On",
        text: isAr
          ? "اطلع على هذا المنتج المميز"
          : "Check out this beautiful add-on",
        url: fullUrl,
      };

      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await navigator.share(shareData as any);
          return;
        }
      } catch {
        // ignore and fallback
      }

      try {
        await navigator.clipboard.writeText(fullUrl);
        showToast(isAr ? "تم نسخ الرابط!" : "Link copied!");
      } catch {
        const copied = window.prompt(
          isAr ? "انسخ الرابط:" : "Copy link:",
          fullUrl,
        );
        if (copied !== null) {
          showToast(isAr ? "تم نسخ الرابط!" : "Link copied!");
        }
      }
    },
    [getFullUrl, isAr, showToast],
  );

  if (loading) {
    return (
      <section
        className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16"
        id="addons-section"
      >
        <HomeSectionSkeleton showFilters={false} cardCount={4} />
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80)">
        <div className="text-center text-red-500 text-sm px-4">{error}</div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section
      className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16"
      id="addons-section"
    >
      <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 xs:mb-10 sm:mb-12 md:mb-14 lg:mb-(--space-64) gap-4 xs:gap-5 sm:gap-6 md:gap-(--space-24)">
          <div>
            <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3">
              <span className="block w-3 xs:w-4 sm:w-5 h-px bg-(--color-grey-muted)"></span>
              <span>{isAr ? "إكسسوارات مميزة" : "Accessory Add-Ons"}</span>
            </span>
            <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[56px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black">
              {isAr ? "إضافات مميزة" : "Featured Add-Ons"}
            </h2>
            <p className="[font-family:var(--font-body)] text-xs sm:text-sm text-gray-500 max-w-lg mt-2">
              {isAr
                ? "إكسسوارات وإضافات مميزة ومكملة لملابسك وتصميماتك المفضلة."
                : "Explore our collection of accessory pieces and optional add-ons to complete your look."}
            </p>
          </div>

          <Link
            href="/addons"
            className="[font-family:var(--font-ui)] text-[9px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 xs:pb-1 hover:opacity-50 transition-all duration-200 whitespace-nowrap font-normal"
          >
            {isAr ? "استكشف الكل →" : "Explore All →"}
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
                const displayTag = isAr ? item.tagAr || item.tag : item.tag;
                const displayName = isAr ? item.nameAr || item.name : item.name;
                const displayDesc = isAr
                  ? item.descriptionAr || item.description
                  : item.description;
                const tagStyles = getTagStyles(item.tag);

                return (
                  <div
                    key={item._id}
                    className="flex-[0_0_100%] xs:flex-[0_0_66.666%] sm:flex-[0_0_50%] md:flex-[0_0_40%] lg:flex-[0_0_33.333%] xl:flex-[0_0_28.571%] 2xl:flex-[0_0_25%] px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 group py-4"
                  >
                    <Link
                      href={`/addons/${item.slug}`}
                      className="bg-(--bg-page) border border-(--color-border) rounded-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full flex flex-col hover:cursor-pointer"
                    >
                      <div className="aspect-9/9 relative overflow-hidden rounded-t-lg">
                        <img
                          src={
                            resolveMediaUrl(item.thumbnailImage) ||
                            "/placeholder.jpg"
                          }
                          className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                          alt={displayName}
                        />

                        <div className="absolute top-2 xs:top-3 right-2 xs:right-3 z-20 flex items-center gap-1.5 xs:gap-2">
                          <button
                            type="button"
                            aria-label={isAr ? "مشاركة" : "Share"}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              await handleShare(`/addons/${item.slug}`);
                            }}
                            className="p-2 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer border-0 flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9"
                          >
                            <Share2 className="w-4 h-4 text-black" />
                          </button>

                          <WishlistButton
                            inline
                            className="p-2 rounded-full bg-white/85 backdrop-blur-sm shadow-sm border-0 flex h-8 w-8 items-center justify-center xs:h-9 xs:w-9"
                            iconClassName="h-4 w-4"
                            item={{
                              id: item._id,
                              name: displayName,
                              image: resolveMediaUrl(item.thumbnailImage) || "",
                              price: item.price,
                              slug: item.slug,
                              size: "N/A",
                              type: "addons",
                              quantity: 1,
                              ...(Number.isFinite(item.stock)
                                ? { maxStock: item.stock }
                                : {}),
                            }}
                          />
                        </div>

                        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        {displayTag && (
                          <div className="absolute top-2 xs:top-3 left-2 xs:left-3 z-10">
                            <span
                              style={{
                                backgroundColor: tagStyles.bg,
                                color: tagStyles.text,
                              }}
                              className="px-2.5 xs:px-3 py-1 xs:py-1.25 text-[10px] xs:text-[12px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-bold"
                            >
                              {displayTag}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-(--space-24) flex flex-col grow">
                        <div className="flex flex-col justify-between items-start gap-2 mb-1 xs:mb-1.5 sm:mb-2">
                          <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] md:text-[20px] lg:text-[22px] xl:text-[24px] 2xl:text-[26px] font-normal leading-[1.2] xs:leading-[1.25] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                            {displayName}
                          </h3>
                          <span className="[font-family:var(--font-ui)] text-[12px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] tracking-[0.24em] text-black font-normal whitespace-nowrap">
                            {item.price.toFixed(2)} {isAr ? "د.إ" : "AED"}
                          </span>
                        </div>

                        {displayDesc && (
                          <p className="[font-family:var(--font-body)] text-[11px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[13px] leading-relaxed xs:leading-[1.5] sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 font-normal grow">
                            {displayDesc}
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {products.length > 0 && (
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
        )}
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black text-white text-xs px-4 py-2.5 shadow-md font-mono tracking-wider uppercase animate-fade-in-up">
          {toastMessage}
        </div>
      )}
    </section>
  );
}
