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
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import GlobalPagination from "@/components/shared/GlobalPagination";
import { MapPin } from "lucide-react";

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
    <div className="min-h-screen bg-white">
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
            columnsClassName="grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4"
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
            <p className="mb-5 font-mono text-[9px] uppercase tracking-[0.14em] text-[#7A7A72] xs:mb-6 xs:text-[10px] sm:mb-8 sm:text-[11px] sm:tracking-[0.18em]">
              {t("showing", { count: totalItems })}
            </p>

            <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {tailors.map((tailor) => {
                const { name, description, location, badge } =
                  getTailorDisplayFields(tailor, locale);
                const imageUrl = resolveTailorImage(
                  tailor.logo,
                  tailor.coverImage,
                );
                const rating = formatTailorRating(tailor.rating);
                const reviewCount = tailor.reviewCount ?? 0;
                const locationLabel = badge || location;

                return (
                  <Link
                    key={tailor._id}
                    href={`/tailors/${tailor.slug}`}
                    className="group flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#E4E0D8] bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-xl sm:rounded-xl"
                  >
                    <div className="relative aspect-4/3 overflow-hidden bg-[#F0EBE3] sm:aspect-[5/4]">
                      <img
                        src={imageUrl}
                        alt={name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-transparent opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
                      {locationLabel ? (
                        <div className="absolute bottom-2 inset-s-2 z-10 xs:bottom-2.5 xs:inset-s-2.5">
                          <Tag
                            size="sm"
                            elevated
                            truncate
                            className="inline-flex max-w-[calc(100%-0.25rem)] items-center gap-1 px-1.5 py-0.5 text-[7px] tracking-[0.1em] sm:gap-1.5 sm:px-2 sm:text-[8px] sm:tracking-[0.12em]"
                          >
                            <MapPin
                              className="size-2.5 shrink-0 sm:size-3"
                              strokeWidth={2}
                              aria-hidden
                            />
                            <span className="truncate">{locationLabel}</span>
                          </Tag>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-1 flex-col gap-1.5 p-2.5 xs:p-3 sm:gap-2 sm:p-3.5">
                      <h2 className="line-clamp-1 [font-family:var(--font-display)] text-[12px] font-normal leading-snug tracking-[-0.01em] text-black xs:text-[13px] sm:text-[14px] md:text-[15px]">
                        {name}
                      </h2>

                      <p className="hidden line-clamp-1 [font-family:var(--font-body)] text-[11px] font-normal leading-snug text-[#7A7A72] md:block md:text-[12px]">
                        {description}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#E4E0D8] pt-1.5 sm:pt-2">
                        <div className="flex min-w-0 items-center gap-1 xs:gap-1.5">
                          <svg
                            className="size-3 shrink-0 fill-black text-black sm:size-3.5"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="none"
                            aria-hidden
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="shrink-0 [font-family:var(--font-ui)] text-[8px] font-medium tracking-[0.12em] text-black xs:text-[9px] sm:text-[10px]">
                            {rating}
                          </span>
                          <span className="truncate [font-family:var(--font-ui)] text-[7px] font-normal uppercase tracking-[0.12em] text-[#7A7A72] xs:text-[8px]">
                            ({reviewCount})
                          </span>
                        </div>
                        <span className="inline-flex shrink-0 items-center gap-0.5 border-b border-black pb-px [font-family:var(--font-ui)] text-[7px] font-normal uppercase tracking-[0.14em] text-black transition group-hover:opacity-50 xs:text-[8px] sm:text-[9px]">
                          {t("viewShop")}
                          <svg
                            className="size-3 text-black transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden
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
