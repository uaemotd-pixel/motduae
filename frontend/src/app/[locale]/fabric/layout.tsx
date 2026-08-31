"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api/client";
import FabricPendingState from "@/components/fabric/FabricPendingState";
import FabricRejectedState from "@/components/fabric/FabricRejectedState";
import FabricPortalShell from "@/components/fabric/FabricPortalShell";
import PartnerApplyChrome from "@/components/partner/PartnerApplyChrome";
import { SectionLoadingSkeleton } from "@/components/ui/Skeleton";
import { resolvePartnerPortalGate } from "@/lib/auth/partnerPortalGate";

export default function FabricLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("FabricPortal");
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const locale = params.locale === "ar" ? "ar" : "en";
  const { user, isLoading } = useAuth();
  const [isDeactivated, setIsDeactivated] = useState(false);
  const gate = resolvePartnerPortalGate({
    portal: "fabric",
    user,
    pathname,
    isDeactivated,
  });
  const redirectTo = gate.screen === "redirect" ? gate.to : null;

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const redirect = encodeURIComponent(`/${locale}/fabric`);
      router.push(`/auth/login?redirect=${redirect}`);
      return;
    }

    if (user.role !== "fabric_store") {
      router.push("/");
      return;
    }

    if (redirectTo) {
      router.replace(redirectTo);
      return;
    }

    if (user.isActive === false) {
      setIsDeactivated(true);
      return;
    }

    const checkStatus = async () => {
      try {
        const profile = await api.get<{ isActive?: boolean }>("/api/users/profile");
        if (profile.isActive === false) {
          setIsDeactivated(true);
        }
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 403 || status === 401) {
          setIsDeactivated(true);
        }
      }
    };

    checkStatus();
  }, [isLoading, locale, router, user, redirectTo]);

  if (isLoading || gate.screen === "redirect") {
    return (
      <div className="min-h-screen bg-white">
        <SectionLoadingSkeleton variant="dashboard" />
      </div>
    );
  }

  if (!user || user.role !== "fabric_store" || gate.screen === "empty") {
    return null;
  }

  if (gate.screen === "apply") {
    return (
      <PartnerApplyChrome
        logoutRedirect="/auth/login?redirect=/fabric"
        logoutLabel={t("logout")}
      >
        {children}
      </PartnerApplyChrome>
    );
  }

  if (gate.screen === "wait") {
    return <FabricPendingState />;
  }

  if (gate.screen === "rejected") {
    return <FabricRejectedState />;
  }

  return <FabricPortalShell>{children}</FabricPortalShell>;
}
