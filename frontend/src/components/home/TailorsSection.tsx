"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { api, type ApiError } from "@/lib/api/client";
import {
  type TailorShopListItem,
  formatTailorRating,
  getTailorDisplayFields,
  resolveTailorImage,
} from "@/lib/tailors";

const SECTION_CLASS =
  "bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) last:mb-0 mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)";

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.25 && rating % 1 < 0.75;
  const roundedUp = rating % 1 >= 0.75;
  const displayFull = roundedUp ? Math.ceil(rating) : fullStars;

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < displayFull;
        const half = !filled && hasHalfStar && i === fullStars;

        return (
          <svg
            key={i}
            className={`w-2.5 h-2.5 sm:w-3 sm:h-3 ${
              filled || half ? "text-[#d4af37] fill-[#d4af37]" : "text-white/30 fill-white/30"
            }`}
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </div>
  );
}

function TailorPortraitCard({
  tailor,
  locale,
  index,
}: {
  tailor: TailorShopListItem;
  locale: "en" | "ar";
  index: number;
}) {
  const t = useTranslations("TailorsSection");
  const { name, description, location, badge } = getTailorDisplayFields(
    tailor,
    locale,
  );
  const imageUrl = resolveTailorImage(tailor.logo, tailor.coverImage);
  const rating = formatTailorRating(tailor.rating);
  const reviewCount = tailor.reviewCount ?? 0;
  const indexLabel = String(index + 1).padStart(2, "0");

  return (
    <Link
      href={`/tailors/${tailor.slug}`}
      className="group relative block h-full overflow-hidden bg-(--color-near-black) transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)]"
    >
      <div className="aspect-[3/4] sm:aspect-[4/5] relative overflow-hidden">
        <img
          src={imageUrl}
          alt={name}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-linear-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-500 group-hover:from-black group-hover:via-black/55" />

        <div className="absolute inset-0 flex flex-col justify-between p-4 sm:p-5 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="[font-family:var(--font-ui)] text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-white/50 font-normal">
              {indexLabel}
            </span>
            {badge && (
              <span className="[font-family:var(--font-ui)] text-[8px] sm:text-[9px] uppercase tracking-[0.24em] bg-white/10 backdrop-blur-md text-white px-2.5 py-1 border border-white/20 font-normal">
                {badge}
              </span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-3 sm:mb-4">
              <div className="flex items-center gap-2">
                <StarRating rating={tailor.rating ?? 0} />
                <span className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] tracking-[0.16em] text-white/80 font-normal">
                  {rating}
                </span>
              </div>
              {reviewCount > 0 && (
                <span className="[font-family:var(--font-ui)] text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-white/50 font-normal">
                  {reviewCount} {t("reviews")}
                </span>
              )}
            </div>

            <h3 className="[font-family:var(--font-display)] text-[22px] sm:text-[24px] md:text-[26px] font-normal leading-[1.1] tracking-[-0.02em] text-white mb-1.5 sm:mb-2 line-clamp-2">
              {name}
            </h3>

            <p className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] uppercase tracking-[0.28em] text-[#d4af37] font-normal mb-2 sm:mb-3 line-clamp-1">
              {location}
            </p>

            {description && (
              <p className="[font-family:var(--font-body)] text-[12px] sm:text-[13px] leading-[1.55] text-white/70 font-normal line-clamp-2 mb-4 sm:mb-5">
                {description}
              </p>
            )}

            <div className="flex items-center gap-2 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
              <span className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] uppercase tracking-[0.28em] text-white font-normal">
                {t("explore")}
              </span>
              <span className="w-8 h-px bg-[#d4af37] transition-all duration-300 group-hover:w-12" />
              <svg
                className="w-3.5 h-3.5 text-[#d4af37] transition-transform duration-300 group-hover:translate-x-1"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function TailorsSection() {
  const t = useTranslations("TailorsSection");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isArabic = locale === "ar";

  const [tailors, setTailors] = useState<TailorShopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: false,
      loop: false,
      slidesToScroll: 1,
      direction: isArabic ? "rtl" : "ltr",
      breakpoints: {
        "(max-width: 640px)": { slidesToScroll: 1 },
        "(min-width: 641px)": { slidesToScroll: 2 },
        "(min-width: 1024px)": { slidesToScroll: 3 },
      },
    },
    [
      Autoplay({
        delay: 4500,
        stopOnInteraction: true,
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
    emblaApi?.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    emblaApi?.scrollNext();
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      emblaApi?.scrollTo(index);
    },
    [emblaApi],
  );

  useEffect(() => {
    const fetchTailors = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          items: TailorShopListItem[];
        }>("/api/tailors?limit=100");

        if (!data?.success) {
          throw new Error("Failed to load tailors");
        }

        setTailors(data.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load tailors");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTailors();
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
  }, [emblaApi, onSelect]);

  useEffect(() => {
    emblaApi?.reInit();
  }, [emblaApi, tailors, isArabic]);

  if (loading) {
    return (
      <section className={SECTION_CLASS} aria-label={t("ariaLabel")}>
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
          {t("loading")}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={SECTION_CLASS} aria-label={t("ariaLabel")}>
        <div className="text-center text-red-500 px-4">{error}</div>
      </section>
    );
  }

  if (tailors.length === 0) {
    return (
      <section className={SECTION_CLASS} aria-label={t("ariaLabel")}>
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
          {t("empty")}
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16"
      aria-label={t("ariaLabel")}
    >
      <div className="absolute inset-0 bg-linear-to-br from-[#f0ebe3] via-(--bg-page) to-(--bg-page)" />
      <div className="absolute top-0 left-0 right-0 h-px bg-linear-to-r from-transparent via-[#d4af37]/40 to-transparent" />

      <div className="relative px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80)">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 sm:gap-8 lg:gap-12 mb-10 xs:mb-12 sm:mb-14 md:mb-16 lg:mb-(--space-64)">
          <div className="max-w-xl">
            <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3 flex items-center gap-3">
              <span className="block w-8 h-px bg-[#d4af37]/60" />
              <span>{t("eyebrow")}</span>
            </span>
            <h2 className="[font-family:var(--font-display)] text-[36px] xs:text-[40px] sm:text-[44px] md:text-[48px] lg:text-[52px] xl:text-[56px] font-normal leading-[1.05] tracking-[-0.02em] text-black mb-4">
              {t("title")}
            </h2>
            <p className="[font-family:var(--font-body)] text-[14px] sm:text-[15px] leading-[1.65] text-(--color-grey-muted) max-w-md">
              {t("description")}
            </p>
          </div>

          <div className="flex items-center gap-4 lg:gap-6 shrink-0">
            <span className="hidden sm:block [font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
              {String(tailors.length).padStart(2, "0")} {t("ateliers")}
            </span>
            <Link
              href="/tailors"
              className="[font-family:var(--font-ui)] text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-black border border-black px-5 py-2.5 hover:bg-black hover:text-white transition-all duration-300 inline-flex items-center gap-2 font-normal"
            >
              {t("viewAll")}
              <svg
                className="w-3.5 h-3.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="relative group/carousel">
          <button
            onClick={scrollPrev}
            disabled={!prevBtnEnabled}
            className={`hidden md:flex absolute -left-2 lg:-left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-11 lg:h-11 bg-black text-white items-center justify-center transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 hover:bg-[#1a1a1a] ${
              !prevBtnEnabled ? "opacity-30! cursor-not-allowed" : ""
            }`}
            aria-label="Previous tailor"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <button
            onClick={scrollNext}
            disabled={!nextBtnEnabled}
            className={`hidden md:flex absolute -right-2 lg:-right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 lg:w-11 lg:h-11 bg-black text-white items-center justify-center transition-all duration-300 opacity-0 group-hover/carousel:opacity-100 hover:bg-[#1a1a1a] ${
              !nextBtnEnabled ? "opacity-30! cursor-not-allowed" : ""
            }`}
            aria-label="Next tailor"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          <div className="overflow-hidden py-4 -my-4" ref={emblaRef}>
            <div className="flex -mx-2 sm:-mx-2.5 md:-mx-3">
              {tailors.map((tailor, index) => (
                <div
                  key={tailor._id}
                  className="flex-[0_0_78%] xs:flex-[0_0_65%] sm:flex-[0_0_48%] md:flex-[0_0_38%] lg:flex-[0_0_30%] xl:flex-[0_0_26%] px-2 sm:px-2.5 md:px-3 py-4"
                >
                  <TailorPortraitCard
                    tailor={tailor}
                    locale={locale}
                    index={index}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {scrollSnaps.length > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 sm:mt-10 md:mt-12">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => scrollTo(index)}
                className={`h-px transition-all duration-300 ${
                  index === selectedIndex
                    ? "w-10 bg-black"
                    : "w-4 bg-(--color-border) hover:bg-(--color-grey-muted)"
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
