"use client";

import {
  Children,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type RelatedProductsCarouselProps = {
  children: ReactNode;
  isRtl?: boolean;
  className?: string;
};

/** Compact related-product slides — smaller than shop grid / home carousels */
export const RELATED_SLIDE_CLASS =
  "min-w-0 flex-[0_0_48%] xs:flex-[0_0_42%] sm:flex-[0_0_34%] md:flex-[0_0_28%] lg:flex-[0_0_22%] xl:flex-[0_0_18.5%] px-1.5 xs:px-2 sm:px-2.5";

export default function RelatedProductsCarousel({
  children,
  isRtl = false,
  className = "",
}: RelatedProductsCarouselProps) {
  const slides = Children.toArray(children).filter(Boolean);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    dragFree: false,
    loop: slides.length > 3,
    slidesToScroll: 1,
    axis: "x",
    direction: isRtl ? "rtl" : "ltr",
  });

  const [prevBtnEnabled, setPrevBtnEnabled] = useState(false);
  const [nextBtnEnabled, setNextBtnEnabled] = useState(false);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setPrevBtnEnabled(emblaApi.canScrollPrev());
    setNextBtnEnabled(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (emblaApi) emblaApi.reInit();
  }, [emblaApi, slides.length, isRtl]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  if (!slides.length) return null;

  return (
    <div className={`relative group/related ${className}`}>
      <button
        type="button"
        onClick={scrollPrev}
        disabled={!prevBtnEnabled}
        aria-label={isRtl ? "السابق" : "Previous"}
        className={`hidden sm:flex absolute start-0 top-[38%] z-20 size-9 -translate-y-1/2 -translate-x-1/2 items-center justify-center rounded-full border border-[#E5E5E0] bg-white shadow-md transition-all duration-300 hover:scale-105 hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-35 rtl:translate-x-1/2 ${
          prevBtnEnabled
            ? "opacity-0 group-hover/related:opacity-100"
            : "opacity-0"
        }`}
      >
        {isRtl ? (
          <ChevronRight className="size-4" strokeWidth={1.75} />
        ) : (
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        )}
      </button>

      <button
        type="button"
        onClick={scrollNext}
        disabled={!nextBtnEnabled}
        aria-label={isRtl ? "التالي" : "Next"}
        className={`hidden sm:flex absolute end-0 top-[38%] z-20 size-9 -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full border border-[#E5E5E0] bg-white shadow-md transition-all duration-300 hover:scale-105 hover:border-black hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:opacity-35 rtl:-translate-x-1/2 ${
          nextBtnEnabled
            ? "opacity-0 group-hover/related:opacity-100"
            : "opacity-0"
        }`}
      >
        {isRtl ? (
          <ChevronLeft className="size-4" strokeWidth={1.75} />
        ) : (
          <ChevronRight className="size-4" strokeWidth={1.75} />
        )}
      </button>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex will-change-transform -mx-1.5 xs:-mx-2 sm:-mx-2.5">
          {slides.map((slide, index) => (
            <div
              key={
                isValidElement(slide) && slide.key != null ? slide.key : index
              }
              className={RELATED_SLIDE_CLASS}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
