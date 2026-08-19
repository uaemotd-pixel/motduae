import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import LenisProvider from "@/components/providers/lenisProvider";
import { buildStaticPageMetadata, SITE_NAME, getSiteUrl } from "@/lib/seo";
import AnalyticsProvider from "@/components/analytics/AnalyticsProvider";
import CookieConsentBanner from "@/components/analytics/CookieConsentBanner";

import "../globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGoogleProvider } from "@/components/auth/AuthGoogleProvider";
import { CartProvider } from "@/context/CartContext";
import { CustomOrderProvider } from "@/context/CustomOrderContext";
import { Toaster } from "react-hot-toast";
import { RTLProvider } from "@/components/shared/RTLProvider";
import { WishlistProvider } from "@/context/WishlistContext";

type Props = {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    const baseMetadata = buildStaticPageMetadata(locale, "/");
    const titleStr = typeof baseMetadata.title === "string"
        ? baseMetadata.title
        : (baseMetadata.title as any)?.absolute || (baseMetadata.title as any)?.default || "";

    return {
        ...baseMetadata,
        metadataBase: new URL(getSiteUrl()),
        title: {
            default: titleStr,
            template: `%s | ${SITE_NAME}`,
        },
    };
}

export default async function LocaleLayout({ children, params }: Props) {
    const { locale } = await params;

    if (!hasLocale(routing.locales, locale)) {
        notFound();
    }

    setRequestLocale(locale);
    const messages = await getMessages();

    const dir = locale === "ar" ? "rtl" : "ltr";

    return (
        <html lang={locale} dir={dir} suppressHydrationWarning>
            <body className="bg-[#FFFDF9] text-[#000000]" suppressHydrationWarning>
                <NextIntlClientProvider messages={messages} locale={locale}>
                    <AuthGoogleProvider>
                        <AuthProvider>
                            <CartProvider>
                                <WishlistProvider>
                                    <CustomOrderProvider>
                                        <RTLProvider>
                                            <LenisProvider>
                                                {children}
                                                <AnalyticsProvider />
                                                <CookieConsentBanner />
                                            </LenisProvider>
                                        </RTLProvider>
                                        <Toaster
                                            position="top-right"
                                            toastOptions={{
                                                style: {
                                                    fontFamily: "var(--font-body)",
                                                    fontSize: "12px",
                                                    letterSpacing: "0.24em",
                                                    textTransform: "uppercase",
                                                    borderRadius: "8px",
                                                    padding: "12px 18px",
                                                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                                                },
                                                success: {
                                                    style: {
                                                        background: "#f0fdf4",
                                                        color: "#166534",
                                                        border: "1px solid #86efac",
                                                    },
                                                    iconTheme: {
                                                        primary: "#16a34a",
                                                        secondary: "#ffffff",
                                                    },
                                                },
                                                error: {
                                                    style: {
                                                        background: "#fef2f2",
                                                        color: "#991b1b",
                                                        border: "1px solid #fca5a5",
                                                    },
                                                    iconTheme: {
                                                        primary: "#dc2626",
                                                        secondary: "#ffffff",
                                                    },
                                                },
                                            }}
                                        />
                                    </CustomOrderProvider>
                                </WishlistProvider>
                            </CartProvider>
                        </AuthProvider>
                    </AuthGoogleProvider>
                </NextIntlClientProvider>
            </body>
        </html>
    );
}