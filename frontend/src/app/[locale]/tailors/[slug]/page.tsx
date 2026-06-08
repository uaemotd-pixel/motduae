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
                <div className="min-h-[50vh] flex items-center justify-center">
                    <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em]">
                        {t("loading")}
                    </p>
                </div>
            </MainLayout>
        );
    }

    if (error || !shop) {
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
                <TailorDetailView
                    shop={shop}
                    designs={designs}
                    locale={locale}
                    labels={{
                        tailors: t("tailors"),
                        reviews: t("reviews"),
                        phone: t("phone"),
                        designsTitle: t("designsTitle"),
                        designsEmpty: t("designsEmpty"),
                        fromPrice: t("fromPrice"),
                        estimatedDays: t("estimatedDays"),
                        days: t("days"),
                        startOrder: t("startOrder"),
                    }}
                />
            </FadeInSection>
        </MainLayout>
    );
}
