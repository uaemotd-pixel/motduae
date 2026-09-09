"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useScroll, useTransform } from "framer-motion";
import { Share2 } from "lucide-react";
import { api } from "@/lib/api/client";
import MainLayout from "@/app/[locale]/main/layout";
import FadeInSection from "@/components/shared/fadeInSection";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { resolveMediaUrl } from "@/lib/media";
import { formatCurrency } from "@/lib/format";
import ZoomImageEffect from "@/components/shared/ZoomImageEffect";
import { DetailPageSkeleton } from "@/components/ui/Skeleton";
import WishlistButton from "@/components/shared/wishlistButton";
import { ProductReviewsSection } from "@/components/reviews/CustomerReviewsView";

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  new: { bg: "#2D5A3D", text: "#FFFFFF" },
  bestseller: { bg: "#8B7355", text: "#FFFFFF" },
  premium: { bg: "#4A4A4A", text: "#FFFFFF" },
  limited: { bg: "#8B3A3A", text: "#FFFFFF" },
  exclusive: { bg: "#C4A47A", text: "#000000" },
  trending: { bg: "#3A5A78", text: "#FFFFFF" },
  handmade: { bg: "#6B4F3C", text: "#FFFFFF" },
};

const getTagStyles = (tagKey?: string) => {
  if (!tagKey) return { bg: "#1A1A1A", text: "#FFFFFF" };
  const key = tagKey.toLowerCase().trim();
  return TAG_COLORS[key] || { bg: "#1A1A1A", text: "#FFFFFF" };
};

type AddonListItem = {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  price: number;
  stock?: number;
  thumbnailImage?: string;
  images?: string[];
  tag?: string;
  tagAr?: string;
};

