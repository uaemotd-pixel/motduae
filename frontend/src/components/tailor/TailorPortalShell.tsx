"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import { LayoutDashboard, LogOut, Menu, Scissors, Store, X } from "lucide-react";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";

type TailorPortalShellProps = {
    children: React.ReactNode;
};

export default function TailorPortalShell({ children }: TailorPortalShellProps) {
    const t = useTranslations("TailorPortal");
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const locale = pathname.split("/")[1] || "en";

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [pathname]);

    const navItems = [
        { label: t("nav.dashboard"), href: "/tailor", icon: LayoutDashboard },
        { label: t("nav.shop"), href: "/tailor/shop", icon: Store },
        { label: t("nav.designs"), href: "/tailor/designs", icon: Scissors },
    ];

    const isActiveLink = (href: string) => {
        const fullHref = `/${locale}${href}`;
        if (href === "/tailor") {
            return pathname === fullHref;
        }
        return pathname.startsWith(fullHref);
    };

    const SidebarContent = () => (
        <>
            <div className="mb-8 lg:mb-10">
                <Link href="/tailor" onClick={() => setIsSidebarOpen(false)}>
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
                    router.push("/auth/login");
                }}
                className="flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-(--color-grey-muted) hover:text-black transition [font-family:var(--font-ui)] mt-4"
            >
                <LogOut className="w-4 h-4" />
                {t("logout")}
            </button>
        </>
    );

    return (
        <div className="relative min-h-screen bg-[#FDFAF5] text-black">
            <aside className="fixed left-0 top-0 w-72 h-full border-r border-(--color-border) flex-col p-6 bg-white z-20 overflow-y-auto hidden lg:flex">
                <SidebarContent />
            </aside>

            <div
                className={`fixed inset-0 bg-black/40 z-30 transition-opacity duration-300 lg:hidden ${
                    isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <aside
                className={`fixed left-0 top-0 w-72 h-full bg-white border-r border-(--color-border) flex flex-col p-6 z-40 transition-transform duration-300 ease-in-out lg:hidden ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 text-(--color-grey-muted) hover:text-black lg:hidden"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>
                <div className="mt-8">
                    <SidebarContent />
                </div>
            </aside>

            <main className="min-h-screen p-4 xs:p-6 sm:p-8 md:p-10 pb-16 transition-all duration-300 lg:ml-72">
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden fixed top-4 left-4 z-20 p-2 bg-black text-white hover:bg-[#2A2A28] transition"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                <div className="lg:pt-0 pt-12">{children}</div>
            </main>
        </div>
    );
}
