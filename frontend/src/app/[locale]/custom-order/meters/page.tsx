import FabricMetersStep from "@/components/custom-order/FabricMetersStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function CustomOrderMetersPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <FabricMetersStep />
            </FadeInSection>
        </MainLayout>
    );
}
