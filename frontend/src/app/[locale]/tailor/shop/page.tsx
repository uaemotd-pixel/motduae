"use client";

import { useTranslations } from "next-intl";

export default function TailorShopPlaceholderPage() {
    const t = useTranslations("TailorPortal.placeholders");

    return (
        <div className="max-w-2xl border border-(--color-border) bg-white p-8">
            <h1 className="[font-family:var(--font-display)] text-[28px] text-black mb-3">
                {t("shopTitle")}
            </h1>
            <p className="[font-family:var(--font-body)] text-[14px] text-(--color-grey-muted)">
                {t("shopDescription")}
            </p>
        </div>
    );
}
