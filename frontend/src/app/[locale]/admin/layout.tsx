"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { safeClientNavigate } from "@/lib/safeClientNavigate";
import { Link } from "@/i18n/navigation";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";
import AdminNotificationBell from "@/components/admin/notifications/AdminNotificationBell";
import { DashboardPanelSkeleton } from "@/components/ui/Skeleton";
import PermissionGuard from "@/lib/auth/PermissionGuard";
import { api } from "@/lib/api/client";
import {
  getFirstAdminPathForUser,
  hasAdminPerm,
  isFullAdmin,
  isStaffUser,
  resolveAdminPagePerm,
  type AdminPermKey,
} from "@/lib/auth/adminAccess";

import {
  LayoutDashboard,
  Shirt,
  Scissors,
  Users,
  ShoppingBag,
  Store,
  Settings,
  LogOut,
  X,
  UserRoundPlus,
  UserRoundPen,
  Activity,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Tag,
  Layers,
  Palette,
  Leaf,
  Tags,
  Ruler,
  Wallet,
  Star,
  MessageCircle,
  Headphones,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { DashboardMobileMenuBar } from "@/components/shared/DashboardMobileMenuBar";
import white_logo from "../../../../public/PNG/White/MOTD_Wordmark_White.png";

const SIDEBAR_EXPANDED_W = 288; // w-72
const SIDEBAR_COLLAPSED_W = 72; // icon rail
const SIDEBAR_EXPANDED_KEY = "motd-admin-sidebar-expanded";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  perm?: AdminPermKey | "subAdmins";
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const isSupportChat = pathname.includes("/admin/support-chat");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  /** Desktop sidebar expanded/collapsed for the whole admin panel. */
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_EXPANDED_W);
  const sidebarDragRef = useRef<{
    active: boolean;
    startX: number;
    startW: number;
  } | null>(null);
  const [settingsExpanded, setSettingsExpanded] = useState(
    pathname.startsWith(`/${locale}/admin/settings`),
  );

  const desktopSidebarCollapsed = !sidebarExpanded;
  const desktopSidebarWidth = sidebarWidth;

  const canSeeNotifications =
    Boolean(user) &&
    (isFullAdmin(user) || hasAdminPerm(user, "notifications"));

  const canSeeReviews =
    Boolean(user) && (isFullAdmin(user) || hasAdminPerm(user, "reviews"));

  const canSeeQueries =
    Boolean(user) && (isFullAdmin(user) || hasAdminPerm(user, "queries"));

  const { count: unreadNotificationCount } = useNotificationUnreadCount(
    "admin",
    canSeeNotifications,
  );
  const [pendingReviewCount, setPendingReviewCount] = useState(0);
  const [newQueryCount, setNewQueryCount] = useState(0);

  useEffect(() => {
    setIsSidebarOpen(false);
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
      } else if (isSupportChat) {
        // First visit to live chat: collapse so the chat pane gets width.
        setSidebarExpanded(false);
        setSidebarWidth(SIDEBAR_COLLAPSED_W);
      }
    } catch {
      if (isSupportChat) {
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
        Math.max(
          SIDEBAR_COLLAPSED_W,
          drag.startW + (e.clientX - drag.startX),
        ),
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
    if (!canSeeReviews) {
      setPendingReviewCount(0);
      return;
    }
    let cancelled = false;
    api
      .get<{ counts?: { pending?: number } }>(
        "/api/admin/reviews?status=pending&limit=1",
      )
      .then((data) => {
        if (!cancelled) {
          setPendingReviewCount(Number(data?.counts?.pending) || 0);
        }
      })
      .catch(() => {
        if (!cancelled) setPendingReviewCount(0);
      });
    return () => {
      cancelled = true;
    };
  }, [canSeeReviews, pathname]);

  useEffect(() => {
    if (!canSeeQueries) {
      setNewQueryCount(0);
      return;
    }
    let cancelled = false;
    const loadNewQueryCount = () => {
      api
        .get<{ counts?: { new?: number } }>(
          "/api/admin/queries?status=new&limit=1",
        )
        .then((data) => {
          if (!cancelled) {
            setNewQueryCount(Number(data?.counts?.new) || 0);
          }
        })
        .catch(() => {
          if (!cancelled) setNewQueryCount(0);
        });
    };
    loadNewQueryCount();
    window.addEventListener("motd-queries-count-refresh", loadNewQueryCount);
    return () => {
      cancelled = true;
      window.removeEventListener("motd-queries-count-refresh", loadNewQueryCount);
    };
  }, [canSeeQueries, pathname]);

  useEffect(() => {
    document.documentElement.classList.remove("lenis", "lenis-smooth");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      safeClientNavigate(`/${locale}/auth/login`, { locale });
      return;
    }
    if (!isStaffUser(user)) {
      safeClientNavigate(`/${locale}`, { locale });
    }
  }, [user, isLoading, locale]);

  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), "") || "/admin";
  const requiredPagePerm = resolveAdminPagePerm(pathWithoutLocale);

  // Sub-admins without dashboard land on their first allowed section instead of /admin.
  useEffect(() => {
    if (isLoading || !user || user.role !== "sub-admin") return;
    if (requiredPagePerm !== "dashboard") return;
    if (hasAdminPerm(user, "dashboard")) return;
    const fallback = getFirstAdminPathForUser(user);
    if (fallback === "/admin") return;
    safeClientNavigate(fallback, { locale, replace: true });
  }, [user, isLoading, locale, requiredPagePerm]);

  const navItems = useMemo(() => {
    const all: NavItem[] = [
      {
        label: "Dashboard",
        href: "/admin",
        icon: LayoutDashboard,
        perm: "dashboard",
      },
      {
        label: "Payments",
        href: "/admin/payments",
        icon: Wallet,
        perm: "payments",
      },
      {
        label: "Customers",
        href: "/admin/customers",
        icon: UserRoundPlus,
        perm: "customers",
      },
      {
        label: "Ready Made",
        href: "/admin/ready-made",
        icon: Shirt,
        perm: "readyMade",
      },
      {
        label: "Fabrics",
        href: "/admin/fabrics",
        icon: Scissors,
        perm: "fabrics",
      },
      {
        label: "Designs",
        href: "/admin/designs",
        icon: Palette,
        perm: "designs",
      },
      {
        label: "Tailors",
        href: "/admin/tailors",
        icon: Users,
        perm: "tailors",
      },
      {
        label: "Add-Ons",
        href: "/admin/addons",
        icon: Sparkles,
        perm: "addons",
      },
      {
        label: "Orders",
        href: "/admin/orders",
        icon: ShoppingBag,
        perm: "orders",
      },
      {
        label: "Fabric Stores",
        href: "/admin/partners",
        icon: Store,
        perm: "partners",
      },
      {
        label: "Sub Admin",
        href: "/admin/sub-admin",
        icon: UserRoundPen,
        perm: "subAdmins",
      },
      {
        label: "Activity Logs",
        href: "/admin/activity",
        icon: Activity,
        perm: "subAdmins",
      },
      {
        label: "Queries",
        href: "/admin/queries",
        icon: MessageCircle,
        perm: "queries",
      },
      {
        label: "Live Chat",
        href: "/admin/support-chat",
        icon: Headphones,
        perm: "customerSupport",
      },
      {
        label: "Reviews",
        href: "/admin/reviews",
        icon: Star,
        perm: "reviews",
      },
      {
        label: "Notifications",
        href: "/admin/notifications",
        icon: Bell,
        perm: "notifications",
      },
    ];

    return all.filter((item) => {
      if (!item.perm) return true;
      if (item.perm === "subAdmins") return isFullAdmin(user);
      return hasAdminPerm(user, item.perm);
    });
  }, [user]);

  const canSeeSettings = hasAdminPerm(user, "settings");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6 sm:p-8">
        <DashboardPanelSkeleton />
      </div>
    );
  }

  if (!user || !isStaffUser(user)) {
    return null;
  }

  const settingsSubItems = [
    { label: "General", href: "/admin/settings/general", icon: Settings },
    { label: "Cuts", href: "/admin/settings/cuts", icon: Ruler },
    { label: "Categories", href: "/admin/settings/categories", icon: Tag },
    { label: "Materials", href: "/admin/settings/materials", icon: Layers },
    { label: "Patterns", href: "/admin/settings/patterns", icon: Palette },
    { label: "Seasons", href: "/admin/settings/seasons", icon: Leaf },
    { label: "Tags", href: "/admin/settings/tags", icon: Tags },
  ];

  const isSettingsActive = pathname.startsWith(`/${locale}/admin/settings`);

  const isActiveLink = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === "/admin") {
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
    <>
      <div className={collapsed ? "mb-6" : "mb-8 lg:mb-10"}>
        <div
          className={`flex h-9 items-center ${
            collapsed ? "justify-center" : "justify-between gap-3"
          }`}
        >
          <Link
            href="/admin"
            onClick={() => setIsSidebarOpen(false)}
            className={`flex h-full min-w-0 items-center ${
              collapsed ? "hidden" : ""
            }`}
          >
            <img
              src={white_logo.src}
              alt="MOTD Admin Logo"
              className="h-3 xs:h-3.25 sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-6 w-auto object-contain"
            />
            <span className="sr-only">MOTD Admin</span>
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
          <p className="font-ui text-[10px] uppercase tracking-[0.24em] text-white/50 mt-3">
            {isFullAdmin(user) ? "Control Panel" : "Staff Panel"}
          </p>
        ) : null}
      </div>

      <nav className={`flex-1 space-y-1 ${collapsed ? "flex flex-col items-center" : ""}`}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.href);
          const badge =
            item.href === "/admin/queries"
              ? newQueryCount
              : item.href === "/admin/reviews"
                ? pendingReviewCount
                : item.href === "/admin/notifications"
                  ? unreadNotificationCount
                  : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              onClick={() => setIsSidebarOpen(false)}
              className={`relative flex items-center rounded-xl font-ui transition ${
                collapsed
                  ? "h-11 w-11 justify-center"
                  : "gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em]"
              } ${
                isActive
                  ? "bg-white text-black shadow-md font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              <div className="relative flex items-center">
                <Icon className="w-4 h-4" />
                {collapsed && badge > 0 ? (
                  <span className="absolute -end-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-(--dash-danger) px-0.5 text-[9px] font-semibold text-white">
                    {badge > 99 ? "99+" : badge}
                  </span>
                ) : null}
              </div>
              {!collapsed ? (
                <>
                  {item.label}
                  {badge > 0 ? (
                    <span className="min-w-5 h-5 px-1 rounded-full bg-(--dash-danger) text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </>
              ) : null}
            </Link>
          );
        })}

        {canSeeSettings && (
          <div className={collapsed ? "w-full flex justify-center" : ""}>
            {collapsed ? (
              <Link
                href="/admin/settings/general"
                title="Settings"
                onClick={() => setIsSidebarOpen(false)}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${
                  isSettingsActive
                    ? "bg-white text-black shadow-md"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Settings className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSettingsExpanded(!settingsExpanded);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-[11px] uppercase tracking-[0.18em] font-ui transition hover:cursor-pointer
              ${
                isSettingsActive
                  ? "bg-white text-black shadow-md font-medium"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
              }`}
                >
                  <Settings className="w-4 h-4" />
                  <span className="flex-1 text-left">Settings</span>
                  {settingsExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                <AnimatePresence initial={false}>
                  {settingsExpanded && (
                    <motion.div
                      key="settings-sub-items"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 mt-1 space-y-1 border-l border-white/20 pl-3">
                        {settingsSubItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = isActiveLink(subItem.href);
                          return (
                            <motion.div
                              key={subItem.href}
                              initial={{ x: -6, opacity: 0 }}
                              animate={{ x: 0, opacity: 1 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                              <Link
                                href={subItem.href}
                                onClick={() => setIsSidebarOpen(false)}
                                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-[11px] uppercase tracking-[0.18em] font-ui transition
                            ${
                              isSubActive
                                ? "bg-white/20 text-white shadow-sm"
                                : "text-white/60 hover:bg-white/10 hover:text-white"
                            }`}
                              >
                                <SubIcon className="w-3.5 h-3.5" />
                                {subItem.label}
                              </Link>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </nav>

      <button
        onClick={() => {
          void logout();
        }}
        title="Log out"
        className={`mt-4 flex items-center rounded-xl font-ui text-red-400/90 transition hover:cursor-pointer hover:bg-red-500/10 ${
          collapsed
            ? "h-11 w-11 justify-center self-center"
            : "gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em]"
        }`}
      >
        <LogOut className="w-4 h-4" />
        {!collapsed ? "LogOut" : null}
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen bg-white">
      <aside
        data-sidebar
        className={`fixed left-0 top-0 z-20 hidden h-full flex-col border-r border-white/10 bg-(--dash-charcoal) transition-[width,padding] duration-300 ease-out lg:flex ${
          desktopSidebarCollapsed
            ? "overflow-y-auto overflow-x-hidden p-3"
            : "overflow-y-auto p-6"
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
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside
        data-sidebar
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col overflow-y-auto border-r border-white/10 bg-(--dash-charcoal) p-6 transition-transform duration-300 ease-in-out lg:hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 text-white/70 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="relative mt-8">
          <SidebarContent />
        </div>
      </aside>
      <main
        className={`admin-canvas relative min-h-screen bg-white text-black transition-[margin] duration-300 ease-out ${
          isSupportChat
            ? "flex h-dvh max-h-dvh flex-col overflow-hidden p-0"
            : "p-4 pb-16 xs:p-6 sm:p-8 md:p-10"
        }`}
        style={
          {
            ["--admin-sidebar-w" as string]: `${desktopSidebarWidth}px`,
          } as CSSProperties
        }
      >
        <style>{`
          @media (min-width: 1024px) {
            .admin-canvas {
              margin-left: var(--admin-sidebar-w);
            }
          }
        `}</style>
        {isSupportChat ? (
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

        <div
          className={
            isSupportChat ? "flex min-h-0 flex-1 flex-col" : undefined
          }
        >
          {canSeeNotifications && !isSupportChat && (
            <div className="mb-6 flex items-center justify-end gap-3">
              <AdminNotificationBell />
            </div>
          )}
          {requiredPagePerm ? (
            <PermissionGuard requiredPerm={requiredPagePerm}>
              {children}
            </PermissionGuard>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
