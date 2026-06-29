"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useAuth } from "../../../context/AuthContext";
import {
  User,
  ShoppingBag,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Star,
} from "lucide-react";
import white_logo from "../../../../public/PNG/White/MOTD_Wordmark_White.png";
import OrdersView from "@/components/orders/OrdersView";
import ProfileTab from "./profile/page";
import EditProfileForm from "./profile/edit/page";
import CustomerReviewsView from "@/components/reviews/CustomerReviewsView";

const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "reviews", label: "My Reviews", icon: Star },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type AccountTab = (typeof NAV_ITEMS)[number]["id"];

const pageVariants = {
  initial: { opacity: 0, x: 25, scale: 0.98 },
  animate: { opacity: 1, x: 0, scale: 1 },
  exit: { opacity: 0, x: -25, scale: 0.98 },
};

type AccountSidebarProps = {
  activeTab: AccountTab;
  onTabChange: (tab: AccountTab) => void;
  onLogout: () => void;
};

function AccountSidebar({
  activeTab,
  onTabChange,
  onLogout,
}: AccountSidebarProps) {
  return (
    <>
      <Link
        href="/"
        className="flex items-center gap-3 mb-8 lg:mb-10 hover:opacity-80 transition"
      >
        <img
          src={white_logo.src}
          alt="MOTD Logo"
          className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
        />
      </Link>

      <nav className="flex-1 space-y-1.5">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-['TT_Norms_Pro'] transition-colors cursor-pointer
                ${
                  isActive
                    ? "bg-white text-black shadow-md"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pt-6 mt-6 border-t border-white/10">
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          <span>LogOut</span>
        </button>
      </div>
    </>
  );
}

function isAccountTab(value: string | null): value is AccountTab {
  return NAV_ITEMS.some((item) => item.id === value);
}

export default function AccountPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<AccountTab>(
    isAccountTab(tabFromUrl) ? tabFromUrl : "profile",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // account/page.tsx – inside component
  const [viewMode, setViewMode] = useState<"profile" | "edit">("profile");
  const handleEditClick = useCallback(() => setViewMode("edit"), []);
  const handleCancelEdit = useCallback(() => setViewMode("profile"), []);

  // Close sidebar on route change (mobile only)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Sync tab with URL
  useEffect(() => {
    if (isAccountTab(tabFromUrl) && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = useCallback(
    (tab: AccountTab) => {
      if (tab === activeTab) return;
      setActiveTab(tab);
      setSidebarOpen(false);
      router.replace(`${pathname}?tab=${tab}`, { scroll: false });
    },
    [activeTab, pathname, router],
  );

  const handleLogout = useCallback(() => {
    logout();
    router.push("/auth/login");
  }, [logout, router]);

  // Auth guard
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading account…
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-black text-white">
      {/* ===== DESKTOP SIDEBAR (fixed) ===== */}
      <aside className="fixed left-0 top-0 w-72 h-full border-r border-white/10 p-6 bg-black z-20 overflow-y-auto hidden lg:flex flex-col">
        <AccountSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
        />
      </aside>

      {/* ===== MOBILE HAMBURGER ===== */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* ===== MOBILE OVERLAY & SIDEBAR ===== */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-black border-r border-white/10 p-6 flex flex-col z-50 lg:hidden"
            >
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <AccountSidebar
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onLogout={handleLogout}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ===== MAIN CONTENT ===== */}
      <main className="min-h-screen bg-linear-to-b from-gray-50 to-gray-100 text-black lg:ml-72">
        {/* Padding wrapper: extra top padding on mobile to clear the hamburger */}
        <div className="p-4 xs:p-6 sm:p-8 md:p-10 lg:p-14 pt-14 lg:pt-14">
          {/* Header */}
          <div className="mb-8 sm:mb-10">
            <h1 className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl font-['Ivy_Ora'] tracking-tight">
              My Account
            </h1>
            <p className="text-gray-500 mt-2 sm:mt-3 font-['TT_Norms_Pro'] text-sm sm:text-base md:text-lg">
              Manage your profile, orders, notifications &amp; settings
            </p>
          </div>

          {/* Tab content */}
          <div className="relative">
            <AnimatePresence mode="wait">
              {activeTab === "profile" && (
                <motion.div
                  key="profile"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.4 }}
                >
                  {viewMode === "profile" ? (
                    <ProfileTab onEditClick={handleEditClick} />
                  ) : (
                    <EditProfileForm onCancel={handleCancelEdit} />
                  )}
                </motion.div>
              )}

              {activeTab === "orders" && (
                <motion.div
                  key="orders"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm"
                >
                  <OrdersView embedded />
                </motion.div>
              )}

              {activeTab === "reviews" && (
                <motion.div
                  key="reviews"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                >
                  <CustomerReviewsView />
                </motion.div>
              )}

              {activeTab === "notifications" && (
                <motion.div
                  key="notifications"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm"
                >
                  <h2 className="text-xl font-semibold mb-4">Notifications</h2>
                  <p className="text-gray-500">
                    You have no new notifications.
                  </p>
                </motion.div>
              )}

              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm"
                >
                  <h2 className="text-xl font-semibold mb-4">Settings</h2>
                  <p className="text-gray-500">
                    Preferences and account settings coming soon.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
