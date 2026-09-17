"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import { api, type ApiError } from "@/lib/api/client";
import DesignDetailView, {
  type DesignDetailItem,
} from "@/components/tailor/DesignDetailView";
import { ProductReviewsSection } from "@/components/reviews/CustomerReviewsView";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import WishlistButton from "@/components/shared/wishlistButton";
import RelatedProductsCarousel from "@/components/shared/RelatedProductsCarousel";
import {
  formatDesignBasePrice,
  getDesignDisplayFields,
  resolveDesignImage,
  type TailorDesignListItem,
} from "@/lib/tailors";

const CATEGORY_COLORS: Record<string, string> = {
  "hand-embroidered": "#8B6B4D",
  "crystal-embellished": "#1A2A3A",
  "non-crystal": "#5A6B5A",
  talli: "#B8860B",
  khous: "#4A3A2A",
  beaded: "#6B2A5A",
};

function RelatedDesignsSection({
  items,
  locale,
  labels,
}: {
  items: TailorDesignListItem[];
  locale: "en" | "ar";
  labels: {
    relatedEyebrow: string;
    relatedTitle: string;
    relatedExplore: string;
  };
}) {
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
        text: locale === "ar" ? "اطلع على هذا التصميم" : "Check this design",
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
    <section className="border-t border-(--color-border) bg-(--bg-page) pt-10 pb-14 xs:pt-14 xs:pb-20 sm:pt-16 sm:pb-24">
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg bg-black px-4 py-2.5 text-center text-xs tracking-wide text-white shadow-lg [font-family:var(--font-ui)] sm:text-sm">
          {toastMessage}
        </div>
      )}
      <div className="mx-auto w-full max-w-7xl px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40)">
        <div className="mb-6 flex flex-col gap-3 xs:mb-8 xs:gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <span className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:gap-3 xs:text-[10px] xs:tracking-[0.28em]">
              <span className="block h-px w-4 bg-(--color-grey-muted) xs:w-5" />
              {labels.relatedEyebrow}
            </span>
            <h2 className="[font-family:var(--font-display)] text-[24px] font-normal leading-[1.1] tracking-[-0.01em] text-black xs:text-[32px] sm:text-[36px] md:text-[40px]">
              {labels.relatedTitle}
            </h2>
          </div>
          <Link
            href="/designs/designShop"
            className="self-start whitespace-nowrap border-b border-black pb-1 text-[9px] uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-50 [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.24em] sm:self-auto"
          >
            {labels.relatedExplore}
          </Link>
        </div>

        <RelatedProductsCarousel isRtl={locale === "ar"}>
          {items.map((item, idx) => {
            const { name, category } = getDesignDisplayFields(item, locale);
            const image = resolveDesignImage(item.images?.[0]);
            const priceText = formatDesignBasePrice(
              item.basePrice,
              locale,
              item.priceType,
            );
            const hrefPath = `/designs/${item.slug}`;
            const categoryColor =
              CATEGORY_COLORS[String(item.category || "").toLowerCase()] ||
              "#1A1A1A";
            const tailorName =
              locale === "ar"
                ? item.tailorNameAr || item.tailorName
                : item.tailorName || item.tailorNameAr;

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
                  className="block h-full overflow-hidden rounded-md border border-(--color-border) bg-(--bg-page) transition-all duration-500 sm:rounded-lg md:hover:-translate-y-1 md:hover:shadow-lg"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                    <img
                      src={image}
                      alt={name}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition-transform duration-700 md:group-hover:scale-105"
                    />
                    {category && (
                      <div
                        className="absolute top-1 inset-s-1 z-10 max-w-[calc(100%-1.75rem)] truncate px-1 py-px text-[6px] font-medium uppercase tracking-widest text-white [font-family:var(--font-ui)] xs:top-1.5 xs:inset-s-1.5 xs:text-[7px]"
                        style={{ backgroundColor: categoryColor }}
                      >
                        {category}
                      </div>
                    )}
                    <div className="absolute top-1 inset-e-1 z-20 flex flex-col items-center gap-0.5 xs:top-1.5 xs:inset-e-1.5 sm:flex-row sm:gap-1">
                      <button
                        type="button"
                        aria-label={locale === "ar" ? "مشاركة" : "Share"}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleShare(hrefPath);
                        }}
                        className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:cursor-pointer sm:size-6 sm:hover:scale-105"
                      >
                        <Share2
                          className="size-2.5 text-black sm:size-3"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </button>
                      <WishlistButton
                        item={{
                          id: item._id,
                          name,
                          image,
                          price: item.basePrice,
                          slug: item.slug,
                          size: "N/A",
                          quantity: 1,
                          type: "design",
                        }}
                        inline
                        className="size-5! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm sm:size-6!"
                        iconClassName="size-2.5! sm:size-3!"
                      />
                    </div>
                  </div>
                  <div className="p-2 xs:p-2.5 sm:p-3">
                    <h3 className="mb-0.5 line-clamp-2 text-[11px] leading-snug text-black [font-family:var(--font-display)] xs:text-[12px] sm:text-[13px]">
                      {name}
                    </h3>
                    <p className="mb-0.5 text-[8px] uppercase tracking-[0.12em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:text-[9px]">
                      {priceText}
                    </p>
                    {tailorName ? (
                      <p className="line-clamp-1 text-[9px] text-(--color-grey-muted) [font-family:var(--font-body)] xs:text-[10px]">
                        {tailorName}
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

export default function DesignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("DesignDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [design, setDesign] = useState<DesignDetailItem | null>(null);
  const [related, setRelated] = useState<TailorDesignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        setLoading(true);
        setError(null);
        setRelated([]);

        const data = await api.get<{
          success: boolean;
          item: DesignDetailItem;
          related?: TailorDesignListItem[];
        }>(`/api/tailors/designs/${slug}`);

        if (!data?.success || !data.item) {
          throw new Error("Design not found");
        }

        setDesign(data.item);
        setRelated(
          Array.isArray(data.related)
            ? data.related.filter((item) => item?.slug && item.slug !== slug)
            : [],
        );
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load design");
        setError(message);
        setDesign(null);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDesign();
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <DetailPageSkeleton />
      </MainLayout>
    );
  }

  if (error || !design) {
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
                href="/tailors"
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

  return (
    <MainLayout>
      <FadeInSection>
        <DesignDetailView
          design={design}
          locale={locale}
          labels={{
            designs: t("designs"),
            category: t("category"),
            estimatedMeters: t("estimatedMeters"),
            estimatedDays: t("estimatedDays"),
            days: t("days"),
            ageRange: t("ageRange"),
            years: t("years"),
            city: t("city"),
            startingPrice: t("startingPrice"),
            selectForCustomOrder: t("selectForCustomOrder"),
            tailorTitle: t("tailorTitle"),
            addressLabel: t("addressLabel"),
            partnerNote: t("partnerNote"),
          }}
        />
      </FadeInSection>

      <RelatedDesignsSection
        items={related}
        locale={locale}
        labels={{
          relatedEyebrow: t("relatedEyebrow"),
          relatedTitle: t("relatedTitle"),
          relatedExplore: t("relatedExplore"),
        }}
      />

      <ProductReviewsSection
        productId={String(design._id)}
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
    </MainLayout>
  );
}
