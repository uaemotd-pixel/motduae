"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import TailorPendingState from "@/components/tailor/TailorPendingState";
import TailorRejectedState from "@/components/tailor/TailorRejectedState";
import TailorPortalShell from "@/components/tailor/TailorPortalShell";
import { SectionLoadingSkeleton } from "@/components/ui/Skeleton";

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
            <div className="min-h-screen bg-[#FDFAF5]">
                <SectionLoadingSkeleton variant="dashboard" />
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
