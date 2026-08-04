import type { Metadata } from "next";
import { resolveMediaUrl } from "@/lib/media";
import { routing } from "@/i18n/routing";

export const SITE_NAME = "MOTD";
export const SITE_NAME_FULL = "MOTD — Mukhawar of the Day";
export const DEFAULT_OG_IMAGE = "/images/hero-1.webp";

const DEFAULT_DESCRIPTION_EN =
  "Mukhawar of the Day — bespoke Eastern luxury tailored for the modern world. Ready-made and custom mukhawars in the UAE.";
const DEFAULT_DESCRIPTION_AR =
  "مخوّر اليوم — أناقة شرقية مصممة خصيصاً للعالم الحديث. مخاوير جاهزة ومخصصة في الإمارات.";

export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return vercel.startsWith("http") ? vercel.replace(/\/$/, "") : `https://${vercel}`;
  }

  return "http://localhost:3000";
}

export function getServerApiUrl(): string {
  const api = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (api) return api.replace(/\/$/, "");
  return getSiteUrl();
}

export function localizePath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return `${getSiteUrl()}${DEFAULT_OG_IMAGE}`;
  if (
    pathOrUrl.startsWith("http://") ||
    pathOrUrl.startsWith("https://") ||
    pathOrUrl.startsWith("data:")
  ) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteUrl()}${path}`;
}

export function resolveOgImage(path?: string | null): string {
  if (!path) return toAbsoluteUrl(DEFAULT_OG_IMAGE);
  const resolved = resolveMediaUrl(path) || path;
  return toAbsoluteUrl(resolved);
}

export function defaultDescription(locale: string): string {
  return locale === "ar" ? DEFAULT_DESCRIPTION_AR : DEFAULT_DESCRIPTION_EN;
}

export function defaultTitle(locale: string): string {
  return locale === "ar" ? "مخوّر اليوم — MOTD" : SITE_NAME_FULL;
}

type BuildMetadataInput = {
  locale: string;
  path: string;
  title: string;
  description?: string;
  image?: string | null;
  noIndex?: boolean;
};

export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  image,
  noIndex = false,
}: BuildMetadataInput): Metadata {
  const desc = description?.trim() || defaultDescription(locale);
  const canonicalPath = localizePath(locale, path);
  const absoluteCanonical = `${getSiteUrl()}${canonicalPath}`;
  const ogImage = resolveOgImage(image);
  const languageAlternates = Object.fromEntries(
    routing.locales.map((loc) => [loc, localizePath(loc, path)]),
  );

  return {
    // Home uses absolute title so the root "%s | MOTD" template is not applied.
    title: path === "/" ? { absolute: title } : title,
    description: desc,
    alternates: {
      canonical: canonicalPath,
      languages: languageAlternates,
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      url: absoluteCanonical,
      title,
      description: desc,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImage],
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

export type StaticSeoPage = {
  path: string;
  titleEn: string;
  titleAr: string;
  descriptionEn: string;
  descriptionAr: string;
};

export const STATIC_SEO_PAGES: StaticSeoPage[] = [
  {
    path: "/",
    titleEn: SITE_NAME_FULL,
    titleAr: "مخوّر اليوم — MOTD",
    descriptionEn: DEFAULT_DESCRIPTION_EN,
    descriptionAr: DEFAULT_DESCRIPTION_AR,
  },
  {
    path: "/ready-made",
    titleEn: "Ready-Made Mukhawars",
    titleAr: "مخاوير جاهزة",
    descriptionEn:
      "Shop ready-made mukhawars online — curated styles with UAE delivery.",
    descriptionAr: "تسوقي مخاوير جاهزة أونلاين — تصاميم مختارة مع التوصيل في الإمارات.",
  },
  {
    path: "/designs/designShop",
    titleEn: "Mukhawar Designs",
    titleAr: "تصاميم المخوّر",
    descriptionEn:
      "Browse tailor designs and start a custom mukhawar order.",
    descriptionAr: "تصفحي تصاميم الخياطين وابدئي طلب مخوّر مخصص.",
  },
  {
    path: "/fabrics/fabricStore",
    titleEn: "Fabrics",
    titleAr: "الأقمشة",
    descriptionEn: "Explore premium fabrics for custom mukhawars in the UAE.",
    descriptionAr: "اكتشفي أقمشة فاخرة لمخاوير مخصصة في الإمارات.",
  },
  {
    path: "/tailors",
    titleEn: "Tailors",
    titleAr: "الخياطون",
    descriptionEn: "Find approved MOTD tailor partners across the UAE.",
    descriptionAr: "اعثري على خياطين معتمدين من MOTD في الإمارات.",
  },
  {
    path: "/contact-us",
    titleEn: "Contact Us",
    titleAr: "تواصلي معنا",
    descriptionEn: "Contact MOTD support for orders, tailoring, and partnerships.",
    descriptionAr: "تواصلي مع دعم MOTD للطلبات والخياطة والشراكات.",
  },
  {
    path: "/privacy",
    titleEn: "Privacy Policy",
    titleAr: "سياسة الخصوصية",
    descriptionEn: "How MOTD collects, uses, and protects your personal data.",
    descriptionAr: "كيف تجمع MOTD بياناتك الشخصية وتستخدمها وتحميها.",
  },
  {
    path: "/terms",
    titleEn: "Terms of Service",
    titleAr: "شروط الخدمة",
    descriptionEn: "Terms governing use of the MOTD platform and services.",
    descriptionAr: "الشروط التي تحكم استخدام منصة وخدمات MOTD.",
  },
  {
    path: "/cookies",
    titleEn: "Cookie Policy",
    titleAr: "سياسة ملفات تعريف الارتباط",
    descriptionEn: "How MOTD uses cookies and similar technologies.",
    descriptionAr: "كيف تستخدم MOTD ملفات تعريف الارتباط والتقنيات المشابهة.",
  },
  {
    path: "/shipping",
    titleEn: "Shipping Policy",
    titleAr: "سياسة الشحن",
    descriptionEn: "UAE delivery timelines and shipping information for MOTD orders.",
    descriptionAr: "مواعيد التوصيل في الإمارات ومعلومات الشحن لطلبات MOTD.",
  },
  {
    path: "/returns",
    titleEn: "Returns Policy",
    titleAr: "سياسة الإرجاع",
    descriptionEn: "Returns and exchanges for MOTD ready-made and custom orders.",
    descriptionAr: "الإرجاع والاستبدال لطلبات MOTD الجاهزة والمخصصة.",
  },
  {
    path: "/faq",
    titleEn: "FAQ",
    titleAr: "الأسئلة الشائعة",
    descriptionEn: "Answers to common questions about MOTD orders and custom tailoring.",
    descriptionAr: "إجابات على الأسئلة الشائعة حول طلبات MOTD والخياطة المخصصة.",
  },
  {
    path: "/motd-guide",
    titleEn: "MOTD Guide",
    titleAr: "دليل MOTD",
    descriptionEn: "A guide to ordering ready-made and custom mukhawars with MOTD.",
    descriptionAr: "دليل لطلب المخاوير الجاهزة والمخصصة مع MOTD.",
  },
  {
    path: "/partners",
    titleEn: "Partners",
    titleAr: "الشركاء",
    descriptionEn: "Partner with MOTD as a tailor or fabric store in the UAE.",
    descriptionAr: "شاركي مع MOTD كخياطة أو متجر أقمشة في الإمارات.",
  },
];

export function getStaticSeoPage(path: string): StaticSeoPage | undefined {
  return STATIC_SEO_PAGES.find((page) => page.path === path);
}

export function buildStaticPageMetadata(locale: string, path: string): Metadata {
  const page = getStaticSeoPage(path);
  if (!page) {
    return buildPageMetadata({
      locale,
      path,
      title: defaultTitle(locale),
      description: defaultDescription(locale),
    });
  }

  const isAr = locale === "ar";
  return buildPageMetadata({
    locale,
    path,
    title: isAr ? page.titleAr : page.titleEn,
    description: isAr ? page.descriptionAr : page.descriptionEn,
  });
}

export async function fetchJson<T>(endpoint: string): Promise<T | null> {
  try {
    const url = `${getServerApiUrl()}${endpoint}`;
    const res = await fetch(url, {
      next: { revalidate: 300 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
