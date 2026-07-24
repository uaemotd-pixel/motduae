"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { api, type ApiError } from "@/lib/api/client";
import {
  FABRIC_FILTER_OPTIONS,
  type FabricFilter,
  type FabricListItem,
  filterFabricsByMaterial,
  formatPricePerMeter,
  getFabricDisplayFields,
} from "@/lib/fabrics";
import { resolveMediaUrl } from "@/lib/media";
import { Share2 } from "lucide-react";
import { usePathname } from "next/navigation";
import WishlistButton from "../shared/wishlistButton";

async function copyToClipboard(text: string) {
  if (typeof navigator === "undefined") return;
  await navigator.clipboard.writeText(text);
}

function buildShareUrl(basePath: string, href: string) {
  const trimmedBase = basePath.replace(/\/+$/, "");
  const trimmedHref = href.replace(/^\/+/, "");
  return `${trimmedBase}/${trimmedHref}`;
}

function getLocaleBasePath(pathname: string, fallbackLocale: string) {
  const parts = (pathname || "").split("/").filter(Boolean);
  const maybeLocale = parts[0];
  if (maybeLocale === "en" || maybeLocale === "ar") return `/${maybeLocale}`;
  return `/${fallbackLocale || "en"}`;
}

// Define TAG COLORS
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#2D5A3D", text: "#FFFFFF" }, // Deep muted green
  bestseller: { bg: "#8B7355", text: "#FFFFFF" }, // Warm taupe
  premium: { bg: "#4A4A4A", text: "#FFFFFF" }, // Charcoal (matches theme)
  limited: { bg: "#8B3A3A", text: "#FFFFFF" }, // Muted burgundy
  exclusive: { bg: "#C4A47A", text: "#000000" }, // Soft gold/beige
  trending: { bg: "#3A5A78", text: "#FFFFFF" }, // Muted navy
  handmade: { bg: "#6B4F3C", text: "#FFFFFF" }, // Earthy brown
};

const getTagStyles = (tagValue?: string) => {
  if (!tagValue) return { bg: "#1A1A1A", text: "#FFFFFF" };
  const key = tagValue.toLowerCase().trim();
  return TAG_COLORS[key] || { bg: "#1A1A1A", text: "#FFFFFF" };
};

