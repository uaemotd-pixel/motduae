"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useAuth, needsEmailVerification } from "@/context/AuthContext";
import { LayoutDashboard, LogOut, Menu, Scissors, Store, X, ShoppingBag, Bell, Edit } from "lucide-react";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";
import {
  buildVerifyEmailHref,
  canChangeAccountEmail,
} from "@/lib/auth/emailVerification";
import PartnerChangeEmailCard from "@/components/auth/PartnerChangeEmailCard";
import EmailChangePendingBanner from "@/components/auth/EmailChangePendingBanner";
import { getTranslation } from "@/lib/getTranslation";
import { useNotificationUnreadCount } from "@/hooks/useNotifications";

type TailorPortalShellProps = {
    children: React.ReactNode;
};

export default function TailorPortalShell({ children }: TailorPortalShellProps) {
    const t = useTranslations("TailorPortal");
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showChangeEmail, setShowChangeEmail] = useState(false);

    const locale = pathname.split("/")[1] || "en";
    const tVerify = getTranslation(locale).verifyEmail;
    const canChangeEmail = canChangeAccountEmail(user);
    const showVerify = needsEmailVerification(user) && !user?.isGuest;

    const { count: unreadNotificationCount } = useNotificationUnreadCount(
        "customer",
        Boolean(user),
    );

    useEffect(() => {
        setIsSidebarOpen(false);
        setShowChangeEmail(false);
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
        { label: t("nav.dashboard"), href: "/tailor", icon: LayoutDashboard },
        { label: t("nav.shop"), href: "/tailor/shop", icon: Store },
        { label: t("nav.designs"), href: "/tailor/designs", icon: Scissors },
        { label: t("nav.orders"), href: "/tailor/orders", icon: ShoppingBag },
        {
            label: t("nav.notifications") || "Notifications",
            href: "/tailor/notification",
            icon: Bell,
        },
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
                {user?.email ? (
                    <div className="mt-1 flex items-center gap-1.5 min-w-0 flex-wrap">
                        <p
                            className="[font-family:var(--font-body)] text-[11px] text-(--color-grey-muted) truncate min-w-0"
                            title={user.email}
                        >
                            {user.email}
                        </p>
                        {showVerify ? (
                            <button
                                type="button"
                                onClick={() => {
                                    window.location.assign(
                                        buildVerifyEmailHref({
                                            locale,
                                            mode: "account",
                                            next: "/tailor",
                                        }),
                                    );
                                }}
                                className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-600 text-white hover:bg-red-700 transition cursor-pointer"
                            >
                                {tVerify.profileVerify}
                            </button>
                        ) : null}
                        {canChangeEmail ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setShowChangeEmail((open) => !open);
                                    setIsSidebarOpen(false);
                                }}
                                aria-label={tVerify.changeEmailHeading}
                                className="shrink-0 p-0.5 rounded border border-black text-black bg-transparent hover:bg-black hover:text-white transition cursor-pointer"
                            >
                                <Edit className="w-3 h-3" strokeWidth={2} />
                            </button>
                        ) : null}
                    </div>
                ) : null}
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
                            className={`flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em] transition [font-family:var(--font-ui)] rounded-xl ${
                                isActive
                                    ? "bg-black text-white"
                                    : "text-(--dash-ink) hover:bg-(--dash-bg)"
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {item.label}
                            {item.href === "/tailor/notification" &&
                                unreadNotificationCount > 0 && (
                                    <span className="min-w-5 h-5 px-1 rounded-full bg-(--dash-danger) text-white text-[11px] font-semibold flex items-center justify-center shadow-sm">
                                        {unreadNotificationCount > 99
                                            ? "99+"
                                            : unreadNotificationCount}
                                    </span>
                                )}
                        </Link>
                    );
                })}
            </nav>

            <button
                type="button"
                onClick={() => {
                    void logout("/auth/login?redirect=/tailor");
                }}
                className="flex items-center gap-3 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-(--color-grey-muted) hover:text-black transition [font-family:var(--font-ui)] mt-4"
            >
                <LogOut className="w-4 h-4" />
                {t("logout")}
            </button>
        </>
    );

    return (
        <div className="bg-(--dash-bg) text-(--dash-ink) lg:flex lg:h-dvh lg:overflow-hidden">
            <aside className="fixed left-0 top-0 z-20 hidden h-dvh w-72 shrink-0 flex-col overflow-y-auto border-r border-(--dash-border) bg-(--dash-surface) p-6 lg:sticky lg:flex">
                <SidebarContent />
            </aside>

            <div
                className={`fixed inset-0 z-30 bg-black/40 transition-opacity duration-300 lg:hidden ${
                    isSidebarOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
                }`}
                onClick={() => setIsSidebarOpen(false)}
            />
            <aside
                className={`fixed left-0 top-0 z-40 flex h-dvh w-72 flex-col overflow-y-auto border-r border-(--dash-border) bg-(--dash-surface) p-6 transition-transform duration-300 ease-in-out lg:hidden ${
                    isSidebarOpen ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    className="absolute top-4 right-4 p-2 text-(--dash-muted) hover:text-(--dash-ink)"
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
                    className="fixed top-4 left-4 z-20 bg-black p-2 text-white transition hover:bg-(--dash-charcoal-deep) lg:hidden rounded-md"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {showChangeEmail && canChangeEmail ? (
                    <PartnerChangeEmailCard
                        locale={locale}
                        nextPath="/tailor"
                        currentEmail={user?.email}
                        onCancel={() => setShowChangeEmail(false)}
                    />
                ) : (
                    <>
                        {canChangeEmail ? (
                            <div className="mb-6">
                                <EmailChangePendingBanner
                                    locale={locale}
                                    nextPath="/tailor"
                                    variant="portal"
                                />
                            </div>
                        ) : null}
                        {children}
                    </>
                )}
            </main>
        </div>
    );
}
