"use client";

import type { ReactNode } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import CustomerAudioCallHost from "@/components/shared/CustomerAudioCallHost";

/**
 * Site-shell provider for customer audio calls.
 * Incoming rings use fullscreen when the chatbot is closed; in-call UI
 * mounts inside the chatbot panel via CustomerAudioCallPanelOverlay.
 */
export default function CustomerSiteAudioCall({
  children,
}: {
  children?: ReactNode;
}) {
  const params = useParams();
  const locale = params.locale === "ar" ? "ar" : "en";
  const isAr = locale === "ar";
  const { user, isLoading: authLoading } = useAuth();

  const customerName =
    user && !user.isGuest && user.name?.trim()
      ? user.name.trim()
      : "";

  return (
    <CustomerAudioCallHost
      locale={locale}
      isAr={isAr}
      authLoading={authLoading}
      customerName={customerName}
    >
      {children}
    </CustomerAudioCallHost>
  );
}
