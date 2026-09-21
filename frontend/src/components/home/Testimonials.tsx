"use client";

import { useCallback, useEffect, useState } from "react";
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
}: {
  testimonial: Testimonial;
  language: "en" | "ar";
  verifiedLabel: string;
}) {
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

  return (
    <div className="p-5 xs:p-6 sm:p-7 md:p-8 lg:p-10 border border-(--color-border) bg-white/60 backdrop-blur-sm flex flex-col justify-between h-full transition-all duration-300 hover:shadow-lg">
      <div className="mb-6 xs:mb-7 sm:mb-8 md:mb-9 lg:mb-10">
        <StarRating rating={testimonial.rating} />
        {testimonial.verified ? (
          <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) mt-2">
            {verifiedLabel}
          </p>
        ) : null}
        <p className="[font-family:var(--font-body)] text-[14px] xs:text-[12px] sm:text-[13px] md:text-[12px] lg:text-[13px] xl:text-[14px] leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] md:leading-[1.9] italic text-(--color-grey-muted) font-normal mt-4 xs:mt-5 sm:mt-6">
          &quot;{displayQuote}&quot;
        </p>
      </div>
      <div>
        <p className="[font-family:var(--font-display)] text-[15px] xs:text-[16px] sm:text-[17px] md:text-[16px] lg:text-[17px] xl:text-[18px] 2xl:text-[20px] font-normal tracking-[-0.01em] text-black leading-[1.2] uppercase">
          {displayName}
        </p>
        <p className="[font-family:var(--font-ui)] text-[10px] xs:text-[8px] sm:text-[9px] md:text-[8px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mt-1.5 xs:mt-2 font-normal">
          {displayTitle}
        </p>
      </div>
    </div>
  );
}

export function Testimonials() {
  const t = useTranslations("Testimonials");
  const params = useParams();
  const currentLanguage = params.locale === "ar" ? "ar" : "en";
  const isArabic = currentLanguage === "ar";

  const [allTestimonials, setAllTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        const fetched = await api.get<{ items?: Testimonial[] }>(
          "/api/customer/reviews?limit=12",
        );
        const items = Array.isArray(fetched?.items) ? fetched.items : [];
        setAllTestimonials(
          items.filter((item) =>
            Boolean(String(item.quoteEn || item.quoteAr || "").trim()),
          ),
        );
      } catch (err) {
        console.error("Failed to load customer reviews:", err);
        setAllTestimonials([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

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
  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  );

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
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, allTestimonials, isArabic]);

  const showNav = scrollSnaps.length > 1;

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
                    className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] xl:flex-[0_0_25%] px-2.5 md:px-4 lg:px-5 py-4"
                  >
                    <TestimonialCard
                      testimonial={testimonial}
                      language={currentLanguage}
                      verifiedLabel={t("verifiedPurchase")}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {showNav && (
            <div className="mt-6 flex justify-center gap-1.5 xs:mt-8 sm:mt-10 md:mt-12 lg:mt-(--space-32)">
              {scrollSnaps.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => scrollTo(index)}
                  className={`h-1.5 rounded-full transition-all duration-300 hover:cursor-pointer ${
                    index === selectedIndex
                      ? "w-5 bg-black"
                      : "w-1.5 bg-black/25 hover:bg-black/45"
                  }`}
                  aria-label={`Go to review ${index + 1}`}
                  aria-current={index === selectedIndex ? "true" : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
