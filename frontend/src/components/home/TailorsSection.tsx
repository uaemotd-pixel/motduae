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

export function TailorsSection() {
  const t = useTranslations("TailorsSection");
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

        const data = await api.get<{
          success: boolean;
          items: TailorShopListItem[];
        }>("/api/tailors?limit=100");

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

  if (loading) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) last:mb-0 mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
          {t("loading")}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) last:mb-0 mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
        <div className="text-center text-red-500 px-4">{error}</div>
      </section>
    );
  }

  if (tailors.length === 0) {
    return (
      <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) last:mb-0 mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-(--space-80)">
        <div className="text-center [font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
          {t("empty")}
        </div>
      </section>
    );
  }

  return (
    <section className="bg-(--bg-page) py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80) border-(--color-border) my-6 xs:my-8 sm:my-10 md:my-12 lg:my-16">
      <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 md:gap-6 max-w-3xl mx-auto">
          {tailors.map((tailor) => {
            const { name, description, location, badge } =
              getTailorDisplayFields(tailor, locale);
            const imageUrl = resolveTailorImage(tailor.logo, tailor.coverImage);
            const rating = formatTailorRating(tailor.rating);
            const reviewCount = tailor.reviewCount ?? 0;

            return (
              <Link
                key={tailor._id}
                href={`/tailors/${tailor.slug}`}
                className="group block bg-(--bg-page) border border-(--color-border) overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:cursor-pointer text-left"
              >
                <div className="aspect-4/3 max-h-64 sm:max-h-72 relative overflow-hidden bg-(--color-border)/10">
                  <img
                    src={imageUrl}
                    alt={name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  {badge && (
                    <div className="absolute bottom-3 left-3">
                      <span className="[font-family:var(--font-ui)] text-[8px] xs:text-[9px] uppercase tracking-[0.24em] bg-black text-white px-2 py-0.5 font-normal">
                        {badge}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4 sm:p-5">
                  <div className="mb-3">
                    <h3 className="[font-family:var(--font-display)] text-[17px] sm:text-[18px] font-normal leading-[1.2] tracking-[-0.01em] text-black mb-1 line-clamp-2">
                      {name}
                    </h3>
                    <p className="[font-family:var(--font-ui)] text-[9px] sm:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) font-normal line-clamp-1">
                      {location}
                    </p>
                  </div>
                  <p className="[font-family:var(--font-body)] text-[12px] sm:text-[13px] leading-normal text-(--color-grey-muted) mb-4 font-normal line-clamp-2">
                    {description}
                  </p>
                  <div className="pt-3 border-t border-(--color-border)">
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
                        {rating}
                      </span>
                      <span className="[font-family:var(--font-ui)] text-[8px] xs:text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) font-normal">
                        ({reviewCount} {t("reviews")})
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

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
