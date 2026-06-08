"use client";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import DesignGallery from "@/components/tailor/DesignGallery";
import {
    type TailorDesignListItem,
    type TailorShopDetailItem,
    formatTailorRating,
    getTailorDisplayFields,
    resolveTailorImage,
} from "@/lib/tailors";

type TailorDetailViewProps = {
    shop: TailorShopDetailItem;
    designs: TailorDesignListItem[];
    locale: Locale;
    labels: {
        tailors: string;
        reviews: string;
        phone: string;
        designsTitle: string;
        designsEmpty: string;
        fromPrice: string;
        estimatedDays: string;
        days: string;
        startOrder: string;
    };
};

export default function TailorDetailView({
    shop,
    designs,
    locale,
    labels,
}: TailorDetailViewProps) {
    const { name, description, location, badge } = getTailorDisplayFields(shop, locale);
    const coverImage = resolveTailorImage(shop.logo, shop.coverImage);
    const rating = formatTailorRating(shop.rating);
    const reviewCount = shop.reviewCount ?? 0;

    return (
        <div className="bg-(--bg-page) min-h-screen pt-20 pb-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-(--color-grey-muted) mb-6">
                    <Link href="/tailors" className="hover:text-black transition">
                        {labels.tailors}
                    </Link>
                    <span>/</span>
                    <span className="text-black">{badge || name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
                    <div className="aspect-4/3 lg:aspect-square bg-[#F0EBE3] overflow-hidden rounded-sm">
                        <img
                            src={coverImage}
                            alt={name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex flex-col justify-center">
                        {badge && (
                            <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-3">
                                {badge}
                            </span>
                        )}
                        <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] lg:text-[44px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3">
                            {name}
                        </h1>
                        <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mb-4">
                            {location}
                        </p>

                        <div className="flex items-center gap-2 mb-6">
                            <svg
                                className="w-4 h-4 text-black fill-black"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                                stroke="none"
                            >
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="[font-family:var(--font-ui)] text-[11px] font-medium tracking-[0.2em] text-black">
                                {rating}
                            </span>
                            <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                                ({reviewCount} {labels.reviews})
                            </span>
                        </div>

                        <p className="[font-family:var(--font-body)] text-[14px] sm:text-[15px] leading-relaxed text-(--color-grey-muted) mb-6">
                            {description}
                        </p>

                        {shop.phone && (
                            <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-black">
                                <span className="text-(--color-grey-muted)">{labels.phone}: </span>
                                <a href={`tel:${shop.phone}`} className="hover:opacity-60 transition">
                                    {shop.phone}
                                </a>
                            </p>
                        )}
                    </div>
                </div>

                <DesignGallery
                    tailorSlug={shop.slug}
                    designs={designs}
                    locale={locale}
                    labels={{
                        title: labels.designsTitle,
                        empty: labels.designsEmpty,
                        fromPrice: labels.fromPrice,
                        estimatedDays: labels.estimatedDays,
                        days: labels.days,
                        startOrder: labels.startOrder,
                    }}
                />
            </div>
        </div>
    );
}
