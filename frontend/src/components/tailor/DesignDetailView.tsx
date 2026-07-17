"use client";

import { useCallback, useState } from "react";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  resolveDesignImage,
  getDesignDisplayFields,
  formatDesignBasePrice,
} from "@/lib/tailors";

import { Share2 } from "lucide-react";

import InnerImageZoom from "react-inner-image-zoom";
import "react-inner-image-zoom/lib/styles.min.css";

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

  return (
    <div className="bg-(--bg-page) min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-(--color-grey-muted) mb-6">
          <Link href="/tailors" className="hover:text-black transition">
            {labels.designs}
          </Link>
          <span>/</span>
          <span className="text-black">{category}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Design Image(s) */}

          <div className="space-y-4">
            <div className="w-full relative overflow-hidden bg-[#F5F5F0] rounded-lg group">
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
                className="w-full h-auto"
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
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
              </div>
            )}
          </div>

          {/* Right Column - Text & Attribution & CTA */}
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="inline-block text-white text-[10px] uppercase tracking-[0.25em] px-2.5 py-1.5 bg-[#8B6F47] rounded-none">
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

            <div>
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
            </div>

            {description && (
              <p className="[font-family:var(--font-body)] text-sm sm:text-base text-(--color-grey-muted) leading-relaxed">
                {description}
              </p>
            )}

            <div className="grid grid-cols-2 gap-4 py-5 border-y border-(--color-border)">
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
            </div>

            {/* Tailor Attribution */}
            <div className="rounded-sm border border-(--color-border) bg-[#FAFAF8] p-4 sm:p-5 space-y-3">
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
            </div>

            <Link
              href={customOrderHref}
              className="block w-full py-4 bg-black text-white text-center text-sm tracking-[0.22em] uppercase hover:bg-[#1A1A1A] transition-colors"
            >
              {labels.selectForCustomOrder}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
