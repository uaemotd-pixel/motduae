"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/context/AuthContext";
import PartnerGateScreen from "@/components/partner/PartnerGateScreen";
import { partnerSupportMailto } from "@/lib/contactEmail";

export default function FabricRejectedState() {
  const t = useTranslations("FabricPortal.rejected");
  const tPortal = useTranslations("FabricPortal");
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
        { label: t("editApplication"), href: "/fabric/apply", variant: "primary" },
        { label: t("goHome"), href: "/", variant: "outline" },
        {
          label: t("contactCta"),
          mailto: partnerSupportMailto({
            requestNumber: user?.requestNumber,
            role: "fabric_store",
          }),
          variant: "outline",
        },
      ]}
      logoutLabel={tPortal("logout")}
      onLogout={() => void logout("/auth/login?redirect=/fabric")}
    />
  );
}
