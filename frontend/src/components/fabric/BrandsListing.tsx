"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { ArrowUpRight, MapPin, Search, Star, X } from "lucide-react";

const DEFAULT_LIMIT = 12;
const LIMIT_OPTIONS = [6, 12, 24, 48];
const FETCH_LIMIT = 100;

type PartnerKind = "fabric" | "tailor";
type PartnerFilter = "all" | PartnerKind;
type SortOrder = "az" | "za";

type BrandPartner = {
  kind: PartnerKind;
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  logo?: string;
  coverImage?: string;
  location?: string;
  city?: string;
  rating?: number;
  reviewCount?: number;
};

type ListResponse<T> = {
  success: boolean;
  items: T[];
  total?: number;
};

function partnerSortKey(item: BrandPartner, locale: "en" | "ar"): string {
  const name =
    locale === "ar" ? item.nameAr || item.name : item.name || item.nameAr || "";
  return name.trim().toLocaleLowerCase(locale === "ar" ? "ar" : "en");
}

function partnerMatchesSearch(
  item: BrandPartner,
  query: string,
  locale: "en" | "ar",
): boolean {
  const q = query.trim().toLocaleLowerCase(locale === "ar" ? "ar" : "en");
  if (!q) return true;

  const haystack = [
    item.name,
    item.nameAr,
    item.description,
    item.descriptionAr,
    item.location,
    item.city,
    item.slug,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase(locale === "ar" ? "ar" : "en");

  return haystack.includes(q);
}

function toFabricPartner(item: FabricShopListItem): BrandPartner {
  return {
    kind: "fabric",
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    description: item.description,
    descriptionAr: item.descriptionAr,
    logo: item.logo,
    coverImage: item.coverImage,
    location: item.location,
    city: item.city,
    rating: item.rating,
    reviewCount: item.reviewCount,
  };
}

function toTailorPartner(item: TailorShopListItem): BrandPartner {
  return {
    kind: "tailor",
    _id: item._id,
    slug: item.slug,
    name: item.name,
    nameAr: item.nameAr,
    description: item.description,
    descriptionAr: item.descriptionAr,
    logo: item.logo,
    coverImage: item.coverImage,
    location: item.location,
    city: item.city,
    rating: item.rating,
    reviewCount: item.reviewCount,
  };
}

export default function BrandsListing() {
  const t = useTranslations("BrandsListing");
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";

  const [partners, setPartners] = useState<BrandPartner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PartnerFilter>("all");
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("az");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [fabricData, tailorData] = await Promise.all([
        api.get<ListResponse<FabricShopListItem>>(
          `/api/fabric-shops?page=1&limit=${FETCH_LIMIT}`,
        ),
        api.get<ListResponse<TailorShopListItem>>(
          `/api/tailors?page=1&limit=${FETCH_LIMIT}`,
        ),
      ]);

      if (!fabricData?.success || !tailorData?.success) {
        throw new Error("Failed to load brands");
      }

      setPartners([
        ...(fabricData.items || []).map(toFabricPartner),
        ...(tailorData.items || []).map(toTailorPartner),
      ]);
    } catch (err: unknown) {
      const message =
        (err as ApiError)?.message ||
        (err instanceof Error ? err.message : "Failed to load brands");
      setError(message);
      setPartners([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  const searchedPartners = useMemo(
    () =>
      partners.filter((item) => partnerMatchesSearch(item, search, locale)),
    [partners, search, locale],
  );

  const filteredPartners = useMemo(() => {
    const byType =
      filter === "all"
        ? searchedPartners
        : searchedPartners.filter((item) => item.kind === filter);

    const sorted = [...byType].sort((a, b) =>
      partnerSortKey(a, locale).localeCompare(
        partnerSortKey(b, locale),
        locale === "ar" ? "ar" : "en",
      ),
    );

    return sortOrder === "za" ? sorted.reverse() : sorted;
  }, [searchedPartners, filter, locale, sortOrder]);

  const totalItems = filteredPartners.length;
  const totalPages = Math.ceil(totalItems / limit) || 0;
  const safePage = Math.min(currentPage, Math.max(totalPages, 1));
  const pageItems = filteredPartners.slice(
    (safePage - 1) * limit,
    safePage * limit,
  );

  const fabricCount = searchedPartners.filter(
    (item) => item.kind === "fabric",
  ).length;
  const tailorCount = searchedPartners.filter(
    (item) => item.kind === "tailor",
  ).length;

  const handleFilterChange = (next: PartnerFilter) => {
    setFilter(next);
    setCurrentPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOrder) => {
    setSortOrder(value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleLimitChange = (nextLimit: number) => {
    setLimit(nextLimit);
    setCurrentPage(1);
  };

  const filterOptions: { value: PartnerFilter; label: string; count: number }[] =
    [
      { value: "all", label: t("filterAll"), count: searchedPartners.length },
      {
        value: "fabric",
        label: t("filterFabric"),
        count: fabricCount,
      },
      {
        value: "tailor",
        label: t("filterTailor"),
        count: tailorCount,
      },
    ];

  const emptyMessage = search.trim()
    ? t("emptySearch")
    : filter === "fabric"
      ? t("emptyFabric")
      : filter === "tailor"
        ? t("emptyTailor")
        : t("empty");

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
          <p className="max-w-2xl [font-family:var(--font-body)] text-[14px] leading-normal text-[#7A7A72] xs:text-[13px] sm:text-[14px] md:text-[13px] lg:text-[14px] xl:text-[15px] 2xl:text-[16px] text-justify">
            {t("description")}
          </p>
        </div>
      </div>

      <div className="px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
        {!loading && !error ? (
          <div className="mb-6 flex flex-col gap-4 xs:mb-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">{t("searchLabel")}</span>
                <Search
                  className="pointer-events-none absolute start-3 top-1/2 size-3.5 -translate-y-1/2 text-[#7A7A72] sm:size-4"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder={t("searchPlaceholder")}
                  className="w-full border border-[#E4E0D8] bg-white py-2.5 pe-9 ps-9 text-[12px] text-black outline-none transition placeholder:text-[#B0AEA6] focus:border-black [font-family:var(--font-body)] sm:text-[13px]"
                />
                {search ? (
                  <button
                    type="button"
                    onClick={() => handleSearchChange("")}
                    aria-label={t("clearSearch")}
                    className="absolute end-2.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center text-[#7A7A72] transition hover:cursor-pointer hover:text-black"
                  >
                    <X className="size-3.5" strokeWidth={2} aria-hidden />
                  </button>
                ) : null}
              </label>

              <label className="flex shrink-0 items-center gap-2 border border-[#E4E0D8] bg-white px-3 py-2.5">
                <span className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-[#7A7A72] sm:text-[10px]">
                  {t("sortLabel")}
                </span>
                <select
                  value={sortOrder}
                  onChange={(e) =>
                    handleSortChange(e.target.value === "za" ? "za" : "az")
                  }
                  className="bg-transparent [font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.14em] text-black outline-none hover:cursor-pointer sm:text-[10px]"
                >
                  <option value="az">{t("sortAZ")}</option>
                  <option value="za">{t("sortZA")}</option>
                </select>
              </label>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div
                role="tablist"
                aria-label={t("filterLabel")}
                className="flex flex-wrap items-center gap-2"
              >
                {filterOptions.map((option) => {
                  const active = filter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleFilterChange(option.value)}
                      className={`inline-flex items-center gap-2 border px-3 py-2 text-[9px] uppercase tracking-[0.16em] transition hover:cursor-pointer [font-family:var(--font-ui)] xs:text-[10px] sm:px-3.5 sm:text-[11px] ${
                        active
                          ? "border-black bg-black text-white"
                          : "border-[#E4E0D8] bg-white text-[#7A7A72] hover:border-black/40 hover:text-black"
                      }`}
                    >
                      <span>{option.label}</span>
                      <span
                        className={`tabular-nums ${
                          active ? "text-white/70" : "text-[#B0AEA6]"
                        }`}
                      >
                        {option.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {totalItems > 0 ? (
                <p className="[font-family:var(--font-ui)] text-[9px] uppercase tracking-[0.18em] text-[#7A7A72] xs:text-[10px] sm:text-[11px]">
                  {t("showing", { count: totalItems })}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

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
        ) : pageItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-28 text-center">
            <h2 className="mb-3 font-ui text-[18px] uppercase tracking-widest text-black md:text-[22px]">
              {t("emptyTitle")}
            </h2>
            <p className="max-w-xs text-[13px] leading-relaxed text-[#7A7A72]">
              {emptyMessage}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 md:gap-5 lg:gap-6 xl:grid-cols-4">
              {pageItems.map((partner) => {
                const isFabric = partner.kind === "fabric";
                const display = isFabric
                  ? getFabricShopDisplayFields(partner, locale)
                  : getTailorDisplayFields(partner, locale);
                const { name, description, location, badge } = display;
                const imageUrl = isFabric
                  ? resolveFabricShopImage(partner.logo, partner.coverImage)
                  : resolveTailorImage(partner.logo, partner.coverImage);
                const logoUrl = partner.logo?.trim()
                  ? resolveMediaUrl(partner.logo.trim())
                  : "";
                const showLogoBadge = Boolean(logoUrl && logoUrl !== imageUrl);
                const rating =
                  (partner.reviewCount ?? 0) > 0
                    ? isFabric
                      ? formatFabricShopRating(partner.rating)
                      : formatTailorRating(partner.rating)
                    : "0.0";
                const reviewCount = partner.reviewCount ?? 0;
                const locationLabel = badge || location;
                const href = isFabric
                  ? `/brands/${partner.slug}`
                  : `/tailors/${partner.slug}`;
                const typeLabel = isFabric
                  ? t("typeFabric")
                  : t("typeTailor");
                const fallbackDescription = isFabric
                  ? locale === "ar"
                    ? "متجر أقمشة معتمد على MOTD"
                    : "Approved fabric house on MOTD"
                  : locale === "ar"
                    ? "ورشة خياطة معتمدة على MOTD"
                    : "Approved atelier on MOTD";
                const ctaLabel = isFabric ? t("viewBrand") : t("viewTailor");

                return (
                  <Link
                    key={`${partner.kind}-${partner._id}`}
                    href={href}
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
                        <div className="flex min-w-0 max-w-[72%] flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 [font-family:var(--font-ui)] text-[7px] font-medium uppercase tracking-[0.14em] xs:text-[8px] sm:text-[9px] ${
                              isFabric
                                ? "bg-[#1A2A3A] text-white"
                                : "bg-[#8B6B4D] text-white"
                            }`}
                          >
                            {typeLabel}
                          </span>
                          {locationLabel ? (
                            <Tag
                              size="sm"
                              elevated
                              truncate
                              className="inline-flex max-w-full items-center gap-1"
                            >
                              <MapPin
                                className="size-2.5 shrink-0 sm:size-3"
                                strokeWidth={2}
                                aria-hidden
                              />
                              <span className="truncate">{locationLabel}</span>
                            </Tag>
                          ) : null}
                        </div>

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
                        {description || fallbackDescription}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#E4E0D8] pt-2 xs:gap-3 xs:pt-2.5 sm:pt-3">
                        <span className="truncate [font-family:var(--font-ui)] text-[7px] uppercase tracking-[0.14em] text-[#7A7A72] xs:text-[8px] sm:text-[9px]">
                          ({reviewCount}) {t("reviews")}
                        </span>
                        <span className="inline-flex shrink-0 items-center gap-0.5 [font-family:var(--font-ui)] text-[8px] font-medium uppercase tracking-[0.14em] text-[#1A2A3A] transition-all duration-300 group-hover:gap-1.5 xs:text-[9px] sm:text-[10px]">
                          {ctaLabel}
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
                  currentPage={safePage}
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
