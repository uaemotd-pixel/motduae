"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { api, type ApiError } from "@/lib/api/client";
import type { FabricDetailItem, FabricListItem } from "@/lib/fabrics";
import {
  getFabricDisplayFields,
  getFabricMinListingPrice,
  resolveFabricImage,
} from "@/lib/fabrics";
import { formatCurrency } from "@/lib/format";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import FabricDetailView from "@/components/fabric/FabricDetailView";
import { Link } from "@/i18n/navigation";
import colors from "@/components/shared/colors";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import { Tag } from "@/components/ui/Tag";
import WishlistButton from "@/components/shared/wishlistButton";
import RelatedProductsCarousel from "@/components/shared/RelatedProductsCarousel";
import { ProductReviewsSection } from "@/components/reviews/CustomerReviewsView";

function RelatedFabricsSection({
  items,
  locale,
  labels,
}: {
  items: FabricListItem[];
  locale: string;
  labels: {
    relatedEyebrow: string;
    relatedTitle: string;
    relatedExplore: string;
    outOfStock: string;
  };
}) {
  const lang = locale === "ar" ? "ar" : "en";
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
    async (hrefPath: string) => {
      const fullUrl = getFullUrl(hrefPath);
      const shareData = {
        title: "MOTD",
        text: locale === "ar" ? "اطلع على القماش" : "Check this fabric",
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

  if (!items.length) return null;

  return (
    <section className="bg-(--bg-page) border-t border-(--color-border) pt-12 xs:pt-14 sm:pt-16 pb-16 xs:pb-20 sm:pb-24">
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-black text-white px-4 py-2.5 rounded-lg shadow-lg [font-family:var(--font-ui)] text-xs sm:text-sm tracking-wide max-w-[calc(100vw-24px)] text-center pointer-events-none">
          {toastMessage}
        </div>
      )}
      <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 xs:mb-10">
          <div>
            <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 flex items-center gap-3">
              <span className="block w-5 h-px bg-(--color-grey-muted)" />
              {labels.relatedEyebrow}
            </span>
            <h2 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] md:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
              {labels.relatedTitle}
            </h2>
          </div>
          <Link
            href="/fabrics/fabricStore"
            className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-1 hover:opacity-50 transition-opacity whitespace-nowrap self-start sm:self-auto"
          >
            {labels.relatedExplore}
          </Link>
        </div>

        <RelatedProductsCarousel isRtl={locale === "ar"}>
          {items.map((item, idx) => {
            const { title } = getFabricDisplayFields(item, lang);
            const image = resolveFabricImage(item.images);
            const price = getFabricMinListingPrice(item);
            const inStock = (item.cuts || []).some(
              (cut) => Number(cut.stock) > 0,
            );
            const hrefPath = `/fabrics/${item.slug}`;
            const tag = item.tag;
            const store =
              item.listedByStore && typeof item.listedByStore === "object"
                ? item.listedByStore
                : null;
            const storeName = store
              ? lang === "ar"
                ? store.nameAr || store.name
                : store.name
              : "";

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
                className="group h-full min-w-0"
              >
                <Link
                  href={hrefPath}
                  className="block h-full overflow-hidden rounded-md border border-(--color-border) bg-(--bg-page) transition-all duration-500 hover:-translate-y-1 hover:shadow-lg sm:rounded-lg"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                    <img
                      src={image}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    {tag && (
                      <Tag
                        elevated
                        truncate
                        className="absolute top-1 left-1 z-10 max-w-[calc(100%-1.75rem)] px-1 py-px text-[6px] tracking-[0.08em] xs:top-1.5 xs:left-1.5 xs:text-[7px]"
                      >
                        {tag}
                      </Tag>
                    )}
                    {!inStock && (
                      <div className="absolute bottom-1.5 left-1.5 z-10 bg-black/75 px-1.5 py-0.5 text-[7px] uppercase tracking-[0.14em] text-white [font-family:var(--font-ui)]">
                        {labels.outOfStock}
                      </div>
                    )}
                    <div className="absolute top-1 right-1 z-20 flex flex-col items-center gap-0.5 xs:top-1.5 xs:right-1.5 sm:flex-row sm:gap-1">
                      <button
                        type="button"
                        aria-label={locale === "ar" ? "مشاركة" : "Share"}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleShare(hrefPath);
                        }}
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:cursor-pointer hover:scale-105 sm:size-6"
                      >
                        <Share2 className="size-2.5 text-black sm:size-3" />
                      </button>
                      <WishlistButton
                        item={{
                          id: item._id,
                          name: title,
                          image,
                          price,
                          slug: item.slug,
                          size: item.material || "fabric",
                          quantity: 1,
                          type: "fabric",
                        }}
                        inline
                        className="size-5! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm sm:size-6!"
                        iconClassName="size-2.5! sm:size-3!"
                      />
                    </div>
                  </div>
                  <div className="p-2 xs:p-2.5 sm:p-3">
                    <h3 className="mb-0.5 line-clamp-2 text-[11px] leading-snug text-black [font-family:var(--font-display)] xs:text-[12px] sm:text-[13px]">
                      {title}
                    </h3>
                    <p className="mb-0.5 text-[8px] uppercase tracking-[0.12em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:text-[9px]">
                      {formatCurrency(price, lang)}
                    </p>
                    {storeName ? (
                      <p className="line-clamp-1 text-[9px] text-(--color-grey-muted) [font-family:var(--font-body)] xs:text-[10px]">
                        {storeName}
                      </p>
                    ) : null}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </RelatedProductsCarousel>
      </div>
    </section>
  );
}

