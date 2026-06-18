"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import {
    type TailorShopListItem,
    formatTailorRating,
    getTailorDisplayFields,
    resolveTailorImage,
} from "@/lib/tailors";

export default function TailorsListing() {
    const t = useTranslations("TailorsListing");
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";

    const [tailors, setTailors] = useState<TailorShopListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTailors = async () => {
            try {
                setLoading(true);
                setError(null);

                const data = await api.get<{ success: boolean; items: TailorShopListItem[] }>(
                    "/api/tailors?limit=100",
                );

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

    return (
        <div className="min-h-screen bg-[#FDFAF5]">
            <div className="py-12 sm:py-16 lg:py-24 border-b border-[#E4E0D8] px-4 sm:px-8 lg:px-12">
                <div className="w-full text-left">
                    <div className="mb-4 xs:mb-6">
                        <div className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px] uppercase tracking-[0.28em] text-[#7A7A72] flex items-center justify-start gap-2 xs:gap-3">
                            <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                            <span>{t("eyebrow")}</span>
                            <span className="block w-6 xs:w-8 h-px bg-[#7A7A72]"></span>
                        </div>
                    </div>
                    <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] font-normal leading-[1.1] tracking-[-0.01em] text-black mb-3 xs:mb-4">
                        {t("title")}
                    </h1>
                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] leading-normal text-[#7A7A72] max-w-2xl">
                        {t("description")}
                    </p>
                </div>
            </div>

            <div className="px-4 sm:px-8 lg:px-12 py-8 sm:py-12 lg:py-16">
                {loading ? (
                    <div className="flex items-center justify-center py-28">
                        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-[#7A7A72]">
                            {t("loading")}
                        </p>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center text-center py-28">
                        <h2 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                            {t("errorTitle")}
                        </h2>
                        <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed">{error}</p>
                    </div>
                ) : tailors.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-28">
                        <h2 className="text-[18px] md:text-[22px] uppercase tracking-widest text-black mb-3">
                            {t("emptyTitle")}
                        </h2>
                        <p className="text-[#7A7A72] text-[13px] max-w-xs leading-relaxed">
                            {t("empty")}
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="[font-family:var(--font-ui)] text-[11px] tracking-[0.18em] uppercase text-[#7A7A72] font-mono mb-8">
                            {t("showing", { count: tailors.length })}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                            {tailors.map((tailor) => {
                                const { name, description, location, badge } =
                                    getTailorDisplayFields(tailor, locale);
                                const imageUrl = resolveTailorImage(
                                    tailor.logo,
                                    tailor.coverImage,
                                );
                                const rating = formatTailorRating(tailor.rating);
                                const reviewCount = tailor.reviewCount ?? 0;

                                return (
                                    <Link
                                        key={tailor._id}
                                        href={`/tailors/${tailor.slug}`}
                                        className="group bg-white border border-[#E4E0D8] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1"
                                    >
                                        <div className="aspect-4/3 max-h-64 sm:max-h-72 relative overflow-hidden bg-[#F0EBE3]">
                                            <img
                                                src={imageUrl}
                                                alt={name}
                                                loading="lazy"
                                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                                            />
                                            <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            {badge && (
                                                <div className="absolute bottom-4 left-4">
                                                    <span className="[font-family:var(--font-ui)] text-[8px] xs:text-[9px] uppercase tracking-[0.24em] bg-black text-white px-2.5 py-1 font-normal">
                                                        {badge}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-5 sm:p-6">
                                            <h2 className="[font-family:var(--font-display)] text-[20px] sm:text-[22px] font-normal leading-[1.2] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                                                {name}
                                            </h2>
                                            <p className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-[#7A7A72] font-normal line-clamp-1 mb-3">
                                                {location}
                                            </p>
                                            <p className="[font-family:var(--font-body)] text-[13px] sm:text-[14px] leading-[1.6] text-[#7A7A72] mb-4 font-normal line-clamp-3">
                                                {description}
                                            </p>

                                            <div className="flex items-center justify-between pt-4 border-t border-[#E4E0D8]">
                                                <div className="flex items-center gap-1.5">
                                                    <svg
                                                        className="w-4 h-4 text-black fill-black"
                                                        viewBox="0 0 24 24"
                                                        fill="currentColor"
                                                        stroke="none"
                                                    >
                                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                    </svg>
                                                    <span className="[font-family:var(--font-ui)] text-[10px] sm:text-[11px] font-medium tracking-[0.2em] text-black">
                                                        {rating}
                                                    </span>
                                                    <span className="[font-family:var(--font-ui)] text-[8px] sm:text-[9px] uppercase tracking-[0.2em] text-[#7A7A72] font-normal">
                                                        ({reviewCount} {t("reviews")})
                                                    </span>
                                                </div>
                                                <span className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-0.5 group-hover:opacity-50 transition inline-flex items-center gap-1 font-normal">
                                                    {t("viewShop")}
                                                    <svg
                                                        className="w-3.5 h-3.5 text-black group-hover:translate-x-1 transition-transform duration-200"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="2"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M9 18l6-6-6-6" />
                                                    </svg>
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
