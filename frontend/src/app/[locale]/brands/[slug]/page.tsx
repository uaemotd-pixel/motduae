"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import {
  type FabricShopListItem,
  formatFabricShopRating,
  getFabricShopDisplayFields,
  getSocialPlatform,
  normalizeHttpUrl,
  resolveFabricShopImage,
} from "@/lib/fabricShop";
import {
  resolveFabricImage,
  formatFabricListingPrice,
  getFabricMinListingPrice,
  getFabricDefaultCut,
  getCutDisplayName,
  buildFabricCutCartId,
  type FabricListItem,
} from "@/lib/fabrics";
import {
  resolveReadyMadeImage,
  type ReadyMadeListItem,
} from "@/lib/readyMade";
import { resolveMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/format";
import { formatPartnerExperience } from "@/lib/partnerExperience";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import WishlistButton from "@/components/shared/wishlistButton";
import AddToCartButton from "@/components/shared/addToCartButton";
import { ProductReviewsSection } from "@/components/reviews/CustomerReviewsView";
import { MapPin, Star, Share2, Link2, ExternalLink, Phone, ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import SocialPlatformIcon, {
  SOCIAL_PLATFORM_LINK_CLASS,
} from "@/components/shared/SocialPlatformIcon";
import FavouriteShopButton from "@/components/shared/FavouriteShopButton";

const SOCIAL_LINK_BASE_CLASS =
  "inline-flex size-10 xs:size-11 items-center justify-center rounded-full border bg-white transition-all duration-300";

type BrandDetailItem = FabricShopListItem & {
  owner?: { _id: string; name: string; role?: string } | null;
};

type BrandFabricItem = Pick<
  FabricListItem,
  | "_id"
  | "slug"
  | "name"
  | "nameAr"
  | "images"
  | "material"
  | "materialAr"
  | "pricePerMeter"
  | "cuts"
  | "tag"
>;

type BrandReadyMadeItem = Pick<
  ReadyMadeListItem,
  | "_id"
  | "slug"
  | "name"
  | "nameAr"
  | "images"
  | "finalSellingPriceAED"
  | "tag"
  | "tagAr"
  | "fabricType"
  | "fabricTypeAr"
  | "availableFabricStock"
  | "metersPerFabric"
>;

type BrandAddonItem = {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  images?: string[];
  thumbnailImage?: string;
  price: number;
  stock?: number;
  tag?: string;
  tagAr?: string;
};

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("BrandDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [shop, setShop] = useState<BrandDetailItem | null>(null);
  const [fabrics, setFabrics] = useState<BrandFabricItem[]>([]);
  const [readyMade, setReadyMade] = useState<BrandReadyMadeItem[]>([]);
  const [addons, setAddons] = useState<BrandAddonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const getFullUrl = useCallback(
    (hrefPath: string) => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const basePath = locale === "ar" ? "/ar" : "/en";
      return `${origin}${basePath}${hrefPath}`;
    },
    [locale],
  );

  const handleShare = useCallback(
    async (hrefPath: string, shareText?: string) => {
      const fullUrl = getFullUrl(hrefPath);
      const shareData = {
        title: "MOTD",
        text:
          shareText ||
          (locale === "ar" ? "اطلع على هذا المنتج" : "Check this product"),
        url: fullUrl,
      };

      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await navigator.share(shareData as ShareData);
          return;
        }
      } catch {
        // fall through
      }

      try {
        await navigator.clipboard.writeText(fullUrl);
        setToastMessage(locale === "ar" ? "تم نسخ الرابط!" : "Link copied!");
      } catch {
        window.prompt(locale === "ar" ? "انسخ الرابط:" : "Copy link:", fullUrl);
      }
    },
    [getFullUrl, locale],
  );

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [shopData, fabricsData, readyMadeData, addonsData] =
          await Promise.all([
            api.get<{ success: boolean; item: BrandDetailItem }>(
              `/api/fabric-shops/${slug}`,
            ),
            api.get<{ success: boolean; items: BrandFabricItem[] }>(
              `/api/fabric-shops/${slug}/fabrics`,
            ),
            api.get<{ success: boolean; items: BrandReadyMadeItem[] }>(
              `/api/fabric-shops/${slug}/ready-made`,
            ),
            api.get<{ success: boolean; items: BrandAddonItem[] }>(
              `/api/fabric-shops/${slug}/addons`,
            ),
          ]);

        if (!shopData?.success || !shopData.item) {
          throw new Error("Brand not found");
        }

        setShop(shopData.item);
        setFabrics(fabricsData?.items || []);
        setReadyMade(readyMadeData?.items || []);
        setAddons(addonsData?.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load brand");
        setError(message);
        setShop(null);
        setFabrics([]);
        setReadyMade([]);
        setAddons([]);
      } finally {
        setLoading(false);
      }
    };

    if (slug) load();
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <DetailPageSkeleton />
      </MainLayout>
    );
  }

  if (error || !shop) {
    return (
      <MainLayout>
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <div className="max-w-md text-center">
            <h1 className="mb-3 [font-family:var(--font-display)] text-2xl text-black">
              {t("notFoundTitle")}
            </h1>
            <p className="mb-6 text-sm text-(--color-grey-muted)">
              {error || t("notFound")}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/brands"
                className="bg-black px-6 py-3 text-[10px] uppercase tracking-[0.22em] text-white transition hover:bg-[#1A1A1A]"
              >
                {t("browseAll")}
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="border border-black px-6 py-3 text-[10px] uppercase tracking-[0.22em] transition hover:bg-black hover:text-white"
              >
                {t("goBack")}
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const { name, description, location, badge } = getFabricShopDisplayFields(
    shop,
    locale,
  );
  const coverImage = resolveFabricShopImage(shop.logo, shop.coverImage);
  const logoImage =
    resolveMediaUrl(shop.logo?.trim() || "") || coverImage;
  const rating = formatFabricShopRating(shop.rating);
  const reviewCount = shop.reviewCount ?? 0;

  const websiteUrl = shop.website?.trim()
    ? normalizeHttpUrl(shop.website)
    : "";
  const socialLinks = (shop.social || [])
    .map((link) => ({
      name: String(link.name || "").trim(),
      url: link.url?.trim() ? normalizeHttpUrl(link.url) : "",
    }))
    .filter((link) => link.name && link.url);
  const hasConnect = Boolean(websiteUrl || socialLinks.length);
  const experienceLabel = formatPartnerExperience(shop.experience, {
    year: t("experienceYear"),
    years: t("experienceYears"),
    month: t("experienceMonth"),
    months: t("experienceMonths"),
    underOneYear: t("experienceUnderOneYear"),
  });

  return (
    <MainLayout>
      <div className="w-full min-w-0 overflow-x-clip">
      <FadeInSection>
        <div className="min-h-screen w-full min-w-0 overflow-x-clip bg-[linear-gradient(180deg,#FAF8F4_0%,#FFFFFF_22%,#FFFFFF_100%)]">
          {toastMessage && (
            <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg bg-black px-4 py-2.5 text-center text-xs tracking-wide text-white shadow-lg [font-family:var(--font-ui)] sm:text-sm">
              {toastMessage}
            </div>
          )}
          <section className="relative isolate overflow-hidden">
            <div className="absolute inset-0">
              <img
                src={coverImage}
                alt=""
                aria-hidden
                className="h-full w-full scale-105 object-cover object-top"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-black/25" />
              <div className="absolute inset-0 bg-linear-to-r from-black/45 via-transparent to-transparent" />
            </div>

            <div className="relative mx-auto flex w-full max-w-7xl flex-col justify-between px-4 xs:px-5 pt-[max(4.5rem,calc(env(safe-area-inset-top)+3.5rem))] pb-8 xs:pb-10 sm:min-h-[58vh] sm:px-8 sm:pb-14 md:min-h-[64vh] md:px-10 lg:px-(--space-40)">
              <div className="flex min-w-0 items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-white/65 xs:tracking-[0.18em] sm:text-[10px]">
                <Link
                  href="/brands"
                  className="shrink-0 transition hover:text-white"
                >
                  {t("brands")}
                </Link>
                <span className="shrink-0" aria-hidden>
                  /
                </span>
                <span className="min-w-0 truncate text-white">{name}</span>
              </div>

              <div className="mt-8 grid grid-cols-1 items-end gap-5 xs:gap-6 sm:mt-10 lg:mt-auto lg:grid-cols-[auto_1fr] lg:gap-10">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="mx-auto aspect-4/5 w-20 shrink-0 overflow-hidden rounded-sm border border-white/25 bg-[#F5F5F0] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.65)] xs:w-24 sm:mx-0 sm:w-32 md:w-36 lg:w-40"
                >
                  <img
                    src={logoImage}
                    alt={name}
                    className="h-full w-full object-cover object-top"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: 0.15 }}
                  className="min-w-0 max-w-full text-center sm:text-start"
                >
                {badge ? (
                  <span className="mb-2 inline-flex max-w-full items-center gap-2 text-[9px] uppercase tracking-[0.24em] text-white/70 [font-family:var(--font-ui)] xs:mb-3 xs:tracking-[0.28em] sm:text-[10px]">
                    <span className="hidden h-px w-5 shrink-0 bg-white/40 sm:block" />
                    <span className="min-w-0 truncate">{badge}</span>
                  </span>
                ) : null}
                <h1 className="max-w-full wrap-break-word [font-family:var(--font-display)] text-[clamp(1.75rem,6vw,3.25rem)] leading-[1.08] tracking-[-0.02em] text-white">
                  {name}
                </h1>
                {location ? (
                  <p className="mt-2.5 inline-flex max-w-full items-start justify-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/75 [font-family:var(--font-ui)] xs:mt-3 xs:text-[11px] xs:tracking-[0.2em] sm:justify-start">
                    <MapPin
                      className="mt-0.5 size-3.5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    <span className="min-w-0 wrap-break-word text-start">
                      {location}
                    </span>
                  </p>
                ) : null}
                {experienceLabel ? (
                  <p className="mt-2 max-w-full wrap-break-word text-[10px] uppercase tracking-[0.16em] text-white/75 [font-family:var(--font-ui)] xs:text-[11px] xs:tracking-[0.2em]">
                    <span className="text-white/55">{t("experienceTitle")}: </span>
                    {experienceLabel}
                  </p>
                ) : null}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 xs:mt-5 xs:gap-x-4 sm:justify-start">
                  <a
                    href="#reviews"
                    className="inline-flex min-w-0 items-center gap-1.5 text-white transition hover:opacity-80"
                  >
                    <Star
                      className="size-3.5 shrink-0 fill-[#d4af37] stroke-[#d4af37]"
                      aria-hidden
                    />
                    <span className="text-[12px] tracking-[0.14em] [font-family:var(--font-ui)]">
                      {rating}
                    </span>
                    <span className="text-[9px] uppercase tracking-[0.14em] text-white/55 [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.16em]">
                      ({reviewCount} {t("reviews")})
                    </span>
                  </a>
                  <span className="hidden h-3 w-px bg-white/25 sm:block" aria-hidden />
                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/70 [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.18em]">
                    {t("fabricsCount", { count: fabrics.length })}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/70 [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.18em]">
                    {t("readyMadeCount", { count: readyMade.length })}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.16em] text-white/70 [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.18em]">
                    {t("addonsCount", { count: addons.length })}
                  </span>
                </div>
                <div className="mt-5 flex w-full flex-col items-stretch gap-2.5 xs:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-start">
                  <a
                    href="#products"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-white px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-black transition hover:bg-white/90 [font-family:var(--font-ui)] xs:tracking-[0.2em] sm:w-auto sm:px-6"
                  >
                    {t("viewProducts")}
                    <ArrowUpRight
                      className="size-3.5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </a>
                  {shop.phone ? (
                    <a
                      href={`tel:${shop.phone}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-sm border border-white/35 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-white backdrop-blur-sm transition hover:bg-white/15 [font-family:var(--font-ui)] xs:tracking-[0.2em] sm:w-auto sm:px-6"
                    >
                      <Phone
                        className="size-3.5 shrink-0"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                      {t("callShop")}
                    </a>
                  ) : null}
                  <FavouriteShopButton
                    type="fabricShop"
                    shopId={String(shop._id)}
                    variant="onDark"
                    className="w-full justify-center hover:cursor-pointer sm:w-auto"
                  />
                </div>
                </motion.div>
              </div>
            </div>
          </section>

          {description || hasConnect ? (
            <section className="border-b border-(--color-border) px-4 xs:px-5 py-8 xs:py-9 sm:px-8 sm:py-11 md:px-10 lg:px-(--space-40)">
              <div
                className={`mx-auto grid max-w-7xl gap-6 xs:gap-8 sm:gap-10 ${
                  description && hasConnect ? "lg:grid-cols-[1fr_minmax(0,260px)]" : ""
                }`}
              >
                {description ? (
                  <div className="min-w-0">
                    <div className="mb-3 flex items-center gap-3 xs:mb-4">
                      <span className="block h-px w-5 shrink-0 bg-black/35" />
                      <h2 className="text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) [font-family:var(--font-ui)]">
                        {t("aboutTitle")}
                      </h2>
                    </div>
                    <p className="max-w-3xl wrap-break-word text-justify text-[13px] leading-relaxed text-(--color-grey-muted) [font-family:var(--font-body)] xs:text-[14px] sm:text-[15px]">
                      {description}
                    </p>
                  </div>
                ) : null}

                {hasConnect ? (
                  <div className="min-w-0 rounded-lg border border-(--color-border) bg-[#FAFAF7] px-4 py-4 xs:px-5 xs:py-5 sm:px-6">
                    <p className="mb-3 text-[10px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:mb-4">
                      {t("connectTitle")}
                    </p>
                    <div className="flex flex-wrap gap-2 xs:gap-2.5">
                      {websiteUrl ? (
                        <a
                          href={websiteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={t("website")}
                          title={t("website")}
                          className={`${SOCIAL_LINK_BASE_CLASS} size-10 border-(--color-border) text-black hover:border-black hover:bg-black hover:text-white`}
                        >
                          <Link2
                            className="size-4"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        </a>
                      ) : null}
                      {socialLinks.map((link) => {
                        const platform = getSocialPlatform(link.name);
                        const brandClass = platform
                          ? SOCIAL_PLATFORM_LINK_CLASS[platform.value]
                          : "border-(--color-border) text-black hover:border-black hover:bg-black hover:text-white";

                        return (
                          <a
                            key={`${link.name}-${link.url}`}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={link.name}
                            title={link.name}
                            className={`${SOCIAL_LINK_BASE_CLASS} size-10 ${brandClass}`}
                          >
                            {platform ? (
                              <SocialPlatformIcon platform={platform.value} />
                            ) : (
                              <ExternalLink
                                className="size-4"
                                strokeWidth={1.75}
                                aria-hidden
                              />
                            )}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {/* Fabrics */}
          <section
            id="products"
            className="scroll-mt-20 border-b border-(--color-border) px-4 xs:px-5 py-8 xs:py-10 sm:scroll-mt-24 sm:px-8 sm:py-12 md:px-10 lg:px-(--space-40) lg:py-14"
          >
            <div className="mx-auto max-w-7xl min-w-0">
              <div className="mb-5 xs:mb-6 sm:mb-7">
                <span className="mb-2 flex min-w-0 items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.22em]">
                  <span className="block h-px w-4 shrink-0 bg-(--color-grey-muted) xs:w-5" />
                  <span className="min-w-0 truncate">{t("fabricsCount", { count: fabrics.length })}</span>
                </span>
                <h2 className="wrap-break-word [font-family:var(--font-display)] text-[22px] tracking-[-0.01em] text-black xs:text-[24px] sm:text-[30px] md:text-[32px]">
                  {t("fabricsTitle")}
                </h2>
              </div>

              {fabrics.length === 0 ? (
                <div className="rounded-lg border border-(--color-border) bg-[#FAFAF7] px-6 py-12 text-center">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)]">
                    {t("fabricsEmpty")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {fabrics.map((fabric, idx) => {
                    const fabricName =
                      locale === "ar"
                        ? fabric.nameAr || fabric.name
                        : fabric.name;
                    const image = resolveFabricImage(fabric.images?.[0]);
                    const material =
                      locale === "ar"
                        ? fabric.materialAr || fabric.material
                        : fabric.material;
                    const hrefPath = `/fabrics/${fabric.slug}`;
                    const listingCut = getFabricDefaultCut(fabric);
                    const cutLabel = listingCut
                      ? getCutDisplayName(listingCut, locale)
                      : fabric.material || "fabric";
                    const price =
                      listingCut?.price ?? getFabricMinListingPrice(fabric);

                    return (
                      <motion.div
                        key={fabric._id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{
                          duration: 0.4,
                          delay: Math.min(idx * 0.05, 0.25),
                        }}
                        className="group min-w-0"
                      >
                        <Link
                          href={hrefPath}
                          className="block h-full overflow-hidden rounded-md border border-(--color-border) bg-white shadow-[0_1px_0_rgba(26,42,58,0.03)] transition-all duration-500 sm:rounded-lg md:hover:-translate-y-1 md:hover:border-[#1A2A3A]/20 md:hover:shadow-[0_14px_28px_-18px_rgba(26,42,58,0.3)]"
                        >
                          <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                            <img
                              src={image}
                              alt={fabricName}
                              loading="lazy"
                              className="h-full w-full object-cover object-top transition-transform duration-700 md:group-hover:scale-105"
                            />
                            {fabric.tag ? (
                              <div className="absolute top-1.5 inset-s-1.5 z-10 max-w-[calc(100%-4.25rem)] truncate bg-black px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-widest text-white [font-family:var(--font-ui)] xs:top-2 xs:inset-s-2 xs:max-w-[calc(100%-5rem)] xs:px-2 xs:text-[9px]">
                                {fabric.tag}
                              </div>
                            ) : null}
                            <div className="absolute top-1.5 inset-e-1.5 z-20 flex items-center gap-0.5 xs:top-2 xs:inset-e-2 xs:gap-1">
                              <button
                                type="button"
                                aria-label={
                                  locale === "ar" ? "مشاركة" : "Share"
                                }
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await handleShare(
                                    hrefPath,
                                    locale === "ar"
                                      ? "اطلع على القماش"
                                      : "Check this fabric",
                                  );
                                }}
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:cursor-pointer xs:size-7 sm:hover:scale-105"
                              >
                                <Share2
                                  className="size-2.5 text-black xs:size-3"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                              </button>
                              <WishlistButton
                                item={{
                                  id: listingCut
                                    ? buildFabricCutCartId(
                                        fabric._id,
                                        listingCut.cutId,
                                      )
                                    : fabric._id,
                                  name: fabricName,
                                  image,
                                  price,
                                  slug: fabric.slug,
                                  size: cutLabel,
                                  quantity: 1,
                                  type: "fabric",
                                  ...(listingCut
                                    ? { maxStock: listingCut.stock }
                                    : {}),
                                }}
                                inline
                                className="size-6! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm xs:size-7!"
                                iconClassName="size-2.5! xs:size-3!"
                              />
                            </div>
                          </div>
                          <div className="p-2 xs:p-2.5 sm:p-3">
                            <h3 className="mb-0.5 line-clamp-2 text-[12px] leading-snug text-black [font-family:var(--font-display)] xs:text-[13px] sm:text-[14px]">
                              {fabricName}
                            </h3>
                            {material ? (
                              <p className="mb-0.5 text-[8px] uppercase tracking-[0.14em] text-(--color-grey-muted) [font-family:var(--font-ui)] sm:text-[9px]">
                                {material}
                              </p>
                            ) : null}
                            <p className="text-[9px] text-(--color-grey-muted) [font-family:var(--font-ui)] sm:text-[10px]">
                              {formatFabricListingPrice(fabric, locale)}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Ready-made */}
          <section className="border-b border-(--color-border) px-4 xs:px-5 py-8 xs:py-10 sm:px-8 sm:py-12 md:px-10 lg:px-(--space-40) lg:py-14">
            <div className="mx-auto max-w-7xl min-w-0">
              <div className="mb-5 xs:mb-6 sm:mb-7">
                <span className="mb-2 flex min-w-0 items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.22em]">
                  <span className="block h-px w-4 shrink-0 bg-(--color-grey-muted) xs:w-5" />
                  <span className="min-w-0 truncate">{t("readyMadeCount", { count: readyMade.length })}</span>
                </span>
                <h2 className="wrap-break-word [font-family:var(--font-display)] text-[22px] tracking-[-0.01em] text-black xs:text-[24px] sm:text-[30px] md:text-[32px]">
                  {t("readyMadeTitle")}
                </h2>
              </div>

              {readyMade.length === 0 ? (
                <div className="rounded-lg border border-(--color-border) bg-[#FAFAF7] px-6 py-12 text-center">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)]">
                    {t("readyMadeEmpty")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {readyMade.map((item, idx) => {
                    const itemName =
                      locale === "ar" ? item.nameAr || item.name : item.name;
                    const image = resolveReadyMadeImage(item.images?.[0]);
                    const fabricType =
                      locale === "ar"
                        ? item.fabricTypeAr || item.fabricType
                        : item.fabricType;
                    const tag =
                      locale === "ar" ? item.tagAr || item.tag : item.tag;
                    const hrefPath = `/ready-made/${item.slug}`;
                    const price = Number(item.finalSellingPriceAED) || 0;

                    return (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{
                          duration: 0.4,
                          delay: Math.min(idx * 0.05, 0.25),
                        }}
                        className="group min-w-0"
                      >
                        <Link
                          href={hrefPath}
                          className="block h-full overflow-hidden rounded-md border border-(--color-border) bg-white shadow-[0_1px_0_rgba(26,42,58,0.03)] transition-all duration-500 sm:rounded-lg md:hover:-translate-y-1 md:hover:border-[#1A2A3A]/20 md:hover:shadow-[0_14px_28px_-18px_rgba(26,42,58,0.3)]"
                        >
                          <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                            <img
                              src={image}
                              alt={itemName}
                              loading="lazy"
                              className="h-full w-full object-cover object-top transition-transform duration-700 md:group-hover:scale-105"
                            />
                            {tag ? (
                              <div className="absolute top-1.5 inset-s-1.5 z-10 max-w-[calc(100%-6.5rem)] truncate bg-black px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-widest text-white [font-family:var(--font-ui)] xs:top-2 xs:inset-s-2 xs:max-w-[calc(100%-7.5rem)] xs:px-2 xs:text-[9px]">
                                {tag}
                              </div>
                            ) : null}
                            <div className="absolute top-1.5 inset-e-1.5 z-20 flex items-center gap-0.5 xs:top-2 xs:inset-e-2 xs:gap-1">
                              <button
                                type="button"
                                aria-label={
                                  locale === "ar" ? "مشاركة" : "Share"
                                }
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await handleShare(hrefPath);
                                }}
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:cursor-pointer xs:size-7 sm:hover:scale-105"
                              >
                                <Share2
                                  className="size-2.5 text-black xs:size-3"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                              </button>
                              <WishlistButton
                                item={{
                                  id: item._id,
                                  name: itemName,
                                  image,
                                  price,
                                  slug: item.slug,
                                  size: String(item.metersPerFabric || "N/A"),
                                  quantity: 1,
                                  type: "readyMade",
                                  ...(Number.isFinite(item.availableFabricStock)
                                    ? { maxStock: item.availableFabricStock }
                                    : {}),
                                }}
                                inline
                                className="size-6! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm xs:size-7!"
                                iconClassName="size-2.5! xs:size-3!"
                              />
                              <AddToCartButton
                                item={{
                                  id: item._id,
                                  slug: item.slug,
                                  name: itemName,
                                  image,
                                  price,
                                  size: String(item.metersPerFabric || "N/A"),
                                  itemType: "readyMade",
                                  maxStock: item.availableFabricStock ?? 0,
                                }}
                                inline
                                className="size-6! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm xs:size-7!"
                                iconClassName="size-2.5! xs:size-3!"
                              />
                            </div>
                          </div>
                          <div className="p-2 xs:p-2.5 sm:p-3">
                            <h3 className="mb-0.5 line-clamp-2 text-[12px] leading-snug text-black [font-family:var(--font-display)] xs:text-[13px] sm:text-[14px]">
                              {itemName}
                            </h3>
                            {fabricType ? (
                              <p className="mb-0.5 text-[8px] uppercase tracking-[0.14em] text-(--color-grey-muted) [font-family:var(--font-ui)] sm:text-[9px]">
                                {fabricType}
                              </p>
                            ) : null}
                            <p className="text-[9px] text-(--color-grey-muted) [font-family:var(--font-ui)] sm:text-[10px]">
                              AED {price.toLocaleString()}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Add-ons */}
          <section className="px-4 xs:px-5 py-8 xs:py-10 sm:px-8 sm:py-12 md:px-10 lg:px-(--space-40) lg:py-14">
            <div className="mx-auto max-w-7xl min-w-0">
              <div className="mb-5 xs:mb-6 sm:mb-7">
                <span className="mb-2 flex min-w-0 items-center gap-2 text-[9px] uppercase tracking-[0.2em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.22em]">
                  <span className="block h-px w-4 shrink-0 bg-(--color-grey-muted) xs:w-5" />
                  <span className="min-w-0 truncate">{t("addonsCount", { count: addons.length })}</span>
                </span>
                <h2 className="wrap-break-word [font-family:var(--font-display)] text-[22px] tracking-[-0.01em] text-black xs:text-[24px] sm:text-[30px] md:text-[32px]">
                  {t("addonsTitle")}
                </h2>
              </div>

              {addons.length === 0 ? (
                <div className="rounded-lg border border-(--color-border) bg-[#FAFAF7] px-6 py-12 text-center">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)]">
                    {t("addonsEmpty")}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 xs:gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {addons.map((item, idx) => {
                    const itemName =
                      locale === "ar" ? item.nameAr || item.name : item.name;
                    const image =
                      resolveMediaUrl(item.thumbnailImage) ||
                      resolveMediaUrl(item.images?.[0]) ||
                      "/placeholder.png";
                    const tag =
                      locale === "ar" ? item.tagAr || item.tag : item.tag;
                    const hrefPath = `/addons/${item.slug}`;
                    const price = Number(item.price) || 0;

                    return (
                      <motion.div
                        key={item._id}
                        initial={{ opacity: 0, y: 14 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-40px" }}
                        transition={{
                          duration: 0.4,
                          delay: Math.min(idx * 0.05, 0.25),
                        }}
                        className="group min-w-0"
                      >
                        <Link
                          href={hrefPath}
                          className="block h-full overflow-hidden rounded-md border border-(--color-border) bg-white shadow-[0_1px_0_rgba(26,42,58,0.03)] transition-all duration-500 sm:rounded-lg md:hover:-translate-y-1 md:hover:border-[#1A2A3A]/20 md:hover:shadow-[0_14px_28px_-18px_rgba(26,42,58,0.3)]"
                        >
                          <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                            <img
                              src={image}
                              alt={itemName}
                              loading="lazy"
                              className="h-full w-full object-cover object-top transition-transform duration-700 md:group-hover:scale-105"
                            />
                            {tag ? (
                              <div className="absolute top-1.5 inset-s-1.5 z-10 max-w-[calc(100%-6.5rem)] truncate bg-black px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-widest text-white [font-family:var(--font-ui)] xs:top-2 xs:inset-s-2 xs:max-w-[calc(100%-7.5rem)] xs:px-2 xs:text-[9px]">
                                {tag}
                              </div>
                            ) : null}
                            <div className="absolute top-1.5 inset-e-1.5 z-20 flex items-center gap-0.5 xs:top-2 xs:inset-e-2 xs:gap-1">
                              <button
                                type="button"
                                aria-label={
                                  locale === "ar" ? "مشاركة" : "Share"
                                }
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await handleShare(hrefPath);
                                }}
                                className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:cursor-pointer xs:size-7 sm:hover:scale-105"
                              >
                                <Share2
                                  className="size-2.5 text-black xs:size-3"
                                  strokeWidth={1.75}
                                  aria-hidden
                                />
                              </button>
                              <WishlistButton
                                item={{
                                  id: item._id,
                                  name: itemName,
                                  image,
                                  price,
                                  slug: item.slug,
                                  size: "N/A",
                                  quantity: 1,
                                  type: "addons",
                                  maxStock: Number(item.stock) || 0,
                                }}
                                inline
                                className="size-6! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm xs:size-7!"
                                iconClassName="size-2.5! xs:size-3!"
                              />
                              <AddToCartButton
                                item={{
                                  id: item._id,
                                  slug: item.slug,
                                  name: itemName,
                                  image,
                                  price,
                                  size: "N/A",
                                  itemType: "addon",
                                  maxStock: Number(item.stock) || 0,
                                }}
                                inline
                                className="size-6! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm xs:size-7!"
                                iconClassName="size-2.5! xs:size-3!"
                              />
                            </div>
                          </div>
                          <div className="p-2 xs:p-2.5 sm:p-3">
                            <h3 className="mb-0.5 line-clamp-2 text-[12px] leading-snug text-black [font-family:var(--font-display)] xs:text-[13px] sm:text-[14px]">
                              {itemName}
                            </h3>
                            <p className="text-[9px] text-(--color-grey-muted) [font-family:var(--font-ui)] sm:text-[10px]">
                              {formatCurrency(price, locale)}
                            </p>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </FadeInSection>

      <div id="reviews" className="scroll-mt-20 sm:scroll-mt-24">
        <ProductReviewsSection
          fabricShopId={String(shop._id)}
          locale={locale}
          labels={{
            title: t("reviewsTitle"),
            empty: t("reviewsEmpty"),
            loading: t("reviewsLoading"),
            averageLabel: t.raw("reviewsAverage"),
            countLabel: t.raw("reviewsCount"),
            verifiedLabel: t("verifiedPurchase"),
          }}
        />
      </div>
      </div>
    </MainLayout>
  );
}
