import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import {
  STATIC_SEO_PAGES,
  fetchJson,
  getSiteUrl,
  localizePath,
} from "@/lib/seo";

type SlugItem = { slug?: string };

async function fetchAllReadyMadeSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 20) {
    const data = await fetchJson<{
      success?: boolean;
      totalPages?: number;
      items?: SlugItem[];
    }>(`/api/ready-made?page=${page}&limit=100`);

    if (!data?.items?.length) break;

    for (const item of data.items) {
      if (item.slug) slugs.push(item.slug);
    }

    totalPages = Math.max(1, Number(data.totalPages) || 1);
    page += 1;
  }

  return slugs;
}

async function fetchDesignSlugs(): Promise<string[]> {
  const data = await fetchJson<{
    success?: boolean;
    items?: SlugItem[];
  }>("/api/tailors/designs/all?limit=100");

  return (data?.items || [])
    .map((item) => item.slug)
    .filter((slug): slug is string => Boolean(slug));
}

async function fetchFabricSlugs(): Promise<string[]> {
  const slugs: string[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages && page <= 20) {
    const data = await fetchJson<{
      success?: boolean;
      totalPages?: number;
      items?: SlugItem[];
    }>(`/api/fabrics?page=${page}&limit=100`);

    if (!data?.items?.length) break;

    for (const item of data.items) {
      if (item.slug) slugs.push(item.slug);
    }

    totalPages = Math.max(1, Number(data.totalPages) || 1);
    page += 1;
  }

  return slugs;
}

function localeEntries(
  path: string,
  lastModified: Date,
): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  return routing.locales.map((locale) => {
    const localized = localizePath(locale, path);
    const languages = Object.fromEntries(
      routing.locales.map((loc) => [
        loc,
        `${siteUrl}${localizePath(loc, path)}`,
      ]),
    );

    return {
      url: `${siteUrl}${localized}`,
      lastModified,
      changeFrequency: path === "/" ? "daily" : "weekly",
      priority: path === "/" ? 1 : 0.7,
      alternates: {
        languages,
      },
    };
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const page of STATIC_SEO_PAGES) {
    entries.push(...localeEntries(page.path, now));
  }

  const [readyMadeSlugs, designSlugs, fabricSlugs] = await Promise.all([
    fetchAllReadyMadeSlugs(),
    fetchDesignSlugs(),
    fetchFabricSlugs(),
  ]);

  for (const slug of readyMadeSlugs) {
    entries.push(...localeEntries(`/ready-made/${slug}`, now));
  }

  for (const slug of designSlugs) {
    entries.push(...localeEntries(`/designs/${slug}`, now));
  }

  for (const slug of fabricSlugs) {
    entries.push(...localeEntries(`/fabrics/${slug}`, now));
  }

  return entries;
}
