"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { X, ZoomIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { customOrderMeasurementGuide } from "../../../../public/images/ImageIndex";

const MEASUREMENT_GUIDE_SRC = customOrderMeasurementGuide.src;

type MeasurementGuideImageProps = {
  cropClassName?: string;
  imageClassName?: string;
  alt?: string;
  zoom?: {
    scale: number;
    originX: string;
    originY: string;
  };
};

export default function MeasurementGuideImage({
  cropClassName = "aspect-square w-full",
  imageClassName = "object-contain p-2",
  alt = "Measurement guide",
  zoom,
}: MeasurementGuideImageProps) {
  const t = useTranslations("CustomOrderMeasurements");
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const closeLightbox = useCallback(() => {
    setLightboxOpen(false);
  }, []);

  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLightbox();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeLightbox, lightboxOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        aria-label={t("clickToZoom")}
        className={`group relative block overflow-hidden rounded-2xl border border-(--color-border) bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] cursor-zoom-in transition hover:border-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30 ${cropClassName}`}
      >
        <div
          className="absolute inset-0"
          style={
            zoom
              ? {
                  transform: `scale(${zoom.scale})`,
                  transformOrigin: `${zoom.originX} ${zoom.originY}`,
                }
              : undefined
          }
        >
          <Image
            src={customOrderMeasurementGuide}
            alt={alt}
            fill
            sizes="(max-width: 768px) 90vw, 560px"
            className={imageClassName}
            priority={false}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 pointer-events-none bg-linear-to-t from-black/55 to-transparent pt-10 pb-3 px-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-[9px] uppercase tracking-[0.18em] text-black shadow-sm">
            <ZoomIn className="h-3.5 w-3.5" aria-hidden />
            {t("clickToZoom")}
          </span>
        </div>
      </button>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={t("diagramGuide")}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80"
            onClick={closeLightbox}
            aria-label={t("closeZoom")}
          />

          <div className="relative z-10 flex w-full max-w-6xl max-h-[92vh] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-(--color-border) px-4 py-3 sm:px-6">
              <div>
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted)">
                  {t("diagramGuide")}
                </p>
                <p className="[font-family:var(--font-body)] mt-1 text-[13px] text-(--color-grey-muted)">
                  {t("zoomHint")}
                </p>
              </div>
              <button
                type="button"
                onClick={closeLightbox}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--color-border) text-black transition hover:bg-black hover:text-white"
                aria-label={t("closeZoom")}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="overflow-auto p-4 sm:p-6">
              <div className="mx-auto max-w-4xl flex items-center justify-center">
                <Image
                  src={customOrderMeasurementGuide}
                  alt={alt}
                  className="w-full h-auto max-h-[70vh] object-contain"
                  sizes="(max-width: 1200px) 90vw, 1200px"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
