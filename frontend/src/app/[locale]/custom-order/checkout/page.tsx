import CustomOrderCheckoutStep from "@/components/custom-order/CustomOrderCheckoutStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function CustomOrderCheckoutPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <CustomOrderCheckoutStep />
            </FadeInSection>
        </MainLayout>
    );
}
