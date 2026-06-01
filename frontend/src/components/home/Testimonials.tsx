"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

// Testimonials Data
interface Testimonial {
  id: number;
  nameEn: string;
  nameAr: string;
  titleEn: string;
  titleAr: string;
  quoteEn: string;
  quoteAr: string;
  rating: number;
}

const testimonialsData: Testimonial[] = [
  {
    id: 1,
    nameEn: "Kauser Al QAYYUM",
    nameAr: "كاوسر القيوم",
    titleEn: "FINANCE EXECUTIVE · SHARJAH, UAE",
    titleAr: "مديرة مالية · الشارقة، الإمارات",
    quoteEn: "The level of precision from a smartphone scan is truly refined. The garment feels tailored to movement itself — understated, exact, and personal.",
    quoteAr: "مستوى الدقة من المسح عبر الهاتف الذكي راقٍ حقاً. الثوب يشعرك بأنه مصمم خصيصاً للحركة — أنيق، دقيق، وشخصي.",
    rating: 5
  },
  {
    id: 2,
    nameEn: "NOOR AL-SAYED",
    nameAr: "نور السيد",
    titleEn: "ART CURATOR · DUBAI",
    titleAr: "أمينة متحف فني · دبي",
    quoteEn: "A quiet connection to authentic fabrics and craft traditions. Every piece feels considered, not produced.",
    quoteAr: "اتصال هادئ بالأقمشة الأصيلة وتقاليد الحرف اليدوية. كل قطعة تشعرك بأنها مدروسة، وليست مصنعة.",
    rating: 4.9
  },
  {
    id: 3,
    nameEn: "MARIA AL JAVED",
    nameAr: "ماريا الجافد",
    titleEn: "ARCHITECT · ABU DHABI, UAE",
    titleAr: "مهندسة معمارية · أبو ظبي، الإمارات",
    quoteEn: "What stands out is clarity — knowing the origin of every material and the hands behind it makes each garment meaningful.",
    quoteAr: "ما يبرز هو الوضوح — معرفة أصل كل مادة والأيادي التي صنعتها يجعل كل ثوب ذا معنى.",
    rating: 5
  },
  {
    id: 4,
    nameEn: "MARYUM AL YAQOUB",
    nameAr: "مريم اليعقوب",
    titleEn: "ENTREPRENEUR · DUBAI, UAE",
    titleAr: "رائدة أعمال · دبي، الإمارات",
    quoteEn: "A seamless experience from consultation to delivery. The outcome feels precise, measured, and quietly exceptional.",
    quoteAr: "تجربة سلسة من الاستشارة إلى التسليم. النتيجة تشعرك بالدقة والقياس والتميز الهادئ.",
    rating: 5
  }
];

// Star Rating Component
function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 !== 0;
  const emptyStars = 5 - Math.ceil(rating);

  return (
    <div className="flex gap-0.5 xs:gap-1">
      {/* Full Stars */}
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

      {/* Half Star */}
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

      {/* Empty Stars */}
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

// Testimonial Card Component
function TestimonialCard({ testimonial, language }: { testimonial: Testimonial; language: "en" | "ar" }) {
  const displayName = language === "ar" ? testimonial.nameAr : testimonial.nameEn;
  const displayTitle = language === "ar" ? testimonial.titleAr : testimonial.titleEn;
  const displayQuote = language === "ar" ? testimonial.quoteAr : testimonial.quoteEn;

  return (
    <div className="p-5 xs:p-6 sm:p-7 md:p-8 lg:p-10 border border-(--color-border) bg-white/60 backdrop-blur-sm flex flex-col justify-between h-full transition-all duration-300 hover:shadow-lg">
      <div className="mb-6 xs:mb-7 sm:mb-8 md:mb-9 lg:mb-10">
        {/* Stars */}
        <StarRating rating={testimonial.rating} />
        {/* Quote */}
        <p className="[font-family:var(--font-body)] text-[14px] xs:text-[12px] sm:text-[13px] md:text-[12px] lg:text-[13px] xl:text-[14px] leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] md:leading-[1.9] italic text-(--color-grey-muted) font-normal mt-4 xs:mt-5 sm:mt-6">
          &quot;{displayQuote}&quot;
        </p>
      </div>
      {/* Author */}
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
  const [currentLanguage, setCurrentLanguage] = useState<"en" | "ar">("en");

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
    <section className="py-12 xs:py-16 sm:py-20 md:py-24 lg:py-section-gap px-4 xs:px-6 sm:px-8 md:px-12 lg:px-margin-desktop max-w-container-max mx-auto bg-(--bg-page) mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
      {/* Header */}
      <div className="text-center mb-10 xs:mb-12 sm:mb-14 md:mb-16 lg:mb-20">
        <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[56px] font-normal tracking-[-0.02em] text-black leading-[1.1] xs:leading-[1.12]">
          {t("title")}
        </h2>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 xs:gap-6 sm:gap-7 md:gap-8 lg:gap-10">
        {testimonialsData.map((testimonial) => (
          <TestimonialCard
            key={testimonial.id}
            testimonial={testimonial}
            language={currentLanguage}
          />
        ))}
      </div>
    </section>
  );
}