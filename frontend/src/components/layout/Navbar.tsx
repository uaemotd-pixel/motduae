"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import { GlobalProgressBar } from "../shared/GlobalProgressBar";
import { useAuth } from "@/context/AuthContext";
import LocaleSwitcher from "../shared/LocaleSwitcher";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";

const NAV_LINKS = [
  { key: "designs", href: "/#designs" },
  { key: "fabrics", href: "/fabrics/fabricStore" },
  { key: "brands", href: "/tailors" },
  { key: "joinOurCommunity", href: "/#join-our-community" },
  { key: "motdGuide", href: "/motd-guide" },
  { key: "contactUs", href: "/contact-us" },
] as const;

const MOBILE_NAV_LINKS = [
  { key: "designs", href: "/#designs" },
  { key: "fabrics", href: "/fabrics/fabricStore" },
  { key: "brands", href: "/tailors" },
  { key: "joinOurCommunity", href: "/#join-our-community" },
  { key: "motdGuide", href: "/motd-guide" },
  { key: "contactUs", href: "/contact-us" },
] as const;

// SVG Icons (unchanged)

const WishlistIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const CartIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export function Navbar() {
  const params = useParams();
  const localParams = params.locale as string;
  const isArabic = localParams === "ar";
  const t = getTranslation(localParams);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const { user, isLoading } = useAuth();
  const accountLabel = user ? t.navbar.actions.account : t.navbar.actions.login;
  const { items } = useCart();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const { wishItems } = useWishlist();
  const wishlistTotalItems = wishItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // Role Based Logic after Login
  const getAccountHref = () => {
    if (isLoading) return undefined;
    if (!user) return "/auth/login";
    if (user.role.toLowerCase() === "admin") return "/admin";
    if (user.role.toLowerCase() === "tailor") return "/tailor";
    if (user.role.toLowerCase() === "fabric_store") return "/fabric";
    return "/account";
  };
  const accountHref = getAccountHref();

  // Toggle menu with animation
  const toggleMenu = useCallback(() => {
    if (!mobileOpen) {
      setMobileOpen(true);
      setTimeout(() => {
        if (menuRef.current) {
          menuRef.current.style.opacity = "1";
          menuRef.current.style.transform = "translateY(0)";
        }
      }, 10);
      document.body.style.overflow = "hidden";
    } else {
      if (menuRef.current) {
        menuRef.current.style.opacity = "0";
        menuRef.current.style.transform = "translateY(-10px)";
      }
      setTimeout(() => {
        setMobileOpen(false);
        if (menuRef.current) {
          menuRef.current.style.opacity = "";
          menuRef.current.style.transform = "";
        }
      }, 300);
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  const closeMenu = useCallback(() => {
    if (mobileOpen) {
      if (menuRef.current) {
        menuRef.current.style.opacity = "0";
        menuRef.current.style.transform = "translateY(-10px)";
      }
      setTimeout(() => {
        setMobileOpen(false);
        if (menuRef.current) {
          menuRef.current.style.opacity = "";
          menuRef.current.style.transform = "";
        }
      }, 300);
      document.body.style.overflow = "";
    }
  }, [mobileOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mobileOpen &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        closeMenu();
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mobileOpen, closeMenu]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileOpen) closeMenu();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen, closeMenu]);

  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  // ----- Dynamic classes based on Arabic -----
  const desktopNavLinkClass = `[font-family:var(--font-ui)] uppercase tracking-[0.22em] text-[var(--color-black)] hover:opacity-50 transition whitespace-nowrap ${
    isArabic
      ? "text-[11px] xs:text-[12px] lg:text-[14px] xl:text-[16px] 2xl:text-[18px] 3xl:text-[20px]"
      : "text-[9px] xs:text-[10px] lg:text-[10px] xl:text-[11px] 2xl:text-[12px] 3xl:text-[13px]"
  }`;

  const mobileNavLinkClass = `uppercase tracking-[0.22em] [font-family:var(--font-ui)] hover:opacity-50 transition ${
    isArabic
      ? "text-[14px] xs:text-[14px] sm:text-[15px]"
      : "text-[11px] xs:text-[12px] sm:text-[13px]"
  }`;

  const bottomLabelClass = `uppercase tracking-[0.18em] [font-family:var(--font-ui)] ${
    isArabic ? "text-[10px] xs:text-[11px]" : "text-[8px] xs:text-[9px]"
  }`;

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 border-b border-(--color-border) nav-blur">
      {/* MAIN BAR */}
      <div className="w-full min-h-14 xs:min-h-[60px] sm:min-h-16 md:min-h-18 flex items-center justify-between px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 3xl:px-24 4xl:px-32">
        {/* LOGO */}
        <Link
          href="/"
          className="shrink-0 flex items-center p-7.5 -m-7.5"
          onClick={closeMenu}
        >
          <img
            src="/PNG/Black/MOTD_Wordmark_Black.png"
            alt={t.navbar.logoAlt}
            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
          />
        </Link>

        {/* DESKTOP NAV */}
        <ul className="hidden lg:flex items-center gap-4 xl:gap-6 2xl:gap-8 3xl:gap-10 4xl:gap-12 list-none m-0 p-0">
          {NAV_LINKS.map(({ key, href }) => (
            <li key={key}>
              <Link href={href} className={desktopNavLinkClass}>
                {t.navbar.links[key]}
              </Link>
            </li>
          ))}
        </ul>

        {/* RIGHT ICONS */}
        <div className="flex items-center gap-1 xs:gap-1.5 sm:gap-2 md:gap-2 lg:gap-3 xl:gap-3 2xl:gap-4">
          <LocaleSwitcher />

          {/* Wishlist Icon */}
          <Link
            href="/wishlist"
            className="hidden lg:flex p-1.5 lg:p-2 hover:opacity-50 transition items-center justify-center relative"
            aria-label={t.navbar.actions.wishlist}
          >
            <div className="relative">
              <WishlistIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
              {wishlistTotalItems > 0 && (
                <span className="absolute -top-2.5 -right-1 w-4 h-4 lg:w-4 lg:h-4 bg-black text-white text-[9px] lg:text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
                  {wishlistTotalItems}
                </span>
              )}
            </div>
          </Link>

          {/* Cart Icon */}
          <Link
            href="/cart"
            className="hidden lg:flex p-1.5 lg:p-2 hover:opacity-50 transition items-center justify-center relative"
            aria-label={t.navbar.actions.cart}
          >
            <div className="relative">
              <CartIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
              {totalItems > 0 && (
                <span className="absolute -top-2.5 -right-1 w-4 h-4 lg:w-4 lg:h-4 bg-black text-white text-[9px] lg:text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
                  {totalItems}
                </span>
              )}
            </div>
          </Link>

          {/* User Icon */}
          {accountHref ? (
            <Link
              href={accountHref}
              className="hidden lg:flex p-1.5 lg:p-2 hover:opacity-50 transition items-center justify-center"
              aria-label={accountLabel}
            >
              <UserIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
            </Link>
          ) : (
            <span
              className="hidden lg:flex p-1.5 lg:p-2 items-center justify-center opacity-50"
              aria-label={t.navbar.actions.account}
              aria-busy="true"
            >
              <UserIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
            </span>
          )}

          {/* MOBILE HAMBURGER */}
          <button
            ref={btnRef}
            type="button"
            id="hamburger-btn"
            className="lg:hidden flex flex-col gap-[3.5px] xs:gap-[4px] p-1.5 xs:p-2"
            aria-expanded={mobileOpen}
            aria-label={
              mobileOpen
                ? t.navbar.actions.closeMenu
                : t.navbar.actions.openMenu
            }
            onClick={(e) => {
              e.stopPropagation();
              toggleMenu();
            }}
          >
            <span className="block w-4 xs:w-5 h-px bg-black" />
            <span className="block w-4 xs:w-5 h-px bg-black" />
            <span className="block w-4 xs:w-5 h-px bg-black" />
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      <div
        ref={menuRef}
        id="mobile-menu"
        className={`lg:hidden border-t border-(--color-border) bg-white transition-all duration-300 ease ${mobileOpen ? "" : "hidden"}`}
        style={{
          opacity: mobileOpen ? 1 : 0,
          transform: mobileOpen ? "translateY(0)" : "translateY(-10px)",
          transition: "all 0.3s ease",
        }}
        aria-hidden={!mobileOpen}
      >
        <div className="px-4 xs:px-5 sm:px-6 py-5 xs:py-6 sm:py-7">
          <ul className="flex flex-col gap-4 xs:gap-5 sm:gap-6 mb-5 xs:mb-6 sm:mb-7 list-none m-0 p-0">
            {MOBILE_NAV_LINKS.map(({ key, href }) => (
              <li key={key}>
                <Link
                  href={href}
                  className={mobileNavLinkClass}
                  onClick={closeMenu}
                >
                  {t.navbar.links[key]}
                </Link>
              </li>
            ))}
          </ul>

          {/* Mobile bottom icons grid */}
          <div className="grid grid-cols-3 gap-2 border-t border-(--color-border) pt-4 xs:pt-5">
            {accountHref ? (
              <Link
                href={accountHref}
                className="flex flex-col items-center gap-1 group hover:opacity-50 transition"
                aria-label={accountLabel}
                onClick={closeMenu}
              >
                <UserIcon className="w-4.5 h-4.5 xs:w-[20px] xs:h-[20px] sm:w-5.5 sm:h-5.5" />
                <span className={bottomLabelClass}>{accountLabel}</span>
              </Link>
            ) : (
              <span
                className="flex flex-col items-center gap-1 opacity-50"
                aria-label={t.navbar.actions.account}
                aria-busy="true"
              >
                <UserIcon className="w-4.5 h-4.5 xs:w-[20px] xs:h-[20px] sm:w-5.5 sm:h-5.5" />
                <span className={bottomLabelClass}>
                  {t.navbar.actions.account}
                </span>
              </span>
            )}

            <Link
              href="/cart"
              className="flex flex-col items-center gap-1 group hover:opacity-50 transition relative"
              onClick={closeMenu}
            >
              <div className="relative">
                <CartIcon className="w-4.5 h-4.5 xs:w-[20px] xs:h-[20px] sm:w-5.5 sm:h-5.5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 xs:w-5 xs:h-5 bg-black text-white text-[8px] xs:text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
                    {totalItems}
                  </span>
                )}
              </div>
              <span className={bottomLabelClass}>{t.navbar.actions.cart}</span>
            </Link>

            <button
              type="button"
              className="flex flex-col items-center gap-1 group hover:opacity-50 transition relative"
              aria-label={t.navbar.actions.wishlist}
              onClick={closeMenu}
            >
              <WishlistIcon className="w-4.5 h-4.5 xs:w-[20px] xs:h-[20px] sm:w-5.5 sm:h-5.5" />
              <span className={bottomLabelClass}>
                {t.navbar.actions.wishlist}
              </span>
            </button>
          </div>
        </div>
      </div>

      <GlobalProgressBar />
    </nav>
  );
}