export default function FabricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("FabricDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [fabric, setFabric] = useState<FabricDetailItem | null>(null);
  const [related, setRelated] = useState<FabricListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFabric = async () => {
      try {
        setLoading(true);
        setError(null);
        setRelated([]);

        const data = await api.get<{
          success: boolean;
          item: FabricDetailItem;
          related?: FabricListItem[];
        }>(`/api/fabrics/${slug}`);

        if (!data?.success || !data.item) {
          throw new Error("Fabric not found");
        }

        setFabric(data.item);
        setRelated(
          Array.isArray(data.related)
            ? data.related.filter((item) => item?.slug && item.slug !== slug)
            : [],
        );
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load fabric");
        setError(message);
        setFabric(null);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchFabric();
  }, [slug]);

  const getColorDisplay = (fabricColors: string[] | undefined) => {
    if (!fabricColors || fabricColors.length === 0) {
      return locale === "ar" ? "بدون لون" : "No color";
    }

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {fabricColors.slice(0, 8).map((color, index) => {
          const colorObj = colors.find(
            (c) => c.value.toLowerCase() === color.toLowerCase(),
          );
          return (
            <span
              key={index}
              className="w-6 h-6 rounded-full border border-[#E4E0D8] shrink-0"
              style={{
                backgroundColor: colorObj?.hex || "#CCCCCC",
              }}
              title={color}
            />
          );
        })}
        {fabricColors.length > 8 && (
          <span className="text-[10px] text-[#8A8A80] font-mono">
            +{fabricColors.length - 8}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <MainLayout>
        <DetailPageSkeleton />
      </MainLayout>
    );
  }

  if (error || !fabric) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <h1 className="[font-family:var(--font-display)] text-2xl text-black mb-3">
              {t("notFoundTitle")}
            </h1>
            <p className="text-sm text-(--color-grey-muted) mb-6">
              {error || t("notFound")}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link
                href="/fabrics/fabricStore"
                className="px-6 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition"
              >
                {t("browseAll")}
              </Link>
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 border border-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition"
              >
                {t("goBack")}
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const enhancedFabric = {
    ...fabric,
    colorDisplay: getColorDisplay(fabric.color),
  };

  return (
    <MainLayout>
      <FadeInSection>
        <FabricDetailView
          fabric={enhancedFabric}
          locale={locale}
          labels={{
            fabrics: t("fabrics"),
            material: t("material"),
            category: t("category"),
            pattern: t("pattern"),
            color: [t("color")],
            city: t("city"),
            perMeter: t("perMeter"),
            selectCut: t("selectCut"),
            selectForCustomOrder: t("selectForCustomOrder"),
            storeTitle: t("storeTitle"),
            pickupLabel: t("pickupLabel"),
            partnerNote: t("partnerNote"),
          }}
        />
      </FadeInSection>

      <RelatedFabricsSection
        items={related}
        locale={locale}
        labels={{
          relatedEyebrow: t("relatedEyebrow"),
          relatedTitle: t("relatedTitle"),
          relatedExplore: t("relatedExplore"),
          outOfStock: t("outOfStock"),
        }}
      />

      <ProductReviewsSection
        productId={String(fabric._id)}
        locale={locale}
        labels={{
          title: t("reviewsTitle"),
          empty: t("reviewsEmpty"),
          loading: t("reviewsLoading"),
          // Use raw templates — ProductReviewsSection fills {rating}/{count}
          averageLabel: t.raw("reviewsAverage"),
          countLabel: t.raw("reviewsCount"),
          verifiedLabel: t("verifiedPurchase"),
        }}
      />
    </MainLayout>
  );
}
