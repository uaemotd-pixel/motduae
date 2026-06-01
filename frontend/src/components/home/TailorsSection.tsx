"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import * as images from "../../../public/images/ImageIndex";

// Tailors Data
const tailorsData = [
    {
        id: 1,
        nameEn: "Ayesha Al Riaz",
        nameAr: "عائشة الرياز",
        locationEn: "DUBAI, AL FAHIDI",
        locationAr: "دبي، الفهيدي",
        badgeEn: "5+ Years",
        badgeAr: "+5 سنوات",
        image: images.tailor1,
        descEn: "Master of traditional Emirati kandura and bespoke suits. Third-generation tailor preserving Dubai's rich textile heritage.",
        descAr: "خبيرة في الكندورة الإماراتية التقليدية والبدلات المخصصة. خياط من الجيل الثالث يحافظ على تراث دبي النسيجي الغني.",
        rating: "4.9",
        reviews: "247"
    },
    {
        id: 2,
        nameEn: "Asma Al Naeem",
        nameAr: "أسماء النعيم",
        locationEn: "ABU DHABI, CORNICHE",
        locationAr: "أبو ظبي، الكورنيش",
        badgeEn: "Royal Court",
        badgeAr: "البلاط الملكي",
        image: images.tailor2,
        descEn: "Official tailor to Abu Dhabi's royal court. Specializing in ceremonial bisht and luxury evening wear with over 40 years of excellence.",
        descAr: "خياط رسمي للبلاط الملكي في أبو ظبي. متخصص في البشت الاحتفالي وملابس السهرة الفاخرة مع أكثر من 40 عاماً من التميز.",
        rating: "5.0",
        reviews: "398"
    },
    {
        id: 3,
        nameEn: "Fatima Al Qasimi",
        nameAr: "فاطمة القاسمي",
        locationEn: "SHARJAH, HEART OF SHARJAH",
        locationAr: "الشارقة، قلب الشارقة",
        badgeEn: "Women's Wear",
        badgeAr: "ملابس نسائية",
        image: images.tailor3,
        descEn: "Pioneering female tailor redefining traditional abaya and jalabiya. Award-winning designer blending heritage with contemporary elegance.",
        descAr: "خياطة رائدة تعيد تعريف العباية والجلابية التقليدية. مصممة حاصلة على جوائز تمزج بين التراث والأناقة المعاصرة.",
        rating: "4.8",
        reviews: "312"
    },
    {
        id: 4,
        nameEn: "Kalsoom Al Bashir",
        nameAr: "كلثوم البشير",
        locationEn: "DUBAI, UAE",
        locationAr: "دبي، الإمارات",
        badgeEn: "Master Weaver",
        badgeAr: "حائكة ماهرة",
        image: images.tailor4,
        descEn: "Master weaver specializing in traditional wool and cotton fabrics. Family legacy spanning 60 years in Dubai's historic textile district.",
        descAr: "حائكة ماهرة متخصصة في الأقمشة الصوفية والقطنية التقليدية. إرث عائلي يمتد لـ 60 عاماً في المنطقة التاريخية للنسيج في دبي.",
        rating: "4.9",
        reviews: "178"
    }
];

