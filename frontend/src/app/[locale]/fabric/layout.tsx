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
  const submitted = Boolean(user?.applicationSubmittedAt);
  const isApplyPath = pathname.includes("/fabric/apply");

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

    if (user.approvalStatus === "pending" && !submitted && !isApplyPath) {
      router.replace("/fabric/apply");
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
  }, [isLoading, locale, router, user, submitted, isApplyPath]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <SectionLoadingSkeleton variant="dashboard" />
      </div>
    );
  }

  if (!user || user.role !== "fabric_store") {
    return null;
  }

  if (user.approvalStatus === "pending" && !submitted) {
    if (!isApplyPath) return null;
    return (
      <PartnerApplyChrome
        logoutRedirect="/auth/login?redirect=/fabric"
        logoutLabel={t("logout")}
      >
        {children}
      </PartnerApplyChrome>
    );
  }

  if (
    user.approvalStatus === "pending" ||
    user.isActive === false ||
    isDeactivated
  ) {
    return <FabricPendingState />;
  }

  if (user.approvalStatus === "rejected" && isApplyPath) {
    return (
      <PartnerApplyChrome
        logoutRedirect="/auth/login?redirect=/fabric"
        logoutLabel={t("logout")}
      >
        {children}
      </PartnerApplyChrome>
    );
  }

  if (user.approvalStatus === "rejected") {
    return <FabricRejectedState />;
  }

  return <FabricPortalShell>{children}</FabricPortalShell>;
}
