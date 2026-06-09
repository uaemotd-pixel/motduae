import MeasurementsStep from "@/components/custom-order/MeasurementsStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

export default function CustomOrderMeasurementsPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <MeasurementsStep />
            </FadeInSection>
        </MainLayout>
    );
}
