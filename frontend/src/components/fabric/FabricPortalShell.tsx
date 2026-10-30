"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Headphones,
  PanelLeftClose,
  PanelLeftOpen,
  Scissors,
  Store,
  X,
  ShoppingBag,
  Bell,
  Shirt,
  Plus,
  Edit,
  Settings,
} from "lucide-react";
import white_logo from "../../../public/PNG/White/MOTD_Wordmark_White.png";
import {
  buildVerifyEmailHref,
  canChangeAccountEmail,
} from "@/lib/auth/emailVerification";
import PartnerChangeEmailCard from "@/components/auth/PartnerChangeEmailCard";
import EmailChangePendingBanner from "@/components/auth/EmailChangePendingBanner";
import { DashboardMobileMenuBar } from "@/components/shared/DashboardMobileMenuBar";
import { getTranslation } from "@/lib/getTranslation";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";

const SIDEBAR_EXPANDED_W = 288; // w-72
const SIDEBAR_COLLAPSED_W = 72; // icon rail
const SIDEBAR_EXPANDED_KEY = "motd-fabric-sidebar-expanded";

type FabricPortalShellProps = {
  children: React.ReactNode;
};

export default function FabricPortalShell({
  children,
}: FabricPortalShellProps) {
  const t = useTranslations("FabricPortal");
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_EXPANDED_W);
  const sidebarDragRef = useRef<{
    active: boolean;
    startX: number;
    startW: number;
  } | null>(null);

  const locale = pathname.split("/")[1] || "en";
  const tVerify = getTranslation(locale).verifyEmail;
  const canChangeEmail = canChangeAccountEmail(user);
  const showVerify = needsEmailVerification(user) && !user?.isGuest;
  const isMessagesChat = pathname.includes("/fabric/messages");
  const desktopSidebarCollapsed = !sidebarExpanded;
  const desktopSidebarWidth = sidebarWidth;

  const { count: unreadNotificationCount } = useNotificationUnreadCount(
    "customer",
    Boolean(user),
  );

  useEffect(() => {
    setIsSidebarOpen(false);
    setShowChangeEmail(false);
  }, [pathname]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_EXPANDED_KEY);
      if (saved === "0") {
        setSidebarExpanded(false);
        setSidebarWidth(SIDEBAR_COLLAPSED_W);
      } else if (saved === "1") {
        setSidebarExpanded(true);
        setSidebarWidth(SIDEBAR_EXPANDED_W);
      } else if (isMessagesChat) {
        setSidebarExpanded(false);
        setSidebarWidth(SIDEBAR_COLLAPSED_W);
      }
    } catch {
      if (isMessagesChat) {
        setSidebarExpanded(false);
        setSidebarWidth(SIDEBAR_COLLAPSED_W);
      }
    }
    // Intentionally once on mount — preference is user-controlled after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSidebarExpanded = useCallback((expanded: boolean) => {
    setSidebarExpanded(expanded);
    setSidebarWidth(expanded ? SIDEBAR_EXPANDED_W : SIDEBAR_COLLAPSED_W);
    try {
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, expanded ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const onSidebarDragStart = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      sidebarDragRef.current = {
        active: true,
        startX: e.clientX,
        startW: sidebarWidth,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [sidebarWidth],
  );

  const onSidebarDragMove = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = sidebarDragRef.current;
      if (!drag?.active) return;
      const next = Math.min(
        SIDEBAR_EXPANDED_W,
        Math.max(SIDEBAR_COLLAPSED_W, drag.startW + (e.clientX - drag.startX)),
      );
      setSidebarWidth(next);
      setSidebarExpanded(next > (SIDEBAR_COLLAPSED_W + SIDEBAR_EXPANDED_W) / 2);
    },
    [],
  );

  const onSidebarDragEnd = useCallback(
    (e: ReactPointerEvent<HTMLButtonElement>) => {
      const drag = sidebarDragRef.current;
      if (!drag?.active) return;
      sidebarDragRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      const snapExpanded =
        sidebarWidth >= (SIDEBAR_COLLAPSED_W + SIDEBAR_EXPANDED_W) / 2;
      persistSidebarExpanded(snapExpanded);
    },
    [sidebarWidth, persistSidebarExpanded],
  );

  useEffect(() => {
    document.documentElement.classList.remove("lenis", "lenis-smooth");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const navItems = [
    { label: t("nav.dashboard"), href: "/fabric", icon: LayoutDashboard },
    { label: t("nav.shop"), href: "/fabric/shop", icon: Store },
    { label: t("nav.fabrics"), href: "/fabric/fabrics", icon: Scissors },
    {
      label: t("nav.ready-made") || "Ready Made",
      href: "/fabric/ready-made",
      icon: Shirt,
    },
    { label: t("nav.addons") || "Add-Ons", href: "/fabric/addons", icon: Plus },
    { label: t("nav.orders"), href: "/fabric/orders", icon: ShoppingBag },
    {
      label: t("nav.messages") || "Customer Support",
      href: "/fabric/messages",
      icon: Headphones,
    },
    {
      label: t("nav.notifications") || "Notifications",
      href: "/fabric/notifications",
      icon: Bell,
    },
    {
      label: t("nav.settings") || "Settings",
      href: "/fabric/settings",
      icon: Settings,
    },
  ];

  const isActiveLink = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === "/fabric") {
      return pathname === fullHref;
    }
    return pathname.startsWith(fullHref);
  };

  const SidebarContent = ({
    collapsed = false,
    showCollapseToggle = false,
  }: {
    collapsed?: boolean;
    showCollapseToggle?: boolean;
  }) => (
    <div className="flex h-full min-h-0 w-full flex-col">
      <div
        className={`w-full shrink-0 ${collapsed ? "mb-6" : "mb-8 lg:mb-10"}`}
      >
        <div
          className={`flex h-9 w-full items-center ${
            collapsed ? "justify-center" : "justify-between gap-3"
          }`}
        >
          <Link
            href="/fabric"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex h-full min-w-0 items-center ${
              collapsed ? "hidden" : ""
            }`}
          >
            <img
              src={white_logo.src}
              alt="MOTD"
              className="h-3 sm:h-3.5 md:h-4 w-auto object-contain"
            />
            <span className="sr-only">MOTD</span>
          </Link>
          {showCollapseToggle ? (
            <button
              type="button"
              onClick={() => persistSidebarExpanded(collapsed)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white hover:cursor-pointer"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4.5 w-4.5" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="h-4.5 w-4.5" strokeWidth={1.75} />
              )}
            </button>
          ) : null}
        </div>
        {!collapsed ? (
          <>
            <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-white/50 mt-3">
              {t("portalLabel")}
            </p>
            {user?.name && (
              <p className="[font-family:var(--font-body)] text-[13px] text-white mt-2">
                {user.name}
              </p>
            )}
            {user?.email ? (
              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                <p
                  className="min-w-0 truncate [font-family:var(--font-body)] text-[11px] text-white/50"
                  title={user.email}
                >
                  {user.email}
                </p>
                {showVerify ? (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.assign(
                        buildVerifyEmailHref({
                          locale,
                          mode: "account",
                          next: "/fabric",
                        }),
                      );
                    }}
                    className="shrink-0 cursor-pointer rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white transition hover:bg-red-700"
                  >
                    {tVerify.profileVerify}
                  </button>
                ) : null}
                {canChangeEmail ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangeEmail((open) => !open);
                      setIsSidebarOpen(false);
                    }}
                    aria-label={tVerify.changeEmailHeading}
                    className="shrink-0 cursor-pointer rounded border border-white/40 bg-transparent p-0.5 text-white transition hover:bg-white hover:text-black"
                  >
                    <Edit className="h-3 w-3" strokeWidth={2} />
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      <nav
        className={`min-h-0 w-full flex-1 space-y-1 ${
          collapsed
            ? "flex flex-col items-center"
            : "flex flex-col items-stretch"
        }`}
      >
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.href);
          const badge =
            item.href === "/fabric/notifications" ? unreadNotificationCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={() => setIsSidebarOpen(false)}
              className={`relative flex items-center rounded-xl transition [font-family:var(--font-ui)] ${
                collapsed
                  ? "h-11 w-11 justify-center"
                  : "w-full gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em]"
              } ${
                isActive
                  ? "bg-white font-medium text-black shadow-md"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="relative flex items-center">
                <Icon className="h-4 w-4" />
                {collapsed && badge > 0 ? (
                  <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--dash-danger) px-0.5 text-[9px] font-semibold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </div>
              {!collapsed ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-start">
                    {item.label}
                  </span>
                  {item.href === "/fabric/notifications" && badge > 0 ? (
                    <span
                      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1 text-[11px] font-semibold shadow-sm ${
                        isActive
                          ? "bg-black text-white"
                          : "bg-(--dash-danger) text-white"
                      }`}
                    >
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        title={t("logout")}
        onClick={() => {
          void logout("/auth/login?redirect=/fabric");
        }}
        className={`mt-4 flex shrink-0 items-center rounded-xl text-red-400/90 transition hover:bg-red-500/10 hover:text-red-300 [font-family:var(--font-ui)] ${
          collapsed
            ? "h-11 w-11 justify-center self-center"
            : "w-full gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em]"
        }`}
      >
        <LogOut className="h-4 w-4" />
        {!collapsed ? t("logout") : null}
      </button>
    </div>
  );

  return (
    <div className="relative bg-(--dash-bg) text-(--dash-ink) lg:flex lg:h-dvh lg:overflow-hidden">
      <aside
        data-sidebar
        className={`relative z-20 hidden h-full shrink-0 flex-col items-stretch border-r border-white/10 bg-(--dash-charcoal) transition-[width,padding] duration-300 ease-out lg:sticky lg:top-0 lg:flex lg:h-dvh ${
          desktopSidebarCollapsed
            ? "overflow-y-auto overflow-x-hidden p-3"
            : "overflow-y-auto overflow-x-hidden p-6"
        }`}
        style={{ width: desktopSidebarWidth }}
      >
        <SidebarContent
          collapsed={desktopSidebarCollapsed}
          showCollapseToggle
        />
        <button
          type="button"
          aria-label="Drag to resize sidebar"
          title="Drag to resize sidebar"
          onPointerDown={onSidebarDragStart}
          onPointerMove={onSidebarDragMove}
          onPointerUp={onSidebarDragEnd}
          onPointerCancel={onSidebarDragEnd}
          className="absolute inset-y-0 -right-1 z-30 w-2 cursor-col-resize touch-none bg-transparent hover:bg-white/15"
        />
      </aside>

      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside
        data-sidebar
        className={`h-viewport fixed left-0 top-0 z-40 flex w-72 flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-r border-white/10 bg-(--dash-charcoal) p-6 transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="mt-8 flex min-h-0 w-full flex-1 flex-col">
          <SidebarContent />
        </div>
      </aside>

      {/* Below `lg` the page must scroll natively on the document. Making this
          element a scroll container instead (`overflow-y-auto`, or even a lone
          `overflow-x-hidden`, which forces the y axis to `auto`) combined with
          `overscroll-contain` breaks one-finger scrolling on Android: the box
          has nothing to scroll and refuses to chain the gesture to the
          document, so only a two-finger visual-viewport pan moves the page.
          `overflow-x-clip` still clips wide children without creating one.
          Messages chat matches admin support-chat: full-bleed, no padding. */}
      <main
        className={`relative min-w-0 flex-1 ${
          isMessagesChat
            ? "flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden p-0 lg:min-h-0"
            : "min-h-dvh overflow-x-clip p-4 pb-40 xs:p-6 sm:p-8 md:p-10 lg:min-h-0 lg:overflow-x-hidden lg:overflow-y-auto lg:overscroll-y-contain lg:pt-10"
        }`}
      >
        {isMessagesChat ? (
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-3 start-3 z-30 rounded-md bg-black p-2 text-white shadow-md lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : (
          <DashboardMobileMenuBar onOpen={() => setIsSidebarOpen(true)} />
        )}

        {showChangeEmail && canChangeEmail && !isMessagesChat ? (
          <PartnerChangeEmailCard
            locale={locale}
            nextPath="/fabric"
            currentEmail={user?.email}
            onCancel={() => setShowChangeEmail(false)}
          />
        ) : (
          <div
            className={
              isMessagesChat ? "flex min-h-0 flex-1 flex-col" : undefined
            }
          >
            {canChangeEmail && !isMessagesChat ? (
              <div className="mb-6">
                <EmailChangePendingBanner
                  locale={locale}
                  nextPath="/fabric"
                  variant="portal"
                />
              </div>
            ) : null}
            {children}
          </div>
        )}
      </main>
    </div>
  );
}
