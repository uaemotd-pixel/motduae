"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, type ApiError } from "@/lib/api/client";
import DesignDetailView, {
  type DesignDetailItem,
} from "@/components/tailor/DesignDetailView";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";

export default function DesignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("DesignDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [design, setDesign] = useState<DesignDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDesign = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          item: DesignDetailItem;
        }>(`/api/tailors/designs/${slug}`);

        if (!data?.success || !data.item) {
          throw new Error("Design not found");
        }

        setDesign(data.item);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load design");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchDesign();
  }, [slug]);

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
            {t("loading")}
          </p>
        </div>
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
            city: t("city"),
            startingPrice: t("startingPrice"),
            selectForCustomOrder: t("selectForCustomOrder"),
            tailorTitle: t("tailorTitle"),
            addressLabel: t("addressLabel"),
            partnerNote: t("partnerNote"),
          }}
        />
      </FadeInSection>
    </MainLayout>
  );
}
