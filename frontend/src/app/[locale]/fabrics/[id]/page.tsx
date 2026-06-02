// app/[locale]/fabrics/[id]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import ViewFabricDetails from "../../../../components/fabric/viewFabricDetails";
import * as images from '../../../../../public/images/ImageIndex';

// Mock product data - with string IDs to match URL params
const products: Record<string, any> = {
    "1": {
        id: 1,
        name: "Royal Gold Damask",
        price: 1200,
        category: "silk",
        color: "gold",
        material: "Silk Brocade",
        inStock: true,
        image: images.fab1?.src || "/images/placeholder.jpg",
        description: "Exquisite gold damask silk brocade handcrafted by master artisans. This luxurious fabric features intricate damask patterns woven with gold metallic threads, creating a stunning interplay of light and texture.",
        origin: "Dubai, UAE",
        weight: "280 gsm",
        width: "140 cm",
    },
    "2": {
        id: 2,
        name: "Midnight Floral",
        price: 950,
        category: "velvet",
        color: "black",
        material: "Premium Velvet",
        inStock: true,
        image: images.fab2?.src || "/images/placeholder.jpg",
        description: "Deep midnight floral velvet with subtle shimmer",
        origin: "Abu Dhabi, UAE",
        weight: "320 gsm",
        width: "150 cm",
    },
    "3": {
        id: 3,
        name: "Diamond Geometric",
        price: 680,
        category: "cotton",
        color: "ivory",
        material: "Washable Cotton",
        inStock: true,
        image: images.fab3?.src || "/images/placeholder.jpg",
        description: "Contemporary geometric pattern on breathable cotton",
        origin: "Sharjah, UAE",
        weight: "180 gsm",
        width: "110 cm",
    },
    "4": {
        id: 4,
        name: "Golden Peony",
        price: 1450,
        category: "embroidered",
        color: "gold",
        material: "Embroidered Tulle",
        inStock: true,
        image: images.fab4?.src || "/images/placeholder.jpg",
        description: "Hand-embroidered peony motifs on fine tulle",
        origin: "Dubai, UAE",
        weight: "90 gsm",
        width: "130 cm",
    },
    "5": {
        id: 5,
        name: "Pearl Lattice",
        price: 1100,
        category: "silk",
        color: "ivory",
        material: "Silk Jacquard",
        inStock: true,
        image: images.fab5?.src || "/images/placeholder.jpg",
        description: "Pearlescent lattice pattern on premium silk jacquard",
        origin: "Ras Al Khaimah, UAE",
        weight: "200 gsm",
        width: "140 cm",
    },
    "6": {
        id: 6,
        name: "Charcoal Shadow",
        price: 980,
        category: "velvet",
        color: "black",
        material: "Luxury Velvet",
        inStock: true,
        image: images.fab6?.src || "/images/placeholder.jpg",
        description: "Subtle charcoal shadow effect on luxury velvet",
        origin: "Ajman, UAE",
        weight: "350 gsm",
        width: "150 cm",
    },
};

export default function FabricDetailPage() {
    const params = useParams();
    const router = useRouter();
    const productId = params.id as string;

    console.log("Product ID from URL:", productId); // Debug log
    console.log("Available product IDs:", Object.keys(products)); // Debug log

    const product = products[productId];

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
        <ViewFabricDetails
            product={product}
            onBack={() => router.back()}
        />
    );
}