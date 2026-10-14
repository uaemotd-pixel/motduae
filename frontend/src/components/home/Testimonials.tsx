"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api/client";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

interface Testimonial {
  id: number | string;
  nameEn: string;
  nameAr: string;
  titleEn: string;
  titleAr: string;
  quoteEn: string;
  quoteAr: string;
  rating: number;
  verified?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(rating);

  return (
    <div className="flex gap-0.5 xs:gap-1">
      {Array.from({ length: fullStars }).map((_, i) => (
        <svg
          key={`full-${i}`}
          className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-black fill-black"
          viewBox="0 0 24 24"
          fill="currentColor"
          stroke="none"
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}

      {hasHalfStar && (
        <svg
          key="half"
          className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-black"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <clipPath id="half-star-clip">
              <rect x="0" y="0" width="12" height="24" />
            </clipPath>
          </defs>
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill="black"
            clipPath="url(#half-star-clip)"
          />
          <polygon
            points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
            fill="none"
            stroke="black"
          />
        </svg>
      )}

      {Array.from({ length: emptyStars }).map((_, i) => (
        <svg
          key={`empty-${i}`}
          className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-black"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

function TestimonialCard({
  testimonial,
  language,
  verifiedLabel,
  readMoreLabel,
  showLessLabel,
}: {
  testimonial: Testimonial;
  language: "en" | "ar";
  verifiedLabel: string;
  readMoreLabel: string;
  showLessLabel: string;
}) {
  const quoteRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  const displayName =
    language === "ar"
      ? testimonial.nameAr || testimonial.nameEn
      : testimonial.nameEn || testimonial.nameAr;
  const displayTitle =
    language === "ar"
      ? testimonial.titleAr || testimonial.titleEn
      : testimonial.titleEn || testimonial.titleAr;
  const displayQuote =
    language === "ar"
      ? testimonial.quoteAr || testimonial.quoteEn
      : testimonial.quoteEn || testimonial.quoteAr;

  useEffect(() => {
    setExpanded(false);
  }, [displayQuote]);

  useEffect(() => {
    const el = quoteRef.current;
    if (!el) return;

    const measure = () => {
      if (expanded) {
        setOverflows(true);
        return;
      }
      setOverflows(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [displayQuote, expanded]);

  return (
    <div className="flex h-full min-h-[260px] flex-col border border-(--color-border) bg-white/60 p-5 backdrop-blur-sm transition-all duration-300 hover:shadow-lg xs:p-6 sm:min-h-[280px] sm:p-7 md:p-8 lg:p-10">
      <div className="mb-5 flex min-h-0 flex-1 flex-col xs:mb-6 sm:mb-7">
        <StarRating rating={testimonial.rating} />
        {testimonial.verified ? (
          <p className="mt-2 [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
            {verifiedLabel}
          </p>
        ) : null}
        <p
          ref={quoteRef}
          className={[
            "mt-4 [font-family:var(--font-body)] text-[13px] leading-[1.7] font-normal italic text-(--color-grey-muted) xs:mt-5 xs:text-[12px] sm:mt-6 sm:text-[13px] sm:leading-[1.8] md:text-[12px] lg:text-[13px] xl:text-[14px]",
            // Fixed 4-line box so short and long reviews keep even card heights
            expanded ? "" : "line-clamp-4 min-h-[calc(1.7em*4)] sm:min-h-[calc(1.8em*4)]",
          ].join(" ")}
        >
          &quot;{displayQuote}&quot;
        </p>
        {overflows ? (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2 self-start [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.18em] text-black underline underline-offset-4 transition hover:opacity-60"
          >
            {expanded ? showLessLabel : readMoreLabel}
          </button>
        ) : null}
      </div>
      <div className="mt-auto shrink-0 border-t border-(--color-border)/70 pt-4">
        <p className="[font-family:var(--font-display)] text-[15px] font-normal uppercase leading-[1.2] tracking-[-0.01em] text-black xs:text-[16px] sm:text-[17px] md:text-[16px] lg:text-[17px] xl:text-[18px] 2xl:text-[20px]">
          {displayName}
        </p>
        <p className="mt-1.5 [font-family:var(--font-ui)] text-[10px] font-normal uppercase tracking-[0.28em] text-(--color-grey-muted) xs:mt-2 xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px]">
          {displayTitle}
        </p>
      </div>
    </div>
  );
}

const TESTIMONIALS_PER_PAGE = 12;
const MAX_NAV_DOTS = 5;

function hasQuote(item: Testimonial) {
  return Boolean(String(item.quoteEn || item.quoteAr || "").trim());
}

function mergeTestimonials(existing: Testimonial[], incoming: Testimonial[]) {
  const seen = new Set(existing.map((item) => String(item.id)));
  const next = [...existing];
  for (const item of incoming) {
    const id = String(item.id);
    if (seen.has(id)) continue;
    seen.add(id);
    next.push(item);
  }
  return next;
}

export function Testimonials() {
  const t = useTranslations("Testimonials");
  const params = useParams();
  const currentLanguage = params.locale === "ar" ? "ar" : "en";
  const isArabic = currentLanguage === "ar";

  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (nextPage: number) => {
    const query = new URLSearchParams({
      page: String(nextPage),
      limit: String(TESTIMONIALS_PER_PAGE),
    });
    const fetched = await api.get<{
      items?: Testimonial[];
      totalPages?: number;
    }>(`/api/customer/reviews?${query.toString()}`);
    const items = (Array.isArray(fetched?.items) ? fetched.items : []).filter(
      hasQuote,
    );
    return {
      items,
      page: nextPage,
      totalPages: Number(fetched?.totalPages) || 0,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const result = await fetchPage(1);
        if (cancelled) return;
        setAllTestimonials(result.items);
        setPage(result.page);
        setTotalPages(result.totalPages);
      } catch (err) {
        console.error("Failed to load customer reviews:", err);
        if (!cancelled) {
          setAllTestimonials([]);
          setPage(1);
          setTotalPages(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const handleLoadMore = async () => {
    if (loadingMore || page >= totalPages) return;
    try {
      setLoadingMore(true);
      const result = await fetchPage(page + 1);
      setAllTestimonials((prev) => mergeTestimonials(prev, result.items));
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error("Failed to load more reviews:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      align: "start",
      containScroll: "trimSnaps",
      dragFree: false,
      loop: allTestimonials.length > 1,
      slidesToScroll: 1,
      direction: isArabic ? "rtl" : "ltr",
    },
    [
      Autoplay({
        delay: 3500,
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

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const syncSnaps = () => {
      setScrollSnaps(emblaApi.scrollSnapList());
      onSelect();
    };
    syncSnaps();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", syncSnaps);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", syncSnaps);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi) return;
    const index = emblaApi.selectedScrollSnap();
    emblaApi.reInit();
    emblaApi.scrollTo(index, true);
  }, [emblaApi, allTestimonials, isArabic]);

  const showNav = scrollSnaps.length > 1;
  const hasMore = page < totalPages;
  const snapCount = scrollSnaps.length;
  const dotCount = Math.min(MAX_NAV_DOTS, snapCount);
  const activeDot = snapCount > 0 ? selectedIndex % dotCount : 0;

  const scrollToDot = useCallback(
    (dotIndex: number) => {
      if (!emblaApi || dotCount <= 0) return;
      const cycle = Math.floor(selectedIndex / dotCount);
      let target = cycle * dotCount + dotIndex;
      if (target === selectedIndex && target + dotCount < snapCount) {
        target += dotCount;
      }
      if (target >= snapCount) {
        target = dotIndex < snapCount ? dotIndex : snapCount - 1;
      }
      emblaApi.scrollTo(target);
    },
    [emblaApi, selectedIndex, dotCount, snapCount],
  );

  return (
    <section className="py-12 xs:py-16 sm:py-20 md:py-24 lg:py-section-gap px-4 xs:px-6 sm:px-8 md:px-12 lg:px-margin-desktop max-w-container-max mx-auto bg-(--bg-page) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
      <div className="text-center mb-10 xs:mb-12 sm:mb-14 md:mb-16 lg:mb-20">
        <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[56px] font-normal tracking-[-0.02em] text-black leading-[1.1] xs:leading-[1.12]">
          {t("title")}
        </h2>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse border border-(--color-border) bg-black/5"
            />
          ))}
        </div>
      ) : allTestimonials.length === 0 ? (
        <p className="text-center text-sm text-(--color-grey-muted) [font-family:var(--font-body)]">
          {t("empty")}
        </p>
      ) : (
        <>
          <div className="relative group/carousel">
            {showNav && (
              <>
                <button
                  type="button"
                  onClick={scrollPrev}
                  disabled={!prevBtnEnabled}
                  className={`hidden sm:flex absolute ${isArabic ? "right-2 xs:right-3 sm:right-4" : "left-2 xs:left-3 sm:left-4"} top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/carousel:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] hover:cursor-pointer group/prev ${
                    !prevBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  aria-label="Previous review"
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
                    <path
                      d={isArabic ? "M9 18l6-6-6-6" : "M15 18l-6-6 6-6"}
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={scrollNext}
                  disabled={!nextBtnEnabled}
                  className={`hidden sm:flex absolute ${isArabic ? "left-2 xs:left-3 sm:left-4" : "right-2 xs:right-3 sm:right-4"} top-1/2 -translate-y-1/2 z-20 w-8 xs:w-9 sm:w-10 h-8 xs:h-9 sm:h-10 rounded-full bg-white border border-[#E5E5E0] items-center justify-center transition-all duration-300 shadow-md opacity-0 group-hover/carousel:opacity-100 pointer-events-auto hover:scale-110 hover:bg-[#1A2A3A] hover:border-[#1A2A3A] hover:cursor-pointer group/next ${
                    !nextBtnEnabled ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  aria-label="Next review"
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
                    <path
                      d={isArabic ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"}
                    />
                  </svg>
                </button>
              </>
            )}

            <div className="overflow-hidden py-4 -my-4" ref={emblaRef}>
              <div className="flex -mx-2.5 md:-mx-4 lg:-mx-5">
                {allTestimonials.map((testimonial) => (
                  <div
                    key={testimonial.id}
                    className="flex min-h-0 flex-[0_0_100%] px-2.5 py-4 sm:flex-[0_0_50%] md:px-4 lg:flex-[0_0_33.333%] lg:px-5 xl:flex-[0_0_25%]"
                  >
                    <TestimonialCard
                      testimonial={testimonial}
                      language={currentLanguage}
                      verifiedLabel={t("verifiedPurchase")}
                      readMoreLabel={t("readMore")}
                      showLessLabel={t("showLess")}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showNav && (
            <div className="mt-6 flex justify-center gap-1.5 xs:mt-8 sm:mt-10 md:mt-12 lg:mt-(--space-32)">
              {Array.from({ length: dotCount }).map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => scrollToDot(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 hover:cursor-pointer ${
                    index === activeDot
                      ? "w-5 bg-black"
                      : "w-1.5 bg-black/25 hover:bg-black/45"
                  }`}
                  aria-label={`Go to review group ${index + 1}`}
                  aria-current={index === activeDot ? "true" : undefined}
                />
              ))}
            </div>
          )}

          {hasMore && (
            <div className="mt-8 flex justify-center xs:mt-10 sm:mt-12">
              <button
                type="button"
                onClick={() => void handleLoadMore()}
                disabled={loadingMore}
                className="inline-flex items-center justify-center min-w-[10rem] px-6 py-2.5 border border-black bg-transparent text-black text-[11px] uppercase tracking-[0.2em] [font-family:var(--font-ui)] transition-colors hover:bg-black hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loadingMore ? t("loadingMore") : t("loadMore")}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
