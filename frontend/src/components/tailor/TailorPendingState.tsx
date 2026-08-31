"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import PartnerGateScreen from "@/components/partner/PartnerGateScreen";

export default function TailorPendingState() {
  const t = useTranslations("TailorPortal.pending");
  const tPortal = useTranslations("TailorPortal");
  const { logout, user } = useAuth();

  return (
    <PartnerGateScreen
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      requestNumber={user?.requestNumber}
      requestNumberLabel={t("requestNumberLabel")}
      statusLine={t("status")}
      actions={[
        { label: t("goHome"), href: "/", variant: "outline" },
        {
          label: tPortal("logout"),
          onClick: () => void logout("/auth/login?redirect=/tailor"),
          variant: "primary",
        },
      ]}
      logoutLabel={tPortal("logout")}
      onLogout={() => void logout("/auth/login?redirect=/tailor")}
      logoutAsButton
    />
  );
}
