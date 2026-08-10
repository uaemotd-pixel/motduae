"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { api, type ApiError } from "@/lib/api/client";
import type { FabricDetailItem } from "@/lib/fabrics";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import FabricDetailView from "@/components/fabric/FabricDetailView";
import { Link } from "@/i18n/navigation";
import colors from "@/components/shared/colors";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";

export default function FabricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("FabricDetail");
  const slug = params.slug as string;
  const locale = params.locale === "ar" ? "ar" : "en";

  const [fabric, setFabric] = useState<FabricDetailItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFabric = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await api.get<{
          success: boolean;
          item: FabricDetailItem;
        }>(`/api/fabrics/${slug}`);

        if (!data?.success || !data.item) {
          throw new Error("Fabric not found");
        }

        setFabric(data.item);
      } catch (err: unknown) {
        const message =
          (err as ApiError)?.message ||
          (err instanceof Error ? err.message : "Failed to load fabric");
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    if (slug) fetchFabric();
  }, [slug]);

  // Helper to get color display
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

  // Pass colors as visual circles to FabricDetailView
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
            color: [t("color")],
            city: t("city"),
            perMeter: t("perMeter"),
            selectForCustomOrder: t("selectForCustomOrder"),
            storeTitle: t("storeTitle"),
            pickupLabel: t("pickupLabel"),
            partnerNote: t("partnerNote"),
          }}
        />
      </FadeInSection>
    </MainLayout>
  );
}