function RelatedAddonsSection({
  items,
  locale,
  labels,
}: {
  items: AddonListItem[];
  locale: string;
  labels: {
    relatedEyebrow: string;
    relatedTitle: string;
    relatedExplore: string;
    outOfStock: string;
  };
}) {
  const lang = locale === "ar" ? "ar" : "en";
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const getFullUrl = useCallback(
    (hrefPath: string) => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const basePath = locale === "ar" ? "/ar" : "/en";
      return `${origin}${basePath}${hrefPath}`;
    },
    [locale],
  );

  const handleShare = useCallback(
    async (hrefPath: string) => {
      const fullUrl = getFullUrl(hrefPath);
      const shareData = {
        title: "MOTD",
        text: locale === "ar" ? "اطلع على هذا الإكسسوار" : "Check this add-on",
        url: fullUrl,
      };

      try {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          await navigator.share(shareData as ShareData);
          return;
        }
      } catch {
        // fall through
      }

      try {
        await navigator.clipboard.writeText(fullUrl);
        setToastMessage(locale === "ar" ? "تم نسخ الرابط!" : "Link copied!");
      } catch {
        window.prompt(locale === "ar" ? "انسخ الرابط:" : "Copy link:", fullUrl);
      }
    },
    [getFullUrl, locale],
  );

  if (!items.length) return null;

  return (
    <section className="bg-(--bg-page) border-t border-(--color-border) pt-12 xs:pt-14 sm:pt-16 pb-16 xs:pb-20 sm:pb-24">
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-black text-white px-4 py-2.5 rounded-lg shadow-lg [font-family:var(--font-ui)] text-xs sm:text-sm tracking-wide max-w-[calc(100vw-24px)] text-center pointer-events-none">
          {toastMessage}
        </div>
      )}
      <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 xs:mb-10">
          <div>
            <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-2 flex items-center gap-3">
              <span className="block w-5 h-px bg-(--color-grey-muted)" />
              {labels.relatedEyebrow}
            </span>
            <h2 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] md:text-[40px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
              {labels.relatedTitle}
            </h2>
          </div>
          <Link
            href="/addons"
            className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-black border-b border-black pb-1 hover:opacity-50 transition-opacity whitespace-nowrap self-start sm:self-auto"
          >
            {labels.relatedExplore}
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 xs:gap-4 sm:gap-5 lg:gap-6">
          {items.map((item, idx) => {
            const title =
              locale === "ar" ? item.nameAr || item.name : item.name;
            const image =
              resolveMediaUrl(item.thumbnailImage) ||
              resolveMediaUrl(item.images?.[0]) ||
              "/placeholder.png";
            const price = Number(item.price) || 0;
            const inStock = Number(item.stock) > 0;
            const hrefPath = `/addons/${item.slug}`;
            const tag = locale === "ar" ? item.tagAr || item.tag : item.tag;
            const tagStyles = getTagStyles(item.tag);

            return (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: Math.min(idx * 0.06, 0.3),
                }}
                className="group"
              >
                <Link
                  href={hrefPath}
                  className="block h-full border border-(--color-border) bg-(--bg-page) rounded-lg overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                    <img
                      src={image}
                      alt={title}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"
                    />
                    {tag && (
                      <div
                        className="absolute top-2 left-2 z-10 px-1.5 py-px text-[8px] [font-family:var(--font-ui)] tracking-[0.12em] font-medium uppercase max-w-[calc(100%-5.5rem)] truncate"
                        style={{
                          backgroundColor: tagStyles.bg,
                          color: tagStyles.text,
                        }}
                      >
                        {tag}
                      </div>
                    )}
                    {!inStock && (
                      <div className="absolute bottom-2 left-2 z-10 bg-black/75 text-white text-[8px] [font-family:var(--font-ui)] tracking-[0.16em] uppercase px-2 py-1">
                        {labels.outOfStock}
                      </div>
                    )}
                    <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={locale === "ar" ? "مشاركة" : "Share"}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleShare(hrefPath);
                        }}
                        className="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:scale-110 transition-transform hover:cursor-pointer border-0 flex items-center justify-center w-8 h-8"
                      >
                        <Share2 className="w-3.5 h-3.5 text-black" />
                      </button>
                      <WishlistButton
                        item={{
                          id: item._id,
                          name: title,
                          image,
                          price,
                          slug: item.slug,
                          size: "N/A",
                          quantity: 1,
                          type: "addons",
                          maxStock: Number(item.stock) || 0,
                        }}
                        inline
                        className="p-2 rounded-full bg-white/90 backdrop-blur-sm shadow-sm border-0 flex h-8 w-8 items-center justify-center"
                        iconClassName="h-3.5 w-3.5"
                      />
                    </div>
                  </div>
                  <div className="p-3 xs:p-4">
                    <h3 className="[font-family:var(--font-display)] text-sm xs:text-base text-black leading-snug line-clamp-2 mb-1.5">
                      {title}
                    </h3>
                    <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.16em] text-(--color-grey-muted)">
                      {formatCurrency(price, lang)}
                    </p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type AddonDetailContentProps = {
  addon: any;
  locale: string;
  isAr: boolean;
  selectedImage: string;
  onSelectImage: (url: string) => void;
  quantity: number;
  onQuantityChange: (updater: (q: number) => number) => void;
  liked: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
};