export function PremiumFabrics() {
  const t = useTranslations("PremiumFabrics");
  const pathname = usePathname();
  const params = useParams();

  const locale = params.locale === "ar" ? "ar" : "en";

  const [fabrics, setFabrics] = useState<FabricListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FabricFilter>("all");

  useEffect(() => {
    const fetchFabrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          items: FabricListItem[];
        }>("/api/fabrics?limit=100");

        if (!data?.success) {
          throw new Error("Failed to load fabrics");
        }

        setFabrics(data.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load fabrics");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchFabrics();
  }, []);

  const filteredItems = useMemo(
    () => filterFabricsByMaterial(fabrics, selectedFilter),
    [fabrics, selectedFilter],
  );

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: false,
      loop: filteredItems.length > 1,
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

  const getLocaleBasePath = useCallback(() => {
    const p = pathname || "";
    const parts = p.split("/").filter(Boolean);
    const maybeLocale = parts[0];
    if (maybeLocale === "en" || maybeLocale === "ar") return `/${maybeLocale}`;
    return `/${locale || "en"}`;
  }, [pathname, locale]);

  const handleShare = useCallback(
    async (hrefPath: string) => {
      const relativeUrl = buildShareUrl(getLocaleBasePath(), hrefPath);
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const fullUrl = origin ? `${origin}${relativeUrl}` : relativeUrl;

      const shareData = {
        title: "MOTD",
        text: locale === "ar" ? "اطلع على القماش" : "Check this fabric",
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
        await copyToClipboard(fullUrl);
      } catch {
        // eslint-disable-next-line no-alert
        window.prompt("Copy link:", fullUrl);
      }
    },
    [getLocaleBasePath, locale],
  );

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
  }, [filteredItems, emblaApi]);

  if (loading) {
    return (
      <section
        id="all-fabrics"
        className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)"
      >
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
          {t("loading")}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section
        id="all-fabrics"
        className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)"
      >
        <div className="text-center text-red-500 px-4">{error}</div>
      </section>
    );
  }

  if (fabrics.length === 0) {
    return (
      <section
        id="all-fabrics"
        className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)"
      >
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
          {t("empty")}
        </div>
      </section>
    );
  }

  return (
    <section
      id="all-fabrics"
      className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16"
    >
      <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto">
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
            href="/fabrics/fabricStore"
            className="[font-family:var(--font-ui)] text-[9px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 xs:pb-1 hover:opacity-50 transition-all duration-200 whitespace-nowrap font-normal"
          >
            {t("exploreLink")} →
          </Link>
        </div>

        <div className="flex gap-2 xs:gap-2.5 sm:gap-3 mb-6 xs:mb-8 sm:mb-10 md:mb-12 lg:mb-(--space-40) overflow-x-auto pb-2 xs:pb-3">
          <button
            onClick={() => setSelectedFilter("all")}
            className={`px-3 xs:px-4 py-1.5 xs:py-2 border border-(--color-border) text-[9px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.24em] whitespace-nowrap [font-family:var(--font-ui)] transition-all font-normal ${
              selectedFilter === "all"
                ? "bg-black text-white border-black"
                : "text-black hover:bg-black hover:text-white hover:border-black"
            }`}
          >
            {t("filters.all")}
          </button>
          {FABRIC_FILTER_OPTIONS.map((material) => (
            <button
              key={material}
              onClick={() => setSelectedFilter(material)}
              className={`px-3 xs:px-4 py-1.5 xs:py-2 border border-(--color-border) text-[9px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.24em] whitespace-nowrap [font-family:var(--font-ui)] transition-all font-normal ${
                selectedFilter === material
                  ? "bg-black text-white border-black"
                  : "text-black hover:bg-black hover:text-white hover:border-black"
              }`}
            >
              {t(`filters.${material}`)}
            </button>
          ))}
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted) py-8">
            {t("emptyFilter")}
          </div>
        ) : (
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
                {filteredItems.map((item) => {
                  const { title, description, location } =
                    getFabricDisplayFields(item, locale);
                  const imageUrl = resolveMediaUrl(item.images?.[0]);
                  const { bg, text } = getTagStyles(item.tag);
                  const hrefPath = `/fabrics/${item.slug}`;

                  return (
                    <div
                      key={item._id}
                      className="flex-[0_0_100%] xs:flex-[0_0_66.666%] sm:flex-[0_0_50%] md:flex-[0_0_40%] lg:flex-[0_0_33.333%] xl:flex-[0_0_28.571%] 2xl:flex-[0_0_25%] px-1 xs:px-1.5 sm:px-2 md:px-2.5 lg:px-3 group py-4"
                    >
                      <Link
                        href={hrefPath}
                        className="bg-(--bg-page) border border-(--color-border) rounded-lg transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 h-full flex flex-col hover:cursor-pointer"
                      >
                        <div className="aspect-9/9 relative overflow-hidden rounded-t-lg">
                          <img
                            src={imageUrl}
                            className="w-full h-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                            alt={title}
                          />

                          {/* Share & Wishlist Actions */}
                          <div className="absolute top-2 xs:top-3 right-2 xs:right-3 z-20 flex items-center gap-1.5 xs:gap-2">
                            <button
                              type="button"
                              aria-label={locale === "ar" ? "مشاركة" : "Share"}
                              onClick={async (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                await handleShare(hrefPath);
                              }}
                              className="p-2 rounded-full bg-white/85 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer border-0 flex items-center justify-center w-8 h-8 xs:w-9 xs:h-9"
                            >
                              <Share2 className="w-4 h-4 text-black" />
                            </button>

                            <WishlistButton
                              item={{
                                id: item._id,
                                name: title,
                                image: imageUrl || "",
                                price: item.pricePerMeter,
                                slug: item.slug,
                                size: "Per Meter",
                                quantity: 1,
                                ...(Number.isFinite(item.stockInMeters)
                                  ? { maxStock: item.stockInMeters }
                                  : {}),
                              }}
                            />
                          </div>

                          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                          {item.tag && (
                            <div className="absolute top-2 xs:top-3 left-2 xs:left-3 z-10">
                              <span
                                className={`bg-black text-white px-2.5 xs:px-3 py-1 xs:py-1.25 text-[10px] xs:text-[12px] uppercase whitespace-nowrap [font-family:var(--font-ui)] tracking-[0.24em] font-bold`}
                                style={{ backgroundColor: bg, color: text }}
                              >
                                {item.tag}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="p-3 xs:p-4 sm:p-5 md:p-6 lg:p-(--space-24) flex flex-col grow">
                          <div className="flex flex-col justify-between items-start gap-2 mb-1 xs:mb-1.5 sm:mb-2">
                            <h3 className="[font-family:var(--font-display)] text-[16px] xs:text-[18px] sm:text-[20px] md:text-[20px] lg:text-[22px] xl:text-[24px] 2xl:text-[26px] font-normal leading-[1.2] xs:leading-[1.25] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                              {title}
                            </h3>
                            <span className="[font-family:var(--font-ui)] text-[12px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] tracking-[0.24em] text-black font-normal whitespace-nowrap">
                              {formatPricePerMeter(item.pricePerMeter, locale)}
                            </span>
                          </div>

                          <p className="[font-family:var(--font-ui)] text-[8px] xs:text-[7px] sm:text-[8px] md:text-[7px] lg:text-[8px] xl:text-[9px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-2 xs:mb-2.5 sm:mb-3 font-normal">
                            {location}
                          </p>

                          <p className="[font-family:var(--font-body)] text-[11px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] xl:text-[12px] 2xl:text-[13px] leading-relaxed xs:leading-[1.5] sm:leading-[1.6] text-(--color-grey-muted) line-clamp-2 font-normal grow">
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
        )}

        {filteredItems.length > 0 && (
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
    </section>
  );
}
