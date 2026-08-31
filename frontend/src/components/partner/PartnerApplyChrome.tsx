"use client";

import { Link } from "@/i18n/navigation";
import { useAuth } from "@/context/AuthContext";
import logoBlack from "../../../public/PNG/Black/MOTD_Wordmark_Black.png";

type PartnerApplyChromeProps = {
  children: React.ReactNode;
  logoutRedirect: string;
  logoutLabel: string;
};

export default function PartnerApplyChrome({
  children,
  logoutRedirect,
  logoutLabel,
}: PartnerApplyChromeProps) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <header className="border-b border-(--color-border) px-3 sm:px-6 lg:px-8 py-4 sm:py-5 flex items-center justify-between gap-3 min-w-0">
        <Link href="/" className="flex items-center shrink-0">
          <img
            src={logoBlack.src}
            alt="MOTD"
            className="h-3 sm:h-3.5 md:h-4 w-auto object-contain"
          />
        </Link>
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {user?.name ? (
            <span className="hidden sm:inline [font-family:var(--font-body)] text-[13px] text-black truncate max-w-[40vw]">
              {user.name}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => void logout(logoutRedirect)}
            className="shrink-0 text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.22em] [font-family:var(--font-ui)] text-black hover:opacity-70"
          >
            {logoutLabel}
          </button>
        </div>
      </header>
      <main className="w-full max-w-3xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-10 lg:py-14 min-w-0">
        {children}
      </main>
    </div>
  );
}
