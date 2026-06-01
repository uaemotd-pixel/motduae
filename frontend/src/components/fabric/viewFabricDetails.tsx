// components/fabric/ViewFabricDetails.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FabricDetailsProps {
    product: {
        id: number;
        name: string;
        price: number;
        category: string;
        color: string;
        material: string;
        inStock: boolean;
        image: string;
        description: string;
        origin: string;
        careInstructions?: string[];
        weight?: string;
        width?: string;
        certifications?: string[];
    };
    onBack?: () => void;
}

const ViewFabricDetails = ({ product, onBack }: FabricDetailsProps) => {
    const router = useRouter();
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState("meter");

    const handleAddToCart = () => {
        console.log("Added to cart:", { ...product, quantity, selectedSize });
    };

    const handleRequestSample = () => {
        console.log("Sample requested for:", product.name);
    };

    return (
        <div className="min-h-screen bg-[#FFFDF9]">
            {/* Back Navigation */}
            <div className="sticky top-0 z-30 bg-[#FFFDF9] border-b border-[#E8E8E4] px-4 sm:px-8 lg:px-12 py-4">
                <button
                    onClick={onBack || (() => router.back())}
                    className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase font-mono text-[#5A5A56] hover:text-black transition-colors group"
                >
                    <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Collection
                </button>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
                    {/* Left Column - Image Gallery */}
                    <div className="space-y-4">
                        <div className="aspect-square bg-[#F2F2F0] overflow-hidden">
                            <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="aspect-square bg-[#F2F2F0] overflow-hidden cursor-pointer hover:opacity-80 transition">
                                    <img
                                        src={product.image}
                                        alt={`${product.name} view ${i}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column - Product Details */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56]">
                            <Link href="/fabrics" className="hover:text-black transition">Fabrics</Link>
                            <span>/</span>
                            <span className="text-black">{product.category}</span>
                        </div>

                        <div>
                            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-normal tracking-tight text-black mb-3">
                                {product.name}
                            </h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-[10px] tracking-[0.16em] uppercase bg-[#F2F2F0] text-black px-3 py-1">
                                    {product.material}
                                </span>
                                <span className="text-[10px] tracking-[0.16em] uppercase bg-[#F2F2F0] text-black px-3 py-1">
                                    {product.origin}
                                </span>
                                {product.inStock ? (
                                    <span className="text-[9px] tracking-[0.16em] uppercase text-green-600 font-mono">In Stock</span>
                                ) : (
                                    <span className="text-[9px] tracking-[0.16em] uppercase text-red-500 font-mono">Out of Stock</span>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-b border-[#E8E8E4] py-4">
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-mono text-black">AED {product.price.toLocaleString()}</span>
                                <span className="text-[11px] text-[#5A5A56] font-mono">per meter</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] tracking-[0.18em] uppercase font-mono text-black mb-2">Description</h3>
                            <p className="text-[13px] text-[#5A5A56] leading-relaxed">
                                {product.description}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] mb-1">Material</h3>
                                <p className="text-[12px] text-black">{product.material}</p>
                            </div>
                            <div>
                                <h3 className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] mb-1">Origin</h3>
                                <p className="text-[12px] text-black">{product.origin}</p>
                            </div>
                            <div>
                                <h3 className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] mb-1">Weight</h3>
                                <p className="text-[12px] text-black">{product.weight || "250 gsm"}</p>
                            </div>
                            <div>
                                <h3 className="text-[9px] tracking-[0.16em] uppercase font-mono text-[#5A5A56] mb-1">Width</h3>
                                <p className="text-[12px] text-black">{product.width || "140 cm"}</p>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] tracking-[0.18em] uppercase font-mono text-black mb-2">Color</h3>
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full border border-[#E8E8E4]"
                                    style={{
                                        backgroundColor: product.color === "gold" ? "#C9A96E" :
                                            product.color === "black" ? "#1A1A18" :
                                                product.color === "ivory" ? "#F5F0E8" : "#E8E4DC"
                                    }}
                                />
                                <span className="text-[12px] text-black capitalize">{product.color}</span>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] tracking-[0.18em] uppercase font-mono text-black mb-2">Quantity</h3>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center border border-[#E8E8E4]">
                                    <button
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="px-3 py-2 hover:bg-[#F2F2F0] transition"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4" />
                                        </svg>
                                    </button>
                                    <span className="w-12 text-center text-[13px] font-mono">{quantity}</span>
                                    <button
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="px-3 py-2 hover:bg-[#F2F2F0] transition"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                </div>
                                <select
                                    value={selectedSize}
                                    onChange={(e) => setSelectedSize(e.target.value)}
                                    className="text-[11px] font-mono bg-transparent border border-[#E8E8E4] px-3 py-2 focus:outline-none"
                                >
                                    <option value="meter">Meter</option>
                                    <option value="yard">Yard</option>
                                    <option value="sample">Sample (30cm)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-3 pt-4">
                            <button
                                onClick={handleAddToCart}
                                disabled={!product.inStock}
                                className="w-full py-3.5 bg-black text-white text-[11px] tracking-[0.22em] uppercase font-mono hover:bg-[#1A1A1A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Add to Cart
                            </button>
                            <div className="flex gap-3">
                                <button
                                    onClick={handleRequestSample}
                                    disabled={!product.inStock}
                                    className="flex-1 py-3 border border-black text-[10px] tracking-[0.2em] uppercase font-mono hover:bg-black hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Request Sample
                                </button>
                                <button className="py-3 px-5 border border-[#E8E8E4] hover:border-black transition-colors">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="border-t border-[#E8E8E4] pt-5">
                            <h3 className="text-[10px] tracking-[0.18em] uppercase font-mono text-black mb-3">Care Instructions</h3>
                            <div className="flex flex-wrap gap-3">
                                {["Dry Clean Only", "Do Not Bleach", "Iron Low Heat", "Store in Cool Place"].map((care, i) => (
                                    <span key={i} className="text-[10px] text-[#5A5A56] font-mono bg-[#F2F2F0] px-3 py-1">
                                        {care}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] tracking-[0.18em] uppercase font-mono text-black mb-3">Certifications</h3>
                            <div className="flex gap-4">
                                {["OEKO-TEX", "GOTS", "Luxury Guarantee"].map((cert, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <span className="text-[10px] text-[#5A5A56] font-mono">{cert}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewFabricDetails;