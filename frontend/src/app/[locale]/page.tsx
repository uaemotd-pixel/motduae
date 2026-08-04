import type { Metadata } from "next";
import MainLayout from "@/app/[locale]/main/layout";
import HomePage from "@/app/[locale]/main/page";
import { buildStaticPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(locale, "/");
}

export default function LocalePage() {
    return (
        <MainLayout>
            <HomePage />
        </MainLayout>
    );
}