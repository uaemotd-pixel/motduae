import { Suspense } from "react";
import TailorDesignSelectionStep from "@/components/custom-order/TailorDesignSelectionStep";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";

function TailorSelectionFallback() {
    return (
        <div className="min-h-[40vh] flex items-center justify-center">
            <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
                Loading...
            </p>
        </div>
    );
}

export default function CustomOrderTailorPage() {
    return (
        <MainLayout>
            <FadeInSection>
                <Suspense fallback={<TailorSelectionFallback />}>
                    <TailorDesignSelectionStep />
                </Suspense>
            </FadeInSection>
        </MainLayout>
    );
}
