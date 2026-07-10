"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, LogOut, Menu, Scissors, Store, X, ShoppingBag } from "lucide-react";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";

type FabricPortalShellProps = {
    children: React.ReactNode;
};

export default function FabricPortalShell({ children }: FabricPortalShellProps) {
    const t = useTranslations("FabricPortal");
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const locale = pathname.split("/")[1] || "en";

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    useEffect(() => {
        document.documentElement.classList.remove("lenis", "lenis-smooth");
        document.documentElement.style.overflow = "";
        document.body.style.overflow = "";

        return () => {
            document.documentElement.style.overflow = "";
            document.body.style.overflow = "";
        };
    }, []);

    const navItems = [
        { label: t("nav.dashboard"), href: "/fabric", icon: LayoutDashboard },
        { label: t("nav.shop"), href: "/fabric/shop", icon: Store },
        { label: t("nav.fabrics"), href: "/fabric/fabrics", icon: Scissors },
        { label: t("nav.orders"), href: "/fabric/orders", icon: ShoppingBag },
    ];

    const isActiveLink = (href: string) => {
        const fullHref = `/${locale}${href}`;
        if (href === "/fabric") {
            return pathname === fullHref;
        }
        return pathname.startsWith(fullHref);
    };

    const SidebarContent = () => (
        <>
            <div className="mb-8 lg:mb-10">
                <Link href="/fabric" onClick={() => setIsSidebarOpen(false)}>
                    <img
                        src={logoBlack.src}
                        alt="MOTD"
                        className="h-3 sm:h-3.5 md:h-4 w-auto object-contain"
                    />
                </Link>
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.24em] text-(--color-grey-muted) mt-3">
                    {t("portalLabel")}
                </p>
                {user?.name && (
                    <p className="[font-family:var(--font-body)] text-[13px] text-black mt-2">
                        {user.name}
                    </p>
                )}
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
                            className={`flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em] transition [font-family:var(--font-ui)] ${
                                isActive
                                    ? "bg-black text-white"
                                    : "text-black hover:bg-[#F0EBE3]"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <button
                type="button"
                onClick={() => {
                    logout();
                    router.push("/auth/login?redirect=/fabric");
                }}
                className="flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-(--color-grey-muted) hover:text-black transition [font-family:var(--font-ui)] mt-4"
            >
                <LogOut className="w-4 h-4" />
                {t("logout")}
            </button>
        </>
    );

    return (
        <div className="bg-[#FDFAF5] text-black lg:flex lg:h-dvh lg:overflow-hidden">
            <aside className="fixed left-0 top-0 z-20 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-(--color-border) bg-white p-6 lg:sticky lg:flex">
                <SidebarContent />
            </aside>

            <div
                className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 lg:hidden ${
                    isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <aside
                className={`fixed left-0 top-0 z-40 flex h-dvh w-72 flex-col overflow-y-auto border-r border-(--color-border) bg-white p-6 transition-transform duration-300 ease-in-out lg:hidden ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 text-(--color-grey-muted) hover:text-black"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="mt-8 flex min-h-0 flex-1 flex-col">
                    <SidebarContent />
                </div>
            </aside>

            <main className="min-h-dvh flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain p-4 pb-40 pt-14 xs:p-6 sm:p-8 md:p-10 lg:min-h-0 lg:pt-10">
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="fixed top-4 left-4 z-20 bg-black p-2 text-white transition hover:bg-[#2A2A28] lg:hidden"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {children}
            </main>
        </div>
    );
}
