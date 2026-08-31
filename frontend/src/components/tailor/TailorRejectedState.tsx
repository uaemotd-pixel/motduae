"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import PartnerGateScreen from "@/components/partner/PartnerGateScreen";

export default function TailorRejectedState() {
  const t = useTranslations("TailorPortal.rejected");
  const tPortal = useTranslations("TailorPortal");
  const { logout, user } = useAuth();

  return (
    <PartnerGateScreen
      eyebrow={t("eyebrow")}
      title={t("title")}
      description={t("description")}
      requestNumber={user?.requestNumber}
      requestNumberLabel={t("requestNumberLabel")}
      noteLabel={t("noteLabel")}
      note={user?.rejectionNote}
      footerText={t("contact")}
      actions={[
        { label: t("editApplication"), href: "/tailor/apply", variant: "primary" },
        { label: t("goHome"), href: "/", variant: "outline" },
        {
          label: t("contactCta"),
          mailto: "mailto:care@motd.ae",
          variant: "outline",
        },
      ]}
      logoutLabel={tPortal("logout")}
      onLogout={() => void logout("/auth/login?redirect=/tailor")}
    />
  );
}
