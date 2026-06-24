"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import * as images from '../../../public/images/ImageIndex';

// Tips data structure
interface Tip {
    number: number;
    titleKey: string;
    descKey: string;
}

const tips: Tip[] = [
    { number: 1, titleKey: "tip1.title", descKey: "tip1.desc" },
    { number: 2, titleKey: "tip2.title", descKey: "tip2.desc" },
    { number: 3, titleKey: "tip3.title", descKey: "tip3.desc" },
];

export function MeasurementGuide() {
    const t = useTranslations("MeasurementGuide");

    const handleDownloadGuide = () => {
        // Add your download logic here
        console.log("Downloading guide...");
        // Example: window.open('/measurement-guide.pdf', '_blank');
    };

    return (
        <section id="how-it-works" className="bg-black/95 text-white py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) relative overflow-hidden mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
            {/* Background decorative elements */}
            <div className="absolute right-0 top-0 w-1/2 sm:w-2/5 md:w-1/3 h-full bg-white/5 -skew-x-12 translate-x-1/2"></div>
            <div className="absolute left-0 bottom-0 w-48 xs:w-56 sm:w-64 md:w-72 h-48 xs:h-56 sm:h-64 md:h-72 bg-white/2 rounded-full blur-3xl"></div>

            <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xs:gap-10 sm:gap-12 md:gap-14 lg:gap-(--space-64) items-start lg:items-center">
                    {/* LEFT SECTION - Content */}
                    <div>
                        {/* Eyebrow */}
                        <span className="[font-family:var(--font-ui)] text-[13px] xs:text-[14px] sm:text-[15px] uppercase tracking-[0.28em] text-white/40 mb-2 xs:mb-3 flex items-center gap-2 xs:gap-3">
                            <span className="block w-4 xs:w-5 h-px bg-white/40"></span>
                            <span>{t("eyebrow")}</span>
                        </span>

                        {/* Title */}
                        <h2 className="[font-family:var(--font-display)] text-[32px] xs:text-[36px] sm:text-[40px] md:text-[44px] lg:text-[48px] xl:text-[52px] font-normal leading-[1.2] xs:leading-[1.15] sm:leading-[1.1] tracking-[-0.02em] text-white mb-3 xs:mb-4 sm:mb-5">
                            {t("title")}
                        </h2>

                        {/* Description */}
                        <p className="[font-family:var(--font-body)] text-[17px] xs:text-[18px] sm:text-[19px] leading-normal text-white/50 mb-6 xs:mb-7 sm:mb-8 max-w-lg font-normal">
                            {t("description")}
                        </p>

                        {/* Tips */}
                        <div className="space-y-4 xs:space-y-5 sm:space-y-6">
                            {tips.map((tip) => (
                                <div key={tip.number} className="flex gap-3 xs:gap-4 items-start group">
                                    <div className="w-5 h-5 xs:w-6 xs:h-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-white/20 transition-colors">
                                        <span className="text-[12px] xs:text-[13px] text-white/80 font-medium">
                                            {tip.number}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="[font-family:var(--font-display)] text-[17px] xs:text-[18px] sm:text-[19px] font-normal text-white mb-0.5">
                                            {t(tip.titleKey)}
                                        </h4>
                                        <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] leading-relaxed text-white/40 font-normal">
                                            {t(tip.descKey)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <button
                            onClick={handleDownloadGuide}
                            className="mt-8 xs:mt-9 sm:mt-10 [font-family:var(--font-body)] text-[15px] xs:text-[16px] sm:text-[17px] uppercase tracking-[0.24em] bg-white text-black px-6 xs:px-7 sm:px-8 py-3 xs:py-3.5 sm:py-4 hover:opacity-80 transition-opacity duration-150 inline-flex items-center gap-2 group font-normal"
                        >
                            {t("btn")}
                            <svg
                                className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-black group-hover:translate-y-0.5 transition-transform duration-200"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                <polyline points="7 10 12 15 17 10" />
                                <line x1="12" y1="15" x2="12" y2="3" />
                            </svg>
                        </button>
                    </div>

                    {/* RIGHT SECTION - Measurement Image */}
                    <div className="relative mt-8 lg:mt-0 flex justify-center items-center">
                        {/* Decorative frame */}
                        <div className="relative w-full max-w-65 xs:max-w-[320px] sm:max-w-95 md:max-w-105 lg:max-w-115 aspect-4/5 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm shadow-2xl">
                            <Image
                                src={images.measure1}
                                alt="How to measure guide"
                                className="w-full h-full object-cover opacity-90 hover:scale-105 hover:opacity-100 transition-all duration-700"
                                fill
                                sizes="(max-width: 480px) 260px, (max-width: 640px) 320px, (max-width: 768px) 380px, (max-width: 1024px) 420px, 460px"
                                priority={false}
                            />
                            {/* Optional overlay */}
                            <div className="absolute inset-0 bg-linear-to-t from-black/30 via-transparent to-transparent"></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}