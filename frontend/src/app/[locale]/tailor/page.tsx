"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

export default function TailorDashboardPage() {
    const t = useTranslations("TailorPortal.dashboard");
    const { user } = useAuth();

    return (
        <div className="max-w-3xl">
            <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-3">
                {t("eyebrow")}
            </p>
            <h1 className="[font-family:var(--font-display)] text-[32px] sm:text-[40px] text-black mb-4">
                {t("title", { name: user?.name || "" })}
            </h1>
            <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) mb-8">
                {t("description")}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link
                    href="/tailor/shop"
                    className="block border border-(--color-border) bg-white p-6 hover:border-black transition"
                >
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
                        {t("shopCardEyebrow")}
                    </p>
                    <p className="[font-family:var(--font-display)] text-[20px] text-black">
                        {t("shopCardTitle")}
                    </p>
                </Link>
                <Link
                    href="/tailor/designs"
                    className="block border border-(--color-border) bg-white p-6 hover:border-black transition"
                >
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-2">
                        {t("designsCardEyebrow")}
                    </p>
                    <p className="[font-family:var(--font-display)] text-[20px] text-black">
                        {t("designsCardTitle")}
                    </p>
                </Link>
            </div>
        </div>
    );
}
