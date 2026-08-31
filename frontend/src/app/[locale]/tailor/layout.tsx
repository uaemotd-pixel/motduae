"use client";

import { useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import TailorPendingState from "@/components/tailor/TailorPendingState";
import TailorRejectedState from "@/components/tailor/TailorRejectedState";
import TailorPortalShell from "@/components/tailor/TailorPortalShell";
import PartnerApplyChrome from "@/components/partner/PartnerApplyChrome";
import { SectionLoadingSkeleton } from "@/components/ui/Skeleton";

export default function TailorLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("TailorPortal");
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const locale = params.locale === "ar" ? "ar" : "en";
    const { user, isLoading } = useAuth();

    const submitted = Boolean(user?.applicationSubmittedAt);
    const isApplyPath = pathname.includes("/tailor/apply");

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            const redirect = encodeURIComponent(`/${locale}/tailor`);
            router.push(`/auth/login?redirect=${redirect}`);
            return;
        }

        if (user.role !== "tailor") {
            router.push("/");
            return;
        }

        if (user.approvalStatus === "pending" && !submitted && !isApplyPath) {
            router.replace("/tailor/apply");
        }
    }, [isLoading, locale, router, user, submitted, isApplyPath]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-white">
                <SectionLoadingSkeleton variant="dashboard" />
            </div>
        );
    }

    if (!user || user.role !== "tailor") {
        return null;
    }

    if (user.approvalStatus === "pending" && !submitted) {
        if (!isApplyPath) return null;
        return (
            <PartnerApplyChrome
                logoutRedirect="/auth/login?redirect=/tailor"
                logoutLabel={t("logout")}
            >
                {children}
            </PartnerApplyChrome>
        );
    }

    if (user.approvalStatus === "pending") {
        return <TailorPendingState />;
    }

    if (user.approvalStatus === "rejected" && isApplyPath) {
        return (
            <PartnerApplyChrome
                logoutRedirect="/auth/login?redirect=/tailor"
                logoutLabel={t("logout")}
            >
                {children}
            </PartnerApplyChrome>
        );
    }

    if (user.approvalStatus === "rejected") {
        return <TailorRejectedState />;
    }

    return <TailorPortalShell>{children}</TailorPortalShell>;
}
