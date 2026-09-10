"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { motion } from "framer-motion";
import { Share2 } from "lucide-react";
import WishlistButton from "@/components/shared/wishlistButton";
import {
  type TailorDesignListItem,
  formatDesignBasePrice,
  getDesignDisplayFields,
  resolveDesignImage,
} from "@/lib/tailors";

const CATEGORY_COLORS: Record<string, string> = {
  "hand-embroidered": "#8B6B4D",
  "crystal-embellished": "#1A2A3A",
  "non-crystal": "#5A6B5A",
  talli: "#B8860B",
  khous: "#4A3A2A",
  beaded: "#6B2A5A",
};

type DesignGalleryProps = {
  tailorSlug: string;
  designs: TailorDesignListItem[];
  locale: Locale;
  labels: {
    title: string;
    empty: string;
    fromPrice: string;
    estimatedDays: string;
    days: string;
    startOrder: string;
    countLabel?: string;
  };
};

export default function DesignGallery({
  designs,
  locale,
  labels,
}: DesignGalleryProps) {
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
        text: locale === "ar" ? "اطلع على هذا التصميم" : "Check this design",
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

  if (designs.length === 0) {
    return (
      <div>
        <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
          <h2 className="[font-family:var(--font-display)] text-[26px] leading-tight tracking-[-0.01em] text-black sm:text-[32px]">
            {labels.title}
          </h2>
        </div>
        <div className="border border-(--color-border) bg-[#FAFAF7] px-6 py-14 text-center sm:py-16">
          <p className="text-[11px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)] sm:text-[12px]">
            {labels.empty}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {toastMessage && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-lg bg-black px-4 py-2.5 text-center text-xs tracking-wide text-white shadow-lg [font-family:var(--font-ui)] sm:text-sm">
          {toastMessage}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-2 xs:mb-8 sm:mb-10 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <span className="mb-2 flex items-center gap-2 text-[9px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:gap-3 xs:text-[10px]">
            <span className="block h-px w-4 bg-(--color-grey-muted) xs:w-5" />
            {labels.countLabel}
          </span>
          <h2 className="[font-family:var(--font-display)] text-[26px] leading-tight tracking-[-0.01em] text-black xs:text-[30px] sm:text-[36px]">
            {labels.title}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 xs:gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">
        {designs.map((design, idx) => {
          const { name, category } = getDesignDisplayFields(design, locale);
          const imageUrl = resolveDesignImage(design.images?.[0]);
          const categoryColor =
            CATEGORY_COLORS[String(design.category || "").toLowerCase()] ||
            "#1A1A1A";
          const hrefPath = `/designs/${design.slug}`;

          return (
            <motion.div
              key={design._id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                duration: 0.4,
                delay: Math.min(idx * 0.05, 0.25),
              }}
              className="group min-w-0"
            >
              <Link
                href={hrefPath}
                className="block h-full overflow-hidden rounded-md border border-(--color-border) bg-(--bg-page) transition-all duration-500 sm:rounded-lg md:hover:-translate-y-1 md:hover:shadow-xl"
              >
                <div className="relative aspect-4/5 overflow-hidden bg-[#F5F5F0]">
                  <img
                    src={imageUrl}
                    alt={name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition-transform duration-700 md:group-hover:scale-105"
                  />
                  {category ? (
                    <div
                      className="absolute top-1.5 inset-s-1.5 z-10 max-w-[calc(100%-4.25rem)] truncate px-1 py-px text-[7px] font-medium uppercase tracking-widest text-white [font-family:var(--font-ui)] xs:top-2 xs:inset-s-2 xs:max-w-[calc(100%-5rem)] xs:px-1.5 xs:text-[8px] xs:tracking-[0.12em] sm:max-w-[calc(100%-5.5rem)]"
                      style={{ backgroundColor: categoryColor }}
                    >
                      {category}
                    </div>
                  ) : null}
                  <div className="absolute top-1.5 inset-e-1.5 z-20 flex items-center gap-1 xs:top-2 xs:inset-e-2 xs:gap-1.5">
                    <button
                      type="button"
                      aria-label={locale === "ar" ? "مشاركة" : "Share"}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        await handleShare(hrefPath);
                      }}
                      className="inline-flex size-7 shrink-0 items-center justify-center rounded-full border-0 bg-white/90 shadow-sm backdrop-blur-sm transition-transform hover:cursor-pointer xs:size-8 sm:hover:scale-105"
                    >
                      <Share2
                        className="size-3 text-black xs:size-3.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </button>
                    <WishlistButton
                      item={{
                        id: design._id,
                        name,
                        image: imageUrl,
                        price: design.basePrice,
                        slug: design.slug,
                        size: "N/A",
                        quantity: 1,
                        type: "design",
                      }}
                      inline
                      className="size-7! p-0! inline-flex shrink-0 items-center justify-center rounded-full border-0 bg-white/90! shadow-sm backdrop-blur-sm xs:size-8!"
                      iconClassName="size-3! xs:size-3.5!"
                    />
                  </div>
                </div>

                <div className="p-2.5 xs:p-3 sm:p-4">
                  <h3 className="mb-1 line-clamp-2 text-[13px] leading-snug text-black [font-family:var(--font-display)] xs:mb-1.5 xs:text-sm sm:text-base">
                    {name}
                  </h3>
                  <p className="mb-0.5 text-[9px] uppercase tracking-[0.14em] text-(--color-grey-muted) [font-family:var(--font-ui)] xs:text-[10px] xs:tracking-[0.16em]">
                    {labels.fromPrice}{" "}
                    <span className="text-black">
                      {formatDesignBasePrice(
                        design.basePrice,
                        locale,
                        design.priceType,
                      )}
                    </span>
                  </p>
                  <p className="text-[10px] text-(--color-grey-muted) [font-family:var(--font-body)] xs:text-[11px]">
                    {labels.estimatedDays} {design.estimatedDays} {labels.days}
                  </p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
