import { Suspense } from "react";
import TailorDesignSelectionStep from "@/components/custom-order/TailorDesignSelectionStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { CustomOrderStepSkeleton } from "@/components/ui/Skeleton";

export default function CustomOrderTailorPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <Suspense fallback={<CustomOrderStepSkeleton />}>
                    <TailorDesignSelectionStep />
                </Suspense>
            </FadeInSection>
        </MainLayout>
    );
}
