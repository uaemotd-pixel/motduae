"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Link } from "@/i18n/navigation";
import * as images from "../../../public/images/ImageIndex";
import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";

const BACKGROUND_IMAGES = [
  images.hero_image_1.src,
  images.hero_image_2.src,
  images.hero_image_3.src,
];

export function HeroSection() {
  const params = useParams();
  const localParams = params.locale as string;
  const isArabic = localParams === "ar";
  const t = getTranslation(localParams);
  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      direction: isArabic ? "rtl" : "ltr",
      duration: 30,
    },
    [
      Autoplay({
        delay: 4000,
        stopOnInteraction: false,
        stopOnMouseEnter: false,
      }),
    ],
  );

  return (
    <section className="relative min-h-[fit] xs:min-h-[85vh] sm:min-h-[90vh] flex flex-col justify-end bg-(--color-near-black) overflow-hidden pt-16 xs:pt-20 sm:pt-24 md:pt-28 lg:pt-0 mb-8 xs:mb-10 sm:mb-12 md:mb-14 lg:mb-18">
      {/* Embla Carousel – background layer */}
      <div className="absolute inset-0 w-full h-full z-0">
        <div className="overflow-hidden h-full" ref={emblaRef}>
          <div className="flex h-full embla__container">
            {BACKGROUND_IMAGES.map((src, idx) => (
              <div key={idx} className="relative flex-[0_0_100%] h-full">
                <img
                  src={src}
                  alt={`${t.heroSection.imageAlt} ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/70" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content with Arabic font size adjustments */}
      <div className="relative z-10 border-white/10 px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) pt-6 xs:pt-8 sm:pt-10 pb-8 xs:pb-10 sm:pb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 xs:gap-8 sm:gap-10">
        <div className="max-w-140 w-full lg:w-auto">
          {/* Eyebrow text */}
          <span
            className={`
              [font-family:var(--font-ui)] uppercase tracking-[0.28em] text-white/60 mb-3 xs:mb-4 flex items-center gap-3
              ${
                isArabic
                  ? "text-[12px] xs:text-[11px] sm:text-[12px] md:text-[12px] lg:text-[14px] xl:text-[16px]"
                  : "text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[9px] xl:text-[10px]"
              }
            `}
          >
            <span className="block w-4 xs:w-5 h-px bg-white/40"></span>
            <span>{t.heroSection.eyebrow}</span>
          </span>

          {/* Heading H1 - significantly larger for Arabic */}
          <h1
            className={`
              [font-family:var(--font-display)] font-normal leading-[1.1] xs:leading-[1.08] sm:leading-[1.06] md:leading-[1.05] tracking-[-0.01em] text-white mb-4 xs:mb-5
              ${
                isArabic
                  ? "text-[38px] xs:text-[48px] sm:text-[52px] md:text-[58px] lg:text-[64px] xl:text-[70px] 2xl:text-[80px] 3xl:text-[90px]"
                  : "text-[32px] xs:text-[40px] sm:text-[44px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] 3xl:text-[72px]"
              }
            `}
          >
            <span className="lg:whitespace-nowrap">
              {t.heroSection.headlineLine1}{" "}
            </span>
            <br />
            <em className="italic lg:whitespace-nowrap">
              {t.heroSection.headlineLine2}
            </em>
          </h1>

          {/* Description paragraph */}
          <p
            className={`
              [font-family:var(--font-body)] leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] text-white/60 max-w-100 w-full mb-6 xs:mb-8
              ${
                isArabic
                  ? "text-[16px] xs:text-[15px] sm:text-[16px] md:text-[15px] lg:text-[16px] xl:text-[20px]"
                  : "text-[14px] xs:text-[13px] sm:text-[14px] md:text-[15px]"
              }
            `}
          >
            {t.heroSection.body}
          </p>
        </div>
      </div>
    </section>
  );
}
