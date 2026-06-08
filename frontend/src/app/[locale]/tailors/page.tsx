import TailorsListing from "@/components/tailor/TailorsListing";
import MainLayout from "../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function TailorsPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <TailorsListing />
            </FadeInSection>
        </MainLayout>
    );
}
