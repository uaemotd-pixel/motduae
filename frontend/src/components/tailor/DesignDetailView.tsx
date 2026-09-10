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
import { useMeasurementUnit } from "@/hooks/useMeasurementUnit";
import { useWishlist } from "@/context/WishlistContext";
import { useCustomOrder } from "@/context/CustomOrderContext";
import { buildCustomOrderHrefFromDesign } from "@/lib/customOrder";
import { Share2, ArrowUpRight, Heart } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  "hand-embroidered": "#8B6B4D",
  "crystal-embellished": "#1A2A3A",
  "non-crystal": "#5A6B5A",
  talli: "#B8860B",
  khous: "#4A3A2A",
  beaded: "#6B2A5A",
};

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
  minCutId?: string;
  minCutSnapshot?: {
    name: string;
    nameAr?: string;
    lengthInMeters: number;
  };
  minCut?: {
    name: string;
    nameAr?: string;
    lengthInMeters: number;
  };
  estimatedMeters: number;
  estimatedDays: number;
  minAge?: number;
  maxAge?: number;
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
    ageRange: string;
    years: string;
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
  const { unit, formatLength } = useMeasurementUnit();
  const { selectSingleDesign, setFirstStep } = useCustomOrder();
  const { name, description, category } = getDesignDisplayFields(
    design,
    locale,
  );
  const {
    wishItems,
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
  } = useWishlist();

  const liked = wishItems.some((item) => item.id === design._id);
  const toggleWishlist = () => {
    if (liked) {
      removeFromWishlist(design._id);
    } else {
      addToWishlist({
        id: design._id,
        slug: design.slug,
        name,
        image: resolveDesignImage(design.images?.[0]),
        price: design.basePrice,
        size: String(design.estimatedMeters ?? ""),
        maxStock: 1,
        type: "design",
      });
    }
  };

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

  const categoryValue = String(category || "").trim();
  const metersValue = design.minCutSnapshot?.name
    ? `${
        locale === "ar"
          ? design.minCutSnapshot.nameAr || design.minCutSnapshot.name
          : design.minCutSnapshot.name
      } (${formatLength(design.minCutSnapshot.lengthInMeters)})`
    : design.estimatedMeters != null
      ? formatLength(design.estimatedMeters)
      : "";
  const daysValue =
    design.estimatedDays != null && Number(design.estimatedDays) >= 0
      ? `${design.estimatedDays} ${labels.days}`
      : "";
  const ageValue =
    design.minAge != null || design.maxAge != null
      ? `${Number(design.minAge) || 0}–${Number(design.maxAge) || 0} ${labels.years}`
      : "";

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

  const customOrderHref = buildCustomOrderHrefFromDesign(
    design.slug,
    design.tailorShop.slug,
  );

  const handleSelectForCustomOrder = () => {
    selectSingleDesign({
      _id: design._id,
      slug: design.slug,
      name: design.name,
      nameAr: design.nameAr,
      category: design.category,
      basePrice: design.basePrice,
      priceType: design.priceType,
      tailoringFee: design.tailoringFee,
      estimatedMeters: design.estimatedMeters,
      estimatedDays: design.estimatedDays,
      image: resolveDesignImage(design.images?.[0]),
      tailor: {
        _id: design.tailorShop._id,
        slug: design.tailorShop.slug,
        name: design.tailorShop.name,
        nameAr: design.tailorShop.nameAr,
        logo: design.tailorShop.logo,
        coverImage: design.tailorShop.coverImage,
        city: design.tailorShop.city,
        location: design.tailorShop.location,
      },
    });
    setFirstStep("tailor");
  };

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
    <div
      ref={containerRef}
      className="bg-(--bg-page) min-h-screen pt-16 sm:pt-20 pb-10 sm:pb-12"
    >
      <ImageModal
        isOpen={imageModalOpen}
        imageUrl={selectedImage}
        alt={name}
        onClose={() => setImageModalOpen(false)}
      />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4 flex min-w-0 items-center gap-2 text-[9px] uppercase tracking-[0.16em] text-(--color-grey-muted) sm:mb-6 sm:text-[10px] sm:tracking-[0.2em]"
        >
          <Link
            href="/designs/designShop"
            className="shrink-0 transition hover:text-black"
          >
            {labels.designs}
          </Link>
          <span className="shrink-0" aria-hidden>
            /
          </span>
          <span className="min-w-0 truncate text-black">{category}</span>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Left Column */}
          <div className="relative min-w-0">
            <motion.div
              ref={leftRef}
              style={
                stickySide === "left"
                  ? { scale: imageScale, opacity: imageOpacity }
                  : {}
              }
              className={`${getStickyClass()} space-y-3 sm:space-y-4`}
            >
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="group relative w-full overflow-hidden rounded-md bg-[#F5F5F0] sm:rounded-lg"
              >
                <button
                  type="button"
                  aria-label={isAr ? "مشاركة" : "Share"}
                  onClick={handleShare}
                  className="absolute top-2.5 inset-e-2.5 z-20 inline-flex size-9 items-center justify-center rounded-full border-0 bg-white/90 text-black shadow-sm backdrop-blur-sm transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:top-3 sm:inset-e-3 sm:size-10"
                >
                  <Share2
                    className="size-4 sm:size-4.5"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </button>

                <div className="relative w-full touch-pan-y">
                  <ZoomImageEffect
                    src={images[activeImage]}
                    alt={name}
                    className="block h-auto w-full object-contain object-center"
                    lensSize={185}
                    zoomLevel={4.5}
                  />
                </div>
              </motion.div>

              {images.length > 1 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                  className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin"
                >
                  {images.map((image, index) => (
                    <button
                      key={`${design._id}-image-${index}`}
                      type="button"
                      aria-label={`${isAr ? "صورة" : "Image"} ${index + 1}`}
                      aria-pressed={index === activeImage}
                      onClick={() => setActiveImage(index)}
                      className={`size-14 shrink-0 overflow-hidden border-2 transition sm:size-16 ${
                        index === activeImage
                          ? "border-black"
                          : "border-(--color-border)"
                      }`}
                    >
                      <img
                        src={image}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="relative min-w-0">
            <motion.div
              ref={rightRef}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`${getStickyClass()} space-y-4 sm:space-y-6`}
            >
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span
                  className="inline-block max-w-full truncate px-2 py-1 text-[9px] uppercase tracking-[0.18em] text-white sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.25em]"
                  style={{
                    backgroundColor:
                      CATEGORY_COLORS[design.category] || "#000000",
                  }}
                >
                  {category}
                </span>
                <span
                  className={`inline-block max-w-full truncate border px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] sm:px-2.5 sm:py-1.5 sm:text-[10px] sm:tracking-[0.25em] ${
                    design.priceType === "per_meter"
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-gray-200 bg-gray-50 text-gray-800"
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
                <div className="mb-2 flex items-start justify-between gap-3 sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <h1 className="[font-family:var(--font-display)] text-[26px] leading-[1.15] font-normal text-black sm:text-3xl md:text-4xl">
                      {name}
                    </h1>
                    {tailorShopName && design.tailorShop?.slug ? (
                      <Link
                        href={`/tailors/${design.tailorShop.slug}`}
                        className="group mt-2 inline-flex max-w-full items-center gap-1 [font-family:var(--font-body)] text-[13px] text-(--color-grey-muted) transition-colors hover:text-black sm:mt-2.5 sm:gap-1.5 sm:text-sm"
                      >
                        <span className="min-w-0 truncate border-b border-transparent transition-colors group-hover:border-black/40">
                          {tailorShopName}
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          strokeWidth={1.75}
                          className="size-3.5 shrink-0 opacity-70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 rtl:group-hover:-translate-x-0.5"
                        />
                      </Link>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={toggleWishlist}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full transition-colors duration-200 hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 sm:size-10"
                    aria-label={
                      liked
                        ? isAr
                          ? "إزالة من المفضلة"
                          : "Remove from wishlist"
                        : isAr
                          ? "إضافة إلى المفضلة"
                          : "Add to wishlist"
                    }
                    aria-pressed={liked}
                  >
                    <Heart
                      aria-hidden
                      strokeWidth={1.5}
                      className={`size-4.5 transition-colors sm:size-5 ${
                        liked
                          ? "fill-red-500 stroke-red-500"
                          : "fill-none stroke-black"
                      }`}
                    />
                  </button>
                </div>
                <p className="[font-family:var(--font-ui)] text-xl text-black sm:text-2xl">
                  {formatDesignBasePrice(
                    design.basePrice,
                    locale,
                    design.priceType,
                    unit,
                  )}
                </p>
              </motion.div>

              {(categoryValue || metersValue) && (
                <div className="flex flex-row gap-x-6 my-2">
                  {categoryValue && (
                    <div className="min-w-0 flex-1">
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block">
                        {labels.category}
                      </span>
                      <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                        {categoryValue}
                      </p>
                    </div>
                  )}
                  {metersValue && (
                    <div className="min-w-0 flex-1">
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block">
                        {labels.estimatedMeters}
                      </span>
                      <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                        {metersValue}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {(daysValue || ageValue) && (
                <div className="grid grid-cols-2 gap-x-6 my-2">
                  {daysValue && (
                    <div>
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                        {labels.estimatedDays}
                      </span>
                      <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                        {daysValue}
                      </p>
                    </div>
                  )}
                  {ageValue && (
                    <div>
                      <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-1">
                        {labels.ageRange}
                      </span>
                      <p className="[font-family:var(--font-body)] text-[14px] xs:text-[15px] sm:text-[16px] text-black">
                        {ageValue}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {description && (
                <div className="my-6">
                  <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[11px] uppercase tracking-[0.24em] text-(--color-grey-muted) block mb-2">
                    {isAr ? "الوصف" : "Description"}
                  </span>
                  <p className="[font-family:var(--font-body)] text-[14px] text-justify xs:text-[15px] sm:text-[16px] leading-relaxed text-(--color-grey-muted)">
                    {description}
                  </p>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="sticky bottom-0 z-20 -mx-4 border-t border-(--color-border) bg-(--bg-page)/95 px-4 py-3 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none"
              >
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
                  <Link
                    href={customOrderHref}
                    onClick={handleSelectForCustomOrder}
                    className="block w-full bg-black px-4 py-3.5 text-center text-[11px] uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#1A1A1A] sm:px-6 sm:py-4 sm:text-sm sm:tracking-[0.22em]"
                  >
                    {labels.selectForCustomOrder}
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
