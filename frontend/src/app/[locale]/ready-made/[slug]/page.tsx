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
import { getTranslation } from "@/lib/getTranslation";

// Product color mapping (for swatches)
const colorOptions = [
  { name: "Aqua", value: "aqua", bg: "#00FFFF" },
  { name: "Aquamarine", value: "aquamarine", bg: "#7FFFD4" },
  { name: "Beige", value: "beige", bg: "#F5F5DC" },
  { name: "Bisque", value: "bisque", bg: "#FFE4C4" },
  { name: "Black", value: "black", bg: "#000000" },
  { name: "Blue", value: "blue", bg: "#0000FF" },
  { name: "Blue Violet", value: "blueviolet", bg: "#8A2BE2" },
  { name: "Brown", value: "brown", bg: "#A52A2A" },
  { name: "Burlywood", value: "burlywood", bg: "#DEB887" },
  { name: "Cadet Blue", value: "cadetblue", bg: "#5F9EA0" },
  { name: "Chocolate", value: "chocolate", bg: "#D2691E" },
  { name: "Coral", value: "coral", bg: "#FF7F50" },
  { name: "Cornflower Blue", value: "cornflowerblue", bg: "#6495ED" },
  { name: "Cornsilk", value: "cornsilk", bg: "#FFF8DC" },
  { name: "Crimson", value: "crimson", bg: "#DC143C" },
  { name: "Cyan", value: "cyan", bg: "#00FFFF" },
  { name: "Dark Blue", value: "darkblue", bg: "#00008B" },
  { name: "Dark Cyan", value: "darkcyan", bg: "#008B8B" },
  { name: "Dark Goldenrod", value: "darkgoldenrod", bg: "#B8860B" },
  { name: "Dark Gray", value: "darkgray", bg: "#A9A9A9" },
  { name: "Dark Green", value: "darkgreen", bg: "#006400" },
  { name: "Dark Khaki", value: "darkkhaki", bg: "#BDB76B" },
  { name: "Dark Magenta", value: "darkmagenta", bg: "#8B008B" },
  { name: "Dark Orchid", value: "darkorchid", bg: "#9932CC" },
  { name: "Dark Red", value: "darkred", bg: "#8B0000" },
  { name: "Dark Salmon", value: "darksalmon", bg: "#E9967A" },
  { name: "Dark Sea Green", value: "darkseagreen", bg: "#8FBC8F" },
  { name: "Dark Slate Blue", value: "darkslateblue", bg: "#483D8B" },
  { name: "Dark Slate Gray", value: "darkslategray", bg: "#2F4F4F" },
  { name: "Dark Turquoise", value: "darkturquoise", bg: "#00CED1" },
  { name: "Dark Violet", value: "darkviolet", bg: "#9400D3" },
  { name: "Deep Pink", value: "deeppink", bg: "#FF1493" },
  { name: "Deep Sky Blue", value: "deepskyblue", bg: "#00BFFF" },
  { name: "Dim Gray", value: "dimgray", bg: "#696969" },
  { name: "Dodger Blue", value: "dodgerblue", bg: "#1E90FF" },
  { name: "Firebrick", value: "firebrick", bg: "#B22222" },
  { name: "Fuchsia", value: "fuchsia", bg: "#FF00FF" },
  { name: "Gainsboro", value: "gainsboro", bg: "#DCDCDC" },
  { name: "Gold", value: "gold", bg: "#FFD700" },
  { name: "Goldenrod", value: "goldenrod", bg: "#DAA520" },
  { name: "Gray", value: "gray", bg: "#808080" },
  { name: "Green", value: "green", bg: "#008000" },
  { name: "Green Yellow", value: "greenyellow", bg: "#ADFF2F" },
  { name: "Grey", value: "grey", bg: "#808080" },
  { name: "Hot Pink", value: "hotpink", bg: "#FF69B4" },
  { name: "Indian Red", value: "indianred", bg: "#CD5C5C" },
  { name: "Indigo", value: "indigo", bg: "#4B0082" },
  { name: "Ivory", value: "ivory", bg: "#FFFFF0" },
  { name: "Khaki", value: "khaki", bg: "#F0E68C" },
  { name: "Lavender", value: "lavender", bg: "#E6E6FA" },
  { name: "Light Blue", value: "lightblue", bg: "#ADD8E6" },
  { name: "Light Gray", value: "lightgray", bg: "#D3D3D3" },
  { name: "Light Green", value: "lightgreen", bg: "#90EE90" },
  { name: "Light Pink", value: "lightpink", bg: "#FFB6C1" },
  { name: "Light Salmon", value: "lightsalmon", bg: "#FFA07A" },
  { name: "Light Sea Green", value: "lightseagreen", bg: "#20B2AA" },
  { name: "Light Sky Blue", value: "lightskyblue", bg: "#87CEFA" },
  { name: "Light Slate Gray", value: "lightslategray", bg: "#778899" },
  { name: "Light Steel Blue", value: "lightsteelblue", bg: "#B0C4DE" },
  { name: "Maroon", value: "maroon", bg: "#800000" },
  { name: "Medium Blue", value: "mediumblue", bg: "#0000CD" },
  { name: "Medium Purple", value: "mediumpurple", bg: "#9370DB" },
  { name: "Medium Sea Green", value: "mediumseagreen", bg: "#3CB371" },
  { name: "Medium Slate Blue", value: "mediumslateblue", bg: "#7B68EE" },
  { name: "Medium Turquoise", value: "mediumturquoise", bg: "#48D1CC" },
  { name: "Medium Violet Red", value: "mediumvioletred", bg: "#C71585" },
  { name: "Midnight Blue", value: "midnightblue", bg: "#191970" },
  { name: "Moccasin", value: "moccasin", bg: "#FFE4B5" },
  { name: "Navy", value: "navy", bg: "#000080" },
  { name: "Olive", value: "olive", bg: "#808000" },
  { name: "Olive Drab", value: "olivedrab", bg: "#6B8E23" },
  { name: "Orange", value: "orange", bg: "#FFA500" },
  { name: "Orchid", value: "orchid", bg: "#DA70D6" },
  { name: "Pale Goldenrod", value: "palegoldenrod", bg: "#EEE8AA" },
  { name: "Pale Green", value: "palegreen", bg: "#98FB98" },
  { name: "Pale Turquoise", value: "paleturquoise", bg: "#AFEEEE" },
  { name: "Pale Violet Red", value: "palevioletred", bg: "#DB7093" },
  { name: "Peach Puff", value: "peachpuff", bg: "#FFDAB9" },
  { name: "Pink", value: "pink", bg: "#FFC0CB" },
  { name: "Plum", value: "plum", bg: "#DDA0DD" },
  { name: "Powder Blue", value: "powderblue", bg: "#B0E0E6" },
  { name: "Purple", value: "purple", bg: "#800080" },
  { name: "Rebecca Purple", value: "rebeccapurple", bg: "#663399" },
  { name: "Red", value: "red", bg: "#FF0000" },
  { name: "Rosy Brown", value: "rosybrown", bg: "#BC8F8F" },
  { name: "Royal Blue", value: "royalblue", bg: "#4169E1" },
  { name: "Saddle Brown", value: "saddlebrown", bg: "#8B4513" },
  { name: "Salmon", value: "salmon", bg: "#FA8072" },
  { name: "Sandy Brown", value: "sandybrown", bg: "#F4A460" },
  { name: "Sea Green", value: "seagreen", bg: "#2E8B57" },
  { name: "Silver", value: "silver", bg: "#C0C0C0" },
  { name: "Sky Blue", value: "skyblue", bg: "#87CEEB" },
  { name: "Slate Blue", value: "slateblue", bg: "#6A5ACD" },
  { name: "Slate Gray", value: "slategray", bg: "#708090" },
  { name: "Steel Blue", value: "steelblue", bg: "#4682B4" },
  { name: "Tan", value: "tan", bg: "#D2B48C" },
  { name: "Teal", value: "teal", bg: "#008080" },
  { name: "Thistle", value: "thistle", bg: "#D8BFD8" },
  { name: "Tomato", value: "tomato", bg: "#FF6347" },
  { name: "Turquoise", value: "turquoise", bg: "#40E0D0" },
  { name: "Violet", value: "violet", bg: "#EE82EE" },
  { name: "Wheat", value: "wheat", bg: "#F5DEB3" },
  { name: "White", value: "white", bg: "#FFFFFF" },
  { name: "Yellow", value: "yellow", bg: "#FFFF00" },
  { name: "Yellow Green", value: "yellowgreen", bg: "#9ACD32" },
];

