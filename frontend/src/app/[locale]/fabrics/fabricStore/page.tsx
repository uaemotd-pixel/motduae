import FabricStoreListings from "@/components/fabric/fabricStoreListing";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function fabricStoreRoute() {
    return (
        <>
            <MainLayout>
                <FadeInSection>
                    <FabricStoreListings />
                </FadeInSection>
            </MainLayout>
        </>
    )
}