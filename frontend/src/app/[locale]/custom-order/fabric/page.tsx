import { Suspense } from "react";
import FabricSelectionStep from "@/components/custom-order/FabricSelectionStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { CustomOrderStepSkeleton } from "@/components/ui/Skeleton";

export default function CustomOrderFabricPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <Suspense fallback={<CustomOrderStepSkeleton />}>
                    <FabricSelectionStep />
                </Suspense>
            </FadeInSection>
        </MainLayout>
    );
}
