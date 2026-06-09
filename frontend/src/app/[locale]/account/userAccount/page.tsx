"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useAuth } from "../../../../context/AuthContext";
import {
    User,
    Mail,
    ShoppingBag,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import white_logo from "../../../../../public/PNG/White/MOTD_Wordmark_White.png";
import UserOrders from "../userOrders/page";
import FadeInSection from "@/components/shared/fadeInSection";

const NAV_ITEMS = [
    { id: "profile", label: "Profile", icon: User },
    { id: "orders", label: "Orders", icon: ShoppingBag },
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

function AccountSidebar({ activeTab, onTabChange, onLogout }: AccountSidebarProps) {
    return (
        <>
            <Link href="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition">
                <img src={white_logo.src} className="h-6 w-auto object-contain" alt="Logo" />
            </Link>

            <nav className="flex-1 space-y-2">
                {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onTabChange(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-['TT_Norms_Pro'] transition-colors cursor-pointer
                                ${isActive
                                    ? "bg-white text-black shadow-md"
                                    : "text-white hover:bg-white/10"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="pt-6 border-t border-white/10 mt-auto">
                <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
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

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                Loading account...
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-black text-white lg:flex lg:overflow-hidden">
            <aside className="hidden lg:flex lg:w-72 lg:min-h-screen lg:flex-col lg:border-r lg:border-white/10 lg:p-6">
                <AccountSidebar
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    onLogout={handleLogout}
                />
            </aside>

            <div className="lg:hidden fixed top-4 left-4 z-50">
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/20 text-white"
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
                            />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>

            <main className="flex-1 bg-linear-to-b from-gray-50 to-gray-100 text-black overflow-y-auto min-h-screen p-6 sm:p-8 md:p-10 lg:p-14">
                <div className="mb-8 sm:mb-10">
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-['Ivy_Ora'] tracking-tight">
                        My Account
                    </h1>
                    <p className="text-gray-500 mt-2 sm:mt-3 font-['TT_Norms_Pro'] text-base sm:text-lg">
                        Manage your profile, orders, notifications & settings
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
                                transition={{ duration: 0.25 }}
                                className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-sm"
                            >
                                <h2 className="text-lg sm:text-xl font-['TT_Norms_Pro_Mono'] mb-4 sm:mb-6">
                                    Personal Information
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                    <div className="p-4 sm:p-5 border rounded-xl bg-gray-50">
                                        <label className="text-xs sm:text-sm text-gray-500">Full Name</label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-sm sm:text-base">{user.name}</span>
                                        </div>
                                    </div>
                                    <div className="p-4 sm:p-5 border rounded-xl bg-gray-50">
                                        <label className="text-xs sm:text-sm text-gray-500">Email</label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium text-sm sm:text-base">{user.email}</span>
                                        </div>
                                    </div>
                                </div>
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

                        {activeTab === "notifications" && (
                            <motion.div
                                key="notifications"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8"
                            >
                                Notifications coming soon
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
                                className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 md:p-8"
                            >
                                Settings panel coming soon
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
