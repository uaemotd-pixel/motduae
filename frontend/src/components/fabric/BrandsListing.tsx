"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import {
  type FabricShopListItem,
  formatFabricShopRating,
  getFabricShopDisplayFields,
  resolveFabricShopImage,
} from "@/lib/fabricShop";
import { ProductGridSkeleton } from "@/components/ui/Skeleton";
import GlobalPagination from "@/components/shared/GlobalPagination";

const DEFAULT_LIMIT = 12;
const LIMIT_OPTIONS = [6, 12, 24, 48];

type BrandsListResponse = {
  success: boolean;
  items: FabricShopListItem[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
};

export default function BrandsListing() {
  const t = useTranslations("BrandsListing");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const [brands, setBrands] = useState<FabricShopListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const fetchBrands = useCallback(
    async (page = 1, limitOverride?: number) => {
      try {
        setLoading(true);
        setError(null);

        const pageLimit = limitOverride ?? limit;
        const data = await api.get<BrandsListResponse>(
          `/api/fabric-shops?page=${page}&limit=${pageLimit}`,
        );

        if (!data?.success) {
          throw new Error("Failed to load brands");
        }

        setBrands(data.items || []);
        setCurrentPage(data.page || page);
        setTotalItems(data.total || 0);
        setTotalPages(data.totalPages || 0);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load brands");
        setError(message);
        setBrands([]);
        setTotalItems(0);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    fetchBrands(1, limit);
  }, [fetchBrands, limit]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchBrands(page);
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
            count={Math.min(limit, 6)}
            columnsClassName="grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
          />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <h2 className="mb-3 text-[18px] uppercase tracking-widest text-black md:text-[22px]">
              {t("errorTitle")}
            </h2>
            <p className="max-w-xs text-[13px] leading-relaxed text-[#7A7A72]">
              {error}
            </p>
          </div>
        ) : brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <h2 className="mb-3 text-[18px] uppercase tracking-widest text-black md:text-[22px]">
              {t("emptyTitle")}
            </h2>
            <p className="max-w-xs text-[13px] leading-relaxed text-[#7A7A72]">
              {t("empty")}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-8 font-mono text-[11px] uppercase tracking-[0.18em] text-[#7A7A72]">
              {t("showing", { count: totalItems })}
            </p>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-8 lg:grid-cols-3">
              {brands.map((brand) => {
                const { name, description, location, badge } =
                  getFabricShopDisplayFields(brand, locale);
                const imageUrl = resolveFabricShopImage(
                  brand.logo,
                  brand.coverImage,
                );
                const rating = formatFabricShopRating(brand.rating);
                const reviewCount = brand.reviewCount ?? 0;

                return (
                  <Link
                    key={brand._id}
                    href={`/brands/${brand.slug}`}
                    className="group overflow-hidden border border-[#E4E0D8] bg-white transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className="relative aspect-4/5 overflow-hidden bg-[#F0EBE3]">
                      <img
                        src={imageUrl}
                        alt={name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition-all duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      {badge ? (
                        <div className="absolute bottom-4 inset-s-4">
                          <span className="bg-black px-2.5 py-1 text-[8px] font-normal uppercase tracking-[0.24em] text-white [font-family:var(--font-ui)] xs:text-[9px]">
                            {badge}
                          </span>
                        </div>
                      ) : null}
                    </div>

                    <div className="p-5 sm:p-6">
                      <h2 className="mb-1 line-clamp-2 [font-family:var(--font-display)] text-[20px] font-normal leading-[1.2] tracking-[-0.01em] text-black sm:text-[22px]">
                        {name}
                      </h2>
                      <p className="mb-3 line-clamp-1 [font-family:var(--font-ui)] text-[9px] font-normal uppercase tracking-[0.24em] text-[#7A7A72] sm:text-[10px]">
                        {location}
                      </p>
                      <p className="mb-4 line-clamp-3 [font-family:var(--font-body)] text-[13px] font-normal leading-[1.6] text-[#7A7A72] sm:text-[14px]">
                        {description}
                      </p>

                      <div className="flex items-center justify-between border-t border-[#E4E0D8] pt-4">
                        <div className="flex items-center gap-1.5">
                          <svg
                            className="h-4 w-4 fill-black text-black"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            stroke="none"
                            aria-hidden
                          >
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="[font-family:var(--font-ui)] text-[10px] font-medium tracking-[0.2em] text-black sm:text-[11px]">
                            {rating}
                          </span>
                          <span className="[font-family:var(--font-ui)] text-[8px] font-normal uppercase tracking-[0.2em] text-[#7A7A72] sm:text-[9px]">
                            ({reviewCount} {t("reviews")})
                          </span>
                        </div>
                        <span className="inline-flex items-center gap-1 border-b border-black pb-0.5 [font-family:var(--font-ui)] text-[9px] font-normal uppercase tracking-[0.24em] text-black transition group-hover:opacity-50 sm:text-[10px]">
                          {t("viewShop")}
                          <svg
                            className="h-3.5 w-3.5 text-black transition-transform duration-200 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
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
              <div className="mt-10">
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
