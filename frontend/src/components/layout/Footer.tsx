"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import Image from "next/image";
import * as images from '../../../public/images/ImageIndex';

const QUICK_LINKS = [
  { key: "home", href: "/" },
  { key: "exploreFabrics", href: "/#fabrics" },
  { key: "tailors", href: "/#tailors" },
  { key: "customDesign", href: "/#custom-clothing" },
  { key: "aboutUs", href: "/#about" },
  { key: "contact", href: "/#contact" },
] as const;

const CUSTOMER_LINKS = [
  { key: "trackOrder", href: "/account/userAccount?tab=orders" },
  { key: "shippingPolicy", href: "/shipping" },
  { key: "returnsRefunds", href: "/returns" },
  { key: "measurementGuide", href: "/#how-it-works" },
  { key: "faqs", href: "/faq" },
  { key: "supportCenter", href: "/support" },
] as const;

const BUSINESS_LINKS = [
  { key: "becomeTailor", href: "/partners/tailor" },
  { key: "fabricVendor", href: "/partners/fabric" },
  { key: "shippingPartner", href: "/partners/shipping" },
  { key: "vendorDashboard", href: "/vendor" },
  { key: "partnerships", href: "/partners" },
] as const;

const POLICY_LINKS = [
  { key: "privacy", href: "/privacy" },
  { key: "terms", href: "/terms" },
  { key: "cookies", href: "/cookies" },
] as const;

const columnHeadingClass =
  "[font-family:var(--font-ui)] text-[14px] xs:text-[12px] sm:text-[13px] md:text-[14px] lg:text-[15px] xl:text-[16px] uppercase tracking-[0.32em] text-white/80 font-normal py-[15px] xs:py-[20px] sm:py-[25px] md:py-[30px] lg:py-[30px]";

const columnLinkClass =
  "[font-family:var(--font-body)] text-[15px] xs:text-[13px] sm:text-[14px] md:text-[15px] lg:text-[16px] text-white hover:text-white/60 transition-colors duration-300";

