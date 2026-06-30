"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Link } from "@/i18n/navigation";
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
} from "lucide-react";
import white_logo from "../../../../public/PNG/White/MOTD_Wordmark_White.png";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Extract locale from pathname (e.g., "/en/admin" -> "en")
  const locale = pathname.split("/")[1] || "en";

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  // ===================== GUARD (C-11) =====================
  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push(`/${locale}/auth/login`);
        return;
      }
      if (user.role !== "sub-admin") {
        router.push("/");
      }
    }
  }, [user, isLoading, router, locale]);

  // ===================== LOADING STATE =====================
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black text-white">
        Loading admin panel...
      </div>
    );
  }

  // ===================== REDIRECT FOR NON-ADMIN =====================
  if (!user || user.role !== "sub-admin") {
    return null;
  }

  const navItems = [
    { label: "Dashboard", href: "/sub-admin-dashboard", icon: LayoutDashboard },
    {
      label: "Customers",
      href: "/sub-admin-dashboard/customers",
      icon: UserRoundPlus,
    },
    {
      label: "Ready-Made",
      href: "/sub-admin-dashboard/ready-made",
      icon: Shirt,
    },
    { label: "Fabrics", href: "/sub-admin-dashboard/fabrics", icon: Scissors },
    { label: "Tailors", href: "/sub-admin-dashboard/tailors", icon: Users },
    { label: "Orders", href: "/sub-admin-dashboard/orders", icon: ShoppingBag },
    { label: "Partners", href: "/sub-admin-dashboard/partners", icon: Store },
    {
      label: "Settings",
      href: "/sub-admin-dashboard/settings",
      icon: Settings,
    },
  ];

  // Helper to check active link (exact or subpath)
  const isActiveLink = (href: string) => {
    const fullHref = `/${locale}${href}`;
    if (href === "/sub-admin-dashboard") {
      return pathname === fullHref;
    }
    return pathname.startsWith(fullHref);
  };

  // Sidebar content (reused in both desktop and mobile)
  const SidebarContent = () => (
    <>
      {/* BRAND */}
      <div className="mb-8 lg:mb-10">
        <Link
          href="/sub-admin-dashboard"
          onClick={() => setIsSidebarOpen(false)}
        >
          <img
            src={white_logo.src}
            alt="MOTD Admin Logo"
            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
          />
          <span className="sr-only">MOTD Admin</span>
        </Link>
        <p className="text-white/50 text-xs mt-3">Control Panel</p>
      </div>

      {/* NAV */}
      <nav className="flex-1 space-y-2">
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
                                ? "bg-white text-black shadow-md"
                                : "text-white/70 hover:bg-white/10"
                            }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* LOGOUT */}
      <button
        onClick={() => {
          logout();
          router.push(`/${locale}/auth/login`);
        }}
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition hover:cursor-pointer mt-4"
      >
        <LogOut className="w-4 h-4" />
        LogOut
      </button>
    </>
  );

  // ===================== UI =====================
  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* Desktop Sidebar (always visible on lg+) */}
      <aside className="fixed left-0 top-0 w-72 h-full border-r border-white/10 flex-col p-6 bg-black z-20 overflow-y-auto hidden lg:flex">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar (overlay, slides in) */}
      <div
        className={`fixed inset-0 bg-black/50 z-30 transition-opacity duration-300 lg:hidden ${
          isSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <aside
        className={`fixed left-0 top-0 w-72 h-full bg-black border-r border-white/10 flex flex-col p-6 z-40 transition-transform duration-300 ease-in-out lg:hidden ${
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

      {/* Main Content Area */}
      <main
        className={`
                    min-h-screen bg-gray-100 text-black p-4 xs:p-6 sm:p-8 md:p-10 pb-16
                    transition-all duration-300
                    lg:ml-72
                `}
      >
        {/* Mobile Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-black rounded-md shadow-md hover:bg-gray-800 transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-white" />
        </button>

        {/* Add top padding on mobile so content isn't hidden behind toggle */}
        <div className="lg:pt-0 pt-12">{children}</div>
      </main>
    </div>
  );
}
