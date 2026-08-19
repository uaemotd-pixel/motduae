"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  getGaMeasurementId,
  readCookieConsent,
  type CookieConsentRecord,
} from "@/lib/cookieConsent";

function disableGoogleAnalytics(measurementId: string) {
  if (typeof window === "undefined") return;

  (window as unknown as Record<string, unknown>)[
    `ga-disable-${measurementId}`
  ] = true;

  const hostname = window.location.hostname;
  const domains = [hostname, `.${hostname}`];
  const propertySuffix = measurementId.replace(/^G-/, "");
  const names = ["_ga", "_gid", "_gat", `_ga_${propertySuffix}`];

  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; domain=${domain}`;
    }
    document.cookie = `${name}=; Max-Age=0; path=/`;
  }
}

export default function AnalyticsProvider() {
  const measurementId = getGaMeasurementId();
  const [consent, setConsent] = useState<CookieConsentRecord | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readCookieConsent());
    setReady(true);

    const onConsent = (event: Event) => {
      const detail = (event as CustomEvent<CookieConsentRecord | null>).detail;
      setConsent(detail);
      if (detail?.status !== "accepted" && measurementId) {
        disableGoogleAnalytics(measurementId);
      }
    };

    window.addEventListener("motd:cookie-consent", onConsent);
    return () => window.removeEventListener("motd:cookie-consent", onConsent);
  }, [measurementId]);

  const shouldLoad =
    ready && consent?.status === "accepted" && Boolean(measurementId);

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script id="motd-ga4" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${measurementId}', { anonymize_ip: true });
      `}</Script>
    </>
  );
}
