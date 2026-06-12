"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import TailorPendingState from "@/components/tailor/TailorPendingState";
import TailorRejectedState from "@/components/tailor/TailorRejectedState";
import TailorPortalShell from "@/components/tailor/TailorPortalShell";

export default function TailorLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("TailorPortal");
    const router = useRouter();
    const params = useParams();
    const locale = params.locale === "ar" ? "ar" : "en";
    const { user, isLoading } = useAuth();

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            const redirect = encodeURIComponent(`/${locale}/tailor`);
            router.push(`/auth/login?redirect=${redirect}`);
            return;
        }

        if (user.role !== "tailor") {
            router.push("/");
        }
    }, [isLoading, locale, router, user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#FDFAF5] flex items-center justify-center">
                <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {t("loading")}
                </p>
            </div>
        );
    }

    if (!user || user.role !== "tailor") {
        return null;
    }

    if (user.approvalStatus === "pending") {
        return <TailorPendingState />;
    }

    if (user.approvalStatus === "rejected") {
        return <TailorRejectedState />;
    }

    return <TailorPortalShell>{children}</TailorPortalShell>;
}