const getColorHex = (colorName: string): string => {
  const found = colorOptions.find(
    (c) => c.value.toLowerCase() === colorName.toLowerCase(),
  );
  return found?.bg || "#CCCCCC";
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
  const t = getTranslation(locale).readyMade.detail;
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
        size: String(product.metersPerFabric ?? ""),
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
                <div className="w-full relative overflow-hidden bg-[#F5F5F0] rounded-lg group">
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
                        {colors.map((c: string, idx: number) => (
                          <span
                            key={`${c}-${idx}`}
                            className="w-6 h-6 rounded-full border border-black/85 shadow-sm"
                            style={{ backgroundColor: getColorHex(c) }}
                            aria-label={`Color ${c}`}
                          />
                        ))}
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

                    {/* Fabric and Design Link Buttons */}
                    {(product.fabricId || product.designId) && (
                      <div className="mt-2 pt-4 border-t border-(--color-border)">
                        <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                          {t.madeWithHeading}
                        </span>
                        <p className="[font-family:var(--font-body)] text-[13px] xs:text-[14px] leading-relaxed text-(--color-grey-muted) mb-4">
                          {t.madeWithDescription}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {product.fabricId && product.fabricId.slug && (
                            <Link
                              href={`/${locale}/fabrics/${product.fabricId.slug}`}
                              className="group border border-(--color-border) bg-[#FAFAF8] p-4 transition-all duration-300 hover:border-black hover:bg-white hover:cursor-pointer"
                            >
                              <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) block mb-1">
                                {t.viewFabricLabel}
                              </span>
                              <span className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] text-black block mb-2">
                                {locale === "ar"
                                  ? product.fabricId.nameAr ||
                                    product.fabricId.name
                                  : product.fabricId.name}
                              </span>
                              <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-black/70 group-hover:text-black inline-flex items-center gap-1">
                                {t.viewDetails}
                                <span aria-hidden="true">
                                  {locale === "ar" ? "←" : "→"}
                                </span>
                              </span>
                            </Link>
                          )}
                          {product.designId && product.designId.slug && (
                            <Link
                              href={`/${locale}/designs/${product.designId.slug}`}
                              className="group border border-(--color-border) bg-[#FAFAF8] p-4 transition-all duration-300 hover:border-black hover:bg-white hover:cursor-pointer"
                            >
                              <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) block mb-1">
                                {t.viewDesignLabel}
                              </span>
                              <span className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] text-black block mb-2">
                                {locale === "ar"
                                  ? product.designId.nameAr ||
                                    product.designId.name
                                  : product.designId.name}
                              </span>
                              <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.18em] text-black/70 group-hover:text-black inline-flex items-center gap-1">
                                {t.viewDetails}
                                <span aria-hidden="true">
                                  {locale === "ar" ? "←" : "→"}
                                </span>
                              </span>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}
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
