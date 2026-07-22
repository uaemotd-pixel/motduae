"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  resolveDesignImage,
  getDesignDisplayFields,
  formatDesignBasePrice,
} from "@/lib/tailors";
import { ImageModal } from "@/components/shared/ImageModal";
import ZoomImageEffect from "@/components/shared/ZoomImageEffect";

const CATEGORY_COLORS: Record<string, string> = {
  "hand-embroidered": "#8B6B4D",
  "crystal-embellished": "#1A2A3A",
  "non-crystal": "#5A6B5A",
  talli: "#B8860B",
  khous: "#4A3A2A",
  beaded: "#6B2A5A",
};
import { Share2 } from "lucide-react";

export interface TailorShopInfo {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  logo?: string;
  coverImage?: string;
  location?: string;
  city?: string;
  phone?: string;
  rating?: number;
  reviewCount?: number;
}

export interface DesignDetailItem {
  _id: string;
  slug: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  images?: string[];
  category: string;
  basePrice: number;
  priceType?: "fixed" | "per_meter";
  tailoringFee: number;
  estimatedMeters: number;
  estimatedDays: number;
  tailorShop: TailorShopInfo;
}

type DesignDetailViewProps = {
  design: DesignDetailItem;
  locale: Locale;
  labels: {
    designs: string;
    category: string;
    estimatedMeters: string;
    estimatedDays: string;
    days: string;
    city: string;
    startingPrice: string;
    selectForCustomOrder: string;
    tailorTitle: string;
    addressLabel: string;
    partnerNote: string;
  };
};

