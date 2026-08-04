import type { Metadata } from "next";
import TailorsListing from "@/components/tailor/TailorsListing";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { buildStaticPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return buildStaticPageMetadata(locale, "/tailors");
}

export default function TailorsPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <TailorsListing />
            </FadeInSection>
        </MainLayout>
    );
}
