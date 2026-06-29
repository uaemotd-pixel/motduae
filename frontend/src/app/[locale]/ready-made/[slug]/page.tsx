"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api/client";
import MainLayout from "../../main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { resolveMediaUrl } from "@/lib/media";
import InnerImageZoom from "react-inner-image-zoom";
import "react-inner-image-zoom/lib/styles.min.css";
import { resolveReadyMadeImage } from "@/lib/readyMade";

// Product color mapping (for swatches)
const colorMap: Record<string, string> = {
  red: "#EF4444",
  blue: "#3B82F6",
  green: "#22C55E",
  black: "#000000",
  white: "#FFFFFF",
  gold: "#F59E0B",
  silver: "#9CA3AF",
};

// Tag color palette – elegant, muted, brand‑compliant
const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#2D5A3D", text: "#FFFFFF" }, // Deep muted green
  bestseller: { bg: "#8B7355", text: "#FFFFFF" }, // Warm taupe
  premium: { bg: "#4A4A4A", text: "#FFFFFF" }, // Charcoal
  limited: { bg: "#8B3A3A", text: "#FFFFFF" }, // Muted burgundy
  exclusive: { bg: "#C4A47A", text: "#000000" }, // Soft gold/beige
  trending: { bg: "#3A5A78", text: "#FFFFFF" }, // Muted navy
  handmade: { bg: "#6B4F3C", text: "#FFFFFF" }, // Earthy brown
};

// Helper to get tag styles from key
const getTagStyles = (tagKey?: string) => {
  if (!tagKey) return { bg: "#1A1A1A", text: "#FFFFFF" };
  const key = tagKey.toLowerCase().trim();
  return TAG_COLORS[key] || { bg: "#1A1A1A", text: "#FFFFFF" };
};

