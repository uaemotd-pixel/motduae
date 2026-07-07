"use client";

import { Suspense, useState, useEffect, useCallback } from "react";
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
  Shirt,
  Users,
  Star,
  PanelLeft,
} from "lucide-react";
import white_logo from "../../../../public/PNG/White/MOTD_Wordmark_White.png";
import OrdersView from "@/components/orders/OrdersView";
import ProfileTab from "./profile/page";
import EditProfileForm from "./profile/edit/page";
import FamilyMembersPage from "./family-members/page";
import CustomerReviewsView from "@/components/reviews/CustomerReviewsView";
import ChangePasswordForm from "@/components/account/ChangePasswordForm";
import BrandLoader from "@/components/shared/BrandLoader";
import MeasurementsForm from "./measurements/page";

const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "reviews", label: "My Reviews", icon: Star },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "measurements", label: "Measurements", icon: Shirt },
  { id: "family-members", label: "Add Members", icon: Users },
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
  collapsed: boolean;
  onToggle: () => void;
};

function AccountSidebar({
  activeTab,
  onTabChange,
  onLogout,
  collapsed,
  onToggle,
}: AccountSidebarProps) {
  return (
    <>
      <button
        onClick={onToggle}
        className={`absolute right-0 top-5 w-8 h-8 rounded-full bg-black border-0 text-white hover:bg-white/10 transition flex items-center justify-center z-30 hover:cursor-pointer ${
          collapsed ? "rotate-180" : ""
        } hidden lg:flex`}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <PanelLeft className="w-5 h-5" />
      </button>

      <Link
        href="/"
        className={`flex items-center gap-3 mb-8 lg:mb-10 hover:opacity-80 transition ${
          collapsed ? "justify-center" : ""
        }`}
      >
        <img
          src={white_logo.src}
          alt="MOTD Logo"
          className={`w-auto object-contain ${
            collapsed
              ? "h-8 xs:h-8 sm:h-8 md:h-8 lg:h-8 xl:h-8"
              : "h-5 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px]"
          }`}
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
                ${collapsed ? "justify-center px-2" : ""}
                ${
                  isActive
                    ? "bg-white text-black shadow-md"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon
                className={`${collapsed ? "w-5 h-5" : "w-4 h-4"} shrink-0`}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div
        className={`pt-6 mt-6 border-t border-white/10 ${collapsed ? "flex justify-center" : ""}`}
      >
        <button
          type="button"
          onClick={onLogout}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition hover:cursor-pointer ${
            collapsed ? "justify-center px-2 w-auto" : ""
          }`}
          title={collapsed ? "LogOut" : undefined}
        >
          <LogOut className={`${collapsed ? "w-5 h-5" : "w-4 h-4"} shrink-0`} />
          {!collapsed && <span>LogOut</span>}
        </button>
      </div>
    </>
  );
}

function isAccountTab(value: string | null): value is AccountTab {
  return NAV_ITEMS.some((item) => item.id === value);
}

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Loading account…
          </div>
        </div>
      }
    >
      <AccountPageContent />
    </Suspense>
  );
}

function AccountPageContent() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<AccountTab>(
    isAccountTab(tabFromUrl) ? tabFromUrl : "profile",
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"profile" | "edit">("profile");

  useEffect(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    if (saved !== null) {
      setSidebarCollapsed(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebarCollapsed", JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleEditClick = useCallback(() => setViewMode("edit"), []);
  const handleCancelEdit = useCallback(() => setViewMode("profile"), []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!authLoading && user) {
      const role = user.role.toLowerCase();
      if (role === "admin") {
        router.replace("/admin");
      } else if (role === "tailor") {
        router.replace("/tailor");
      } else if (role === "fabric_store") {
        router.replace("/fabric");
      }
    }
  }, [user, authLoading, router]);

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

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <BrandLoader />
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="relative min-h-screen bg-black text-white">
      <aside
        className={`fixed left-0 top-0 h-full border-r border-white/10 p-6 bg-black z-20 overflow-y-auto hidden lg:flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? "w-20" : "w-72"
        }`}
      >
        <AccountSidebar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          onLogout={handleLogout}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
        />
      </aside>

      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/20 text-white hover:bg-white/10 transition"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

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
                collapsed={false}
                onToggle={() => {}}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main
        className={`min-h-screen bg-linear-to-b from-gray-50 to-gray-100 text-black transition-all duration-300 ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <div className="p-4 xs:p-6 sm:p-8 md:p-10 lg:p-14 pt-14 lg:pt-14">
          <div className="mb-8 sm:mb-10">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-['Ivy_Ora'] tracking-tight">
              My Account
            </h1>
            <p className="text-gray-500 mt-2 sm:mt-3 font-['TT_Norms_Pro'] text-sm sm:text-base md:text-lg">
              Manage your profile, orders, notifications &amp; settings
            </p>
          </div>

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

              {activeTab === "measurements" && (
                <motion.div
                  key="measurements"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm"
                >
                  <MeasurementsForm />
                </motion.div>
              )}

              {activeTab === "family-members" && (
                <motion.div
                  key="orders"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm"
                >
                  <FamilyMembersPage />
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
                  <ChangePasswordForm hasPassword={user.hasPassword === true} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
