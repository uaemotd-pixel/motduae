import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function HeroSection() {
  const t = await getTranslations("HeroSection");

  return (
    <section className="relative min-h-[fit] xs:min-h-[85vh] sm:min-h-[90vh] flex flex-col justify-end bg-(--color-near-black) overflow-hidden pt-16 xs:pt-20 sm:pt-24 md:pt-28 lg:pt-0 mb-12 xs:mb-16 sm:mb-20 md:mb-24 lg:mb-32">
      <img
        src="/images/hero-1.png"
        alt={t("imageAlt")}
        className="absolute inset-0 w-full h-full object-cover opacity-30"
      />

      <div className="relative z-10 border-white/10 px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) pt-6 xs:pt-8 sm:pt-10 pb-8 xs:pb-10 sm:pb-12 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 xs:gap-8 sm:gap-10">
        <div className="max-w-140 w-full lg:w-auto">
          {/* Eyebrow */}
          <span className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[9px] lg:text-[9px] xl:text-[10px] uppercase tracking-[0.28em] text-white/60 mb-3 xs:mb-4 flex items-center gap-3 hero-eyebrow">
            <span className="block w-4 xs:w-5 h-px bg-white/40"></span>
            <span>{t("eyebrow")}</span>
          </span>

          {/* Title */}
          <h1 className="[font-family:var(--font-display)] text-[32px] xs:text-[40px] sm:text-[44px] md:text-[48px] lg:text-[52px] xl:text-[56px] 2xl:text-[64px] 3xl:text-[72px] font-normal leading-[1.1] xs:leading-[1.08] sm:leading-[1.06] md:leading-[1.05] tracking-[-0.01em] text-white mb-4 xs:mb-5 hero-title">
            <span className="lg:whitespace-nowrap">{t("headlineLine1")} </span>
            <br />
            <em className="italic lg:whitespace-nowrap">{t("headlineLine2")}</em>
          </h1>

          {/* Description */}
          <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] text-white/60 leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] max-w-100 w-full mb-6 xs:mb-8 hero-description">
            {t("body")}
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap gap-2 xs:gap-3">
            <Link
              href="/#fabrics"
              className="[font-family:var(--font-body)] text-[12px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[11px] xl:text-[12px] uppercase tracking-[0.24em] bg-white text-black px-5 xs:px-6 sm:px-7 py-2.5 xs:py-[12px] sm:py-3.25 hover:opacity-80 transition-opacity duration-150 hero-btn-shop"
            >
              {t("ctaShopNow")}
            </Link>
            <Link
              href="/#tailors"
              className="[font-family:var(--font-body)] text-[12px] xs:text-[11px] sm:text-[12px] md:text-[11px] lg:text-[11px] xl:text-[12px] uppercase tracking-[0.24em] bg-transparent text-white border border-white/40 px-5 xs:px-6 sm:px-7 py-2.5 xs:py-[12px] sm:py-3.25 hover:bg-white hover:text-black transition-all duration-150 hero-btn-tailors"
            >
              {t("ctaMeetTailors")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}