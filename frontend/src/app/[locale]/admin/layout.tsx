"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";
import AdminNotificationBell from "@/components/admin/notifications/AdminNotificationBell";
import { DashboardPanelSkeleton } from "@/components/ui/Skeleton";
import PermissionGuard from "@/lib/auth/PermissionGuard";
import {
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
  Menu,
  X,
  UserRoundPlus,
  UserRoundPen,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Tag,
  Layers,
  Palette,
  Leaf,
  Tags,
  Wallet,
} from "lucide-react";
import white_logo from "../../../../public/PNG/White/MOTD_Wordmark_White.png";

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
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(
    pathname.startsWith(`/${locale}/admin/settings`),
  );

  const canSeeNotifications =
    Boolean(user) &&
    (isFullAdmin(user) || hasAdminPerm(user, "notifications"));

  const { count: unreadNotificationCount } = useNotificationUnreadCount(
    "admin",
    canSeeNotifications,
  );

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.remove("lenis", "lenis-smooth");
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/${locale}/auth/login`);
        return;
      }
      if (!isStaffUser(user)) {
        router.push("/");
      }
    }
  }, [user, isLoading, router, locale]);

  const pathWithoutLocale = pathname.replace(new RegExp(`^/${locale}`), "") || "/admin";
  const requiredPagePerm = resolveAdminPagePerm(pathWithoutLocale);

  const navItems = useMemo(() => {
    const all: NavItem[] = [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
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
        label: "Ready-Made",
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
      <div className="min-h-screen bg-(--dash-charcoal-deep) p-6 sm:p-8">
        <DashboardPanelSkeleton />
      </div>
    );
  }

  if (!user || !isStaffUser(user)) {
    return null;
  }

  const settingsSubItems = [
    { label: "General", href: "/admin/settings/general", icon: Settings },
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

  const SidebarContent = () => (
    <>
      <div className="mb-8 lg:mb-10">
        <Link href="/admin" onClick={() => setIsSidebarOpen(false)}>
          <img
            src={white_logo.src}
            alt="MOTD Admin Logo"
            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
          />
          <span className="sr-only">MOTD Admin</span>
        </Link>
        <p className="text-white/50 text-xs mt-3 tracking-wide">
          {isFullAdmin(user) ? "Control Panel" : "Staff Panel"}
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = isActiveLink(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition
                            ${
                              isActive
                                ? "bg-white text-black shadow-md font-medium"
                                : "text-white/70 hover:bg-white/10 hover:text-white"
                            }`}
            >
              <div className="relative flex items-center">
                <Icon className="w-4 h-4" />
              </div>
              {item.label}
              {item.href === "/admin/notifications" &&
                unreadNotificationCount > 0 && (
                  <span className="min-w-5 h-5 px-1 rounded-full bg-white text-black text-[11px] font-semibold flex items-center justify-center shadow-sm">
                    {unreadNotificationCount > 99
                      ? "99+"
                      : unreadNotificationCount}
                  </span>
                )}
            </Link>
          );
        })}

        {canSeeSettings && (
          <div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setSettingsExpanded(!settingsExpanded);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition hover:cursor-pointer
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
                            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition
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
          </div>
        )}
      </nav>

      <button
        onClick={() => {
          void logout();
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400/90 hover:bg-red-500/10 transition hover:cursor-pointer mt-4"
      >
        <LogOut className="w-4 h-4" />
        LogOut
      </button>
    </>
  );

  return (
    <div className="relative min-h-screen bg-(--dash-charcoal-deep) text-white">
      <aside
        data-sidebar
        className="fixed left-0 top-0 w-72 h-full border-r border-white/10 flex-col p-6 bg-(--dash-charcoal) z-20 overflow-y-auto hidden lg:flex"
      >
        <SidebarContent />
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
        className={`fixed left-0 top-0 w-72 h-full bg-(--dash-charcoal) border-r border-white/10 flex flex-col p-6 z-40 transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-white/70 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="mt-8">
          <SidebarContent />
        </div>
      </aside>
      <main
        className={`min-h-screen bg-(--dash-bg) text-(--dash-ink) p-4 xs:p-6 sm:p-8 md:p-10 pb-16 transition-all duration-300 lg:ml-72`}
      >
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-black rounded-md shadow-md hover:bg-(--dash-charcoal-deep) transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        <div className="lg:pt-0 pt-12">
          {canSeeNotifications && (
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
