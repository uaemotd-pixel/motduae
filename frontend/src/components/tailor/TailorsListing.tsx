"use client";

import { useCallback, useEffect, useState } from "react";
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
import { resolveMediaUrl } from "@/lib/media";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { ArrowUpRight, MapPin, Star } from "lucide-react";

const DEFAULT_LIMIT = 12;
const LIMIT_OPTIONS = [6, 12, 24, 48];

type TailorsListResponse = {
  success: boolean;
  items: TailorShopListItem[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export default function TailorsListing() {
  const t = useTranslations("TailorsListing");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const [tailors, setTailors] = useState<TailorShopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchTailors = useCallback(
    async (page = 1, limitOverride?: number) => {
      try {
        setLoading(true);
        setError(null);

        const pageLimit = limitOverride ?? limit;
        const data = await api.get<TailorsListResponse>(
          `/api/tailors?page=${page}&limit=${pageLimit}`,
        );

        if (!data?.success) {
          throw new Error("Failed to load tailors");
        }

        setTailors(data.items || []);
        setCurrentPage(data.page || page);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 0);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load tailors");
        setError(message);
        setTailors([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchTailors(1, limit);
  }, [fetchTailors, limit]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchTailors(page);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#FAF8F4_0%,#FFFFFF_28%,#FFFFFF_100%)]">
      <div className="border-b border-[#E4E0D8] px-4 py-12 sm:px-8 sm:py-16 lg:px-12 lg:py-24">
        <div className="w-full text-left">
          <div className="mb-4 xs:mb-6">
            <div className="flex items-center justify-start gap-2 text-[10px] uppercase tracking-[0.28em] text-[#7A7A72] [font-family:var(--font-ui)] xs:gap-3 xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[10px] xl:text-[11px]">
              <span className="block h-px w-6 bg-[#7A7A72] xs:w-8" />
              <span>{t("eyebrow")}</span>
              <span className="block h-px w-6 bg-[#7A7A72] xs:w-8" />
            </div>
          </div>
          <h1 className="mb-3 [font-family:var(--font-display)] text-[32px] font-normal leading-[1.1] tracking-[-0.01em] text-black xs:mb-4 xs:text-[38px] sm:text-[42px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px]">
            {t("title")}
          </h1>
          <p className="max-w-2xl [font-family:var(--font-body)] text-[14px] leading-normal text-[#7A7A72] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px]">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {loading ? (
          <ProductGridSkeleton
            count={Math.min(limit, 8)}
            columnsClassName="grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:gap-6 xl:grid-cols-4"
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <h2 className="mb-3 font-ui text-[18px] uppercase tracking-widest text-black md:text-[22px]">
              {t("errorTitle")}
            </h2>
            <p className="max-w-xs text-[13px] leading-relaxed text-[#7A7A72]">
              {error}
            </p>
          </div>
        ) : tailors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <h2 className="mb-3 font-ui text-[18px] uppercase tracking-widest text-black md:text-[22px]">
              {t("emptyTitle")}
            </h2>
            <p className="max-w-xs text-[13px] leading-relaxed text-[#7A7A72]">
              {t("empty")}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.18em] text-[#7A7A72] xs:mb-8 xs:text-[10px] sm:text-[11px]">
              {t("showing", { count: totalItems })}
            </p>

            <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:gap-6 xl:grid-cols-4">
              {tailors.map((tailor) => {
                const { name, description, location, badge } =
                  getTailorDisplayFields(tailor, locale);
                const imageUrl = resolveTailorImage(
                  tailor.logo,
                  tailor.coverImage,
                );
                const logoUrl = tailor.logo?.trim()
                  ? resolveMediaUrl(tailor.logo.trim())
                  : "";
                const showLogoBadge = Boolean(logoUrl && logoUrl !== imageUrl);
                const rating = formatTailorRating(tailor.rating);
                const reviewCount = tailor.reviewCount ?? 0;
                const locationLabel = badge || location;

                return (
                  <Link
                    key={tailor._id}
                    href={`/tailors/${tailor.slug}`}
                    className="group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#E4E0D8] bg-white shadow-[0_1px_0_rgba(26,42,58,0.04)] transition-all duration-500 hover:-translate-y-1.5 hover:border-[#1A2A3A]/25 hover:shadow-[0_18px_40px_-24px_rgba(26,42,58,0.35)] sm:rounded-xl"
                  >
                    <div className="relative aspect-4/5 overflow-hidden bg-[#F0EBE3]">
                      <img
                        src={imageUrl}
                        alt={name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      />

                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,42,58,0.18)_0%,transparent_32%,transparent_55%,rgba(26,42,58,0.72)_100%)] transition-opacity duration-500 group-hover:opacity-95" />

                      <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-1.5 p-2 xs:gap-2 xs:p-2.5 sm:p-3.5">
                        {locationLabel ? (
                          <Tag
                            size="sm"
                            elevated
                            truncate
                            className="inline-flex max-w-[65%] items-center gap-1"
                          >
                            <MapPin
                              className="size-2.5 shrink-0 sm:size-3"
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span className="truncate">{locationLabel}</span>
                          </Tag>
                        ) : (
                          <span />
                        )}

                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-white/25 bg-white/90 px-1 py-0.5 backdrop-blur-sm xs:gap-1 xs:px-1.5 xs:py-1">
                          <Star
                            className="size-2.5 fill-[#1A2A3A] text-[#1A2A3A] sm:size-3"
                            aria-hidden
                          />
                          <span className="[font-family:var(--font-ui)] text-[8px] font-medium tracking-[0.08em] text-[#1A2A3A] xs:text-[9px] sm:text-[10px]">
                            {rating}
                          </span>
                        </span>
                      </div>

                      <div className="absolute inset-x-0 bottom-0 z-10 p-2 xs:p-2.5 sm:p-4">
                        <div className="flex items-end gap-2 sm:gap-3">
                          {showLogoBadge ? (
                            <div className="size-9 shrink-0 overflow-hidden rounded-md border border-white/70 bg-white shadow-md ring-1 ring-black/5 transition-transform duration-500 group-hover:-translate-y-1 xs:size-10 sm:size-14 sm:rounded-lg">
                              <img
                                src={logoUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                          <div className="min-w-0 flex-1 pb-0.5">
                            <h2 className="line-clamp-2 [font-family:var(--font-display)] text-[14px] font-normal leading-[1.15] tracking-[-0.01em] text-white drop-shadow-sm xs:text-[15px] sm:text-[18px] md:text-[20px] lg:text-[21px]">
                              {name}
                            </h2>
                            {location && location !== locationLabel ? (
                              <p className="mt-0.5 truncate [font-family:var(--font-ui)] text-[7px] uppercase tracking-[0.16em] text-white/75 xs:mt-1 xs:text-[8px] sm:text-[9px]">
                                {location}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-2 p-2.5 xs:gap-2.5 xs:p-3 sm:gap-3 sm:p-4">
                      <p className="line-clamp-2 min-h-[2.4em] [font-family:var(--font-body)] text-[11px] leading-relaxed text-[#7A7A72] xs:text-[12px] sm:min-h-[2.6em] sm:text-[13px]">
                        {description ||
                          (locale === "ar"
                            ? "ورشة خياطة معتمدة على MOTD"
                            : "Approved atelier on MOTD")}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#E4E0D8] pt-2 xs:gap-3 xs:pt-2.5 sm:pt-3">
                        <span className="truncate [font-family:var(--font-ui)] text-[7px] uppercase tracking-[0.14em] text-[#7A7A72] xs:text-[8px] sm:text-[9px]">
                          ({reviewCount}) {t("reviews")}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 [font-family:var(--font-ui)] text-[8px] font-medium uppercase tracking-[0.14em] text-[#1A2A3A] transition-all duration-300 group-hover:gap-1.5 xs:text-[9px] sm:text-[10px]">
                          {t("viewShop")}
                          <ArrowUpRight
                            className="size-3 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 sm:size-3.5 rtl:-rotate-90 rtl:group-hover:-translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 0 && totalItems > 0 ? (
              <div className="mt-8 sm:mt-10">
                <GlobalPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  showItemsPerPage
                  itemsPerPage={limit}
                  onItemsPerPageChange={handleLimitChange}
                  itemsPerPageOptions={LIMIT_OPTIONS}
                  totalItems={totalItems}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
