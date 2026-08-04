import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";
import { routing } from "@/i18n/routing";

// Trailing slash / $ avoid blocking public /tailors and /fabrics routes.
const PRIVATE_PATHS = [
  "/admin",
  "/sub-admin-dashboard",
  "/account",
  "/auth",
  "/checkout",
  "/cart",
  "/wishlist",
  "/tailor$",
  "/tailor/",
  "/fabric$",
  "/fabric/",
];

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();
  const disallow = routing.locales.flatMap((locale) =>
    PRIVATE_PATHS.map((prefix) => `/${locale}${prefix}`),
  );

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow,
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
