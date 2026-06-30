"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  type FabricDetailItem,
  formatMaterialLabel,
  formatPricePerMeter,
  getFabricDisplayFields,
} from "@/lib/fabrics";
import StoreAttribution from "@/components/fabric/StoreAttribution";
import { resolveMediaUrl } from "@/lib/media";
import InnerImageZoom from "react-inner-image-zoom";
import "react-inner-image-zoom/lib/styles.min.css";

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
  const images = fabric.images?.length
    ? fabric.images.map(resolveMediaUrl)
    : [resolveMediaUrl(undefined)];
  const [activeImage, setActiveImage] = useState(0);

  const customOrderHref = `/custom-order/fabric?fabricSlug=${encodeURIComponent(fabric.slug)}`;

  return (
    <div className="bg-(--bg-page) min-h-screen pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-[10px] tracking-[0.2em] uppercase text-(--color-grey-muted) mb-6">
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square bg-[#F5F4F0] overflow-hidden rounded-sm">
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
                    key={`${fabric._id}-image-${index}`}
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

          <div className="space-y-6">
            {fabric.tag && (
              <span
                className={`inline-block text-white text-[10px] uppercase tracking-[0.2em] px-2 py-1 bg-black`}
              >
                {fabric.tag}
              </span>
            )}

            <div>
              <h1 className="[font-family:var(--font-display)] text-3xl sm:text-4xl text-black leading-tight mb-3">
                {title}
              </h1>
              <p className="[font-family:var(--font-ui)] text-2xl text-black">
                {formatPricePerMeter(fabric.pricePerMeter, locale)}
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
                  {labels.material}
                </p>
                <p className="[font-family:var(--font-body)] text-base text-black mt-1">
                  {formatMaterialLabel(fabric.material, locale)}
                </p>
              </div>
              <div>
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.2em] text-(--color-grey-muted)">
                  {labels.color}
                </p>
                <p className="[font-family:var(--font-body)] text-base text-black mt-1">
                  {Array.isArray(fabric.color) && fabric.color.length
                    ? fabric.color.join(", ")
                    : "—"}
                </p>
              </div>
            </div>

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
