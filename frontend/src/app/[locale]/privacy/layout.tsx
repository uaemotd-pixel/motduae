import type { Metadata } from "next";
import { buildStaticPageMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(locale, "/privacy");
}

export default function PrivacyLayout({ children }: Props) {
  return children;
}