export default function DesignDetailView({
  design,
  locale,
  labels,
}: DesignDetailViewProps) {
  const isAr = locale === "ar";
  const { name, description, category } = getDesignDisplayFields(
    design,
    locale,
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [stickySide, setStickySide] = useState<"left" | "right" | null>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState("");

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
  }, [isLargeScreen, design]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const imageScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);
  const imageOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.85]);

  const handleShare = useCallback(async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    if (!shareUrl) return;

    const shareTitle = name;
    const shareText = `${name} - ${category}`;

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
  }, [category, name]);

  const images = design.images?.length
    ? design.images.map(resolveDesignImage)
    : [resolveDesignImage(undefined)];
  const [activeImage, setActiveImage] = useState(0);

  const customOrderHref = `/custom-order/tailor?tailorSlug=${encodeURIComponent(design.tailorShop.slug)}&designSlug=${encodeURIComponent(design.slug)}`;

  const tailorShopName = isAr
    ? design.tailorShop.nameAr || design.tailorShop.name
    : design.tailorShop.name;

  const tailorShopAddress = [design.tailorShop.location, design.tailorShop.city]
    .filter((part) => part?.trim())
    .join(isAr ? "، " : ", ");

  const getStickyClass = () => {
    if (!isLargeScreen) return "";
    if (stickySide === "left") return "lg:sticky lg:top-24";
    if (stickySide === "right") return "lg:sticky lg:top-24";
    return "";
  };

  return (
    <div ref={containerRef} className="bg-(--bg-page) min-h-screen pt-20 pb-12">
      {/* Image Modal */}
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt={name}
        onClose={() => setImageModalOpen(false)}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-(--color-grey-muted) mb-6"
        >
          <Link
            href="/designs/designShop"
            className="hover:text-black transition"
          >
            {labels.designs}
          </Link>
          <span>/</span>
          <span className="text-black">{category}</span>
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
                className="w-full relative bg-[#F5F5F0] rounded-lg group"
              >
                <button
                  type="button"
                  aria-label="Share"
                  onClick={handleShare}
                  className="absolute top-3 right-3 z-10 inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 text-black shadow-sm hover:bg-white focus:outline-none focus:ring-2 focus:ring-black/20 hover:cursor-pointer"
                >
                  <Share2 className="w-5 h-5" />
                </button>

                {/* Main Image with Zoom Effect */}
                <div className="relative w-full">
                  <ZoomImageEffect
                    src={images[activeImage]}
                    alt={name}
                    className="w-full h-auto"
                    lensSize={150}
                    zoomLevel={4}
                  />
                </div>
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
                      key={`${design._id}-image-${index}`}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`w-16 h-16 shrink-0 overflow-hidden border-2 transition ${
                        index === activeImage
                          ? "border-black"
                          : "border-(--color-border)"
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
              <div className="flex flex-wrap gap-2 items-center">
                <span
                  className="inline-block text-white text-[10px] uppercase tracking-[0.25em] px-2.5 py-1.5 rounded-none"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[design.category] || "#000000",
                  }}
                >
                  {category}
                </span>
                <span
                  className={`inline-block text-[10px] uppercase tracking-[0.25em] px-2.5 py-1.5 font-semibold rounded-none border ${
                    design.priceType === "per_meter"
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-gray-50 text-gray-800 border-gray-200"
                  }`}
                >
                  {design.priceType === "per_meter"
                    ? locale === "ar"
                      ? "سعر لكل متر"
                      : "Per Meter Price"
                    : locale === "ar"
                      ? "سعر ثابت"
                      : "Fixed Price"}
                </span>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
              >
                <h1 className="[font-family:var(--font-display)] text-3xl sm:text-4xl text-black leading-tight mb-3 font-normal">
                  {name}
                </h1>
                <p className="[font-family:var(--font-ui)] text-2xl text-black">
                  {formatDesignBasePrice(
                    design.basePrice,
                    locale,
                    design.priceType,
                  )}
                </p>
              </motion.div>

              {description && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="[font-family:var(--font-body)] text-sm sm:text-base text-(--color-grey-muted) leading-relaxed text-justify [text-justify:inter-word]"
                >
                  {description}
                </motion.p>
              )}

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="grid grid-cols-2 gap-4 py-5 border-y border-(--color-border)"
              >
                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {labels.category}
                  </p>
                  <p className="[font-family:var(--font-body)] text-base text-black mt-1 font-normal">
                    {category}
                  </p>
                </div>
                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {labels.estimatedMeters}
                  </p>
                  <p className="[font-family:var(--font-body)] text-base text-black mt-1 font-normal">
                    {design.estimatedMeters}m
                  </p>
                </div>
                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {labels.estimatedDays}
                  </p>
                  <p className="[font-family:var(--font-body)] text-base text-black mt-1 font-normal">
                    {design.estimatedDays} {labels.days}
                  </p>
                </div>
                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                    {labels.city}
                  </p>
                  <p className="[font-family:var(--font-body)] text-base text-black mt-1 font-normal">
                    {design.tailorShop.city || "—"}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="rounded-sm border border-(--color-border) bg-[#FAFAF8] p-4 sm:p-5 space-y-3"
              >
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                  {labels.tailorTitle}
                </p>
                <div>
                  <p className="[font-family:var(--font-display)] text-lg text-black font-normal">
                    {tailorShopName}
                  </p>
                  <p className="[font-family:var(--font-body)] text-sm text-(--color-grey-muted) mt-1">
                    {labels.partnerNote}
                  </p>
                </div>
                <div>
                  <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted) mb-1">
                    {labels.addressLabel}
                  </p>
                  <p className="[font-family:var(--font-body)] text-sm text-black leading-relaxed font-normal">
                    {tailorShopAddress}
                  </p>
                  {design.tailorShop.phone?.trim() && (
                    <p className="[font-family:var(--font-body)] text-sm text-(--color-grey-muted) mt-1 font-normal">
                      {design.tailorShop.phone}
                    </p>
                  )}
                </div>
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
                  className="block w-full py-3 sm:py-4 px-4 sm:px-6 bg-black text-white text-center text-xs sm:text-sm tracking-[0.2em] sm:tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition-colors"
                >
                  {labels.selectForCustomOrder}
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
