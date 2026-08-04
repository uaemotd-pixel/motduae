import type { Metadata } from "next";
import { buildStaticPageMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(locale, "/ready-made");
}

export default function ReadyMadeLayout({ children }: Props) {
  return children;
}
