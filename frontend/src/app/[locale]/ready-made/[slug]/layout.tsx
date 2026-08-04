import type { Metadata } from "next";
import { buildPageMetadata, fetchJson } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
};

type ReadyMadeDetailResponse = {
  success?: boolean;
  item?: {
    slug?: string;
    name?: string;
    nameAr?: string;
    description?: string;
    descriptionAr?: string;
    images?: string[];
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const data = await fetchJson<ReadyMadeDetailResponse>(
    `/api/ready-made/${encodeURIComponent(slug)}`,
  );
  const item = data?.item;

  if (!item) {
    return buildPageMetadata({
      locale,
      path: `/ready-made/${slug}`,
      title: locale === "ar" ? "منتج جاهز" : "Ready-Made Product",
    });
  }

  const isAr = locale === "ar";
  const title = (isAr ? item.nameAr || item.name : item.name) || slug;
  const description =
    (isAr
      ? item.descriptionAr || item.description
      : item.description || item.descriptionAr) || undefined;

  return buildPageMetadata({
    locale,
    path: `/ready-made/${item.slug || slug}`,
    title,
    description,
    image: item.images?.[0],
  });
}

export default function ReadyMadeSlugLayout({ children }: Props) {
  return children;
}
