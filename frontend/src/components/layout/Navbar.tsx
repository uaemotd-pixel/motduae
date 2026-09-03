"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { GlobalProgressBar } from "../shared/GlobalProgressBar";
import { useAuth } from "@/context/AuthContext";
import LocaleSwitcher from "../shared/LocaleSwitcher";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { getTranslation } from "@/lib/getTranslation";
import { useParams } from "next/navigation";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";
import CustomerNotificationBell from "@/components/account/CustomerNotificationBell";

const NAV_LINKS = [
  { key: "designs", href: "/designs/designShop" },
  { key: "fabrics", href: "/fabrics/fabricStore" },
  { key: "brands", href: "/tailors" },
] as const;

const MOBILE_NAV_LINKS = [
  { key: "designs", href: "/#designs" },
  { key: "fabrics", href: "/fabrics/fabricStore" },
  { key: "brands", href: "/tailors" },
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

const LogOutIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export function Navbar() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const localParams = params.locale as string;
  const isArabic = localParams === "ar";
  const t = getTranslation(localParams);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLLIElement>(null);

  const handleScrollToSection = (e: React.MouseEvent, targetId: string) => {
    e.preventDefault();
    setDropdownOpen(false);
    closeMenu();

    const isHome =
      pathname === "/" ||
      pathname === "" ||
      pathname === `/${localParams}` ||
      pathname === `/${localParams}/`;
    const targetElement = document.getElementById(targetId);

    if (isHome && targetElement) {
      if ((window as any).lenis) {
        (window as any).lenis.scrollTo(targetElement, {
          offset: -80,
          duration: 1.2,
        });
      } else {
        const navbarHeight = 80;
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.pageYOffset - navbarHeight;
        window.scrollTo({
          top: offsetPosition,
          behavior: "smooth",
        });
      }
      window.history.pushState(null, "", `/#${targetId}`);
    } else {
      router.push(`/#${targetId}`);
    }
  };
  const { user, isLoading, logout } = useAuth();
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
    if (user.isGuest) return undefined;
    if (user.role.toLowerCase() === "admin") return "/admin";
    if (user.role.toLowerCase() === "sub-admin") return "/admin";
    if (user.role.toLowerCase() === "tailor") return "/tailor";
    if (user.role.toLowerCase() === "fabric_store") return "/fabric";
    return "/account";
  };
  const accountHref = getAccountHref();
  const isCustomerAccount = Boolean(user && accountHref === "/account");
  const { count: customerNotificationCount } = useNotificationUnreadCount(
    "customer",
    isCustomerAccount,
    30000,
  );

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
    setDropdownOpen(false);
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
      if (
        dropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [mobileOpen, closeMenu, dropdownOpen]);

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

  const navIconClass =
    "p-2 hover:opacity-50 transition items-center justify-center relative touch-manipulation shrink-0";

  return (
    <nav className="fixed top-0 left-0 right-0 w-full z-50 border-b border-(--color-border) nav-blur pt-[var(--safe-top)] ps-[var(--safe-left)] pe-[var(--safe-right)]">
      {/* MAIN BAR */}
      <div className="w-full min-h-14 xs:min-h-[60px] sm:min-h-16 md:min-h-18 flex items-center justify-between gap-2 min-w-0 px-3 xs:px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 2xl:px-16 3xl:px-24 4xl:px-32">
        {/* LOGO */}
        <Link
          href="/"
          className="shrink-0 flex items-center py-2"
          onClick={closeMenu}
        >
          <img
            src="/PNG/Black/MOTD_Wordmark_Black.png"
            alt={t.navbar.logoAlt}
            className="h-3.5 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
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
          <li className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className={`${desktopNavLinkClass} flex items-center gap-1 bg-transparent border-0 p-0 hover:cursor-pointer`}
            >
              <span>{isArabic ? "جاهز للطلب" : "Ready to Order"}</span>
              <svg
                className={`w-3 h-3 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {dropdownOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-44 bg-white border border-(--color-border) rounded-lg shadow-lg py-2.5 z-50 flex flex-col text-center">
                <Link
                  href="/#designs"
                  onClick={(e) => handleScrollToSection(e, "designs")}
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-black hover:bg-[#FAF9F6] transition font-medium"
                >
                  {isArabic ? "مخوّر" : "Mukhawar"}
                </Link>
                <Link
                  href="/#ready-made"
                  onClick={(e) => handleScrollToSection(e, "ready-made")}
                  className="px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-black hover:bg-[#FAF9F6] transition border-t border-[#FAF9F6] font-medium"
                >
                  {isArabic ? "جاهز للارتداء" : "Ready to Wear"}
                </Link>
              </div>
            )}
          </li>
        </ul>

        {/* RIGHT ICONS */}
        <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 md:gap-2 lg:gap-3 xl:gap-3 2xl:gap-4 shrink-0">
          <LocaleSwitcher />

          {/* Cart – always visible */}
          <Link
            href="/cart"
            className={`flex ${navIconClass}`}
            aria-label={t.navbar.actions.cart}
            onClick={closeMenu}
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

          {/* Login / Account – always visible */}
          {user && user.isGuest ? (
            <button
              onClick={() => {
                closeMenu();
                void logout();
              }}
              className={`flex ${navIconClass} text-red-600 hover:cursor-pointer bg-transparent border-0`}
              title={
                localParams === "ar"
                  ? "تسجيل الخروج كضيف"
                  : "Sign out from Guest"
              }
            >
              <LogOutIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
            </button>
          ) : accountHref ? (
            <Link
              href={accountHref}
              className={`flex ${navIconClass}`}
              aria-label={accountLabel}
              onClick={closeMenu}
            >
              <UserIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
            </Link>
          ) : (
            <span
              className={`flex ${navIconClass} opacity-50`}
              aria-label={t.navbar.actions.account}
              aria-busy="true"
            >
              <UserIcon className="w-4 h-4 xs:w-4 sm:w-4 md:w-4 lg:w-5 xl:w-5 2xl:w-6" />
            </span>
          )}

          {/* Wishlist Icon – desktop */}
          <Link
            href="/wishlist"
            className={`hidden lg:flex ${navIconClass}`}
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

          {/* Customer notifications – desktop */}
          {isCustomerAccount && <CustomerNotificationBell />}

          {/* MOBILE HAMBURGER */}
          <button
            ref={btnRef}
            type="button"
            id="hamburger-btn"
            className="lg:hidden flex flex-col gap-[3.5px] xs:gap-[4px] p-2 touch-manipulation shrink-0"
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
        className={`lg:hidden border-t border-(--color-border) bg-white transition-all duration-300 ease overflow-y-auto overflow-x-clip ${mobileOpen ? "" : "hidden"}`}
        style={{
          opacity: mobileOpen ? 1 : 0,
          transform: mobileOpen ? "translateY(0)" : "translateY(-10px)",
          transition: "all 0.3s ease",
          maxHeight: mobileOpen
            ? "calc(100dvh - var(--nav-height) - var(--safe-top) - var(--safe-bottom))"
            : undefined,
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
            <li className="flex flex-col">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`${mobileNavLinkClass} flex items-center gap-1.5 bg-transparent border-0 p-0 text-left rtl:text-right hover:cursor-pointer`}
              >
                <span>{isArabic ? "جاهز للطلب" : "Ready to Order"}</span>
                <svg
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${dropdownOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {dropdownOpen && (
                <ul className="pl-4 pr-4 mt-2 flex flex-col gap-2 list-none border-l border-(--color-border) rtl:border-l-0 rtl:border-r rtl:border-(--color-border)">
                  <li>
                    <Link
                      href="/#designs"
                      className={`${mobileNavLinkClass} text-[10px] text-black/70`}
                      onClick={(e) => handleScrollToSection(e, "designs")}
                    >
                      {isArabic ? "مخوّر" : "Mukhawar"}
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/#ready-made"
                      className={`${mobileNavLinkClass} text-[10px] text-black/70`}
                      onClick={(e) => handleScrollToSection(e, "ready-made")}
                    >
                      {isArabic ? "جاهز للارتداء" : "Ready to Wear"}
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>

          {/* Mobile bottom icons – wishlist + alerts (login & cart are in the bar) */}
          <div
            className={`grid gap-2 border-t border-(--color-border) pt-4 xs:pt-5 pb-[var(--safe-bottom)] ${
              isCustomerAccount ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {isCustomerAccount && (
              <Link
                href="/account?tab=notifications"
                className="flex flex-col items-center gap-1 group hover:opacity-50 transition relative lg:hidden"
                aria-label="Notifications"
                onClick={closeMenu}
              >
                <div className="relative">
                  <svg
                    className="w-4.5 h-4.5 xs:w-[20px] xs:h-[20px] sm:w-5.5 sm:h-5.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {customerNotificationCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 xs:w-5 xs:h-5 bg-black text-white text-[8px] xs:text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
                      {customerNotificationCount > 99
                        ? "99+"
                        : customerNotificationCount}
                    </span>
                  )}
                </div>
                <span className={bottomLabelClass}>Alerts</span>
              </Link>
            )}

            <Link
              href="/wishlist"
              className="flex flex-col items-center gap-1 group hover:opacity-50 transition relative"
              aria-label={t.navbar.actions.wishlist}
              onClick={closeMenu}
            >
              <div className="relative">
                <WishlistIcon className="w-4.5 h-4.5 xs:w-[20px] xs:h-[20px] sm:w-5.5 sm:h-5.5" />
                {wishlistTotalItems > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 xs:w-5 xs:h-5 bg-black text-white text-[8px] xs:text-[10px] font-medium rounded-full flex items-center justify-center shadow-sm">
                    {wishlistTotalItems}
                  </span>
                )}
              </div>
              <span className={bottomLabelClass}>
                {t.navbar.actions.wishlist}
              </span>
            </Link>
          </div>
        </div>
      </div>

      <GlobalProgressBar />
    </nav>
  );
}