export function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="w-full bg-black/90 border-t border-white/10 py-12 xs:py-16 sm:py-20 md:py-24 lg:py-(--space-80)">
      {/* Main Footer */}
      <div className="w-full px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) mx-auto grid grid-cols-1 md:grid-cols-12 gap-y-10 xs:gap-y-12 sm:gap-y-14 md:gap-y-16 lg:gap-y-(--space-64) gap-x-6 md:gap-x-8 lg:gap-x-(--space-48)">
        {/* Brand Column */}
        <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-5 xs:gap-6 sm:gap-7 md:gap-8 lg:gap-(--space-32)">
          <div className="p-7.5">
            <Link href="/" className="inline-block">
              <img
                src="/PNG/White/MOTD_Wordmark_White.png"
                alt={t("logoAlt")}
                className="w-35 xs:w-[160px] sm:w-45 md:w-50 lg:w-55 object-contain brightness-0 invert"
              />
            </Link>
          </div>

          <p className="[font-family:var(--font-display)] text-[24px] xs:text-[24px] sm:text-[26px] md:text-[28px] lg:text-[32px] xl:text-[36px] leading-tight xs:leading-[1.28] sm:leading-[1.3] tracking-[-0.02em] text-white font-normal max-w-105">
            {t("tagline")}
          </p>

          <p className="[font-family:var(--font-body)] text-[14px] xs:text-[13px] sm:text-[14px] md:text-[15px] lg:text-[16px] xl:text-[17px] leading-[1.6] xs:leading-[1.7] sm:leading-[1.8] md:leading-[1.9] text-white/60 max-w-105 font-normal">
            {t("description")}
          </p>

          {/* Social Icons */}
          <div className="flex gap-3 pt-2">
            {/* YouTube */}
            <a
              href="https://www.YouTube.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-[#FF0000] hover:bg-[#FF0000] transition-all duration-300 group"
              aria-label="YouTube"
            >
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
                <path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-white/40 transition-all duration-300 group"
              aria-label="Instagram"
            >
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zM12 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-[#1877F2] hover:bg-[#1877F2] transition-all duration-300 group"
              aria-label="Facebook"
            >
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </a>

            {/* Twitter/X */}
            <a
              href="https://x.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-black hover:bg-black transition-all duration-300 group"
              aria-label="Twitter"
            >
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>

            {/* Pinterest */}
            <a
              href="https://www.pinterest.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/60 hover:text-white hover:border-[#E60023] hover:bg-[#E60023] transition-all duration-300 group"
              aria-label="Pinterest"
            >
              <svg className="w-4.5 h-4.5 fill-current" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.719-.359-1.781c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z" />
              </svg>
            </a>
          </div>
        </div>

        {/* Quick Links Column */}
        <div className="md:col-span-6 lg:col-span-2 flex flex-col gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-(--space-28)">
          <h3 className={columnHeadingClass}>{t("quickLinks")}</h3>
          <ul className="flex flex-col gap-4 xs:gap-3.5 sm:gap-4 md:gap-4.5 lg:gap-5 list-none m-0 p-0">
            {QUICK_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className={columnLinkClass}>
                  {t(`quickLinksList.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Customer Services Column */}
        <div className="md:col-span-6 lg:col-span-3 flex flex-col gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-(--space-28)">
          <h3 className={columnHeadingClass}>{t("services")}</h3>
          <ul className="flex flex-col gap-4 xs:gap-3.5 sm:gap-4 md:gap-4.5 lg:gap-5 list-none m-0 p-0">
            {CUSTOMER_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className={columnLinkClass}>
                  {t(`customerLinks.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Business Column */}
        <div className="md:col-span-12 lg:col-span-3 flex flex-col gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-(--space-28)">
          <h3 className={columnHeadingClass}>{t("business")}</h3>
          <ul className="flex flex-col gap-4 xs:gap-3.5 sm:gap-4 md:gap-4.5 lg:gap-5 list-none m-0 p-0">
            {BUSINESS_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link href={href} className={columnLinkClass}>
                  {t(`businessLinks.${key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="w-full px-4 xs:px-6 sm:px-8 md:px-12 lg:px-(--space-40) mx-auto mt-10 xs:mt-12 sm:mt-14 md:mt-16 lg:mt-(--space-80) pt-6 xs:pt-7 sm:pt-8 md:pt-9 lg:pt-(--space-32) border-t border-white/10 flex flex-col lg:flex-row justify-between items-center gap-4 xs:gap-5 lg:gap-6">
        {/* Copyright */}
        <div className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] uppercase tracking-[0.28em] text-white/40 text-center lg:text-left">
          {t("copyright")}
        </div>

        {/* Policies */}
        <div className="flex flex-wrap justify-center gap-4 xs:gap-5 sm:gap-6 md:gap-7 lg:gap-8">
          {POLICY_LINKS.map(({ key, href }) => (
            <Link
              key={key}
              href={href}
              className="[font-family:var(--font-ui)] text-[10px] xs:text-[9px] sm:text-[10px] md:text-[11px] lg:text-[12px] uppercase tracking-[0.18em] text-white/40 hover:text-white/70 transition-colors duration-300"
            >
              {t(`policies.${key}`)}
            </Link>
          ))}
        </div>

        {/* Payment Icons */}
        <div className="flex gap-3 xs:gap-3.5 sm:gap-4 text-white/40">
          <svg className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 10h18M6 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z" />
            <path d="M15 13a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
          </svg>
          <svg className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
            <line x1="1" y1="10" x2="23" y2="10" />
            <path d="M6 14h3" />
          </svg>
          <svg className="w-4 h-4 xs:w-4.5 xs:h-4.5 sm:w-5 sm:h-5 text-current" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            <path d="M9 11h.01" />
            <path d="M15 11h.01" />
          </svg>
        </div>
      </div>
    </footer>
  );
}