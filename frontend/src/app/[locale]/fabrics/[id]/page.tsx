// app/[locale]/fabrics/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import ViewFabricDetails from "../../../../components/fabric/viewFabricDetails";
import MainLayout from "../../main/layout";
import FadeInSection from "../../../../components/shared/fadeInSection";
import {fabrics} from "../../../../components/shared/fabricData";

// product will be looked up inside component where productId is available

export default function FabricDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    console.log("Product ID from URL:", productId); // Debug log

    // Find the product object matching the route param
    const product = fabrics.find((fabric) => fabric.id.toString() === productId);

    // Log keys if product exists, otherwise log none
    console.log("Found product keys:", product ? Object.keys(product) : []); // Debug log

    if (!product) {
        return (
            <div className="min-h-screen bg-[#FFFDF9] flex items-center justify-center px-4">
                <div className="text-center max-w-md">
                    <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
                        <svg className="w-10 h-10 text-[#5A5A56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4M12 4v16" />
                        </svg>
                    </div>
                    <h1 className="font-display text-2xl text-black mb-3">Product Not Found</h1>
                    <p className="text-[13px] text-[#5A5A56] mb-6">
                        The fabric you're looking for doesn't exist or may have been removed.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={() => router.push('/fabrics')}
                            className="px-6 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition"
                        >
                            Browse All Fabrics
                        </button>
                        <button
                            onClick={() => router.back()}
                            className="px-6 py-3 border border-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <MainLayout>
                <FadeInSection>
                    <ViewFabricDetails
                        product={product}
                        onBack={() => router.back()}
                    />
                </FadeInSection>
            </MainLayout>
        </>
    );
}