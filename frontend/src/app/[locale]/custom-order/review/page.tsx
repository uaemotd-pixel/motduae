import OrderReviewStep from "@/components/custom-order/OrderReviewStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function CustomOrderReviewPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <OrderReviewStep />
            </FadeInSection>
        </MainLayout>
    );
}
