export const COOKIE_CONSENT_KEY = "motd_cookie_consent";

export type CookieConsentStatus = "accepted" | "rejected";

export type CookieConsentRecord = {
  status: CookieConsentStatus;
  updatedAt: string;
};

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CookieConsentRecord>;
    if (parsed.status !== "accepted" && parsed.status !== "rejected") {
      return null;
    }

    return {
      status: parsed.status,
      updatedAt:
        typeof parsed.updatedAt === "string"
          ? parsed.updatedAt
          : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeCookieConsent(
  status: CookieConsentStatus,
): CookieConsentRecord {
  const record: CookieConsentRecord = {
    status,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(record));
    window.dispatchEvent(
      new CustomEvent("motd:cookie-consent", { detail: record }),
    );
  }

  return record;
}

export function clearCookieConsent(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(COOKIE_CONSENT_KEY);
  window.dispatchEvent(
    new CustomEvent("motd:cookie-consent", { detail: null }),
  );
}

export function getGaMeasurementId(): string {
  return process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";
}
