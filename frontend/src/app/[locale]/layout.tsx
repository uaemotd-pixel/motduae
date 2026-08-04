import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import LenisProvider from "@/components/providers/lenisProvider";
import { buildStaticPageMetadata } from "@/lib/seo";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import CookieConsentBanner from "@/components/analytics/CookieConsentBanner";

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    return buildStaticPageMetadata(locale, "/");
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();

    return (
        <NextIntlClientProvider messages={messages} locale={locale}>
            <LenisProvider>
                {children}
                <AnalyticsProvider />
                <CookieConsentBanner />
            </LenisProvider>
        </NextIntlClientProvider>
    );
}