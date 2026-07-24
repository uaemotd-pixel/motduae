// components/fabric/FabricDetailView.tsx

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useRouter } from "next/navigation";
import type { Locale } from "@/i18n/routing";
import {
  type FabricDetailItem,
  formatMaterialLabel,
  formatPricePerMeter,
  getFabricDisplayFields,
} from "@/lib/fabrics";
import { Share2 } from "lucide-react";
import StoreAttribution from "@/components/fabric/StoreAttribution";
import { resolveMediaUrl } from "@/lib/media";
import { COLOR_OPTIONS } from "@/lib/createFabricAdmin";
import ZoomImageEffect from "../shared/ZoomImageEffect";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";

type FabricDetailViewProps = {
  fabric: FabricDetailItem;
  locale: Locale;
  labels: {
    fabrics: string;
    material: string;
    color: string[];
    city: string;
    perMeter: string;
    selectForCustomOrder: string;
    storeTitle: string;
    pickupLabel: string;
    partnerNote: string;
  };
};

export default function FabricDetailView({
  fabric,
  locale,
  labels,
}: FabricDetailViewProps) {
  const { title, description } = getFabricDisplayFields(fabric, locale);
  const router = useRouter();
  const { addItem: addToCart } = useCart();
  const {
    wishItems,
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
  } = useWishlist();

  const [quantity, setQuantity] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [stickySide, setStickySide] = useState<"left" | "right" | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);

  const liked = wishItems.some((item) => item.id === fabric._id);

  const toggleWishlist = () => {
    if (liked) {
      removeFromWishlist(fabric._id);
    } else {
      addToWishlist({
        id: fabric._id,
        slug: fabric.slug,
        name: title,
        image: resolveMediaUrl(fabric.images?.[0]) || "",
        price: fabric.pricePerMeter,
        size: "Per Meter",
        maxStock: fabric.stockInMeters,
      });
    }
  };

  const handleAddToCart = () => {
    addToCart({
      id: fabric._id,
      slug: fabric.slug,
      name: title,
      image: resolveMediaUrl(fabric.images?.[0]) || "",
      price: fabric.pricePerMeter,
      size: "Per Meter",
      maxStock: fabric.stockInMeters,
    });
  };

  const handleBuyNow = () => {
    const checkoutParams = new URLSearchParams({
      productId: fabric._id,
      slug: fabric.slug,
      name: title,
      image: resolveMediaUrl(fabric.images?.[0]) || "",
      price: String(fabric.pricePerMeter),
      size: "Per Meter",
      quantity: String(quantity),
      maxStock: String(fabric.stockInMeters),
    });
    router.push(`/${locale}/checkout?buyNow=true&${checkoutParams.toString()}`);
  };

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
  }, [isLargeScreen, fabric]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.85]);

  const handleShare = async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!shareUrl) return;

    const shareTitle = title;
    const shareText = `${title} - ${formatMaterialLabel(fabric.material, locale)}`;

    try {
      if (
        typeof navigator !== "undefined" &&
        typeof (navigator as any).share === "function"
      ) {
        await (navigator as any).share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        typeof navigator.clipboard.writeText === "function"
      ) {
        await navigator.clipboard.writeText(shareUrl);
        return;
      }

      window.prompt("Copy link:", shareUrl);
    } catch {
      // no-op
    }
  };

  const images = fabric.images?.length
    ? fabric.images.map(resolveMediaUrl)
    : [resolveMediaUrl(undefined)];
  const [activeImage, setActiveImage] = useState(0);

  const customOrderHref = `/custom-order/fabric?fabricSlug=${encodeURIComponent(fabric.slug)}`;

  const getStickyClass = () => {
    if (!isLargeScreen) return "";
    if (stickySide === "left") return "lg:sticky lg:top-24";
    if (stickySide === "right") return "lg:sticky lg:top-24";
    return "";
  };

  return (
    <div ref={containerRef} className="bg-[#FDFAF5] min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-[#7A7A72] mb-6"
        >
          <Link
            href="/fabrics/fabricStore"
            className="hover:text-black transition"
          >
            {labels.fabrics}
          </Link>
          <span>/</span>
          <span className="text-black">
            {formatMaterialLabel(fabric.material, locale)}
          </span>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column */}
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
                className="bg-[#F5F4F0] overflow-hidden rounded-sm relative"
              >
                <button
                  type="button"
                  aria-label="Share"
                  onClick={handleShare}
                  className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-black shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 hover:cursor-pointer"
                >
                  <Share2 className="w-5 h-5" />
                </button>
                <ZoomImageEffect
                  src={images[activeImage]}
                  alt={fabric.name}
                  className="w-full h-auto"
                  lensSize={150}
                  zoomLevel={4}
                />
              </motion.div>

              {images.length > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="flex gap-2 overflow-x-auto"
                >
                  {images.map((image, index) => (
                    <button
                      key={`${fabric._id}-image-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`w-16 h-16 shrink-0 overflow-hidden border-2 transition ${
                        index === activeImage
                          ? "border-black"
                          : "border-[#E4E0D8]"
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="relative">
            <motion.div
              ref={rightRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`${getStickyClass()} space-y-6`}
            >
              {fabric.tag && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="inline-block bg-black text-white text-[10px] uppercase tracking-[0.2em] px-3 py-1.5"
                >
                  {fabric.tag}
                </motion.span>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h1 className="[font-family:var(--font-display)] text-3xl sm:text-4xl text-black leading-tight mb-3">
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
                <p className="[font-family:var(--font-ui)] text-2xl text-black font-medium">
                  {formatPricePerMeter(fabric.pricePerMeter, locale)}
                </p>
              </motion.div>

              {description && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="[font-family:var(--font-body)] text-sm sm:text-base text-[#7A7A72] leading-relaxed text-justify [text-justify:inter-word]"
                >
                  {description}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="grid grid-cols-2 gap-4 py-5 border-y border-[#E4E0D8]"
              >
                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-[#7A7A72]">
                    {labels.material}
                  </p>
                  <p className="[font-family:var(--font-body)] text-base text-black mt-1">
                    {formatMaterialLabel(fabric.material, locale)}
                  </p>
                </div>

                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-[#7A7A72]">
                    {labels.color}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    {fabric.color && fabric.color.length > 0 ? (
                      <>
                        {fabric.color.slice(0, 6).map((color, index) => {
                          const colorObj = COLOR_OPTIONS.find(
                            (c: any) =>
                              c.value.toLowerCase() === color.toLowerCase(),
                          );
                          return (
                            <motion.span
                              key={index}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{
                                duration: 0.3,
                                delay: 0.3 + index * 0.05,
                              }}
                              className="w-7 h-7 rounded-full border border-[#E4E0D8] shrink-0 shadow-sm"
                              style={{
                                backgroundColor: colorObj?.value || "#CCCCCC",
                              }}
                              title={color}
                            />
                          );
                        })}
                        {fabric.color.length > 6 && (
                          <span className="text-[10px] text-[#7A7A72] font-mono bg-[#F5F2ED] px-2 py-0.5 rounded-full">
                            +{fabric.color.length - 6}
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-[13px] text-[#7A7A72] font-mono">
                        {locale === "ar" ? "بدون لون" : "No color"}
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
              >
                <StoreAttribution
                  store={fabric.listedByStore}
                  pickupAddress={fabric.storePickupAddress}
                  locale={locale}
                  labels={{
                    title: labels.storeTitle,
                    pickupLabel: labels.pickupLabel,
                    partnerNote: labels.partnerNote,
                  }}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href={customOrderHref}
                  className="block w-full py-3 sm:py-4 px-4 sm:px-6 bg-black text-white text-center text-xs sm:text-sm tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition-colors hover:cursor-pointer"
                >
                  {labels.selectForCustomOrder}
                </Link>
              </motion.div>

              {/* Buy Only Fabric Options */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="pt-6 border-t border-[#E4E0D8]"
              >
                <h3 className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-black mb-3">
                  {locale === "ar" ? "شراء القماش فقط" : "Buy Fabric Only"}
                </h3>

                <div className="flex flex-col gap-4">
                  {/* Availability */}
                  <div>
                    <span className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                      {locale === "ar" ? "التوفر" : "Availability"}
                    </span>
                    <p
                      className={`[font-family:var(--font-body)] text-[14px] font-medium ${
                        fabric.stockInMeters > 0 ? "text-green-700" : "text-red-600"
                      }`}
                    >
                      {fabric.stockInMeters > 0
                        ? locale === "ar"
                          ? `متوفر في المخزون (${fabric.stockInMeters} متر)`
                          : `In stock (${fabric.stockInMeters} meters)`
                        : locale === "ar"
                        ? "نفذت الكمية"
                        : "Out of stock"}
                    </p>
                  </div>

                  {/* Quantity & Buy Now */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                        disabled={fabric.stockInMeters < 1 || quantity <= 1}
                      >
                        <span className="text-lg">−</span>
                      </button>
                      <span className="w-8 text-center text-sm [font-family:var(--font-body)] text-black">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity((q) => Math.min(fabric.stockInMeters, q + 1))}
                        className="w-8 h-8 border border-gray-300 rounded flex items-center justify-center transition hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed hover:cursor-pointer"
                        disabled={fabric.stockInMeters < 1 || quantity >= fabric.stockInMeters}
                      >
                        <span className="text-lg">+</span>
                      </button>
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-ui shrink-0">
                        {locale === "ar" ? "متر" : "Meters"}
                      </span>
                    </div>
                    <button
                      onClick={handleBuyNow}
                      disabled={fabric.stockInMeters < 1}
                      className={`w-full py-3 px-6 border border-black bg-transparent text-[12px] md:text-[13px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] transition-all duration-300 hover:cursor-pointer ${
                        fabric.stockInMeters < 1
                          ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                          : "hover:bg-black hover:text-white"
                      }`}
                    >
                      {locale === "ar" ? "شراء الآن" : "Buy Now"}
                    </button>
                  </div>

                  {/* Add to Cart */}
                  <button
                    onClick={handleAddToCart}
                    disabled={fabric.stockInMeters < 1}
                    className={`w-full py-3 px-6 border border-black text-[12px] md:text-[13px] tracking-[0.24em] uppercase [font-family:var(--font-ui)] transition-all duration-300 hover:cursor-pointer ${
                      fabric.stockInMeters < 1
                        ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-500 border-gray-300"
                        : "bg-black text-white hover:bg-white hover:text-black hover:border-black"
                    }`}
                  >
                    {locale === "ar" ? "إضافة إلى السلة" : "Add to Cart"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
