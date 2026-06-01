"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import * as images from '../../../public/images/ImageIndex';

interface JoinOurCommunityProps {
    onApplyClick?: () => void;
}

export function JoinOurCommunity({ onApplyClick }: JoinOurCommunityProps) {
    const t = useTranslations("community");

    const handleApplyClick = () => {
        if (onApplyClick) {
            onApplyClick();
        } else {
            console.log("Apply to join clicked");
            // Add your apply logic here
        }
    };

    return (
        <div className="group relative overflow-hidden min-h-112.5 xs:min-h-[480px] sm:min-h-130 md:min-h-137.5 lg:min-h-145 xl:min-h-155 flex items-end p-6 xs:p-8 sm:p-10 md:p-12 lg:p-14 bg-[#111111]">
            <Image
                src={images.sub1}
                alt="A tailor is stitching mukhawar"
                className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-2000"
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                priority={false}
            />

            <div className="relative z-10 w-full">
                <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] uppercase tracking-[0.35em] text-white/40 mb-3 xs:mb-4 sm:mb-5 block">
                    {t("eyebrow")}
                </span>

                <h3 className="[font-family:var(--font-display)] text-[32px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] 2xl:text-[52px] font-normal tracking-[-0.02em] text-white mb-4 xs:mb-5 sm:mb-6 leading-[1.1]">
                    {t("title")}
                </h3>

                <p className="[font-family:var(--font-body)] text-[14px] xs:text-[12px] sm:text-[13px] md:text-[14px] lg:text-[15px] xl:text-[16px] leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] text-white/70 mb-6 xs:mb-7 sm:mb-8 md:mb-9 lg:mb-10 max-w-md font-normal">
                    {t("description")}
                </p>

                <button
                    onClick={handleApplyClick}
                    className="[font-family:var(--font-body)] text-[12px] xs:text-[10px] sm:text-[11px] md:text-[12px] lg:text-[13px] uppercase tracking-[0.3em] px-5 xs:px-6 sm:px-7 md:px-8 py-2.5 xs:py-3 sm:py-3.5 md:py-4 border border-white/30 text-white hover:bg-white hover:text-black transition-all duration-300 font-normal"
                >
                    {t("btn")}
                </button>
            </div>
        </div>
    );
}