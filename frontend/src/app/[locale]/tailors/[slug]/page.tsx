"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { api, type ApiError } from "@/lib/api/client";
import type { TailorDesignListItem, TailorShopDetailItem } from "@/lib/tailors";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import TailorDetailView from "@/components/tailor/TailorDetailView";
import { ProductReviewsSection } from "@/components/reviews/CustomerReviewsView";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";

export default function TailorShopDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("TailorDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [shop, setShop] = useState<TailorShopDetailItem | null>(null);
  const [designs, setDesigns] = useState<TailorDesignListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchShopAndDesigns = async () => {
      try {
        setLoading(true);
        setError(null);

        const [shopData, designsData] = await Promise.all([
          api.get<{ success: boolean; item: TailorShopDetailItem }>(
            `/api/tailors/${slug}`,
          ),
          api.get<{ success: boolean; items: TailorDesignListItem[] }>(
            `/api/tailors/${slug}/designs`,
          ),
        ]);

        if (!shopData?.success || !shopData.item) {
          throw new Error("Tailor shop not found");
        }

        setShop(shopData.item);
        setDesigns(designsData?.items || []);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load tailor shop");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchShopAndDesigns();
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
                href="/tailors"
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

  return (
    <MainLayout>
      <FadeInSection>
        <TailorDetailView
          shop={shop}
          designs={designs}
          locale={locale}
          labels={{
            tailors: t("tailors"),
            reviews: t("reviews"),
            designsTitle: t("designsTitle"),
            designsEmpty: t("designsEmpty"),
            fromPrice: t("fromPrice"),
            estimatedDays: t("estimatedDays"),
            days: t("days"),
            startOrder: t("startOrder"),
            aboutTitle: t("aboutTitle"),
            designsCount: t("designsCount", { count: designs.length }),
            callShop: t("callShop"),
            viewDesigns: t("viewDesigns"),
            connectTitle: t("connectTitle"),
            website: t("website"),
            experienceTitle: t("experienceTitle"),
            experienceYear: t("experienceYear"),
            experienceYears: t("experienceYears"),
            experienceMonth: t("experienceMonth"),
            experienceMonths: t("experienceMonths"),
          }}
        />
      </FadeInSection>

      <div id="reviews" className="scroll-mt-24">
        <ProductReviewsSection
          tailorShopId={String(shop._id)}
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
    </MainLayout>
  );
}
