"use client";

import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";

export default function FabricPendingState() {
    const t = useTranslations("FabricPortal.pending");
    const tPortal = useTranslations("FabricPortal");
    const { logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/auth/login?redirect=/fabric");
    };

    return (
        <div className="min-h-screen bg-[#FDFAF5] flex items-center justify-center px-4 py-16">
            <div className="max-w-lg w-full text-center border border-(--color-border) bg-white p-8 sm:p-10">
                <p className="[font-family:var(--font-ui)] text-[10px] uppercase tracking-[0.28em] text-(--color-grey-muted) mb-4">
                    {t("eyebrow")}
                </p>
                <h1 className="[font-family:var(--font-display)] text-[28px] sm:text-[32px] text-black mb-4">
                    {t("title")}
                </h1>
                <p className="[font-family:var(--font-body)] text-[14px] leading-relaxed text-(--color-grey-muted) mb-6">
                    {t("description")}
                </p>
                <p className="[font-family:var(--font-ui)] text-[11px] uppercase tracking-[0.2em] text-black mb-8">
                    {t("status")}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                        href="/"
                        className="inline-block px-8 py-3 border border-black text-black text-[10px] tracking-[0.22em] uppercase hover:bg-black hover:text-white transition [font-family:var(--font-ui)]"
                    >
                        {t("goHome")}
                    </Link>
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="inline-block px-8 py-3 bg-black text-white text-[10px] tracking-[0.22em] uppercase hover:bg-[#2A2A28] transition [font-family:var(--font-ui)]"
                    >
                        {tPortal("logout")}
                    </button>
                </div>
            </div>
        </div>
    );
}
