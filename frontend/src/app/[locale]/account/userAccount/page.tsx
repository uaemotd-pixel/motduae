"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../../context/AuthContext";
import {
    User,
    Mail,
    Edit2,
    ShoppingBag,
    Bell,
    Settings,
    LogOut,
} from "lucide-react";
import white_logo from "../../../../../public/PNG/White/MOTD_Wordmark_White.png";
import { Link } from "@/i18n/navigation";
import UserOrders from "../userOrders.tsx/page";

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

    const [formData, setFormData] = useState({ name: "", email: "" });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
            });
        }
    }, [user]);

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

    return (
        <div className="min-h-screen bg-black text-white flex">

            {/* ================= SIDEBAR ================= */}
            <aside className="w-72 min-h-screen border-r border-white/10 p-6 flex flex-col">

                {/* LOGO */}
                <Link href="/" className="flex items-center gap-3 mb-10 hover:opacity-80 transition">
                    <img src={white_logo.src} className="h-6 w-auto object-contain" />
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
                <div className="pt-6 border-t border-white/10">
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
            </aside>

            {/* ================= RIGHT PANEL ================= */}
            <main className="flex-1 bg-linear-to-b from-gray-50 to-gray-100 text-black p-10 md:p-14 overflow-hidden">

                {/* HERO */}
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-10"
                >
                    <h1 className="text-5xl md:text-6xl font-['Ivy_Ora'] tracking-tight">
                        My Account
                    </h1>
                    <p className="text-gray-500 mt-3 font-['TT_Norms_Pro'] text-lg">
                        Manage your profile, orders, notifications & settings
                    </p>
                </motion.div>

                {/* ================= DYNAMIC TABS ================= */}
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
                                className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
                            >
                                <h2 className="text-xl font-['TT_Norms_Pro_Mono'] mb-6">
                                    Personal Information
                                </h2>

                                <div className="grid md:grid-cols-2 gap-6">

                                    <div className="p-5 border rounded-xl bg-gray-50">
                                        <label className="text-sm text-gray-500">Full Name</label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{user.name}</span>
                                        </div>
                                    </div>

                                    <div className="p-5 border rounded-xl bg-gray-50">
                                        <label className="text-sm text-gray-500">Email</label>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Mail className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{user.email}</span>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        )}

                        {/* ORDERS TAB (READY FOR A-10) */}
                        {activeTab === "orders" && (
                            <motion.div
                                key="orders"
                                variants={pageVariants}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.25 }}
                                className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm"
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
                                className="bg-white border border-gray-200 rounded-2xl p-8"
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
                                className="bg-white border border-gray-200 rounded-2xl p-8"
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