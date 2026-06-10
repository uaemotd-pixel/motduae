"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard,
    Shirt,
    Scissors,
    Users,
    ShoppingBag,
    Store,
    Settings,
    LogOut,
} from "lucide-react";
import white_logo from "../../../../public/PNG/White/MOTD_Wordmark_White.png";

const NAV_ITEMS = [
    { key: "dashboard", href: "/admin", icon: LayoutDashboard },
    { key: "readyMade", href: "/admin/ready-made", icon: Shirt },
    { key: "fabrics", href: "/admin/fabrics", icon: Scissors },
    { key: "tailors", href: "/admin/tailors", icon: Users },
    { key: "orders", href: "/admin/orders", icon: ShoppingBag },
    { key: "partners", href: "/admin/partners", icon: Store },
    { key: "settings", href: "/admin/settings", icon: Settings },
] as const;

function isActiveAdminPath(pathname: string, href: string) {
    if (href === "/admin") {
        return pathname === "/admin";
    }
    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const t = useTranslations("Admin");

    useEffect(() => {
        if (isLoading) return;

        if (!user) {
            router.replace("/auth/login?redirect=/admin");
            return;
        }

        if (user.role !== "admin") {
            router.replace("/");
        }
    }, [user, isLoading, router]);

    if (isLoading) {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white">
                {t("loading")}
            </div>
        );
    }

    if (!user || user.role !== "admin") {
        return (
            <div className="h-screen flex items-center justify-center bg-black text-white">
                {t("redirecting")}
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-black text-white overflow-hidden">
            <aside className="w-72 h-full border-r border-white/10 flex flex-col p-6">
                <div className="mb-10">
                    <Link href="/admin">
                        <img
                            src={white_logo.src}
                            alt="MOTD Admin Logo"
                            className="h-3 xs:h-[13px] sm:h-3.5 md:h-4 lg:h-4.5 xl:h-5 2xl:h-5.5 3xl:h-[24px] w-auto object-contain"
                        />
                        <span className="sr-only">MOTD Admin</span>
                    </Link>
                    <p className="text-white/50 text-xs mt-3">{t("controlPanel")}</p>
                </div>

                <nav className="flex-1 space-y-2">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = isActiveAdminPath(pathname, item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition
                                ${isActive
                                        ? "bg-white text-black"
                                        : "text-white/70 hover:bg-white/10"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {t(`nav.${item.key}`)}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={() => {
                        logout();
                        router.replace("/auth/login");
                    }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition hover:cursor-pointer"
                >
                    <LogOut className="w-4 h-4" />
                    {t("nav.logout")}
                </button>
            </aside>

            <main className="flex-1 h-full overflow-y-auto bg-gray-100 text-black p-10">
                {children}
            </main>
        </div>
    );
}
