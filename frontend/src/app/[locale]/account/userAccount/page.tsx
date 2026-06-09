"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { useAuth } from "../../../../context/AuthContext";
import {
    User,
    Mail,
    Edit2,
    ShoppingBag,
    Bell,
    Settings,
    LogOut,
    Menu,
    X,
} from "lucide-react";
import white_logo from "../../../../../public/PNG/White/MOTD_Wordmark_White.png";
import { Link } from "@/i18n/navigation";
import UserOrders from "../userOrders/page";
import FadeInSection from "@/components/shared/fadeInSection";

// Mock API
const updateUserProfile = async (userId: string, data: { name: string; email: string }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return { success: true, user: { id: userId, ...data } };
};

const pageVariants = {
    initial: { opacity: 0, x: 25, scale: 0.98 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -25, scale: 0.98 },
};

export default function AccountPage() {
    const { user, isLoading: authLoading, logout } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const formTabURL = searchParams.get("tab");

    const [isEditing, setIsEditing] = useState(false);
    const [activeTab, setActiveTab] = useState(formTabURL || "profile");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const [formData, setFormData] = useState({ name: "", email: "" });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
            });
        }
    }, [user]);

    // Close sidebar on route change (when tab changes)
    useEffect(() => {
        setSidebarOpen(false);
    }, [activeTab]);

    const navItems = [
        { id: "profile", label: "Profile", icon: User },
        { id: "orders", label: "Orders", icon: ShoppingBag },
        { id: "notifications", label: "Notifications", icon: Bell },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white">
                Loading account...
            </div>
        );
    }

    if (!user) return null;

    // Sidebar content (reused for both desktop and mobile)
    const SidebarContent = () => (
        <>
            {/* LOGO */}
            <Link href="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition">
                <img src={white_logo.src} className="h-6 w-auto object-contain" alt="Logo" />
            </Link>

            {/* NAV */}
            <nav className="flex-1 space-y-2">
                {navItems.map((item, i) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <motion.button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                router.push(`?tab=${item.id}`);
                            }}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-['TT_Norms_Pro'] transition-all cursor-pointer
                                ${isActive
                                    ? "bg-white text-black shadow-md"
                                    : "text-white hover:bg-white/10"
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </motion.button>
                    );
                })}
            </nav>

            {/* LOGOUT */}
            <div className="pt-6 border-t border-white/10 mt-auto">
                <motion.button
                    whileHover={{ scale: 1.03 }}
                    onClick={() => {
                        logout();
                        router.push("/auth/login");
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </motion.button>
            </div>
        </>
    );

    return (
        <FadeInSection>
            {/* Outer container: viewport height, flex on desktop, relative for mobile overlay */}
            <div className="min-h-screen bg-black text-white lg:flex lg:overflow-hidden">
                {/* DESKTOP SIDEBAR (always visible) */}
                <aside className="hidden lg:flex lg:w-72 lg:min-h-screen lg:flex-col lg:border-r lg:border-white/10 lg:p-6">
                    <SidebarContent />
                </aside>

                {/* MOBILE HAMBURGER BUTTON */}
                <div className="lg:hidden fixed top-4 left-4 z-50">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 rounded-lg bg-black/80 backdrop-blur-sm border border-white/20 text-white"
                        aria-label="Open menu"
                    >
                        <Menu className="w-5 h-5" />
                    </button>
                </div>

                {/* MOBILE SIDEBAR (overlay) */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <>
                            {/* Backdrop */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setSidebarOpen(false)}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                            />
                            {/* Sidebar panel */}
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
                                <SidebarContent />
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* MAIN CONTENT (scrollable on all devices) */}
                <main className="flex-1 bg-linear-to-b from-gray-50 to-gray-100 text-black overflow-y-auto min-h-screen p-6 sm:p-8 md:p-10 lg:p-14">
                    {/* HERO */}
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 sm:mb-10"
                    >
                        <h1 className="text-4xl sm:text-5xl md:text-6xl font-['Ivy_Ora'] tracking-tight">
                            My Account
                        </h1>
                        <p className="text-gray-500 mt-2 sm:mt-3 font-['TT_Norms_Pro'] text-base sm:text-lg">
                            Manage your profile, orders, notifications & settings
                        </p>
                    </motion.div>

                    {/* DYNAMIC TABS */}
                    <div className="relative">
                        <AnimatePresence mode="wait">
                            {/* PROFILE TAB */}
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

                            {/* ORDERS TAB */}
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
                                    <UserOrders />
                                </motion.div>
                            )}

                            {/* NOTIFICATIONS */}
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

                            {/* SETTINGS */}
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
        </FadeInSection>
    );
}