export function TailorsSection() {
    const t = useTranslations("TailorsSection");
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
        <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) last:mb-0 mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
            <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto">
                {/* Section Header */}
                <div className="text-center max-w-3xl mx-auto mb-10 xs:mb-12 sm:mb-14 md:mb-16 lg:mb-(--space-64)">
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 xs:mb-3 flex items-center justify-center gap-2 xs:gap-3">
                        <span className="block w-6 xs:w-8 h-px bg-(--color-grey-muted)"></span>
                        <span>{t("eyebrow")}</span>
                        <span className="block w-6 xs:w-8 h-px bg-(--color-grey-muted)"></span>
                    </span>
                    <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] font-normal leading-[1.1] xs:leading-[1.09] sm:leading-[1.08] tracking-[-0.01em] text-black mb-3 xs:mb-4">
                        {t("title")}
                    </h2>
                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] leading-normal xs:leading-[1.6] text-(--color-grey-muted) max-w-2xl mx-auto">
                        {t("description")}
                    </p>
                </div>

                {/* Tailors Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 xs:gap-7 sm:gap-8 md:gap-8 lg:gap-6 xl:gap-8">
                    {tailorsData.map((tailor) => {
                        const displayName = currentLanguage === "ar" ? tailor.nameAr : tailor.nameEn;
                        const displayLocation = currentLanguage === "ar" ? tailor.locationAr : tailor.locationEn;
                        const displayBadge = currentLanguage === "ar" ? tailor.badgeAr : tailor.badgeEn;
                        const displayDesc = currentLanguage === "ar" ? tailor.descAr : tailor.descEn;
                        const buttonText = currentLanguage === "ar" ? "احجز استشارة" : "Book Consultation";
                        const reviewsText = currentLanguage === "ar" ? "مراجعة" : "reviews";

                        return (
                            <div
                                key={tailor.id}
                                className="group bg-(--bg-page) border border-(--color-border) overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                            >
                                <div className="aspect-4/5 relative overflow-hidden bg-(--color-border)/10">
                                    <img
                                        src={
                                            typeof tailor.image === "string"
                                                ? tailor.image
                                                : tailor.image.src
                                        }
                                        alt={displayName}
                                        className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <div className="absolute bottom-4 xs:bottom-5 left-4 xs:left-5">
                                        <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] sm:text-[11px] md:text-[10px] lg:text-[11px] uppercase tracking-[0.24em] bg-black text-white px-2.5 xs:px-3 py-1 xs:py-1.5 font-normal">
                                            {displayBadge}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5 xs:p-6 sm:p-7 md:p-8 lg:p-6 xl:p-8">
                                    <div className="mb-4 xs:mb-5">
                                        <h3 className="[font-family:var(--font-display)] text-[20px] xs:text-[22px] sm:text-[24px] md:text-[22px] lg:text-[24px] xl:text-[26px] 2xl:text-[28px] font-normal leading-[1.2] tracking-[-0.01em] text-black mb-1.5">
                                            {displayName}
                                        </h3>
                                        <p className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[12px] uppercase tracking-[0.24em] text-(--color-grey-muted) font-normal">
                                            {displayLocation}
                                        </p>
                                    </div>
                                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] leading-normal xs:leading-[1.6] text-(--color-grey-muted) mb-5 xs:mb-6 font-normal">
                                        {displayDesc}
                                    </p>
                                    <div className="flex items-center justify-between pt-4 xs:pt-5 border-t border-(--color-border)">
                                        <div className="flex items-center gap-1">
                                            <svg
                                                className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-[#000000] fill-[#000000]"
                                                viewBox="0 0 24 24"
                                                fill="currentColor"
                                                stroke="none"
                                            >
                                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                            </svg>
                                            <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] sm:text-[11px] font-medium tracking-[0.2em] text-black">
                                                {tailor.rating}
                                            </span>
                                            <span className="[font-family:var(--font-ui)] text-[8px] xs:text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) font-normal">
                                                ({tailor.reviews} {reviewsText})
                                            </span>
                                        </div>
                                        <Link
                                            href={`/tailors/${tailor.id}`}
                                            className="[font-family:var(--font-ui)] text-[10px] xs:text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 hover:opacity-50 transition inline-flex items-center gap-1 group/link font-normal"
                                        >
                                            {buttonText}
                                            <svg
                                                className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-black group-hover/link:translate-x-1 transition-transform duration-200"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                            >
                                                <path d="M9 18l6-6-6-6" />
                                            </svg>
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* View All Link */}
                <div className="text-center mt-12 xs:mt-14 sm:mt-16 md:mt-18 lg:mt-(--space-48) pt-10">
                    <Link
                        href="/tailors"
                        className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[12px] xl:text-[13px] uppercase tracking-[0.28em] text-black border-b border-black pb-1 xs:pb-1.5 hover:opacity-50 transition-all duration-200 inline-flex items-center gap-2 group font-normal"
                    >
                        {t("viewAll")}
                        <svg
                            className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 text-black group-hover:translate-x-1 transition-transform duration-200"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M9 18l6-6-6-6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </section>
    );
}