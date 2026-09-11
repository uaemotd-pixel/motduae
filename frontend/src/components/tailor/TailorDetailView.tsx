"use client";

import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { motion } from "framer-motion";
import {
  MapPin,
  Phone,
  Star,
  ArrowUpRight,
  Globe,
  ExternalLink,
} from "lucide-react";
import DesignGallery from "@/components/tailor/DesignGallery";
import SocialPlatformIcon, {
  SOCIAL_PLATFORM_LINK_CLASS,
} from "@/components/shared/SocialPlatformIcon";
import {
  type TailorDesignListItem,
  type TailorShopDetailItem,
  formatTailorRating,
  getTailorDisplayFields,
  resolveTailorImage,
} from "@/lib/tailors";
import { getSocialPlatform } from "@/lib/tailorShop";
import { resolveMediaUrl } from "@/lib/media";
import { formatPartnerExperience } from "@/lib/partnerExperience";
import FavouriteShopButton from "@/components/shared/FavouriteShopButton";

const SOCIAL_LINK_BASE_CLASS =
  "inline-flex size-11 items-center justify-center rounded-full border bg-white transition-all duration-300";

type SocialLink = { name: string; url: string };

type TailorDetailViewProps = {
  shop: TailorShopDetailItem;
  designs: TailorDesignListItem[];
  locale: Locale;
  labels: {
    tailors: string;
    reviews: string;
    designsTitle: string;
    designsEmpty: string;
    fromPrice: string;
    estimatedDays: string;
    days: string;
    startOrder: string;
    aboutTitle: string;
    designsCount: string;
    callShop: string;
    viewDesigns: string;
    connectTitle: string;
    website: string;
    experienceTitle: string;
    experienceYear: string;
    experienceYears: string;
    experienceMonth: string;
    experienceMonths: string;
  };
};

function ensureHttpUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function TailorDetailView({
  shop,
  designs,
  locale,
  labels,
}: TailorDetailViewProps) {
  const { name, description, location, badge } = getTailorDisplayFields(
    shop,
    locale,
  );
  const coverImage = resolveTailorImage(shop.logo, shop.coverImage);
  const logoImage = resolveMediaUrl(shop.logo?.trim() || "") || coverImage;
  const rating = formatTailorRating(shop.rating);
  const reviewCount = shop.reviewCount ?? 0;

  const websiteUrl = ensureHttpUrl(shop.website || "");
  const socialLinks: SocialLink[] = (shop.social || [])
    .map((link) => ({
      name: String(link.name || "").trim(),
      url: ensureHttpUrl(String(link.url || "")),
    }))
    .filter((link) => link.name && link.url);

  const hasConnect = Boolean(websiteUrl || socialLinks.length);
  const experienceLabel = formatPartnerExperience(shop.experience, {
    year: labels.experienceYear,
    years: labels.experienceYears,
    month: labels.experienceMonth,
    months: labels.experienceMonths,
  });

  return (
    <div className="min-h-screen bg-(--bg-page)">
      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={coverImage}
            alt=""
            aria-hidden
            className="h-full w-full scale-105 object-cover object-top"
          />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/55 to-black/25" />
          <div className="absolute inset-0 bg-linear-to-r from-black/50 via-transparent to-transparent" />
        </div>

        <div className="relative mx-auto flex min-h-[72vh] w-full max-w-7xl flex-col justify-between px-4 pt-20 pb-10 xs:px-6 sm:min-h-[78vh] sm:px-8 sm:pt-24 sm:pb-14 md:px-12 lg:px-(--space-40)">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex min-w-0 items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-white/65 sm:text-[10px] sm:tracking-[0.22em]"
          >
            <Link
              href="/tailors"
              className="shrink-0 transition hover:text-white"
            >
              {labels.tailors}
            </Link>
            <span className="shrink-0" aria-hidden>
              /
            </span>
            <span className="min-w-0 truncate text-white">{name}</span>
          </motion.div>

          <div className="mt-auto grid grid-cols-1 items-end gap-8 lg:grid-cols-[auto_1fr] lg:gap-10">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="mx-auto aspect-4/5 w-28 shrink-0 overflow-hidden border border-white/25 bg-[#F5F5F0] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.65)] xs:w-32 sm:mx-0 sm:w-40 lg:w-44"
            >
              <img
                src={logoImage}
                alt={name}
                className="h-full w-full object-cover object-top"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.15 }}
              className="min-w-0 text-center sm:text-start"
            >
              {badge ? (
                <span className="mb-3 inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.28em] text-white/70 [font-family:var(--font-ui)] sm:text-[10px]">
                  <span className="hidden h-px w-5 bg-white/40 sm:block" />
                  {badge}
                </span>
              ) : null}

              <h1 className="[font-family:var(--font-display)] text-[34px] leading-[1.05] tracking-[-0.02em] text-white xs:text-[40px] sm:text-[48px] md:text-[56px]">
                {name}
              </h1>

              {location ? (
                <p className="mt-3 inline-flex max-w-full items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-white/75 [font-family:var(--font-ui)] sm:justify-start sm:text-[12px] sm:tracking-[0.24em]">
                  <MapPin
                    className="size-3.5 shrink-0 opacity-80"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <span className="min-w-0 truncate">{location}</span>
                </p>
              ) : null}

              {experienceLabel ? (
                <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-white/75 [font-family:var(--font-ui)] sm:text-[12px]">
                  <span className="text-white/55">{labels.experienceTitle}: </span>
                  {experienceLabel}
                </p>
              ) : null}

              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-start sm:gap-x-5">
                <a
                  href="#reviews"
                  className="inline-flex items-center gap-1.5 transition hover:opacity-80"
                >
                  <Star
                    className="size-3.5 fill-[#d4af37] stroke-[#d4af37]"
                    aria-hidden
                  />
                  <span className="text-[12px] tracking-[0.14em] text-white [font-family:var(--font-ui)]">
                    {rating}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-white/55 [font-family:var(--font-ui)]">
                    ({reviewCount} {labels.reviews})
                  </span>
                </a>
                <span
                  className="hidden h-3 w-px bg-white/25 sm:block"
                  aria-hidden
                />
                <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 [font-family:var(--font-ui)]">
                  {labels.designsCount}
                </span>
              </div>

              <div className="mt-7 flex flex-col items-stretch gap-2.5 xs:flex-row xs:flex-wrap xs:items-center xs:justify-center sm:justify-start">
                <a
                  href="#designs"
                  className="inline-flex items-center justify-center gap-2 bg-white px-5 py-3.5 text-[10px] uppercase tracking-[0.2em] text-black transition hover:bg-white/90 [font-family:var(--font-ui)] sm:px-6"
                >
                  {labels.viewDesigns}
                  <ArrowUpRight
                    className="size-3.5 shrink-0"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </a>
                {shop.phone ? (
                  <a
                    href={`tel:${shop.phone}`}
                    className="inline-flex items-center justify-center gap-2 border border-white/35 bg-white/5 px-5 py-3.5 text-[10px] uppercase tracking-[0.2em] text-white backdrop-blur-sm transition hover:bg-white/15 [font-family:var(--font-ui)] sm:px-6"
                  >
                    <Phone
                      className="size-3.5 shrink-0"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {labels.callShop}
                  </a>
                ) : null}
                <FavouriteShopButton
                  type="tailor"
                  shopId={String(shop._id)}
                  variant="onDark"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* About + social / portfolio */}
      {(description || hasConnect) && (
        <section className="border-b border-(--color-border) bg-(--bg-page)">
          <div
            className={`text-justify mx-auto grid max-w-7xl gap-8 px-4 py-10 xs:px-6 sm:gap-10 sm:px-8 sm:py-14 md:px-12 lg:px-(--space-40) ${
              description && hasConnect ? "lg:grid-cols-[1fr_280px]" : ""
            }`}
          >
            {description ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45 }}
                className="min-w-0"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="block h-px w-5 bg-black/35" />
                  <h2 className="text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) [font-family:var(--font-ui)]">
                    {labels.aboutTitle}
                  </h2>
                </div>
                <p className="max-w-3xl text-pretty text-[14px] leading-relaxed text-(--color-grey-muted) [font-family:var(--font-body)] sm:text-[15px] sm:leading-[1.7]">
                  {description}
                </p>
              </motion.div>
            ) : null}

            {hasConnect ? (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.45, delay: 0.05 }}
                className="border border-(--color-border) bg-[#FAFAF7] px-5 py-5 sm:px-6"
              >
                <p className="mb-4 text-[10px] uppercase tracking-[0.22em] text-(--color-grey-muted) [font-family:var(--font-ui)]">
                  {labels.connectTitle}
                </p>
                <div className="flex flex-wrap gap-3">
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={labels.website}
                      title={labels.website}
                      className={`${SOCIAL_LINK_BASE_CLASS} border-(--color-border) text-black hover:border-black hover:bg-black hover:text-white`}
                    >
                      <Globe
                        className="size-4.5"
                        strokeWidth={1.75}
                        aria-hidden
                      />
                    </a>
                  ) : null}
                  {socialLinks.map((link) => {
                    const platform = getSocialPlatform(link.name);
                    const brandClass = platform
                      ? SOCIAL_PLATFORM_LINK_CLASS[platform.value]
                      : "border-(--color-border) text-black hover:border-black hover:bg-black hover:text-white";

                    return (
                      <a
                        key={`${link.name}-${link.url}`}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={link.name}
                        title={link.name}
                        className={`${SOCIAL_LINK_BASE_CLASS} ${brandClass}`}
                      >
                        {platform ? (
                          <SocialPlatformIcon platform={platform.value} />
                        ) : (
                          <ExternalLink
                            className="size-4.5"
                            strokeWidth={1.75}
                            aria-hidden
                          />
                        )}
                      </a>
                    );
                  })}
                </div>
              </motion.div>
            ) : null}
          </div>
        </section>
      )}

      {/* Designs */}
      <section
        id="designs"
        className="scroll-mt-24 bg-(--bg-page) px-4 py-12 xs:px-6 sm:px-8 sm:py-16 md:px-12 lg:px-(--space-40)"
      >
        <div className="mx-auto max-w-7xl">
          <DesignGallery
            tailorSlug={shop.slug}
            designs={designs}
            locale={locale}
            labels={{
              title: labels.designsTitle,
              empty: labels.designsEmpty,
              fromPrice: labels.fromPrice,
              estimatedDays: labels.estimatedDays,
              days: labels.days,
              startOrder: labels.startOrder,
              countLabel: labels.designsCount,
            }}
          />
        </div>
      </section>
    </div>
  );
}
