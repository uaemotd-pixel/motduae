"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import PartnerGateScreen from "@/components/partner/PartnerGateScreen";

export default function FabricPendingState() {
  const t = useTranslations("FabricPortal.pending");
  const tPortal = useTranslations("FabricPortal");
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
          onClick: () => void logout("/auth/login?redirect=/fabric"),
          variant: "primary",
        },
      ]}
      logoutLabel={tPortal("logout")}
      onLogout={() => void logout("/auth/login?redirect=/fabric")}
      logoutAsButton
    />
  );
}
