"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import ReadyMadeItemInfo from "@/components/readyWear/ReadyMadeItemInfo";
import Link from "next/link";

export default function ReadyMadeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const slug = params.slug as string;
    const locale = params.locale as string;

    const [product, setProduct] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [selectedImage, setSelectedImage] = useState<string>("");
    const [isWishlisted, setIsWishlisted] = useState(false);

    // ---------------------------
    // FETCH SINGLE PRODUCT
    // ---------------------------
    useEffect(() => {
        const fetchProduct = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await api.get<any>(`/api/ready-made/${slug}`);
                if (!data?.success || !data.item) {
                    throw new Error("Product not found");
                }
                setProduct(data.item);
                setSelectedImage(data.item.images?.[0] || "/placeholder.png");
            } catch (err: any) {
                setError(err?.message || "Failed to load product");
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchProduct();
    }, [slug]);

    // ---------------------------
    // HANDLERS
    // ---------------------------
    const increaseQty = () => {
        if (product && quantity < product.countInStock) {
            setQuantity(prev => prev + 1);
        }
    };
    const decreaseQty = () => {
        if (quantity > 1) setQuantity(prev => prev - 1);
    };
    const handleAddToCart = () => {
        // Your cart logic here
        console.log("Added to cart:", { product, quantity });
    };
    const handleBuyNow = () => {
        // Your buy now logic (e.g., redirect to checkout)
        console.log("Buy now:", { product, quantity });
    };
    const toggleWishlist = () => setIsWishlisted(!isWishlisted);

    // ---------------------------
    // LOADING & ERROR STATES
    // ---------------------------
    if (loading) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4">
                    <div className="text-center">
                        <div className="w-12 h-12 border-2 border-black/20 border-t-black rounded-full animate-spin mx-auto mb-4" />
                        <p className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] tracking-[0.24em] uppercase text-(--color-grey-muted)">
                            Loading product...
                        </p>
                    </div>
                </div>
            </MainLayout>
        );
    }

    if (error || !product) {
        return (
            <MainLayout>
                <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4">
                    <div className="text-center max-w-md">
                        <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-[#5A5A56]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12H4M12 4v16" />
                            </svg>
                        </div>
                        <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] text-black mb-3">
                            Product Not Found
                        </h1>
                        <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
                            The ready‑made item you're looking for doesn't exist or may have been removed.
                        </p>
                        <div className="flex gap-3 justify-center flex-wrap">
                            <button
                                onClick={() => router.push('/ready-made')}
                                className="px-6 py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition duration-300"
                            >
                                Browse All Ready‑Made
                            </button>
                            <button
                                onClick={() => router.back()}
                                className="px-6 py-3 border border-black text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition duration-300"
                            >
                                Go Back
                            </button>
                        </div>
                    </div>
                </div>
            </MainLayout>
        );
    }

    const title = product.name;
    const desc = product.description;
    const images = product.images?.length ? product.images : ["/placeholder.png"];
    const sku = product.sku || product._id?.slice(-6) || "N/A";
    const category = product.style || product.category || "Ready-Made";

    return (
        <MainLayout>
            <FadeInSection>
                <div className="bg-(--bg-page) pt-8 xs:pt-10 sm:pt-12 pb-12 xs:pb-16 sm:pb-20 md:pb-24">
                    <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
                        {/* BREADCRUMB */}
                        <nav className="mb-6 xs:mb-8">
                            <ol className="flex flex-wrap items-center gap-1.5 text-[10px] xs:text-[11px] [font-family:var(--font-ui)] uppercase tracking-[0.2em]">
                                <li>
                                    <Link href="/" className="text-(--color-grey-muted) hover:text-black transition">
                                        Home
                                    </Link>
                                </li>
                                <li className="text-(--color-grey-muted)">/</li>
                                <li>
                                    <Link href="/ready-made" className="text-(--color-grey-muted) hover:text-black transition">
                                        Ready‑Made
                                    </Link>
                                </li>
                                <li className="text-(--color-grey-muted)">/</li>
                                <li className="text-black truncate max-w-50 xs:max-w-none">
                                    {title}
                                </li>
                            </ol>
                        </nav>

                        {/* PRODUCT GRID */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xs:gap-10 md:gap-12 lg:gap-(--space-40)">
                            {/* LEFT COLUMN: GALLERY */}
                            <div className="space-y-4">
                                {/* Main image */}
                                <div className="aspect-4/5 relative overflow-hidden bg-[#F5F5F0] rounded-lg group">
                                    <img
                                        src={selectedImage}
                                        alt={title}
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                                    />
                                </div>
                                {/* Thumbnails */}
                                {images.length > 1 && (
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {images.map((img: string, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => setSelectedImage(img)}
                                                className={`shrink-0 w-20 xs:w-24 h-20 xs:h-24 rounded-md overflow-hidden border-2 transition-all duration-200 ${selectedImage === img
                                                    ? "border-black"
                                                    : "border-transparent opacity-60 hover:opacity-100"
                                                    }`}
                                            >
                                                <img
                                                    src={img}
                                                    alt={`Thumbnail ${idx + 1}`}
                                                    className="w-full h-full object-cover"
                                                />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* RIGHT COLUMN: DETAILS */}
                            <div className="flex flex-col">
                                {/* Header with wishlist */}
                                <div className="flex justify-between items-start gap-4 mb-2">
                                    <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
                                        {title}
                                    </h1>
                                    <button
                                        onClick={toggleWishlist}
                                        className="shrink-0 p-2 rounded-full hover:bg-black/5 transition-colors duration-200"
                                        aria-label="Add to wishlist"
                                    >
                                        <svg
                                            className={`w-6 h-6 transition-colors ${isWishlisted ? "fill-red-500 stroke-red-500" : "stroke-black fill-none"
                                                }`}
                                            viewBox="0 0 24 24"
                                            strokeWidth="1.5"
                                            stroke="currentColor"
                                            fill="none"
                                        >
                                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Price */}
                                <div className="border-b border-(--color-border) pb-4 mb-4">
                                    <p className="[font-family:var(--font-ui)] text-[20px] xs:text-[24px] sm:text-[28px] tracking-[0.24em] text-black">
                                        AED {product.price}
                                    </p>
                                    {product.compareAtPrice && (
                                        <p className="text-[12px] xs:text-[13px] text-(--color-grey-muted) line-through mt-1">
                                            AED {product.compareAtPrice}
                                        </p>
                                    )}
                                </div>

                                {/* Meta (SKU, Category) */}
                                <div className="grid grid-cols-2 gap-y-2 mb-4 text-[12px] xs:text-[13px] [font-family:var(--font-body)]">
                                    <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                                        SKU
                                    </span>
                                    <span className="text-black">{sku}</span>
                                    <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                                        Category
                                    </span>
                                    <span className="text-black capitalize">{category}</span>
                                </div>

                                {/* Size & Condition (inline layout) */}
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
                                    <div>
                                        <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                                            Size
                                        </span>
                                        <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black font-medium">
                                            {product.size}
                                        </p>
                                    </div>
                                    {product.condition && (
                                        <div>
                                            <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                                                Condition
                                            </span>
                                            <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                                                {product.condition}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Stock status */}
                                <div className="mb-6">
                                    <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                                        Availability
                                    </span>
                                    <p className={`[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] font-medium ${product.countInStock > 0 ? "text-green-700" : "text-red-600"
                                        }`}>
                                        {product.countInStock > 0
                                            ? `In stock (${product.countInStock} available)`
                                            : "Out of stock"}
                                    </p>
                                </div>

                                {/* Description */}
                                <div className="mb-8">
                                    <span className="[font-family:var(--font-ui)] text-[9px] xs:text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-2">
                                        Description
                                    </span>
                                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] leading-relaxed text-(--color-grey-muted)">
                                        {desc}
                                    </p>
                                </div>

                                {/* ReadyMadeItemInfo component */}
                                <ReadyMadeItemInfo
                                    condition={product.condition}
                                    returnReason={product.returnReason}
                                    originalDesign={product.sourceCustomOrder?.designName || product.originalDesign}
                                />

                                {/* Quantity & Add to Cart Section */}
                                <div className="mt-6 pt-4 border-t border-(--color-border)">
                                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mb-6">
                                        <div className="flex items-center border border-(--color-border) rounded-md">
                                            <button
                                                onClick={decreaseQty}
                                                disabled={quantity <= 1}
                                                className="px-3 py-2 text-lg disabled:opacity-40 hover:bg-black/5 transition"
                                                aria-label="Decrease quantity"
                                            >
                                                −
                                            </button>
                                            <span className="w-12 text-center [font-family:var(--font-ui)] text-[14px]">
                                                {quantity}
                                            </span>
                                            <button
                                                onClick={increaseQty}
                                                disabled={product.countInStock <= quantity}
                                                className="px-3 py-2 text-lg disabled:opacity-40 hover:bg-black/5 transition"
                                                aria-label="Increase quantity"
                                            >
                                                +
                                            </button>
                                        </div>
                                        <div className="flex-1 flex gap-3 w-full sm:w-auto">
                                            <button
                                                onClick={handleAddToCart}
                                                disabled={product.countInStock < 1}
                                                className={`
                                                    flex-1 sm:flex-none py-3 px-6 border border-black text-[10px] xs:text-[11px] tracking-[0.24em] uppercase
                                                    [font-family:var(--font-ui)] transition-all duration-300
                                                    ${product.countInStock < 1
                                                        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                                                        : "bg-black text-white hover:bg-white hover:text-black hover:border-black"
                                                    }
                                                `}
                                            >
                                                Add to Cart
                                            </button>
                                            <button
                                                onClick={handleBuyNow}
                                                disabled={product.countInStock < 1}
                                                className={`
                                                    flex-1 sm:flex-none py-3 px-6 border border-black bg-transparent text-[10px] xs:text-[11px] tracking-[0.24em] uppercase
                                                    [font-family:var(--font-ui)] transition-all duration-300
                                                    ${product.countInStock < 1
                                                        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                                                        : "hover:bg-black hover:text-white"
                                                    }
                                                `}
                                            >
                                                Buy Now
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional info (shipping, returns) – optional */}
                                <div className="mt-4 text-[10px] xs:text-[11px] text-(--color-grey-muted) [font-family:var(--font-ui)] uppercase tracking-[0.2em] text-center sm:text-left">
                                    <p>Free shipping on orders over 500 AED • 14 days return policy</p>
                                </div>
                            </div>
                        </div>

                        {/* You could add a "Related Products" section here */}
                    </div>
                </div>
            </FadeInSection>

            {/* MOBILE STICKY ADD-TO-CART BAR (optional) */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-(--color-border) p-4 shadow-lg z-30">
                <div className="flex gap-3">
                    <div className="flex items-center border border-(--color-border) rounded-md">
                        <button onClick={decreaseQty} disabled={quantity <= 1} className="px-3 py-2 text-lg">−</button>
                        <span className="w-10 text-center">{quantity}</span>
                        <button onClick={increaseQty} disabled={product.countInStock <= quantity} className="px-3 py-2 text-lg">+</button>
                    </div>
                    <button
                        onClick={handleAddToCart}
                        disabled={product.countInStock < 1}
                        className="flex-1 bg-black text-white py-3 text-[10px] tracking-[0.24em] uppercase font-ui disabled:opacity-50"
                    >
                        Add to Cart – AED {product.price * quantity}
                    </button>
                </div>
            </div>
            {/* Add padding-bottom on mobile to avoid content being hidden behind the sticky bar */}
            <div className="lg:hidden pb-20" />
        </MainLayout>
    );
}