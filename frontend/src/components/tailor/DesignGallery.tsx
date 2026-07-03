"use client";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import {
  type TailorDesignListItem,
  buildCustomOrderDesignHref,
  formatDesignBasePrice,
  getDesignDisplayFields,
  resolveDesignImage,
} from "@/lib/tailors";

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
  };
};

export default function DesignGallery({
  tailorSlug,
  designs,
  locale,
  labels,
}: DesignGalleryProps) {
  if (designs.length === 0) {
    return (
      <div className="text-center py-16 border border-(--color-border) bg-[#FDFAF5]">
        <p className="[font-family:var(--font-ui)] text-sm uppercase tracking-[0.2em] text-(--color-grey-muted)">
          {labels.empty}
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="[font-family:var(--font-display)] text-[28px] sm:text-[32px] font-normal tracking-[-0.01em] text-black mb-8">
        {labels.title}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {designs.map((design) => {
          const { name, description, category } = getDesignDisplayFields(
            design,
            locale,
          );
          const imageUrl = resolveDesignImage(design.images?.[0]);
          const orderHref = buildCustomOrderDesignHref(tailorSlug, design.slug);

          return (
            <Link
              key={design._id}
              href={orderHref}
              className="group block bg-white border border-[#E4E0D8] overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 hover:cursor-pointer text-left"
            >
              <div className="aspect-4/5 relative overflow-hidden bg-[#F0EBE3]">
                <img
                  src={imageUrl}
                  alt={name}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="absolute top-3 left-3">
                  <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[12px] uppercase tracking-[0.24em] bg-[#8B6F47] text-white px-2.5 xs:px-3 py-1 xs:py-1.25 font-bold">
                    {category}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="[font-family:var(--font-display)] text-[18px] font-normal leading-[1.2] text-black mb-2 line-clamp-2">
                  {name}
                </h3>
                <p className="[font-family:var(--font-body)] text-[13px] leading-relaxed text-[#7A7A72] mb-4 line-clamp-2">
                  {description}
                </p>

                <div className="flex items-center justify-between text-[10px] tracking-[0.16em] uppercase text-[#7A7A72] [font-family:var(--font-ui)]">
                  <span>
                    {labels.fromPrice}{" "}
                    <span className="text-black font-medium">
                      {formatDesignBasePrice(design.basePrice, locale)}
                    </span>
                  </span>
                  <span>
                    {labels.estimatedDays}: {design.estimatedDays} {labels.days}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
