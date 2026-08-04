import type { Metadata } from "next";
import "./globals.css";
import { EXTENSION_HYDRATION_GUARD_SCRIPT } from "@/lib/extension-hydration-guard";
import { AuthProvider } from "@/context/AuthContext";
import { AuthGoogleProvider } from "@/components/auth/AuthGoogleProvider";
import { CartProvider } from "@/context/CartContext";
import { CustomOrderProvider } from "@/context/CustomOrderContext";
import { Toaster } from "react-hot-toast";
import { RTLProvider } from "@/components/shared/RTLProvider";
import { WishlistProvider } from "@/context/WishlistContext";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  SITE_NAME_FULL,
  defaultDescription,
  getSiteUrl,
  toAbsoluteUrl,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME_FULL,
    template: `%s | ${SITE_NAME}`,
  },
  description: defaultDescription("en"),
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_NAME_FULL,
    description: defaultDescription("en"),
    images: [
      {
        url: toAbsoluteUrl(DEFAULT_OG_IMAGE),
        width: 1200,
        height: 630,
        alt: SITE_NAME_FULL,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME_FULL,
    description: defaultDescription("en"),
    images: [toAbsoluteUrl(DEFAULT_OG_IMAGE)],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <script
          dangerouslySetInnerHTML={{
            __html: EXTENSION_HYDRATION_GUARD_SCRIPT,
          }}
        /> */}
      </head>
      <body className="bg-[#FFFDF9] text-[#000000]" suppressHydrationWarning>
        <AuthGoogleProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <CustomOrderProvider>
                  <RTLProvider>{children}</RTLProvider>
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
      </body>
    </html>
  );
}
