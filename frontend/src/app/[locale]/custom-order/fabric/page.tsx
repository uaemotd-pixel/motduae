import { Suspense } from "react";
import FabricSelectionStep from "@/components/custom-order/FabricSelectionStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

function FabricSelectionFallback() {
    return (
        <div className="min-h-[40vh] flex items-center justify-center">
            <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
                Loading...
            </p>
        </div>
    );
}

export default function CustomOrderFabricPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <Suspense fallback={<FabricSelectionFallback />}>
                    <FabricSelectionStep />
                </Suspense>
            </FadeInSection>
        </MainLayout>
    );
}
