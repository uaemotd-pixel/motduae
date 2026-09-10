import type { Metadata } from "next";
import BrandsListing from "@/components/fabric/BrandsListing";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { buildStaticPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(locale, "/brands");
}

export default function BrandsPage() {
  return (
    <MainLayout>
      <FadeInSection>
        <BrandsListing />
      </FadeInSection>
    </MainLayout>
  );
}