function AddonDetailContent({
  addon,
  locale,
  isAr,
  selectedImage,
  onSelectImage,
  quantity,
  onQuantityChange,
  liked,
  onToggleWishlist,
  onAddToCart,
  onBuyNow,
}: AddonDetailContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [stickySide, setStickySide] = useState<"left" | "right" | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  useEffect(() => {
    if (!isLargeScreen || !leftRef.current || !rightRef.current) {
      setStickySide(null);
      return;
    }

    const checkHeights = () => {
      const leftHeight = leftRef.current?.scrollHeight || 0;
      const rightHeight = rightRef.current?.scrollHeight || 0;
      const viewportHeight = window.innerHeight;
      const topOffset = 96;
      const maxHeight = viewportHeight - topOffset - 32;

      const leftFits = leftHeight <= maxHeight;
      const rightFits = rightHeight <= maxHeight;

      if (leftFits && rightFits) {
        setStickySide(null);
        return;
      }

      if (!leftFits && rightFits) {
        setStickySide("left");
        return;
      }

      if (leftFits && !rightFits) {
        setStickySide("right");
        return;
      }

      if (leftHeight > rightHeight) {
        setStickySide("left");
      } else if (rightHeight > leftHeight) {
        setStickySide("right");
      } else {
        setStickySide(null);
      }
    };

    const timeoutId = setTimeout(checkHeights, 100);

    const resizeObserver = new ResizeObserver(() => {
      checkHeights();
    });

    if (leftRef.current) resizeObserver.observe(leftRef.current);
    if (rightRef.current) resizeObserver.observe(rightRef.current);

    window.addEventListener("resize", checkHeights);

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", checkHeights);
    };
  }, [isLargeScreen, addon]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.85]);

  const getStickyClass = useCallback(() => {
    if (!isLargeScreen) return "";
    if (stickySide === "left") return "lg:sticky lg:top-24";
    if (stickySide === "right") return "lg:sticky lg:top-24";
    return "";
  }, [isLargeScreen, stickySide]);

  const title = isAr ? addon.nameAr || addon.name : addon.name;
  const desc = isAr
    ? addon.descriptionAr || addon.description
    : addon.description;
  const images = addon.images?.length ? addon.images : [addon.thumbnailImage];
  const price = addon.price;
  const stock = addon.stock || 0;
  const tag = isAr ? addon.tagAr || addon.tag : addon.tag;
  const tagStyles = getTagStyles(addon.tag);

  return (
    <FadeInSection>
      <div
        ref={containerRef}
        className="bg-(--bg-page) pt-8 xs:pt-10 sm:pt-12 pb-12 xs:pb-16 sm:pb-20 md:pb-24"
      >
        <div className="px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) w-full mx-auto max-w-7xl">
          <nav className="mb-6 xs:mb-8">
            <ol className="flex flex-wrap items-center gap-1.5 text-[10px] xs:text-[11px] [font-family:var(--font-ui)] uppercase tracking-[0.2em]">
              <li>
                <Link
                  href="/"
                  className="text-(--color-grey-muted) hover:text-black transition"
                >
                  {isAr ? "الرئيسية" : "Home"}
                </Link>
              </li>
              <li className="text-(--color-grey-muted)">/</li>
              <li>
                <Link
                  href="/#addons-section"
                  scroll={true}
                  className="text-(--color-grey-muted) hover:text-black transition"
                >
                  {isAr ? "إكسسوارات" : "Add-Ons"}
                </Link>
              </li>
              <li className="text-(--color-grey-muted)">/</li>
              <li className="text-black truncate max-w-50 xs:max-w-none">
                {title}
              </li>
            </ol>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xs:gap-10 md:gap-12 lg:gap-(--space-40)">
            <div className="relative">
              <motion.div
                ref={leftRef}
                style={
                  stickySide === "left"
                    ? { scale: imageScale, opacity: imageOpacity }
                    : {}
                }
                className={`${getStickyClass()} space-y-4`}
              >
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="w-full relative overflow-hidden bg-[#F5F5F0] rounded-lg group aspect-4/5"
                >
                  <ZoomImageEffect
                    key={selectedImage}
                    src={selectedImage}
                    alt={title}
                    className="h-full w-full object-cover object-top"
                    lensSize={185}
                    zoomLevel={3.5}
                  />
                  {tag && (
                    <div
                      className="absolute top-1.5 left-1.5 z-10 px-1.5 py-px text-[8px] [font-family:var(--font-ui)] tracking-[0.12em] font-medium shadow-sm uppercase max-w-[calc(100%-3.75rem)] truncate"
                      style={{
                        backgroundColor: tagStyles.bg,
                        color: tagStyles.text,
                      }}
                    >
                      {tag}
                    </div>
                  )}
                </motion.div>
                {images.length > 1 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    className="flex gap-2 overflow-x-auto pb-2"
                  >
                    {images.map((img: string, idx: number) => {
                      const thumbUrl = resolveMediaUrl(img);
                      return (
                        <button
                          key={idx}
                          onClick={() => onSelectImage(thumbUrl)}
                          className={`shrink-0 w-20 xs:w-24 h-20 xs:h-24 rounded-md overflow-hidden border-2 transition-all duration-200 ${
                            selectedImage === thumbUrl
                              ? "border-black"
                              : "border-transparent opacity-60 hover:opacity-100"
                          }`}
                        >
                          <img
                            src={thumbUrl}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </motion.div>
            </div>

            <div className="relative">
              <motion.div
                ref={rightRef}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className={`${getStickyClass()} flex flex-col`}
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h1 className="[font-family:var(--font-display)] text-[28px] xs:text-[32px] sm:text-[36px] md:text-[40px] lg:text-[44px] xl:text-[48px] font-normal leading-[1.1] tracking-[-0.01em] text-black">
                    {title}
                  </h1>
                  <button
                    onClick={onToggleWishlist}
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

                <div className="border-b border-(--color-border) pb-4 mb-4">
                  <p className="[font-family:var(--font-ui)] text-[20px] xs:text-[24px] sm:text-[28px] tracking-[0.24em] text-black">
                    {price.toFixed(2)} {isAr ? "د.إ" : "AED"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-x-6 my-2">
                  <div>
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                      {isAr ? "المتوفر" : "Availability"}
                    </span>
                    <p
                      className={`[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] font-medium ${
                        stock > 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {stock > 0
                        ? isAr
                          ? `متوفر في المخزون (${stock})`
                          : `In stock (${stock})`
                        : isAr
                          ? "نفذت الكمية"
                          : "Out of stock"}
                    </p>
                  </div>
                </div>

                {desc && (
                  <div className="my-6">
                    <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-2">
                      {isAr ? "الوصف" : "Description"}
                    </span>
                    <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] leading-relaxed text-(--color-grey-muted)">
                      {desc}
                    </p>
                  </div>
                )}

                <div className="mt-2 pt-4 border-t border-(--color-border)">
                  <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            onQuantityChange((q) => Math.max(1, q - 1))
                          }
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
                            onQuantityChange((q) => Math.min(stock, q + 1))
                          }
                          className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:hover:bg-transparent hover:cursor-pointer"
                          disabled={stock < 1 || quantity >= stock}
                        >
                          <span className="text-lg">+</span>
                        </button>
                      </div>
                      <button
                        onClick={onBuyNow}
                        disabled={stock < 1}
                        className={`w-full py-3 px-6 border border-black bg-transparent text-[12px] md:text-[13px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] transition-all duration-300 hover:cursor-pointer ${
                          stock < 1
                            ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                            : "hover:bg-black hover:text-white"
                        }`}
                      >
                        {isAr ? "شراء الآن" : "Buy Now"}
                      </button>
                    </div>

                    <button
                      onClick={onAddToCart}
                      disabled={stock < 1}
                      className={`w-full py-3 px-6 border border-black text-[12px] md:text-[13px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] transition-all duration-300 hover:cursor-pointer ${
                        stock < 1
                          ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                          : "bg-black text-white hover:bg-white hover:text-black hover:border-black"
                      }`}
                    >
                      {isAr ? "إضافة إلى السلة" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </FadeInSection>
  );
}

export default function AddonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("AddonDetail");
  const slug = params.slug as string;
  const locale = (params.locale as string) || "en";
  const isAr = locale === "ar";

  const { addItem: addToCart } = useCart();
  const {
    wishItems,
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
  } = useWishlist();

  const [addon, setAddon] = useState<any | null>(null);
  const [related, setRelated] = useState<AddonListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] =
    useState<string>("/placeholder.png");

  useEffect(() => {
    const fetchAddon = async () => {
      try {
        setLoading(true);
        setError(null);
        setRelated([]);
        const data = await api.get<any>(`/api/addons/${slug}`);
        if (!data?.success || !data.item) {
          throw new Error("Product not found");
        }
        setAddon(data.item);
        setRelated(
          Array.isArray(data.related)
            ? data.related.filter(
                (item: AddonListItem) => item?.slug && item.slug !== slug,
              )
            : [],
        );
        const img = resolveMediaUrl(data.item.thumbnailImage);
        setSelectedImage(img || "/placeholder.png");
      } catch (err: any) {
        setError(err?.message || "Failed to load product");
        setAddon(null);
        setRelated([]);
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchAddon();
  }, [slug]);

  const handleAddToCart = () => {
    if (!addon) return;
    addToCart({
      id: addon._id,
      slug: addon.slug,
      name: addon.name,
      image: resolveMediaUrl(addon.thumbnailImage) || "",
      price: addon.price,
      size: "N/A",
      maxStock: addon.stock || 0,
    });
  };

  const handleBuyNow = () => {
    if (!addon) return;
    const checkoutParams = new URLSearchParams({
      productId: addon._id,
      slug: addon.slug,
      name: addon.name,
      image: resolveMediaUrl(addon.thumbnailImage) || "",
      size: "N/A",
      quantity: String(quantity),
    });
    router.push(`/${locale}/checkout?buyNow=true&${checkoutParams.toString()}`);
  };

  const liked = addon ? wishItems.some((item) => item.id === addon._id) : false;

  const toggleWishlist = () => {
    if (!addon) return;
    if (liked) {
      removeFromWishlist(addon._id);
    } else {
      addToWishlist({
        id: addon._id,
        slug: addon.slug,
        name: addon.name,
        image: resolveMediaUrl(addon.thumbnailImage) || "",
        price: addon.price,
        size: "N/A",
        maxStock: addon.stock || 0,
        type: "addons",
      });
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <DetailPageSkeleton />
      </MainLayout>
    );
  }

  if (error || !addon) {
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
              {isAr ? "المنتج غير موجود" : "Product Not Found"}
            </h1>
            <p className="text-[13px] xs:text-[14px] text-[#5A5A56] mb-6">
              {isAr
                ? "المنتج الذي تبحث عنه غير موجود أو تم حذفه."
                : "The product you're looking for doesn't exist or may have been removed."}
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <button
                onClick={() => router.push("/")}
                className="px-6 py-3 bg-black text-white text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition duration-300"
              >
                {isAr ? "العودة للرئيسية" : "Go to Homepage"}
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 border border-black text-[10px] xs:text-[11px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition duration-300"
              >
                {isAr ? "الرجوع" : "Go Back"}
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <AddonDetailContent
        addon={addon}
        locale={locale}
        isAr={isAr}
        selectedImage={selectedImage}
        onSelectImage={setSelectedImage}
        quantity={quantity}
        onQuantityChange={setQuantity}
        liked={liked}
        onToggleWishlist={toggleWishlist}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />

      <RelatedAddonsSection
        items={related}
        locale={locale === "ar" ? "ar" : "en"}
        labels={{
          relatedEyebrow: t("relatedEyebrow"),
          relatedTitle: t("relatedTitle"),
          relatedExplore: t("relatedExplore"),
          outOfStock: t("outOfStock"),
        }}
      />

      <ProductReviewsSection
        productId={String(addon._id)}
        locale={locale === "ar" ? "ar" : "en"}
        labels={{
          title: t("reviewsTitle"),
          empty: t("reviewsEmpty"),
          loading: t("reviewsLoading"),
          averageLabel: t.raw("reviewsAverage"),
          countLabel: t.raw("reviewsCount"),
          verifiedLabel: t("verifiedPurchase"),
        }}
      />
    </MainLayout>
  );
}
