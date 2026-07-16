"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { api } from "@/lib/api/client";
import FabricPendingState from "@/components/fabric/FabricPendingState";
import FabricRejectedState from "@/components/fabric/FabricRejectedState";
import FabricPortalShell from "@/components/fabric/FabricPortalShell";

export default function FabricLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("FabricPortal");
  const router = useRouter();
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const { user, isLoading } = useAuth();
  const [isDeactivated, setIsDeactivated] = useState(false);

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

    if (user.isActive === false) {
      setIsDeactivated(true);
      return;
    }

    const checkStatus = async () => {
      try {
        const profile = await api.get<any>("/api/users/profile");
        if (profile.isActive === false) {
          setIsDeactivated(true);
        }
      } catch (err) {
        const status = (err as any)?.status;
        if (status === 403 || status === 401) {
          setIsDeactivated(true);
        }
      }
    };

    checkStatus();
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

  if (!user || user.role !== "fabric_store") {
    return null;
  }

  if (
    user.approvalStatus === "pending" ||
    user.isActive === false ||
    isDeactivated
  ) {
    return <FabricPendingState />;
  }

  if (user.approvalStatus === "rejected") {
    return <FabricRejectedState />;
  }

  return <FabricPortalShell>{children}</FabricPortalShell>;
}
