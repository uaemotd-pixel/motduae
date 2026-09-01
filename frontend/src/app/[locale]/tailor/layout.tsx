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
import { resolvePartnerPortalGate } from "@/lib/auth/partnerPortalGate";

export default function TailorLayout({ children }: { children: React.ReactNode }) {
    const t = useTranslations("TailorPortal");
    const router = useRouter();
    const params = useParams();
    const pathname = usePathname();
    const locale = params.locale === "ar" ? "ar" : "en";
    const { user, isLoading } = useAuth();
    const gate = resolvePartnerPortalGate({
        portal: "tailor",
        user,
        pathname,
    });
    const redirectTo = gate.screen === "redirect" ? gate.to : null;

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

        if (redirectTo) {
            router.replace(redirectTo);
        }
    }, [isLoading, locale, router, user, redirectTo]);

    if (isLoading || gate.screen === "redirect") {
        return (
            <div className="min-h-screen bg-white">
                <SectionLoadingSkeleton variant="dashboard" />
            </div>
        );
    }

    if (!user || user.role !== "tailor" || gate.screen === "empty") {
        return null;
    }

    if (gate.screen === "apply") {
        return (
            <PartnerApplyChrome
                logoutRedirect="/auth/login?redirect=/tailor"
                logoutLabel={t("logout")}
            >
                {children}
            </PartnerApplyChrome>
        );
    }

    if (gate.screen === "wait") {
        return <TailorPendingState />;
    }

    if (gate.screen === "rejected") {
        return <TailorRejectedState />;
    }

    return <TailorPortalShell>{children}</TailorPortalShell>;
}