export default function ReadyMadeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const locale = params.locale as string;
  const { addItem: addToCart } = useCart();
  const {
    wishItems,
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
  } = useWishlist();

  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState<string>("");

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
        setSelectedImage(resolveReadyMadeImage(data.item.images?.[0]));
      } catch (err: any) {
        setError(err?.message || "Failed to load product");
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchProduct();
  }, [slug]);

  const handleAddToCart = () => {
    if (!product) return;
    const price = product.finalSellingPriceAED || 0;
    const maxStock = product.availableFabricStock || 0;
    addToCart({
      id: product._id,
      slug: product.slug,
      name: product.name,
      image: resolveReadyMadeImage(product.images?.[0]),
      price,
      size: product.metersPerFabric,
      maxStock,
    });
  };

  const handleBuyNow = () => {
    if (!product) return;
    const params = new URLSearchParams({
      productId: product._id,
      slug: product.slug,
      name: product.name,
      image: resolveReadyMadeImage(product.images?.[0]),
      price: String(product.finalSellingPriceAED || 0),
      size: product.metersPerFabric || "",
      quantity: String(quantity),
      maxStock: String(product.availableFabricStock || 0),
    });
    router.push(`/${locale}/checkout?buyNow=true&${params.toString()}`);
  };

  // Wishlist toggle
  const liked = product
    ? wishItems.some((item) => item.id === product._id)
    : false;
  const toggleWishlist = () => {
    if (!product) return;
    if (liked) {
      removeFromWishlist(product._id);
    } else {
      addToWishlist({
        id: product._id,
        slug: product.slug,
        name: product.name,
        image: resolveReadyMadeImage(product.images?.[0]),
        price: product.finalSellingPriceAED || 0,
        maxStock: product.availableFabricStock || 0,
      });
    }
  };

  // Loading state
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

  // Error or missing product
  if (error || !product) {
    return (
      <MainLayout>
        <div className="min-h-screen bg-(--bg-page) flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 mx-auto mb-6 bg-[#F2F2F0] rounded-full flex items-center justify-center">
              <svg
                className="w-10 h-10 text-[#5A5A56]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 12H4M12 4v16"
                />
              </svg>
            </div>
            <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] text-black mb-3">
              Product Not Found
            </h1>
            <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
              The ready‑made item you're looking for doesn't exist or may have
              been removed.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => router.push("/ready-made")}
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

  // Extra guard
  if (!product) return null;

  // Product data
  const title = product.name;
  const desc = product.description;
  const images = product.images?.length ? product.images : ["/placeholder.png"];
  const price = product.finalSellingPriceAED || 0;
  const stock = product.availableFabricStock || 0;
  const tag = product.tag; // key like "new", "bestseller", etc.
  const fabricType = product.fabricType;
  const colors = product.colors || [];
  const size = product.metersPerFabric;

  // Tag styles based on key (no longer using tagColor from DB)
  const tagStyles = getTagStyles(tag);

  return (
    <MainLayout>
      <FadeInSection>
        <div className="bg-(--bg-page) pt-8 xs:pt-10 sm:pt-12 pb-12 xs:pb-16 sm:pb-20 md:pb-24">
          <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
            {/* Breadcrumb */}
            <nav className="mb-6 xs:mb-8">
              <ol className="flex flex-wrap items-center gap-1.5 text-[10px] xs:text-[11px] [font-family:var(--font-ui)] uppercase tracking-[0.2em]">
                <li>
                  <Link
                    href="/"
                    className="text-(--color-grey-muted) hover:text-black transition"
                  >
                    Home
                  </Link>
                </li>
                <li className="text-(--color-grey-muted)">/</li>
                <li>
                  <Link
                    href={`/${locale}/#ready-made`}
                    scroll={true}
                    className="text-(--color-grey-muted) hover:text-black transition"
                  >
                    Ready‑Made
                  </Link>
                </li>
                <li className="text-(--color-grey-muted)">/</li>
                <li className="text-black truncate max-w-50 xs:max-w-none">
                  {title}
                </li>
              </ol>
            </nav>

            {/* Product Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xs:gap-10 md:gap-12 lg:gap-(--space-40)">
              {/* Left: Gallery */}
              <div className="space-y-4">
                <div className="aspect-4/5 relative overflow-hidden bg-[#F5F5F0] rounded-lg group">
                  <InnerImageZoom
                    src={resolveMediaUrl(selectedImage)}
                    zoomScale={1.5}
                    className="w-full h-full"
                  />
                  {tag && (
                    <div
                      className="absolute top-3 left-3 z-10 px-2.5 py-1 text-xs font-medium rounded shadow-sm uppercase"
                      style={{
                        backgroundColor: tagStyles.bg,
                        color: tagStyles.text,
                      }}
                    >
                      {tag}
                    </div>
                  )}
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.map((img: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(resolveMediaUrl(img))}
                        className={`shrink-0 w-20 xs:w-24 h-20 xs:h-24 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                          selectedImage === img
                            ? "border-black"
                            : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={resolveMediaUrl(img)}
                          alt={`Thumbnail ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Details */}
              <div className="flex flex-col">
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
                      className={`w-6 h-6 transition-colors ${
                        liked
                          ? "fill-red-500 stroke-red-500"
                          : "stroke-black fill-none"
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
                    AED {price}
                  </p>
                </div>

                <div className="flex flex-row gap-x-6 my-2">
                  {fabricType && (
                    <div className="flex-1">
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block">
                        Fabric Type
                      </span>
                      <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                        {fabricType}
                      </p>
                    </div>
                  )}
                  {size && (
                    <div className="flex-1">
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block">
                        Size
                      </span>
                      <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                        {size + " meters"}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-6 my-2">
                  {colors.length > 0 && (
                    <div>
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-2">
                        Colors
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((c: string, idx: number) => {
                          const color = colorMap[c] || "#000000";
                          return (
                            <span
                              key={`${c}-${idx}`}
                              className="w-6 h-6 rounded-full border border-black/85 shadow-sm"
                              style={{ backgroundColor: color }}
                              aria-label={`Color ${c}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                      Availability
                    </span>
                    <p
                      className={`[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] font-medium ${
                        stock > 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {stock > 0 ? `In stock (${stock})` : "Out of stock"}
                    </p>
                  </div>
                </div>

                {desc && (
                  <div className="my-6">
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-2">
                      Description
                    </span>
                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] leading-relaxed text-(--color-grey-muted)">
                      {desc}
                    </p>
                  </div>
                )}

                <div className="mt-2 pt-4 border-t border-(--color-border)">
                  <div className="flex flex-col gap-4 mb-6">
                    {/* Row: quantity controls + Buy Now */}
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:bg-transparent hover:cursor-pointer"
                          disabled={stock < 1 || quantity <= 1}
                        >
                          <span className="text-lg">−</span>
                        </button>
                        <span className="w-8 text-center text-sm [font-family:var(--font-body)]">
                          {quantity}
                        </span>
                        <button
                          onClick={() =>
                            setQuantity((q) => Math.min(stock, q + 1))
                          }
                          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:bg-transparent hover:cursor-pointer"
                          disabled={stock < 1 || quantity >= stock}
                        >
                          <span className="text-lg">+</span>
                        </button>
                      </div>
                      <button
                        onClick={handleBuyNow}
                        disabled={stock < 1}
                        className={`w-full py-3 px-6 border border-black bg-transparent text-[12px] md:text-[13px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] transition-all duration-300 hover:cursor-pointer ${
                          stock < 1
                            ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                            : "hover:bg-black hover:text-white"
                        }`}
                      >
                        Buy Now
                      </button>
                    </div>

                    {/* Add to Cart as full‑width block */}
                    <button
                      onClick={handleAddToCart}
                      disabled={stock < 1}
                      className={`w-full py-3 px-6 border border-black text-[12px] md:text-[13px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] transition-all duration-300 hover:cursor-pointer ${
                        stock < 1
                          ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                          : "bg-black text-white hover:bg-white hover:text-black hover:border-black"
                      }`}
                    >
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Mobile sticky bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-(--color-border) p-4 shadow-lg z-30">
        <div className="flex gap-3">
          <button
            onClick={handleAddToCart}
            disabled={stock < 1}
            className="flex-1 bg-black text-white py-3 text-[10px] tracking-[0.24em] uppercase font-ui disabled:opacity-50"
          >
            Add to Cart – AED {price * quantity}
          </button>
        </div>
      </div>
      <div className="lg:hidden pb-20" />
    </MainLayout>
  );
}
