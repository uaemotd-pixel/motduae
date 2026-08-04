import type { Metadata } from "next";
import { buildPageMetadata, fetchJson } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string; slug: string }>;
};

type FabricDetailResponse = {
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
  const data = await fetchJson<FabricDetailResponse>(
    `/api/fabrics/${encodeURIComponent(slug)}`,
  );
  const item = data?.item;

  if (!item) {
    return buildPageMetadata({
      locale,
      path: `/fabrics/${slug}`,
      title: locale === "ar" ? "قماش" : "Fabric",
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
    path: `/fabrics/${item.slug || slug}`,
    title,
    description,
    image: item.images?.[0],
  });
}

export default function FabricSlugLayout({ children }: Props) {
  return children;
}
