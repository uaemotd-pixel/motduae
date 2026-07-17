"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link } from "@/i18n/navigation";
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
import InnerImageZoom from "react-inner-image-zoom";
import "react-inner-image-zoom/lib/styles.min.css";
import { COLOR_OPTIONS } from "@/lib/createFabricAdmin";

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
                <InnerImageZoom
                  src={images[activeImage]}
                  zoomScale={1.5}
                  className="w-full h-full object-cover"
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
                <h1 className="[font-family:var(--font-display)] text-3xl sm:text-4xl text-black leading-tight mb-3">
                  {title}
                </h1>
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
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
